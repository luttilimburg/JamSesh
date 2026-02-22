from django.urls import path
from .views import JamSessionListCreateView, ParticipationCreateView

urlpatterns = [
    path('jams/', JamSessionListCreateView.as_view(), name='jam-list-create'),
    path('join/', ParticipationCreateView.as_view(), name='join-jam'),
]
