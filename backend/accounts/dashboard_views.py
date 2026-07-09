import copy
import re

from django.contrib.auth import get_user_model
from django.db import OperationalError, ProgrammingError, transaction
from django.db.models import Max
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    CombatTrainingJournal,
    MethodicalManualSubject,
    TrainingPeriod,
    TrainingSection,
    TrainingTable,
)
from .permissions import IsActiveUser, IsAdminRole
from .serializers import CombatTrainingJournalSerializer, MethodicalManualSubjectSerializer

User = get_user_model()


ROLE_LABELS = {
    User.Role.ADMIN: "Админ",
    User.Role.REGIONAL: "Областное управление",
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
REMOVED_THEMATIC_PERIOD_SLUGS = {"period-3", "period-4"}
REMOVED_THEMATIC_PERIOD_TITLE_PARTS = (
    "2026-окуу жылынын 3 мезгилине",
    "2026-окуу жылынын 4 мезгилине",
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
    return period.slug in REMOVED_THEMATIC_PERIOD_SLUGS or any(
        title_part in period.title
        for title_part in REMOVED_THEMATIC_PERIOD_TITLE_PARTS
    )


def build_library_sections_from_db():
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
        periods = list(
            TrainingPeriod.objects.filter(is_active=True, section_id__in=section_ids)
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
        payload = {"id": section.slug, "title": section.title}
        is_thematic_account = section.slug in THEMATIC_ACCOUNT_SECTION_SLUGS
        is_command_thematic_account = section.slug == COMMAND_THEMATIC_ACCOUNT_SECTION_SLUG

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


def methodical_manual_subjects_payload():
    try:
        subjects = MethodicalManualSubject.objects.filter(is_active=True).order_by(
            "order", "title"
        )
        return MethodicalManualSubjectSerializer(subjects, many=True).data
    except (OperationalError, ProgrammingError):
        return []


def build_modules_payload(user):
    scope = "всей системы"
    if user.role == User.Role.REGIONAL:
        scope = user.region or "области"
    if user.role == User.Role.OUTPOST:
        scope = user.outpost_name or "заставы"

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

    library_sections = build_library_sections_from_db()
    if not library_sections:
        library_sections = [
            {
                "id": "personnel-training",
                "title": "Өздүк курамдын даярдыгы",
                "sections": [
                    {
                        "id": "thematic-account",
                        "title": "Тематикалык эсеп",
                        "periods": [
                            {
                                "id": "period-1",
                                "title": "20__-окуу жылынын 1 мезгилине",
                                "table": build_training_table(1),
                            },
                            {
                                "id": "period-2",
                                "title": "20__-окуу жылынын 2 мезгилине",
                                "table": build_training_table(2),
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
                "title": "Командирдик даярдык",
                "sections": [
                    {
                        "id": "command-thematic-account",
                        "title": "Тематикалык эсеп",
                        "periods": [
                            {
                                "id": "period-1",
                                "title": "20__-окуу жылынын 1 мезгилине",
                                "table": build_training_table(1, is_command=True),
                            },
                            {
                                "id": "period-2",
                                "title": "20__-окуу жылынын 2 мезгилине",
                                "table": build_training_table(2, is_command=True),
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
        ]

    combat_training_journal = build_training_table_module_from_db(
        "combat-training-journal",
        scope,
    )

    return {
        "library": {
            "title": "Сабактардын тематикасынын эсеби жана жүгүртмөсү",
            "scope": scope,
            "sections": library_sections,
            "items": [
                {"name": "Инструкция по несению службы", "type": "Приказ", "updated": "18.06.2026"},
                {"name": "Регламент связи и докладов", "type": "Методичка", "updated": "15.06.2026"},
                {"name": "План реагирования на инциденты", "type": "План", "updated": "10.06.2026"},
            ],
        },
        "combatTrainingJournal": combat_training_journal,
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
        subjects = MethodicalManualSubject.objects.filter(is_active=True).order_by(
            "order", "title"
        )
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


class CombatTrainingJournalListCreateView(APIView):
    permission_classes = [IsActiveUser]

    def get_queryset(self, request):
        queryset = CombatTrainingJournal.objects.all().order_by("-created_at", "-id")
        scope = request.query_params.get("scope")
        if scope:
            queryset = queryset.filter(scope=scope)
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


class CombatTrainingJournalDetailView(APIView):
    permission_classes = [IsActiveUser]

    def get_object(self, pk):
        return get_object_or_404(CombatTrainingJournal, pk=pk)

    def patch(self, request, pk):
        journal = self.get_object(pk)
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
        journal.delete()
        return Response(status=204)


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
            },
            status=status.HTTP_201_CREATED,
        )
