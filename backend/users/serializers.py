from django.contrib.auth.models import User
from rest_framework import serializers
from .models import UserProfile


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['instruments', 'genres', 'skill_level', 'bio', 'location']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    instruments = serializers.CharField(required=False, allow_blank=True)
    genres = serializers.CharField(required=False, allow_blank=True)
    skill_level = serializers.CharField(required=False, allow_blank=True)
    bio = serializers.CharField(required=False, allow_blank=True)
    location = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password',
                  'instruments', 'genres', 'skill_level', 'bio', 'location']

    def create(self, validated_data):
        profile_fields = {
            'instruments': validated_data.pop('instruments', ''),
            'genres': validated_data.pop('genres', ''),
            'skill_level': validated_data.pop('skill_level', ''),
            'bio': validated_data.pop('bio', ''),
            'location': validated_data.pop('location', ''),
        }
        user = User.objects.create_user(**validated_data)
        for field, value in profile_fields.items():
            setattr(user.profile, field, value)
        user.profile.save()
        return user


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'profile']
