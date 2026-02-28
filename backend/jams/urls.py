from django.urls import path
from .views import (
    JamSessionListCreateView, JamSessionRetrieveDestroyView,
    MyJamsView, ParticipationCreateView, MessageListCreateView,
    ParticipantListView, LeaveJamView,
)

urlpatterns = [
    path('jams/', JamSessionListCreateView.as_view(), name='jam-list-create'),
    path('jams/mine/', MyJamsView.as_view(), name='my-jams'),
    path('jams/<int:pk>/', JamSessionRetrieveDestroyView.as_view(), name='jam-detail'),
    path('jams/<int:jam_pk>/messages/', MessageListCreateView.as_view(), name='jam-messages'),
    path('jams/<int:jam_pk>/participants/', ParticipantListView.as_view(), name='jam-participants'),
    path('jams/<int:jam_pk>/leave/', LeaveJamView.as_view(), name='leave-jam'),
    path('join/', ParticipationCreateView.as_view(), name='join-jam'),
]
