from rest_framework import generics, permissions
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db import IntegrityError
from django.db.models import Q
from .models import JamSession, Participation, Message
from .serializers import JamSessionSerializer, ParticipationSerializer, MessageSerializer


class JamSessionListCreateView(generics.ListCreateAPIView):
    queryset = JamSession.objects.all().order_by('date_time')
    serializer_class = JamSessionSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class JamSessionRetrieveDestroyView(generics.RetrieveDestroyAPIView):
    queryset = JamSession.objects.all()
    serializer_class = JamSessionSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_destroy(self, instance):
        if instance.created_by != self.request.user:
            raise PermissionDenied('You can only delete your own sessions.')
        instance.delete()


class MyJamsView(generics.ListAPIView):
    serializer_class = JamSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return JamSession.objects.filter(
            Q(created_by=user) | Q(participation__user=user)
        ).distinct().order_by('date_time')


class ParticipationCreateView(generics.CreateAPIView):
    queryset = Participation.objects.all()
    serializer_class = ParticipationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        try:
            serializer.save(user=self.request.user)
        except IntegrityError:
            raise ValidationError({'detail': 'You have already joined this session.'})


class ParticipantListView(APIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get(self, request, jam_pk):
        jam = JamSession.objects.get(pk=jam_pk)
        participations = Participation.objects.filter(jam_session=jam).select_related('user')
        return Response({
            'created_by': jam.created_by.username,
            'participants': [p.user.username for p in participations],
        })


class LeaveJamView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, jam_pk):
        try:
            p = Participation.objects.get(user=request.user, jam_session_id=jam_pk)
            p.delete()
            return Response(status=204)
        except Participation.DoesNotExist:
            raise ValidationError({'detail': 'You have not joined this session.'})


class MessageListCreateView(generics.ListCreateAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Message.objects.filter(jam_session_id=self.kwargs['jam_pk'])

    def perform_create(self, serializer):
        jam = JamSession.objects.get(pk=self.kwargs['jam_pk'])
        is_member = (
            jam.created_by == self.request.user or
            Participation.objects.filter(user=self.request.user, jam_session=jam).exists()
        )
        if not is_member:
            raise PermissionDenied('You must join this session to send messages.')
        serializer.save(sender=self.request.user, jam_session=jam)
