from rest_framework import generics, permissions
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db import IntegrityError
from django.db.models import Q
from django.utils import timezone
from django.shortcuts import get_object_or_404
from .models import JamSession, Participation, Message, Review, Report
from .serializers import JamSessionSerializer, ParticipationSerializer, MessageSerializer, ReviewSerializer, ReportSerializer
from users.permissions import IsNotBanned
from users.models import UserProfile
from utils.push import send_push


class JamSessionListCreateView(generics.ListCreateAPIView):
    serializer_class = JamSessionSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        now = timezone.now()
        if self.request.query_params.get('past') == '1':
            qs = JamSession.objects.filter(date_time__lt=now).order_by('-date_time')
        else:
            qs = JamSession.objects.filter(date_time__gte=now).order_by('date_time')
        q = self.request.query_params.get('q', '').strip()
        genre = self.request.query_params.get('genre', '').strip()
        skill = self.request.query_params.get('skill_level', '').strip()
        if q:
            qs = qs.filter(
                Q(title__icontains=q) | Q(description__icontains=q) | Q(location__icontains=q)
            )
        if genre:
            qs = qs.filter(genre=genre)
        if skill:
            qs = qs.filter(skill_level=skill)
        return qs

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsNotBanned()]
        return [permissions.IsAuthenticatedOrReadOnly()]

    def perform_create(self, serializer):
        profile = getattr(self.request.user, 'profile', None)
        if not profile or self._profile_score(profile) < 100:
            raise PermissionDenied(
                'Your profile must be 100% complete before you can create a jam session.'
            )
        serializer.save(created_by=self.request.user)

    @staticmethod
    def _profile_score(p):
        score = 0
        if p.avatar or p.avatar_url:
            score += 20
        if p.instruments.strip():
            score += 20
        if p.skill_level:
            score += 20
        if p.bio.strip():
            score += 20
        if p.instagram_handle.strip() or p.tiktok_handle.strip():
            score += 20
        return score


class JamSessionRetrieveDestroyView(generics.RetrieveDestroyAPIView):
    queryset = JamSession.objects.all()
    serializer_class = JamSessionSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_destroy(self, instance):
        if instance.created_by != self.request.user:
            raise PermissionDenied('You can only delete your own sessions.')
        participant_ids = list(instance.participation_set.values_list('user_id', flat=True))
        if participant_ids:
            tokens = list(
                UserProfile.objects.filter(user_id__in=participant_ids)
                .exclude(expo_push_token='')
                .values_list('expo_push_token', flat=True)
            )
            send_push(
                tokens,
                title='Jam cancelled',
                body=f'"{instance.title}" has been cancelled by the organiser.',
                data={'screen': 'Main'},
            )
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
    permission_classes = [IsNotBanned]

    def perform_create(self, serializer):
        jam = get_object_or_404(JamSession, pk=serializer.validated_data['jam_session'].id)
        participant_count = jam.participation_set.count()
        if participant_count >= jam.max_participants - 1:  # -1 reserves a spot for the organiser
            raise ValidationError({'detail': 'This jam session is full.'})
        try:
            participation = serializer.save(user=self.request.user)
        except IntegrityError:
            raise ValidationError({'detail': 'You have already joined this session.'})
        jam = participation.jam_session
        creator = jam.created_by
        if creator != self.request.user:
            token = getattr(getattr(creator, 'profile', None), 'expo_push_token', '')
            if token:
                send_push(
                    [token],
                    title='Someone joined your jam!',
                    body=f'{self.request.user.username} joined "{jam.title}"',
                    data={'screen': 'JamDetail', 'jamId': jam.id},
                )


