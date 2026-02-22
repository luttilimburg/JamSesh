from rest_framework import serializers
from .models import JamSession, Participation


class JamSessionSerializer(serializers.ModelSerializer):
    created_by = serializers.ReadOnlyField(source='created_by.username')

    class Meta:
        model = JamSession
        fields = '__all__'


class ParticipationSerializer(serializers.ModelSerializer):
    user = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = Participation
        fields = '__all__'