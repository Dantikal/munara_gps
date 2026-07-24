import copy
import json
import re
from pathlib import Path

from django.contrib.auth import get_user_model
from django.db import OperationalError, ProgrammingError, transaction
from django.db.models import Case, IntegerField, Max, Q, Value, When
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    AdminChatMessage,
    CombatTrainingNews,
    CombatTrainingNewsAttachment,
    CombatTrainingNewsLike,
    CombatTrainingNewsRead,
    CombatTrainingJournal,
    CombatTrainingJournalRevisionHidden,
    CombatTrainingJournalRevision,
    CombatTrainingJournalRevisionRead,
    CombatTrainingJournalSubject,
    CombatTrainingPlan,
    CombatTrainingPlanRead,
    MethodicalManualDocument,
    MethodicalManualSubject,
    SubmissionEditRequest,
    TrainingPeriod,
    TrainingSection,
    TrainingTable,
    ThematicAccountSubmission,
    ThematicAccountSubmissionRead,
)
from .permissions import IsActiveUser, IsAdminRole
from .outposts import format_outpost_name
from .serializers import (
    CombatTrainingJournalSerializer,
    CombatTrainingJournalSubjectSerializer,
    CombatTrainingNewsSerializer,
    MethodicalManualDocumentSerializer,
    MethodicalManualSubjectSerializer,
)

User = get_user_model()

NORMATIVE_LEGAL_ACTS_TITLE = "Нормативные правовые акты"

ADMIN_MILITARY_UNIT_NUMBERS = [
    "2021",
    "2022",
    "2023",
    "2024",
    "2025",
    "2026",
    "2027",
    "2028",
    "2029",
    "2030",
    "2031",
    "2032",
    "2055",
    "2056",
    "2057",
    "2051",
    "2053",
    "2063",
    "2064",
    "2065",
    "КЖжАККДБ",
    "ЧАП",
]


ROLE_LABELS = {
    User.Role.ADMIN: "Админ",
    User.Role.REGIONAL: "Аскер бөлүгү",
    User.Role.OUTPOST: "Застава",
    "": "Не назначена",
}

STATUS_LABELS = {
    User.Status.PENDING: "Ожидает",
    User.Status.ACTIVE: "Активен",
    User.Status.REJECTED: "Отклонен",
}

LIBRARY_EXCLUDED_SECTION_SLUGS = {"combat-training-journal"}
THEMATIC_ACCOUNT_SECTION_SLUGS = {"thematic-account", "command-thematic-account"}
COMMAND_THEMATIC_ACCOUNT_SECTION_SLUG = "command-thematic-account"
THEMATIC_ACCOUNT_SECTION_TITLE = "Сабактардын тематикалык эсеби"
PERSONNEL_TRAINING_SUBMISSION_SECTION_SLUGS = {
    "thematic-account",
    "lesson-schedule",
}
REMOVED_THEMATIC_PERIOD_SLUGS = {"period-1", "period-2", "period-3", "period-4"}
REMOVED_THEMATIC_PERIOD_TITLE_PARTS = (
    "2026-окуу жылынын 2 мезгилине",
    "2026-окуу жылынын 3 мезгилине",
    "2026-окуу жылынын 4 мезгилине",
    "20__-окуу жылынын 2 мезгилине",
    "20__-окуу жылынын 3 мезгилине",
    "20__-окуу жылынын 4 мезгилине",
)
THEMATIC_ACCOUNT_UNIT_TEXT = "2027 аскер бөлүгүнүн"
THEMATIC_ACCOUNT_YEAR_TEXT = "2026-окуу жылынын"
THEMATIC_ACCOUNT_YEAR_PLACEHOLDER = "20__-окуу жылынын"
LESSON_SCHEDULE_SECTION_SLUGS = {"lesson-schedule", "command-lesson-schedule"}


def build_thematic_account_table_title(period_number):
    return (
        f"20__-окуу жылынын {period_number} мезгилине"
        '_______аскер бөлүгүнүн "__________" чек ара заставынын '
        "(тобунун, взвод, ротосынын) өздүк курамы  менен өтүлгүүчү   "
        "сабактардын тематикалык эсеп сааты."
    )


def build_command_thematic_account_table_title(period_number="___"):
    return (
        f'20__-окуу жылынын {period_number} мезгилине_______аскер бөлүгүнүн "__________" чек ара заставынын '
        "(тобунун, взвод, ротосынын) сержант,  прапорщиктердин\n"
        "өздүк курамы  менен өтүлгүүчү "
        "командирдик даярдык боюбнча  сабактардын тематикалык эсеп сааты."
    )


def build_lesson_schedule_period_title(week_number, month="__________"):
    return f'Сабактардын жүгүртмөсү "{month} "айынын {week_number} жумасы'


def normalize_thematic_account_title(title, is_command=False, period_number=None):
    raw_title = (
        (title or "")
        .replace(THEMATIC_ACCOUNT_YEAR_TEXT, THEMATIC_ACCOUNT_YEAR_PLACEHOLDER)
        .replace(THEMATIC_ACCOUNT_UNIT_TEXT, "")
    )
    compact_title = " ".join(raw_title.split())
    period_match = re.search(r"20__-окуу жылынын\s+(\d+)\s+мезгилине", compact_title)
    command_period_number = period_number or (period_match.group(1) if period_match else "___")
    if is_command and "тематикалык эсеп сааты" in raw_title:
        return build_command_thematic_account_table_title(command_period_number)

    has_old_table_title = (
        "чек ара заставынын сержанттары" in compact_title
        or "командирдик даярдык боюнча сабактардын тематикалык эсеп сааты" in compact_title
    )
    if period_match and has_old_table_title:
        return build_thematic_account_table_title(period_match.group(1))
    if "өздүк курамы" in raw_title and "тематикалык эсеп сааты" in raw_title:
        return raw_title.strip()
    return compact_title


def get_period_number(period):
    slug_match = re.search(r"period-(\d+)$", period.slug or "")
    if slug_match:
        return slug_match.group(1)

    title_match = re.search(r"20__-окуу жылынын\s+(\d+)\s+мезгилине", period.title or "")
    return title_match.group(1) if title_match else None


def is_removed_thematic_period(period):
    if period.slug.startswith("admin-document-"):
        return False
    return period.slug in REMOVED_THEMATIC_PERIOD_SLUGS or any(
        title_part in period.title
        for title_part in REMOVED_THEMATIC_PERIOD_TITLE_PARTS
    )


def build_library_sections_from_db(user=None):
    try:
        sections = list(
            TrainingSection.objects.filter(is_active=True)
            .exclude(slug__in=LIBRARY_EXCLUDED_SECTION_SLUGS)
            .order_by(
                "parent_id", "order", "title"
            )
        )
        if not sections:
            return []

        section_ids = [section.id for section in sections]
        period_queryset = TrainingPeriod.objects.filter(
            is_active=True,
            section_id__in=section_ids,
        )
        if user and user.role != User.Role.ADMIN:
            period_queryset = period_queryset.filter(
                Q(created_by__isnull=True) | Q(created_by=user)
            )
        periods = list(
            period_queryset
            .select_related("table")
            .order_by("section_id", "order", "title")
        )
    except (OperationalError, ProgrammingError):
        return []

    children_by_parent = {}
    for section in sections:
        children_by_parent.setdefault(section.parent_id, []).append(section)

    periods_by_section = {}
    for period in periods:
        periods_by_section.setdefault(period.section_id, []).append(period)

    def serialize_section(section):
        is_thematic_account = section.slug in THEMATIC_ACCOUNT_SECTION_SLUGS
        is_command_thematic_account = section.slug == COMMAND_THEMATIC_ACCOUNT_SECTION_SLUG
        payload = {
            "id": section.slug,
            "title": (
                THEMATIC_ACCOUNT_SECTION_TITLE
                if is_thematic_account
                else section.title
            ),
        }

        child_sections = [
            serialize_section(child)
            for child in children_by_parent.get(section.id, [])
        ]
        if child_sections:
            payload["sections"] = child_sections

        section_periods = []
        for period in periods_by_section.get(section.id, []):
            period_number = get_period_number(period)
            if (
                is_thematic_account
                and is_removed_thematic_period(period)
            ):
                continue

            period_title = (
                normalize_thematic_account_title(
                    period.title,
                    is_command_thematic_account,
                    period_number,
                )
                if is_thematic_account
                else period.title
            )
            period_payload = {"id": period.slug, "title": period_title}
            if user and (
                user.role == User.Role.ADMIN
                or period.created_by_id == user.id
            ):
                period_payload["canEdit"] = True
                period_payload["canDelete"] = True
            is_legacy_custom_lesson_period = (
                period.section.slug in LESSON_SCHEDULE_SECTION_SLUGS
                and period.created_by_id is None
                and period.slug != "lesson-schedule-week-1"
            )
            if user and (
                (
                    period.created_by_id
                    and (user.role == User.Role.ADMIN or period.created_by_id == user.id)
                )
                or (
                    is_legacy_custom_lesson_period
                    and user.role in {User.Role.ADMIN, User.Role.OUTPOST}
                )
            ):
                period_payload["canDelete"] = True
            try:
                table = period.table
            except TrainingTable.DoesNotExist:
                table = None

            if table and table.is_active:
                table_payload = table.to_payload()
                if is_thematic_account:
                    table_payload["title"] = normalize_thematic_account_title(
                        table_payload.get("title"),
                        is_command_thematic_account,
                        period_number,
                    )
                period_payload["table"] = table_payload

            section_periods.append(period_payload)

        if section_periods:
            payload["periods"] = section_periods

        return payload

    return [
        serialize_section(section)
        for section in children_by_parent.get(None, [])
    ]


