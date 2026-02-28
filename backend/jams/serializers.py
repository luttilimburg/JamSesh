from rest_framework import serializers
from .models import JamSession, Participation, Message


class MessageSerializer(serializers.ModelSerializer):
    sender = serializers.ReadOnlyField(source='sender.username')

    class Meta:
        model = Message
        fields = ['id', 'sender', 'text', 'created_at']


class JamSessionSerializer(serializers.ModelSerializer):
    created_by = serializers.ReadOnlyField(source='created_by.username')
    participant_count = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()

    def get_participant_count(self, obj):
        return obj.participation_set.count()

    def get_last_message(self, obj):
        msg = obj.messages.last()
        if msg:
            return {'sender': msg.sender.username, 'text': msg.text, 'created_at': str(msg.created_at)}
        return None

    class Meta:
        model = JamSession
        fields = '__all__'


class ParticipationSerializer(serializers.ModelSerializer):
    user = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = Participation
        fields = '__all__'
