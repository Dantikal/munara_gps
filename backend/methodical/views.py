from django.shortcuts import get_object_or_404
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsActiveUser, IsAdminRole
from methodical.models import MethodicalManualDocument, MethodicalManualSubject
from methodical.serializers import (
    MethodicalManualDocumentSerializer,
    MethodicalManualSubjectSerializer,
)
from methodical.services import methodical_manual_subject_queryset


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
        collection = request.data.get(
            "collection",
            MethodicalManualSubject.Collection.METHODICAL_MANUALS,
        )
        if (
            collection == MethodicalManualSubject.Collection.METHODICAL_MANUALS
            and not request.user.is_superuser
        ):
            raise PermissionDenied("Изменять методические пособия может только главный администратор.")
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
        if (
            subject.collection == MethodicalManualSubject.Collection.METHODICAL_MANUALS
            and not request.user.is_superuser
        ):
            raise PermissionDenied("Изменять методические пособия может только главный администратор.")
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
        if (
            subject.collection == MethodicalManualSubject.Collection.METHODICAL_MANUALS
            and not request.user.is_superuser
        ):
            raise PermissionDenied("Изменять методические пособия может только главный администратор.")
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
        if (
            subject.collection == MethodicalManualSubject.Collection.METHODICAL_MANUALS
            and not request.user.is_superuser
        ):
            raise PermissionDenied("Изменять методические пособия может только главный администратор.")
        if (
            subject.collection == MethodicalManualSubject.Collection.METHODICAL_MANUALS
            and subject.parent_id is None
            and subject.title in ("Электрондук план-конспектилер", "Насааттамалар, нускамалар жана жоболор")
        ):
            raise ValidationError({"subject": (
                "Материалды башкармалыктын ичине кошуңуз."
                if subject.title == "Насааттамалар, нускамалар жана жоболор"
                else "Материалды предметтин ичине кошуңуз."
            )})
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
        if (
            document.subject.collection == MethodicalManualSubject.Collection.METHODICAL_MANUALS
            and not request.user.is_superuser
        ):
            raise PermissionDenied("Изменять методические пособия может только главный администратор.")
        stored_file = document.file
        document.delete()
        if stored_file:
            stored_file.delete(save=False)
        return Response(status=204)