def add_regional_command_training_groups(sections):
    """Add the military-unit-specific command training hierarchy."""
    command_training = next(
        (section for section in sections if section.get("id") == "command-training"),
        None,
    )
    if not command_training:
        return sections

    command_training_sections = command_training.get("sections", [])
    command_training["sections"] = [
        {
            "id": "command-training-subunits",
            "title": "Бөлүкчөлөрдүн командирдик даярдоосу",
            "sections": copy.deepcopy(command_training_sections),
        },
        {
            "id": "command-training-military-unit",
            "title": "Аскер бөлүктүн командирдик даярдоосу",
            "sections": copy.deepcopy(command_training_sections),
        },
    ]
    return sections


def add_regional_typical_week_groups(sections):
    typical_week = next(
        (section for section in sections if section.get("id") == "typical-week"),
        None,
    )
    if not typical_week:
        return sections

    military_unit_content = {}
    if typical_week.get("periods"):
        military_unit_content["periods"] = copy.deepcopy(typical_week["periods"])
    if typical_week.get("table"):
        military_unit_content["table"] = copy.deepcopy(typical_week["table"])
    typical_week.pop("periods", None)
    typical_week.pop("table", None)
    typical_week["sections"] = [
        {
            "id": "typical-week-subunits",
            "title": "Бөлүкчөлөрдүн типовая неделясы",
        },
        {
            "id": "typical-week-military-unit",
            "title": "Аскер бөлүктүн типовая неделясы",
            **military_unit_content,
        },
    ]
    return sections


def build_training_table_module_from_db(section_slug, scope):
    try:
        section = TrainingSection.objects.filter(
            slug=section_slug,
            is_active=True,
        ).first()
        if not section:
            return None

        period = (
            TrainingPeriod.objects.filter(section=section, is_active=True)
            .select_related("table")
            .order_by("order", "title")
            .first()
        )
    except (OperationalError, ProgrammingError):
        return None

    if not period:
        return None

    try:
        table = period.table
    except TrainingTable.DoesNotExist:
        return None

    if not table.is_active:
        return None

    return {
        "id": section.slug,
        "title": section.title,
        "scope": scope,
        "table": table.to_payload(),
    }


def methodical_manual_subject_queryset(
    collection=MethodicalManualSubject.Collection.METHODICAL_MANUALS,
):
    return (
        MethodicalManualSubject.objects.filter(
            is_active=True,
            collection=collection,
        )
        .annotate(
            menu_priority=Case(
                When(title=NORMATIVE_LEGAL_ACTS_TITLE, then=Value(0)),
                default=Value(1),
                output_field=IntegerField(),
            )
        )
        .order_by("menu_priority", "order", "title")
    )


def methodical_manual_subjects_payload():
    try:
        subjects = methodical_manual_subject_queryset()
        return MethodicalManualSubjectSerializer(subjects, many=True).data
    except (OperationalError, ProgrammingError):
        return []


def chat_unread_count_for_user(user):
    try:
        return AdminChatMessage.objects.filter(recipient=user, is_read=False).count()
    except (OperationalError, ProgrammingError):
        return 0


def build_modules_payload(user):
    scope = "всей системы"
    if user.role == User.Role.REGIONAL:
        scope = user.region or "области"
    if user.role == User.Role.OUTPOST:
        scope = user.outpost_name or "заставы"

    unit_numbers = list(ADMIN_MILITARY_UNIT_NUMBERS) if user.role == User.Role.ADMIN else []

    month_options = [
        "январь",
        "февраль",
        "март",
        "апрель",
        "май",
        "июнь",
        "июль",
        "август",
        "сентябрь",
        "октябрь",
        "ноябрь",
        "декабрь",
    ]

    def build_training_table(period_number, is_command=False):
        return {
            "title": (
                build_command_thematic_account_table_title(period_number)
                if is_command
                else build_thematic_account_table_title(period_number)
            ),
            "columns": [
                {"key": "number", "label": "№"},
                {"key": "topic", "label": "Сабактардын аталышы"},
                {"key": "hours", "label": "канча саат"},
                {"key": "december", "label": "Декабрь", "type": "datetime-local"},
                {"key": "january", "label": "Январь", "type": "datetime-local"},
                {"key": "february", "label": "Февраль", "type": "datetime-local"},
                {"key": "march", "label": "Март", "type": "datetime-local"},
                {"key": "june", "label": "Июнь", "type": "datetime-local"},
                {"key": "july", "label": "Июль", "type": "datetime-local"},
                {"key": "august", "label": "Август", "type": "datetime-local"},
                {"key": "september", "label": "Сентябрь", "type": "datetime-local"},
            ],
            "rows": [
                {
                    "number": number,
                    "topic": "",
                    "hours": "",
                    "december": "",
                    "january": "",
                    "february": "",
                    "march": "",
                    "june": "",
                    "july": "",
                    "august": "",
                    "september": "",
                }
                for number in range(1, 11)
            ],
        }

    def build_lesson_schedule_table(title=None):
        title = title or build_lesson_schedule_period_title(1)
        day_groups = [
            {"id": "monday", "label": "Дүйшөмбү", "date": "20__ж. «__»____"},
            {"id": "tuesday", "label": "Шейшемби", "date": "20__ж. «__»____"},
            {"id": "wednesday", "label": "Шаршемби", "date": "20__ж. «__»____"},
            {"id": "thursday", "label": "Бейшемби", "date": "20__ж. «__»____"},
            {"id": "friday", "label": "Жума", "date": "20__ж. «__»____"},
            {"id": "saturday", "label": "Ишемби", "date": "20__ж. «__»____"},
            {"id": "sunday", "label": "Жекшемби", "date": "20__ж. «__»____"},
            {"id": "methodical", "label": "Методикалык нускамалоо", "date": "20__ж. «__»____"},
        ]
        columns = [
            {"key": "start_time", "label": "Башталуу убактысы", "type": "time"},
            {"key": "end_time", "label": "Аяктоо убактысы", "type": "time"},
            {"key": "activity", "label": "Өткөрүлүүчү иш-чара"},
        ]

        for group in day_groups:
            columns.extend(
                [
                    {"key": f"{group['id']}_instructor", "label": "Ким өткөрөт"},
                    {"key": f"{group['id']}_place", "label": "Өткөрүү орду"},
                ]
            )

        return {
            "title": title,
            "variant": "lesson-schedule",
            "headerFields": [
                {"key": "from_year", "label": "Башталган жыл", "defaultValue": "20__", "suffix": "-ж."},
                {"key": "from_day", "label": "Башталган күн", "defaultValue": "__", "prefix": "«", "suffix": "»"},
                {
                    "key": "from_month",
                    "label": "Башталган ай",
                    "type": "select",
                    "placeholder": "ай",
                    "options": month_options,
                },
                {"text": "баштап"},
                {"key": "to_year", "label": "Аяктаган жыл", "defaultValue": "20__", "suffix": "-ж."},
                {"key": "to_day", "label": "Аяктаган күн", "defaultValue": "__", "prefix": "«", "suffix": "»"},
                {
                    "key": "to_month",
                    "label": "Аяктаган ай",
                    "type": "select",
                    "placeholder": "ай",
                    "options": month_options,
                },
                {"text": "чейин"},
                {
                    "key": "outpost",
                    "label": "Чек ара заставасы",
                    "defaultValue": "Степное",
                    "suffix": "чек ара заставасы",
                },
            ],
            "headerRows": [
                [
                    {"key": "start_time", "label": "Башталуу убактысы", "rowSpan": 3},
                    {"key": "end_time", "label": "Аяктоо убактысы", "rowSpan": 3},
                    {"key": "activity", "label": "Өткөрүлүүчү иш-чара", "rowSpan": 3},
                    *[
                        {"key": group["id"], "label": group["label"], "colSpan": 2}
                        for group in day_groups
                    ],
                ],
                [
                    {
                        "key": f"{group['id']}_date",
                        "label": group["date"],
                        "defaultValue": group["date"],
                        "editableKey": f"{group['id']}_date",
                        "colSpan": 2,
                    }
                    for group in day_groups
                ],
                [
                    cell
                    for group in day_groups
                    for cell in [
                        {"key": f"{group['id']}_instructor", "label": "Ким өткөрөт"},
                        {"key": f"{group['id']}_place", "label": "Өткөрүү орду"},
                    ]
                ],
            ],
            "columns": columns,
            "rows": [
                {
                    **{"start_time": "", "end_time": "", "activity": ""},
                    **{
                        column["key"]: ""
                        for column in columns
                        if column["key"] not in {"start_time", "end_time", "activity"}
                    },
                }
                for _ in range(10)
            ],
        }

    def build_combat_training_journal_table():
        return {
            "title": "Күжүрмөн даярдоону каттоо журналы",
            "columns": [
                {"key": "number", "label": "№"},
                {"key": "date", "label": "Дата", "type": "date"},
                {"key": "topic", "label": "Сабактын темасы"},
                {"key": "place", "label": "Өткөрүү орду"},
                {"key": "participants", "label": "Катышкандар"},
                {"key": "instructor", "label": "Жетекчи"},
                {"key": "note", "label": "Белги"},
            ],
            "rows": [
                {
                    "number": number,
                    "date": "",
                    "topic": "",
                    "place": "",
                    "participants": "",
                    "instructor": "",
                    "note": "",
                }
                for number in range(1, 11)
            ],
        }

    library_sections = build_library_sections_from_db(user)
    if not library_sections:
        library_sections = [
            {
                "id": "personnel-training",
                "title": "Өздүк курамдын даярдыгы",
                "sections": [
                    {
                        "id": "thematic-account",
                        "title": "Сабактардын тематикалык эсеби",
                        "periods": [
                            {
                                "id": "period-1",
                                "title": "20__-окуу жылынын 1 мезгилине",
                                "table": build_training_table(1),
                            },
                        ],
                    },
                    {
                        "id": "lesson-schedule",
                        "title": "Сабактардын жүгүртмөсү",
                        "periods": [
                            {
                                "id": "lesson-schedule-week-1",
                                "title": build_lesson_schedule_period_title(1),
                                "table": build_lesson_schedule_table(),
                            },
                        ],
                    },
                ],
            },
            {
                "id": "command-training",
                "title": "Командирдик даярдоо",
                "sections": [
                    {
                        "id": "command-thematic-account",
                        "title": "Сабактардын тематикалык эсеби",
                        "periods": [
                            {
                                "id": "period-1",
                                "title": "20__-окуу жылынын 1 мезгилине",
                                "table": build_training_table(1, is_command=True),
                            },
                        ],
                    },
                    {
                        "id": "command-lesson-schedule",
                        "title": "Сабактардын жүгүртмөсү",
                        "periods": [
                            {
                                "id": "lesson-schedule-week-1",
                                "title": build_lesson_schedule_period_title(1),
                                "table": build_lesson_schedule_table(),
                            },
                        ],
                    },
                ],
            },
            {
                "id": "typical-week",
                "title": "Типовая неделя",
            },
        ]

    if user.role == User.Role.REGIONAL:
        library_sections = add_regional_command_training_groups(library_sections)
        library_sections = add_regional_typical_week_groups(library_sections)

    combat_training_journal = build_training_table_module_from_db(
        "combat-training-journal",
        scope,
    )
    combat_training_journal["unitNumbers"] = unit_numbers

    return {
        "chatUnreadCount": chat_unread_count_for_user(user),
        "library": {
            "title": "Сабактардын тематикасынын эсеби жана жүгүртмөсү",
            "scope": scope,
            "unitNumbers": unit_numbers,
            "sections": library_sections,
            "items": [
                {"name": "Инструкция по несению службы", "type": "Приказ", "updated": "18.06.2026"},
                {"name": "Регламент связи и докладов", "type": "Методичка", "updated": "15.06.2026"},
                {"name": "План реагирования на инциденты", "type": "План", "updated": "10.06.2026"},
            ],
        },
        "combatTrainingJournal": combat_training_journal,
        "combatTrainingResults": {"unitNumbers": unit_numbers},
        "smr": {
            "title": "Күжүрмөн даярдоо боюнча усулдук колдонмолор",
            "subjects": methodical_manual_subjects_payload(),
        },
        "schedule": {
            "title": "Пландоо",
            "items": [
                {"date": "Сегодня", "time": "08:00-20:00", "name": "Смена А", "status": "В наряде"},
                {"date": "Завтра", "time": "20:00-08:00", "name": "Смена Б", "status": "План"},
                {"date": "21.06", "time": "08:00-20:00", "name": "Смена В", "status": "План"},
            ],
        },
        "journal": {
            "title": "Уюштуруу",
            "entries": [
                {"date": "19.06.2026", "event": "Проверка связи", "status": "Закрыто"},
                {"date": "18.06.2026", "event": "Патрулирование участка", "status": "Закрыто"},
                {"date": "17.06.2026", "event": "Технический осмотр", "status": "В работе"},
            ],
        },
        "analytics": {
            "title": "Талдоо",
            "unitNumbers": unit_numbers,
            "reports": [
                {"name": "Сводка за неделю", "status": "Готово", "updated": "19.06.2026"},
                {"name": "Динамика нарушений", "status": "Готово", "updated": "18.06.2026"},
                {"name": "Отчет по обеспечению", "status": "Черновик", "updated": "16.06.2026"},
            ],
        },
    }


