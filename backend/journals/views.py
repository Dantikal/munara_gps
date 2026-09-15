from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from accounts.outposts import format_outpost_name
from accounts.permissions import IsActiveUser, IsPrimaryAdmin
from journals.models import CombatTrainingJournal, CombatTrainingJournalSubject
from journals.serializers import (
    CombatTrainingJournalSerializer,
    CombatTrainingJournalSubjectSerializer,
)


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
        if not request.user.is_superuser:
            raise PermissionDenied("Добавлять предметы может только главный администратор.")
        serializer = CombatTrainingJournalSubjectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        subject = serializer.save()
        return Response(
            CombatTrainingJournalSubjectSerializer(subject).data,
            status=status.HTTP_201_CREATED,
        )


class CombatTrainingJournalSubjectDetailView(APIView):
    permission_classes = [IsPrimaryAdmin]

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