class ParticipantListView(APIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get(self, request, jam_pk):
        from users.serializers import UserSerializer
        jam = get_object_or_404(JamSession, pk=jam_pk)
        participations = Participation.objects.filter(
            jam_session=jam
        ).select_related('user', 'user__profile')

        if request.user.is_authenticated:
            my_jam_ids = set(
                JamSession.objects.filter(
                    Q(created_by=request.user) | Q(participation__user=request.user)
                ).values_list('id', flat=True)
            )
        else:
            my_jam_ids = set()

        participant_data = []
        for p in participations:
            user_data = UserSerializer(p.user, context={'request': request}).data
            if request.user.is_authenticated and p.user != request.user:
                their_jam_ids = set(
                    JamSession.objects.filter(
                        Q(created_by=p.user) | Q(participation__user=p.user)
                    ).values_list('id', flat=True)
                )
                shared = (my_jam_ids & their_jam_ids) - {jam.id}
                user_data['jammed_before'] = bool(shared)
            else:
                user_data['jammed_before'] = False
            participant_data.append(user_data)

        return Response({
            'created_by': jam.created_by.username,
            'participants': participant_data,
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

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsNotBanned()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        jam = get_object_or_404(JamSession, pk=self.kwargs['jam_pk'])
        is_member = (
            jam.created_by == self.request.user or
            Participation.objects.filter(user=self.request.user, jam_session=jam).exists()
        )
        if not is_member:
            raise PermissionDenied('You must be a member of this session to read messages.')
        return Message.objects.filter(jam_session=jam)

    def perform_create(self, serializer):
        jam = get_object_or_404(JamSession, pk=self.kwargs['jam_pk'])
        is_member = (
            jam.created_by == self.request.user or
            Participation.objects.filter(user=self.request.user, jam_session=jam).exists()
        )
        if not is_member:
            raise PermissionDenied('You must join this session to send messages.')
        message = serializer.save(sender=self.request.user, jam_session=jam)
        participant_user_ids = list(
            jam.participation_set.values_list('user_id', flat=True)
        )
        tokens = list(
            UserProfile.objects.filter(
                user_id__in=[jam.created_by_id] + participant_user_ids
            ).exclude(user=self.request.user).values_list('expo_push_token', flat=True)
        )
        send_push(
            tokens,
            title=jam.title,
            body=f'{self.request.user.username}: {message.text[:80]}',
            data={'screen': 'Chat', 'jamId': jam.id, 'jamTitle': jam.title},
        )


class ReviewCreateView(APIView):
    permission_classes = [IsNotBanned]

    def post(self, request, jam_pk):
        jam = get_object_or_404(JamSession, pk=jam_pk)

        if jam.date_time > timezone.now():
            return Response(
                {'detail': 'You can only review after the jam has taken place.'},
                status=400
            )

        reviewer_was_there = (
            jam.created_by == request.user or
            Participation.objects.filter(user=request.user, jam_session=jam).exists()
        )
        if not reviewer_was_there:
            raise PermissionDenied('You were not part of this jam session.')

        reviewee_id = request.data.get('reviewee')
        from django.contrib.auth.models import User as AuthUser
        try:
            reviewee = AuthUser.objects.get(pk=reviewee_id)
        except AuthUser.DoesNotExist:
            return Response({'detail': 'Reviewee not found.'}, status=400)

        if reviewee == request.user:
            return Response({'detail': 'You cannot review yourself.'}, status=400)

        reviewee_was_there = (
            jam.created_by == reviewee or
            Participation.objects.filter(user=reviewee, jam_session=jam).exists()
        )
        if not reviewee_was_there:
            return Response({'detail': 'This user was not in the jam.'}, status=400)

        serializer = ReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            serializer.save(reviewer=request.user, jam_session=jam)
        except IntegrityError:
            return Response({'detail': 'You have already reviewed this person for this jam.'}, status=400)

        return Response(serializer.data, status=201)


class ReportCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from django.contrib.auth.models import User as AuthUser
        reported_id = request.data.get('reported_user')
        try:
            reported_id = int(reported_id)
        except (TypeError, ValueError):
            return Response({'detail': 'Invalid user.'}, status=400)
        if not AuthUser.objects.filter(pk=reported_id).exists():
            return Response({'detail': 'User not found.'}, status=400)
        if reported_id == request.user.id:
            return Response({'detail': 'You cannot report yourself.'}, status=400)
        serializer = ReportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(reporter=request.user)
        return Response({'detail': 'Report submitted. Thank you.'}, status=201)