def latest_users(limit=5):
    return [
        {
            "id": user.id,
            "fullName": user.full_name,
            "role": ROLE_LABELS.get(user.role, user.role),
            "date": timezone.localtime(user.date_joined).strftime("%d.%m.%Y"),
            "status": STATUS_LABELS.get(user.status, user.status),
        }
        for user in User.objects.order_by("-date_joined")[:limit]
    ]


class AdminDashboardView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        today = timezone.localdate()
        admin_count = User.objects.filter(role=User.Role.ADMIN).count()
        regional_count = User.objects.filter(role=User.Role.REGIONAL).count()
        outpost_count = User.objects.filter(role=User.Role.OUTPOST).count()
        pending_count = User.objects.filter(status=User.Status.PENDING).count()
        active_today = User.objects.filter(last_login__date=today).count()
        total_outposts = (
            User.objects.filter(unit_type=User.UnitType.OUTPOST)
            .exclude(outpost_name="")
            .values("outpost_name")
            .distinct()
            .count()
        )
        total_regions = User.objects.exclude(region="").values("region").distinct().count()

        return Response(
            {
                "stats": [
                    {"id": "totalUsers", "label": "Всего пользователей", "value": User.objects.count(), "tone": "primary"},
                    {"id": "admins", "label": "Админов", "value": admin_count, "tone": "neutral"},
                    {"id": "regional", "label": "Областных управлений", "value": regional_count, "tone": "neutral"},
                    {"id": "outposts", "label": "Застав", "value": outpost_count, "tone": "neutral"},
                    {
                        "id": "pending",
                        "label": "Ожидают подтверждения",
                        "value": pending_count,
                        "tone": "warning",
                        "clickTarget": "adminRequests",
                    },
                    {"id": "activeToday", "label": "Активны сегодня", "value": active_today, "tone": "success"},
                    {"id": "totalOutposts", "label": "Всего застав", "value": total_outposts, "tone": "neutral"},
                    {"id": "totalRegions", "label": "Всего областей", "value": total_regions, "tone": "neutral"},
                ],
                "charts": {
                    "roleDistribution": [
                        {"name": "Админы", "value": admin_count},
                        {"name": "Областные", "value": regional_count},
                        {"name": "Заставы", "value": outpost_count},
                    ],
                    "monthlyRegistrations": [
                        {"month": "Янв", "registrations": 12},
                        {"month": "Фев", "registrations": 18},
                        {"month": "Мар", "registrations": 22},
                        {"month": "Апр", "registrations": 31},
                        {"month": "Май", "registrations": 38},
                        {"month": "Июн", "registrations": 44},
                    ],
                    "hourlyActivity": [
                        {"hour": "00", "users": 8},
                        {"hour": "04", "users": 12},
                        {"hour": "08", "users": 64},
                        {"hour": "12", "users": 92},
                        {"hour": "16", "users": 78},
                        {"hour": "20", "users": 41},
                    ],
                },
                "latestUsers": latest_users(),
                "quickActions": [
                    {"id": "requests", "label": "Проверить новые запросы", "count": pending_count, "target": "adminRequests"},
                    {"id": "export", "label": "Экспорт отчета", "count": None, "target": "export"},
                ],
                "modules": build_modules_payload(request.user),
            }
        )


