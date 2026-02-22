from rest_framework import generics, permissions
from .models import JamSession, Participation
from .serializers import JamSessionSerializer, ParticipationSerializer


class JamSessionListCreateView(generics.ListCreateAPIView):
    queryset = JamSession.objects.all()
    serializer_class = JamSessionSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class ParticipationCreateView(generics.CreateAPIView):
    queryset = Participation.objects.all()
    serializer_class = ParticipationSerializer
    permission_classes = [permissions.IsAuthenticated]