class RegionalDashboardView(APIView):
    permission_classes = [IsActiveUser]

    def get(self, request):
        if request.user.role != User.Role.REGIONAL:
            raise PermissionDenied("Доступ разрешен только областному управлению.")

        region = request.user.region or "Чуйская область"

        return Response(
            {
                "region": region,
                "stats": [
                    {"id": "region", "label": "Область", "value": region, "tone": "primary"},
                    {"id": "outposts", "label": "Подчиненных застав", "value": 14, "tone": "neutral"},
                    {"id": "staff", "label": "Сотрудников в области", "value": 326, "tone": "neutral"},
                    {"id": "pending", "label": "Заявок на рассмотрении", "value": 7, "tone": "warning"},
                    {"id": "documents", "label": "Новых документов за неделю", "value": 19, "tone": "success"},
                    {"id": "incidents", "label": "Происшествий за месяц", "value": 4, "tone": "danger"},
                ],
                "charts": {
                    "outpostActivity": [
                        {"name": "Ала-Тоо", "reports": 32},
                        {"name": "Кара-Суу", "reports": 27},
                        {"name": "Ак-Жол", "reports": 21},
                        {"name": "Токмок", "reports": 18},
                        {"name": "Кемин", "reports": 15},
                    ],
                    "incidentTrend": [
                        {"month": "Янв", "incidents": 7},
                        {"month": "Фев", "incidents": 5},
                        {"month": "Мар", "incidents": 6},
                        {"month": "Апр", "incidents": 4},
                        {"month": "Май", "incidents": 3},
                        {"month": "Июн", "incidents": 4},
                    ],
                    "assignmentDistribution": [
                        {"name": "Ала-Тоо", "value": 28},
                        {"name": "Кара-Суу", "value": 22},
                        {"name": "Ак-Жол", "value": 19},
                        {"name": "Токмок", "value": 17},
                        {"name": "Кемин", "value": 14},
                    ],
                },
                "outposts": [
                    {"name": "Ала-Тоо", "chief": "майор Осмонов А.", "phone": "+996700112233", "status": "Активна"},
                    {"name": "Кара-Суу", "chief": "капитан Ибраев Н.", "phone": "+996700445566", "status": "Активна"},
                    {"name": "Ак-Жол", "chief": "майор Касымов Б.", "phone": "+996700778899", "status": "Проверка"},
                    {"name": "Токмок", "chief": "капитан Садыков М.", "phone": "+996700332211", "status": "Активна"},
                ],
                "reports": [
                    {"date": "19.06.2026", "outpost": "Ала-Тоо", "topic": "Суточная сводка", "status": "Проверено"},
                    {"date": "19.06.2026", "outpost": "Кара-Суу", "topic": "Наряд на завтра", "status": "На проверке"},
                    {"date": "18.06.2026", "outpost": "Ак-Жол", "topic": "Инцидент на участке", "status": "Требует уточнения"},
                    {"date": "18.06.2026", "outpost": "Токмок", "topic": "Матобеспечение", "status": "Проверено"},
                    {"date": "17.06.2026", "outpost": "Кемин", "topic": "План патруля", "status": "Проверено"},
                ],
                "quickActions": [
                    {"id": "order", "label": "Создать приказ для застав"},
                    {"id": "summary", "label": "Просмотреть сводку по области"},
                    {"id": "notify", "label": "Отправить уведомление всем заставам"},
                ],
                "modules": build_modules_payload(request.user),
            }
        )


class OutpostDashboardView(APIView):
    permission_classes = [IsActiveUser]

    def get(self, request):
        if request.user.role != User.Role.OUTPOST:
            raise PermissionDenied("Доступ разрешен только заставе.")

        outpost_name = request.user.outpost_name or "Ала-Тоо"
        chief = request.user.full_name or "майор Осмонов А."

        return Response(
            {
                "outpost": outpost_name,
                "stats": [
                    {"id": "outpost", "label": "Застава", "value": f'"{outpost_name}"', "tone": "primary"},
                    {"id": "chief", "label": "Начальник заставы", "value": chief, "tone": "neutral"},
                    {"id": "staff", "label": "Личный состав", "value": 48, "tone": "neutral"},
                    {"id": "duty", "label": "Дежурный сегодня", "value": "ст. сержант Абдиев К.", "tone": "success"},
                    {"id": "assignments", "label": "Нарядов на сегодня", "value": 6, "tone": "warning"},
                    {"id": "safeDays", "label": "Дней без происшествий", "value": 23, "tone": "success"},
                ],
                "widgets": {
                    "todayDuty": {"title": "Сегодняшний наряд", "person": "лейтенант Токтосунов М.", "time": "08:00-20:00", "shift": "Смена А"},
                    "tasks": [
                        "Проверить канал связи с управлением",
                        "Подготовить отчет по маршруту 3",
                        "Обновить журнал вооружения",
                    ],
                    "orders": [
                        {"title": "Приказ о режиме усиления", "from": "Областное управление"},
                        {"title": "График учебных занятий", "from": "Штаб"},
                    ],
                    "incidents": [
                        {"date": "18.06.2026", "event": "Техническая проверка периметра"},
                        {"date": "16.06.2026", "event": "Выезд патрульной группы"},
                        {"date": "14.06.2026", "event": "Плановая проверка связи"},
                    ],
                },
                "charts": {
                    "rankDistribution": [
                        {"name": "Офицеры", "value": 8},
                        {"name": "Прапорщики", "value": 6},
                        {"name": "Сержанты", "value": 14},
                        {"name": "Рядовые", "value": 20},
                    ],
                    "weeklyActivity": [
                        {"day": "Пн", "events": 14},
                        {"day": "Вт", "events": 18},
                        {"day": "Ср", "events": 16},
                        {"day": "Чт", "events": 22},
                        {"day": "Пт", "events": 19},
                        {"day": "Сб", "events": 12},
                        {"day": "Вс", "events": 9},
                    ],
                },
                "duties": [
                    {"day": "Понедельник", "time": "08:00-20:00", "name": "Абдиев К.", "position": "дежурный"},
                    {"day": "Вторник", "time": "20:00-08:00", "name": "Токтосунов М.", "position": "начальник наряда"},
                    {"day": "Среда", "time": "08:00-20:00", "name": "Садыков Э.", "position": "патрульный"},
                    {"day": "Четверг", "time": "20:00-08:00", "name": "Маматов Р.", "position": "дежурный"},
                    {"day": "Пятница", "time": "08:00-20:00", "name": "Осмонов А.", "position": "начальник смены"},
                ],
                "journal": [
                    {"date": "19.06.2026", "event": "Смена заступила без замечаний", "owner": "Абдиев К."},
                    {"date": "18.06.2026", "event": "Проверка транспорта", "owner": "Маматов Р."},
                    {"date": "17.06.2026", "event": "Осмотр участка", "owner": "Садыков Э."},
                    {"date": "16.06.2026", "event": "Получен приказ управления", "owner": "Токтосунов М."},
                    {"date": "15.06.2026", "event": "Учебная тревога", "owner": "Осмонов А."},
                ],
                "quickActions": [
                    {"id": "report", "label": "Создать отчет"},
                    {"id": "journal", "label": "Добавить запись в журнал"},
                    {"id": "library", "label": "Сабактардын тематикасынын эсеби жана жүгүртмөсү"},
                ],
                "modules": build_modules_payload(request.user),
            }
        )


class MethodicalManualSubjectListCreateView(APIView):
    def get_permissions(self):
        if self.request.method == "GET":
            return [IsActiveUser()]
        return [IsAdminRole()]

    def get(self, request):
        collection = request.query_params.get(
            "collection",
            MethodicalManualSubject.Collection.METHODICAL_MANUALS,
        )
        subjects = methodical_manual_subject_queryset(collection)
        return Response(MethodicalManualSubjectSerializer(subjects, many=True).data)

    def post(self, request):
        serializer = MethodicalManualSubjectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        subject = serializer.save()
        return Response(
            MethodicalManualSubjectSerializer(subject).data,
            status=201,
        )


class MethodicalManualSubjectDetailView(APIView):
    permission_classes = [IsAdminRole]

    def get_object(self, pk):
        return get_object_or_404(MethodicalManualSubject, pk=pk)

    def patch(self, request, pk):
        subject = self.get_object(pk)
        serializer = MethodicalManualSubjectSerializer(
            subject,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        subject = serializer.save()
        return Response(MethodicalManualSubjectSerializer(subject).data)

    def delete(self, request, pk):
        subject = self.get_object(pk)
        subject.delete()
        return Response(status=204)


class MethodicalManualDocumentListCreateView(APIView):
    def get_permissions(self):
        if self.request.method == "GET":
            return [IsActiveUser()]
        return [IsAdminRole()]

    def get_subject(self, subject_pk):
        return get_object_or_404(MethodicalManualSubject, pk=subject_pk, is_active=True)

    def get(self, request, subject_pk):
        subject = self.get_subject(subject_pk)
        documents = MethodicalManualDocument.objects.filter(subject=subject)
        return Response(
            MethodicalManualDocumentSerializer(
                documents,
                many=True,
                context={"request": request},
            ).data
        )

    def post(self, request, subject_pk):
        subject = self.get_subject(subject_pk)
        serializer = MethodicalManualDocumentSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        document = serializer.save(subject=subject, uploaded_by=request.user)
        return Response(
            MethodicalManualDocumentSerializer(
                document,
                context={"request": request},
            ).data,
            status=201,
        )


class MethodicalManualDocumentDetailView(APIView):
    permission_classes = [IsAdminRole]

    def delete(self, request, subject_pk, pk):
        document = get_object_or_404(
            MethodicalManualDocument,
            pk=pk,
            subject_id=subject_pk,
        )
        stored_file = document.file
        document.delete()
        if stored_file:
            stored_file.delete(save=False)
        return Response(status=204)


NEWS_ALLOWED_EXTENSIONS = {
    ".doc", ".docx", ".pdf", ".txt", ".rtf",
    ".xls", ".xlsx", ".ppt", ".pptx",
    ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg",
    ".mp4", ".webm", ".mov", ".avi", ".mkv",
    ".mp3", ".wav", ".ogg", ".m4a",
    ".zip", ".rar", ".7z",
}
NEWS_MAX_FILE_SIZE = 100 * 1024 * 1024
NEWS_MAX_FILES = 10


def get_news_attachment_kind(uploaded_file):
    content_type = (getattr(uploaded_file, "content_type", "") or "").lower()
    extension = Path(uploaded_file.name).suffix.lower()
    if content_type.startswith("image/") or extension in {".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"}:
        return "image"
    if content_type.startswith("video/") or extension in {".mp4", ".webm", ".mov", ".avi", ".mkv"}:
        return "video"
    if content_type.startswith("audio/") or extension in {".mp3", ".wav", ".ogg", ".m4a"}:
        return "audio"
    if extension == ".pdf":
        return "pdf"
    return "file"


def validate_news_files(files):
    if len(files) > NEWS_MAX_FILES:
        raise ValidationError({"files": f"Можно прикрепить не более {NEWS_MAX_FILES} файлов."})
    for uploaded_file in files:
        extension = Path(uploaded_file.name).suffix.lower()
        if extension not in NEWS_ALLOWED_EXTENSIONS:
            raise ValidationError({"files": f"Формат файла {uploaded_file.name} не поддерживается."})
        if uploaded_file.size > NEWS_MAX_FILE_SIZE:
            raise ValidationError({"files": f"Файл {uploaded_file.name} превышает 100 МБ."})


def create_news_attachments(news, files):
    for uploaded_file in files:
        CombatTrainingNewsAttachment.objects.create(
            news=news,
            file=uploaded_file,
            original_name=uploaded_file.name[:255],
            kind=get_news_attachment_kind(uploaded_file),
            size=uploaded_file.size,
        )


class CombatTrainingNewsListCreateView(APIView):
    def get_permissions(self):
        if self.request.method == "GET":
            return [IsActiveUser()]
        return [IsAdminRole()]

    def get(self, request):
        news_items = CombatTrainingNews.objects.select_related("author").prefetch_related(
            "attachments", "likes"
        )
        serializer = CombatTrainingNewsSerializer(
            news_items,
            many=True,
            context={"request": request},
        )
        return Response({"results": serializer.data})

    def post(self, request):
        title = str(request.data.get("title", "")).strip()
        body = str(request.data.get("body", "")).strip()
        files = request.FILES.getlist("files")
        if not title:
            raise ValidationError({"title": "Укажите заголовок публикации."})
        if not body and not files:
            raise ValidationError({"body": "Добавьте текст или хотя бы один файл."})
        validate_news_files(files)

        with transaction.atomic():
            news = CombatTrainingNews.objects.create(
                title=title,
                body=body,
                author=request.user,
            )
            create_news_attachments(news, files)

        return Response(
            CombatTrainingNewsSerializer(news, context={"request": request}).data,
            status=201,
        )


class CombatTrainingNewsDetailView(APIView):
    permission_classes = [IsAdminRole]

    def get_object(self, pk):
        return get_object_or_404(CombatTrainingNews, pk=pk)

    def patch(self, request, pk):
        news = self.get_object(pk)
        files = request.FILES.getlist("files")
        validate_news_files(files)
        title = str(request.data.get("title", news.title)).strip()
        body = str(request.data.get("body", news.body)).strip()
        if not title:
            raise ValidationError({"title": "Укажите заголовок публикации."})

        raw_remove_ids = request.data.get("removeAttachmentIds", "[]")
        try:
            remove_ids = json.loads(raw_remove_ids) if isinstance(raw_remove_ids, str) else raw_remove_ids
            remove_ids = [int(item) for item in (remove_ids or [])]
        except (TypeError, ValueError, json.JSONDecodeError) as error:
            raise ValidationError({"removeAttachmentIds": "Некорректный список файлов."}) from error

        remaining_attachments = news.attachments.exclude(id__in=remove_ids).exists()
        if not body and not files and not remaining_attachments:
            raise ValidationError({"body": "Добавьте текст или хотя бы один файл."})

        news.title = title
        news.body = body
        news.save(update_fields=["title", "body", "updated_at"])

        removed_attachments = list(news.attachments.filter(id__in=remove_ids))
        for attachment in removed_attachments:
            stored_file = attachment.file
            attachment.delete()
            if stored_file:
                stored_file.delete(save=False)
        create_news_attachments(news, files)

        return Response(
            CombatTrainingNewsSerializer(news, context={"request": request}).data
        )

    def delete(self, request, pk):
        news = self.get_object(pk)
        stored_files = [attachment.file for attachment in news.attachments.all()]
        news.delete()
        for stored_file in stored_files:
            if stored_file:
                stored_file.delete(save=False)
        return Response(status=204)


class CombatTrainingNewsLikeView(APIView):
    permission_classes = [IsActiveUser]

    def post(self, request, pk):
        news = get_object_or_404(CombatTrainingNews, pk=pk)
        like, created = CombatTrainingNewsLike.objects.get_or_create(
            news=news,
            user=request.user,
        )
        if not created:
            like.delete()
        return Response({
            "isLiked": created,
            "likeCount": news.likes.count(),
        })


class CombatTrainingNewsUnreadCountView(APIView):
    permission_classes = [IsActiveUser]

    def get(self, request):
        unread_count = CombatTrainingNews.objects.filter(
            created_at__gte=request.user.date_joined,
        ).exclude(reads__user=request.user).count()
        return Response({"unreadCount": unread_count})


class CombatTrainingNewsReadAllView(APIView):
    permission_classes = [IsActiveUser]

    def post(self, request):
        unread_ids = CombatTrainingNews.objects.filter(
            created_at__gte=request.user.date_joined,
        ).exclude(reads__user=request.user).values_list("id", flat=True)
        CombatTrainingNewsRead.objects.bulk_create(
            [
                CombatTrainingNewsRead(news_id=news_id, user=request.user)
                for news_id in unread_ids
            ],
            ignore_conflicts=True,
        )
        return Response({"unreadCount": 0})


class CombatTrainingJournalListCreateView(APIView):
    permission_classes = [IsActiveUser]

    def get_queryset(self, request):
        queryset = CombatTrainingJournal.objects.all().order_by("-created_at", "-id")
        scope = request.query_params.get("scope")
        if scope:
            if request.user.role == User.Role.ADMIN:
                queryset = (
                    queryset.filter(scope__endswith=":command-training")
                    if scope.endswith(":command-training")
                    else queryset.exclude(scope__endswith=":command-training")
                )
            else:
                global_scope = (
                    "всей системы:command-training"
                    if scope.endswith(":command-training")
                    else "всей системы"
                )
                queryset = queryset.filter(Q(scope=scope) | Q(scope=global_scope))
        return queryset

    def get(self, request):
        serializer = CombatTrainingJournalSerializer(
            self.get_queryset(request),
            many=True,
        )
        return Response(serializer.data)

    def post(self, request):
        serializer = CombatTrainingJournalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = dict(serializer.validated_data)
        storage_id = payload.pop("storage_id")
        journal, created = CombatTrainingJournal.objects.update_or_create(
            storage_id=storage_id,
            defaults={
                **payload,
                "owner": request.user,
            },
        )
        return Response(
            CombatTrainingJournalSerializer(journal).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class CombatTrainingJournalSubjectListCreateView(APIView):
    permission_classes = [IsActiveUser]

    def get(self, request):
        subjects = CombatTrainingJournalSubject.objects.filter(is_active=True)
        if request.user.role == User.Role.ADMIN:
            unit_number = str(request.query_params.get("unitNumber") or "").strip()
            if unit_number:
                subjects = subjects.filter(unit_number=unit_number)
        else:
            if not request.user.region:
                return Response([])
            subjects = subjects.filter(unit_number=request.user.region)
        return Response(CombatTrainingJournalSubjectSerializer(subjects, many=True).data)

    def post(self, request):
        if request.user.role != User.Role.ADMIN:
            raise PermissionDenied("Добавлять предметы может только администратор.")
        serializer = CombatTrainingJournalSubjectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        subject = serializer.save()
        return Response(
            CombatTrainingJournalSubjectSerializer(subject).data,
            status=status.HTTP_201_CREATED,
        )


class CombatTrainingJournalSubjectDetailView(APIView):
    permission_classes = [IsAdminRole]

    def get_object(self, pk):
        return get_object_or_404(CombatTrainingJournalSubject, pk=pk)

    def patch(self, request, pk):
        subject = self.get_object(pk)
        serializer = CombatTrainingJournalSubjectSerializer(
            subject,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        subject = serializer.save()
        return Response(CombatTrainingJournalSubjectSerializer(subject).data)

    def delete(self, request, pk):
        self.get_object(pk).delete()
        return Response(status=204)


class CombatTrainingJournalOutpostListView(APIView):
    permission_classes = [IsActiveUser]

    def get(self, request):
        if request.user.role not in {User.Role.REGIONAL, User.Role.ADMIN}:
            raise PermissionDenied("Нет доступа к списку застав.")

        outposts = User.objects.filter(
            role=User.Role.OUTPOST,
            status=User.Status.ACTIVE,
        ).exclude(outpost_name="")
        if request.user.role == User.Role.REGIONAL:
            outposts = outposts.filter(region=request.user.region)

        result = []
        seen = set()
        for outpost in outposts.order_by("region", "outpost_name", "id"):
            key = (outpost.region, format_outpost_name(outpost.outpost_name))
            if key in seen:
                continue
            seen.add(key)
            result.append({
                "id": outpost.id,
                "name": key[1],
                "unitNumber": outpost.region,
            })
        return Response(result)


class CombatTrainingJournalDetailView(APIView):
    permission_classes = [IsActiveUser]

    def get_object(self, pk):
        return get_object_or_404(CombatTrainingJournal, pk=pk)

    def patch(self, request, pk):
        journal = self.get_object(pk)
        if request.user.role != User.Role.ADMIN and journal.owner_id != request.user.id:
            raise PermissionDenied("Можно изменить только свой журнал.")
        serializer = CombatTrainingJournalSerializer(
            journal,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        journal = serializer.save()
        return Response(CombatTrainingJournalSerializer(journal).data)

    def delete(self, request, pk):
        journal = self.get_object(pk)
        if request.user.role != User.Role.ADMIN and journal.owner_id != request.user.id:
            raise PermissionDenied("Можно удалить только свой журнал.")
        journal.delete()
        return Response(status=204)


def combat_training_plan_payload(plan):
    return {
        **(plan.data or {}),
        "id": plan.id,
        "title": plan.title,
        "layout": plan.layout,
        "createdAt": plan.created_at.isoformat(),
        "updatedAt": plan.updated_at.isoformat(),
        "publishedAt": plan.published_at.isoformat() if plan.published_at else None,
    }


class CombatTrainingPlanListCreateView(APIView):
    permission_classes = [IsActiveUser]

    def get(self, request):
        layout = str(request.query_params.get("layout") or "plan").strip()
        plans = CombatTrainingPlan.objects.filter(layout=layout)
        return Response([combat_training_plan_payload(plan) for plan in plans])

    def post(self, request):
        if request.user.role != User.Role.ADMIN:
            raise PermissionDenied("Планды администратор гана түзө алат.")

        title = str(request.data.get("title") or "").strip()
        layout = str(request.data.get("layout") or "plan").strip()
        if not title:
            raise ValidationError({"title": "Разделдин аталышын жазыңыз."})
        if layout not in {"plan", "draft"}:
            raise ValidationError({"layout": "Таблицанын түрү туура эмес."})

        data = dict(request.data.get("data") or {})
        plan = CombatTrainingPlan.objects.create(
            title=title,
            layout=layout,
            data=data,
            created_by=request.user,
        )
        return Response(combat_training_plan_payload(plan), status=201)


class CombatTrainingPlanDetailView(APIView):
    permission_classes = [IsActiveUser]

    def get_object(self, pk):
        return get_object_or_404(CombatTrainingPlan, pk=pk)

    def patch(self, request, pk):
        if request.user.role != User.Role.ADMIN:
            raise PermissionDenied("Планды администратор гана өзгөртө алат.")

        plan = self.get_object(pk)
        if "title" in request.data:
            title = str(request.data.get("title") or "").strip()
            if not title:
                raise ValidationError({"title": "Разделдин аталышын жазыңыз."})
            plan.title = title
        if "data" in request.data:
            data = request.data.get("data")
            if not isinstance(data, dict):
                raise ValidationError({"data": "Таблицанын маалыматы туура эмес."})
            previous_sent_at = str((plan.data or {}).get("sentAt") or "")
            next_sent_at = str(data.get("sentAt") or "")
            if next_sent_at and next_sent_at != previous_sent_at:
                plan.published_at = timezone.now()
            plan.data = data
        plan.save()
        return Response(combat_training_plan_payload(plan))

    def delete(self, request, pk):
        if request.user.role != User.Role.ADMIN:
            raise PermissionDenied("Планды администратор гана өчүрө алат.")
        self.get_object(pk).delete()
        return Response(status=204)


class CombatTrainingPlanUnreadCountView(APIView):
    permission_classes = [IsActiveUser]

    def get(self, request):
        if request.user.role == User.Role.ADMIN:
            return Response({"unreadCount": 0})

        try:
            read_at = request.user.combat_training_plan_read.read_at
        except CombatTrainingPlanRead.DoesNotExist:
            read_at = request.user.date_joined

        unread_count = CombatTrainingPlan.objects.filter(
            published_at__gt=read_at,
        ).count()
        return Response({"unreadCount": unread_count})


class CombatTrainingPlanReadAllView(APIView):
    permission_classes = [IsActiveUser]

    def post(self, request):
        if request.user.role != User.Role.ADMIN:
            CombatTrainingPlanRead.objects.update_or_create(user=request.user)
        return Response({"unreadCount": 0})


def thematic_submission_payload(submission, viewing_user=None):
    try:
        edit_request = submission.edit_request
    except SubmissionEditRequest.DoesNotExist:
        edit_request = None
    payload = {
        "id": submission.id,
        "senderId": submission.sender_id,
        "senderRole": submission.sender.role,
        "documentTitle": submission.document_title,
        "unitNumber": submission.unit_number,
        "outpostName": submission.outpost_name,
        "senderName": submission.sender.full_name,
        "sectionId": submission.section_slug,
        "periodId": submission.period_slug,
        "table": submission.table_data,
        "createdAt": submission.created_at.isoformat(),
        "updatedAt": submission.updated_at.isoformat(),
        "isRead": bool(
            viewing_user
            and any(read.user_id == viewing_user.id for read in submission.reads.all())
        ),
        "editRequestStatus": edit_request.status if edit_request else None,
        "canEdit": bool(edit_request and edit_request.status == SubmissionEditRequest.Status.APPROVED),
    }
    if submission.section_slug in {
        "combat-training-personnel-journal",
        "combat-training-command-journal",
        "meetings-combat-training-journal",
        "young-soldier-combat-training-journal",
    }:
        payload["revisions"] = [
            {
                "id": revision.id,
                "documentTitle": revision.document_title,
                "table": revision.table_data,
                "createdAt": revision.created_at.isoformat(),
                "isRead": bool(
                    viewing_user
                    and any(read.user_id == viewing_user.id for read in revision.reads.all())
                ),
            }
            for revision in submission.revisions.all()
            if not (
                viewing_user
                and any(
                    hidden.user_id == viewing_user.id
                    for hidden in revision.hidden_by.all()
                )
            )
        ]
    return payload


def submission_edit_request_payload(item):
    return {
        "id": item.id,
        "status": item.status,
        "createdAt": item.created_at.isoformat(),
        "updatedAt": item.updated_at.isoformat(),
        "requesterId": item.requester_id,
        "requesterName": item.requester.full_name or item.requester.email,
        "requesterRole": item.requester.role,
        "submission": thematic_submission_payload(item.submission),
    }


class ThematicAccountSubmissionListCreateView(APIView):
    permission_classes = [IsActiveUser]

    def get(self, request):
        submissions = ThematicAccountSubmission.objects.select_related("sender").prefetch_related(
            "reads",
            "revisions__reads",
            "revisions__hidden_by",
        )
        if request.user.role == User.Role.OUTPOST:
            submissions = submissions.filter(sender=request.user)
        elif request.user.role == User.Role.REGIONAL:
            submissions = submissions.filter(unit_number=request.user.region)
        elif request.user.role != User.Role.ADMIN:
            raise PermissionDenied("Нет доступа к отправленным документам.")

        return Response([
            thematic_submission_payload(item, request.user)
            for item in submissions
        ])

    def post(self, request):
        document_title = str(request.data.get("documentTitle") or "").strip()
        section_slug = str(request.data.get("sectionId") or "").strip()
        period_slug = str(request.data.get("periodId") or "").strip()
        table_data = request.data.get("table")

        can_submit = request.user.role in {User.Role.OUTPOST, User.Role.REGIONAL}
        if not can_submit:
            raise PermissionDenied("Бул документти жөнөтүүгө укук жок.")

        errors = {}
        if not document_title:
            errors["documentTitle"] = "Иш кагаздардын аталышын жазыңыз."
        if section_slug not in {
            "thematic-account",
            "lesson-schedule",
            "command-thematic-account",
            "command-lesson-schedule",
            "typical-week",
            "combat-training-personnel-journal",
            "combat-training-command-journal",
            "combat-training-results-observation",
            "combat-training-results-inspection",
            "combat-training-analysis",
            "combat-training-analysis-regional",
            "meetings-thematic-account",
            "meetings-lesson-schedule",
            "meetings-combat-training-journal",
            "meetings-observation",
            "meetings-analysis",
            "young-soldier-thematic-account",
            "young-soldier-lesson-schedule",
            "young-soldier-combat-training-journal",
            "young-soldier-observation",
            "young-soldier-analysis",
        }:
            errors["sectionId"] = "Отправляемый раздел указан неверно."
        if not request.user.region:
            errors["unitNumber"] = "Аскер бөлүгүнүн номери көрсөтүлгөн эмес."
        if not isinstance(table_data, dict):
            errors["table"] = "Таблицанын маалыматы туура эмес."
        if errors:
            raise ValidationError(errors)

        submission_defaults = {
            "unit_number": request.user.region,
            "outpost_name": request.user.outpost_name,
            "document_title": document_title,
            "table_data": table_data,
        }
        if section_slug == "combat-training-results-observation":
            subject_id = str(table_data.get("subjectId") or "").strip()
            if not subject_id:
                raise ValidationError({"table": "Предмет көрсөтүлгөн эмес."})

            submission = ThematicAccountSubmission.objects.filter(
                sender=request.user,
                section_slug=section_slug,
                document_title=document_title,
            ).first()
            created = submission is None
            grouped_table_data = dict(submission.table_data or {}) if submission else {}
            grouped_subjects = dict(grouped_table_data.get("subjects") or {})
            grouped_subjects[subject_id] = table_data
            grouped_table_data["subjects"] = grouped_subjects
            submission_defaults["table_data"] = grouped_table_data

            if submission:
                for field, value in submission_defaults.items():
                    setattr(submission, field, value)
                submission.save(update_fields=[*submission_defaults.keys(), "updated_at"])
            else:
                submission = ThematicAccountSubmission.objects.create(
                    sender=request.user,
                    section_slug=section_slug,
                    period_slug="",
                    **submission_defaults,
                )
        elif section_slug in {
            "combat-training-personnel-journal",
            "combat-training-command-journal",
            "meetings-combat-training-journal",
            "young-soldier-combat-training-journal",
        }:
            submission = ThematicAccountSubmission.objects.filter(
                sender=request.user,
                section_slug=section_slug,
                period_slug=period_slug,
            ).first()
            created = submission is None
            if submission:
                for field, value in submission_defaults.items():
                    setattr(submission, field, value)
                submission.save(update_fields=[*submission_defaults.keys(), "updated_at"])
            else:
                submission = ThematicAccountSubmission.objects.create(
                    sender=request.user,
                    section_slug=section_slug,
                    period_slug=period_slug,
                    **submission_defaults,
                )
        else:
            submission = ThematicAccountSubmission.objects.create(
                sender=request.user,
                section_slug=section_slug,
                period_slug=period_slug,
                **submission_defaults,
            )
            created = True
        if section_slug in {
            "combat-training-personnel-journal",
            "combat-training-command-journal",
            "meetings-combat-training-journal",
            "young-soldier-combat-training-journal",
        }:
            CombatTrainingJournalRevision.objects.create(
                submission=submission,
                document_title=document_title,
                table_data=copy.deepcopy(table_data),
            )
        return Response(
            thematic_submission_payload(submission, request.user),
            status=201 if created else 200,
        )


class ThematicAccountSubmissionDetailView(APIView):
    permission_classes = [IsActiveUser]

    def patch(self, request, pk):
        submission = get_object_or_404(
            ThematicAccountSubmission.objects.select_related("sender").prefetch_related("reads"),
            pk=pk,
        )
        is_matching_regional_unit = (
            request.user.role == User.Role.REGIONAL
            and submission.sender.role == User.Role.OUTPOST
            and submission.unit_number == request.user.region
        )
        is_admin_recipient = (
            request.user.role == User.Role.ADMIN
            and submission.sender.role == User.Role.REGIONAL
        )
        if not (is_matching_regional_unit or is_admin_recipient):
            raise PermissionDenied("Нет права отмечать этот документ прочитанным.")

        ThematicAccountSubmissionRead.objects.get_or_create(
            submission=submission,
            user=request.user,
        )
        submission._prefetched_objects_cache.pop("reads", None)
        return Response(thematic_submission_payload(submission, request.user))

    def delete(self, request, pk):
        submission = get_object_or_404(
            ThematicAccountSubmission.objects.select_related("sender"),
            pk=pk,
        )
        is_sender = (
            request.user.role in {User.Role.OUTPOST, User.Role.REGIONAL}
            and submission.sender_id == request.user.id
        )
        is_matching_regional_unit = (
            request.user.role == User.Role.REGIONAL
            and submission.sender.role == User.Role.OUTPOST
            and submission.unit_number == request.user.region
        )
        is_admin = request.user.role == User.Role.ADMIN
        if not (is_sender or is_matching_regional_unit or is_admin):
            raise PermissionDenied("Нет права удалять этот отправленный документ.")

        subject_id = str(request.query_params.get("subjectId") or "").strip()
        if subject_id and submission.section_slug == "combat-training-results-observation":
            table_data = dict(submission.table_data or {})
            subjects = dict(table_data.get("subjects") or {})
            subjects.pop(subject_id, None)
            if subjects:
                table_data["subjects"] = subjects
                submission.table_data = table_data
                submission.save(update_fields=["table_data"])
                return Response(thematic_submission_payload(submission))

        submission.delete()
        return Response(status=204)


class CombatTrainingJournalRevisionDetailView(APIView):
    permission_classes = [IsActiveUser]

    def patch(self, request, pk):
        revision = get_object_or_404(
            CombatTrainingJournalRevision.objects.select_related("submission__sender"),
            pk=pk,
        )
        submission = revision.submission
        is_matching_regional_unit = (
            request.user.role == User.Role.REGIONAL
            and submission.sender.role == User.Role.OUTPOST
            and submission.unit_number == request.user.region
        )
        if not is_matching_regional_unit:
            raise PermissionDenied("Нет права отмечать это обновление прочитанным.")

        CombatTrainingJournalRevisionRead.objects.get_or_create(
            revision=revision,
            user=request.user,
        )
        return Response({"id": revision.id, "isRead": True})

    def delete(self, request, pk):
        revision = get_object_or_404(
            CombatTrainingJournalRevision.objects.select_related("submission__sender"),
            pk=pk,
        )
        submission = revision.submission
        is_sender = submission.sender_id == request.user.id
        is_matching_regional_unit = (
            request.user.role == User.Role.REGIONAL
            and submission.sender.role == User.Role.OUTPOST
            and submission.unit_number == request.user.region
        )
        is_admin = request.user.role == User.Role.ADMIN
        if not (is_sender or is_matching_regional_unit or is_admin):
            raise PermissionDenied("Нет права удалять это обновление журнала.")

        CombatTrainingJournalRevisionHidden.objects.get_or_create(
            revision=revision,
            user=request.user,
        )
        return Response(status=204)


class ThematicAccountSubmissionForwardView(APIView):
    permission_classes = [IsActiveUser]

    def post(self, request, pk):
        if request.user.role != User.Role.REGIONAL:
            raise PermissionDenied("Документти аскер бөлүгү гана жөнөтө алат.")

        source = get_object_or_404(
            ThematicAccountSubmission.objects.select_related("sender"),
            pk=pk,
        )
        if source.sender.role != User.Role.OUTPOST or source.unit_number != request.user.region:
            raise PermissionDenied("Бул кириш документти жөнөтүүгө укук жок.")

        document_title = str(request.data.get("documentTitle") or "").strip()
        if not document_title:
            raise ValidationError({"documentTitle": "Иш кагаздардын аталышын жазыңыз."})

        forwarded = ThematicAccountSubmission.objects.create(
            sender=request.user,
            unit_number=request.user.region,
            outpost_name="",
            document_title=document_title,
            section_slug=source.section_slug,
            period_slug=source.period_slug,
            table_data=copy.deepcopy(source.table_data),
        )
        if source.section_slug in {
            "combat-training-personnel-journal",
            "combat-training-command-journal",
        }:
            CombatTrainingJournalRevision.objects.bulk_create([
                CombatTrainingJournalRevision(
                    submission=forwarded,
                    document_title=revision.document_title,
                    table_data=copy.deepcopy(revision.table_data),
                )
                for revision in source.revisions.all()
            ])

        return Response(
            thematic_submission_payload(forwarded, request.user),
            status=status.HTTP_201_CREATED,
        )


class SubmissionEditRequestCreateView(APIView):
    permission_classes = [IsActiveUser]

    def post(self, request, pk):
        submission = get_object_or_404(ThematicAccountSubmission, pk=pk)
        if request.user.role not in {User.Role.OUTPOST, User.Role.REGIONAL} or submission.sender_id != request.user.id:
            raise PermissionDenied("Өзүңүз жөнөткөн документке гана уруксат сурай аласыз.")

        edit_request, _ = SubmissionEditRequest.objects.get_or_create(
            submission=submission,
            defaults={"requester": request.user},
        )
        edit_request.requester = request.user
        edit_request.status = SubmissionEditRequest.Status.PENDING
        edit_request.reviewed_at = None
        edit_request.reviewed_by = None
        edit_request.save()
        return Response(submission_edit_request_payload(edit_request), status=status.HTTP_201_CREATED)


class SubmissionEditRequestListView(APIView):
    permission_classes = [IsActiveUser, IsAdminRole]

    def get(self, request):
        items = SubmissionEditRequest.objects.select_related("requester", "submission", "submission__sender")
        return Response([submission_edit_request_payload(item) for item in items])


class SubmissionEditRequestDecisionView(APIView):
    permission_classes = [IsActiveUser, IsAdminRole]

    def patch(self, request, pk):
        item = get_object_or_404(
            SubmissionEditRequest.objects.select_related("requester", "submission", "submission__sender"),
            pk=pk,
        )
        decision = str(request.data.get("status") or "").strip()
        if decision not in {SubmissionEditRequest.Status.APPROVED, SubmissionEditRequest.Status.REJECTED}:
            raise ValidationError({"status": "Разрешить же Отклонить маанисин тандаңыз."})
        item.status = decision
        item.reviewed_by = request.user
        item.reviewed_at = timezone.now()
        item.save(update_fields=["status", "reviewed_by", "reviewed_at", "updated_at"])
        return Response(submission_edit_request_payload(item))


class LessonSchedulePeriodListCreateView(APIView):
    permission_classes = [IsActiveUser]

    def post(self, request):
        section_slug = request.data.get("section") or request.data.get("sectionId")

        if section_slug not in LESSON_SCHEDULE_SECTION_SLUGS:
            return Response(
                {"section": "Укажите раздел Сабактардын жүгүртмөсү."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        title = str(request.data.get("title") or "").strip()
        if not title:
            week_number = str(request.data.get("weekNumber") or "1").strip() or "1"
            title = build_lesson_schedule_period_title(week_number)

        section = get_object_or_404(
            TrainingSection,
            slug=section_slug,
            is_active=True,
        )
        template_period = (
            TrainingPeriod.objects.filter(section=section, is_active=True)
            .select_related("table")
            .order_by("order", "title")
            .first()
        )

        template_table = None
        if template_period:
            try:
                template_table = template_period.table
            except TrainingTable.DoesNotExist:
                template_table = None

        if not template_table:
            template_table = (
                TrainingTable.objects.filter(
                    variant=TrainingTable.Variant.LESSON_SCHEDULE,
                    is_active=True,
                )
                .order_by("period__section__slug", "period__order", "title")
                .first()
            )

        with transaction.atomic():
            max_order = (
                TrainingPeriod.objects.filter(section=section).aggregate(max_order=Max("order"))["max_order"]
                or 0
            )
            next_order = max_order + 10
            week_number = str(request.data.get("weekNumber") or next_order // 10).strip() or "1"
            base_slug = f"lesson-schedule-week-{week_number}"
            slug = base_slug
            suffix = 2

            while TrainingPeriod.objects.filter(section=section, slug=slug).exists():
                slug = f"{base_slug}-{suffix}"
                suffix += 1

            period = TrainingPeriod.objects.create(
                section=section,
                created_by=request.user,
                slug=slug,
                title=title,
                order=next_order,
                is_active=True,
            )
            table = TrainingTable.objects.create(
                period=period,
                title=title,
                variant=template_table.variant if template_table else TrainingTable.Variant.LESSON_SCHEDULE,
                columns=copy.deepcopy(template_table.columns) if template_table else [],
                rows=copy.deepcopy(template_table.rows) if template_table else [],
                header_fields=copy.deepcopy(template_table.header_fields) if template_table else [],
                header_rows=copy.deepcopy(template_table.header_rows) if template_table else [],
                is_active=True,
            )

        return Response(
            {
                "id": period.slug,
                "title": period.title,
                "table": table.to_payload(),
                "canDelete": True,
            },
            status=status.HTTP_201_CREATED,
        )


class LessonSchedulePeriodDetailView(APIView):
    permission_classes = [IsActiveUser]

    def delete(self, request, section_slug, period_slug):
        if section_slug not in LESSON_SCHEDULE_SECTION_SLUGS:
            raise ValidationError({"section": "Укажите раздел Сабактардын жүгүртмөсү."})

        period = get_object_or_404(
            TrainingPeriod,
            section__slug=section_slug,
            slug=period_slug,
        )
        is_legacy_custom_period = (
            period.created_by_id is None
            and period.slug != "lesson-schedule-week-1"
        )
        can_delete = (
            request.user.role == User.Role.ADMIN
            or period.created_by_id == request.user.id
            or (request.user.role == User.Role.OUTPOST and is_legacy_custom_period)
        )
        if not can_delete:
            raise PermissionDenied("Можно удалить только добавленную вами неделю.")

        period.delete()
        return Response(status=204)


def library_period_payload(period):
    payload = {
        "id": period.slug,
        "title": period.title,
        "canEdit": True,
        "canDelete": True,
    }
    try:
        table = period.table
    except TrainingTable.DoesNotExist:
        table = None
    if table and table.is_active:
        payload["table"] = table.to_payload()
    return payload


class LibraryPeriodListCreateView(APIView):
    permission_classes = [IsActiveUser]

    def post(self, request):
        section_slug = str(request.data.get("section") or request.data.get("sectionId") or "").strip()
        title = str(request.data.get("title") or "").strip()
        if not title:
            raise ValidationError({"title": "Укажите название документа."})

        section = get_object_or_404(TrainingSection, slug=section_slug, is_active=True)
        if (
            request.user.role != User.Role.ADMIN
            and section.slug not in THEMATIC_ACCOUNT_SECTION_SLUGS
        ):
            raise PermissionDenied("Нет права создавать документы в этом разделе.")
        template_period = (
            TrainingPeriod.objects.filter(section=section, is_active=True)
            .select_related("table")
            .order_by("order", "title")
            .first()
        )
        requested_table = request.data.get("table")

        with transaction.atomic():
            max_order = (
                TrainingPeriod.objects.filter(section=section).aggregate(max_order=Max("order"))["max_order"]
                or 0
            )
            base_slug = f"user-document-{request.user.id}"
            suffix = TrainingPeriod.objects.filter(section=section).count() + 1
            slug = f"{base_slug}-{suffix}"
            while TrainingPeriod.objects.filter(section=section, slug=slug).exists():
                suffix += 1
                slug = f"{base_slug}-{suffix}"

            period = TrainingPeriod.objects.create(
                section=section,
                created_by=request.user,
                slug=slug,
                title=title,
                order=max_order + 10,
                is_active=True,
            )

            template_table = None
            if template_period:
                try:
                    template_table = template_period.table
                except TrainingTable.DoesNotExist:
                    template_table = None

            if template_table is None and section.slug in LESSON_SCHEDULE_SECTION_SLUGS:
                template_table = (
                    TrainingTable.objects.filter(
                        variant=TrainingTable.Variant.LESSON_SCHEDULE,
                        is_active=True,
                    )
                    .order_by("period__section__slug", "period__order")
                    .first()
                )
            elif template_table is None and section.slug in THEMATIC_ACCOUNT_SECTION_SLUGS:
                template_table = (
                    TrainingTable.objects.filter(
                        period__section__slug__in=THEMATIC_ACCOUNT_SECTION_SLUGS,
                        is_active=True,
                    )
                    .order_by("period__section__slug", "period__order")
                    .first()
                )

            table_data = requested_table if isinstance(requested_table, dict) else {}
            if template_table or table_data:
                TrainingTable.objects.create(
                    period=period,
                    title=title,
                    variant=table_data.get("variant", template_table.variant if template_table else ""),
                    columns=copy.deepcopy(table_data.get("columns", template_table.columns if template_table else [])),
                    rows=copy.deepcopy(table_data.get("rows", template_table.rows if template_table else [])),
                    header_fields=copy.deepcopy(
                        table_data.get("headerFields", template_table.header_fields if template_table else [])
                    ),
                    header_rows=copy.deepcopy(
                        table_data.get("headerRows", template_table.header_rows if template_table else [])
                    ),
                    is_active=True,
                )

        return Response(library_period_payload(period), status=status.HTTP_201_CREATED)


class LibraryPeriodDetailView(APIView):
    permission_classes = [IsActiveUser]

    def get_object(self, section_slug, period_slug):
        period = get_object_or_404(
            TrainingPeriod,
            section__slug=section_slug,
            slug=period_slug,
        )
        if (
            self.request.user.role != User.Role.ADMIN
            and period.created_by_id != self.request.user.id
        ):
            raise PermissionDenied("Можно изменять только созданные вами документы.")
        return period

    def patch(self, request, section_slug, period_slug):
        period = self.get_object(section_slug, period_slug)
        title = str(request.data.get("title") or "").strip()
        if not title:
            raise ValidationError({"title": "Укажите название документа."})

        with transaction.atomic():
            period.title = title
            period.save(update_fields=("title",))
            TrainingTable.objects.filter(period=period).update(title=title)
        period.refresh_from_db()
        return Response(library_period_payload(period))

    def delete(self, request, section_slug, period_slug):
        period = self.get_object(section_slug, period_slug)
        period.delete()
        return Response(status=204)
