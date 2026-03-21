from django.contrib.auth.models import User
from rest_framework import serializers
from .models import UserProfile


class UserProfileSerializer(serializers.ModelSerializer):
    completeness_score = serializers.SerializerMethodField()
    missing_fields = serializers.SerializerMethodField()
    phone_verified = serializers.SerializerMethodField()

    def get_completeness_score(self, obj):
        score = 0
        if obj.avatar or obj.avatar_url:
            score += 20
        if obj.instruments.strip():
            score += 20
        if obj.skill_level:
            score += 20
        if obj.bio.strip():
            score += 20
        if obj.instagram_handle.strip() or obj.tiktok_handle.strip():
            score += 20
        return score

    def get_missing_fields(self, obj):
        missing = []
        if not (obj.avatar or obj.avatar_url):
            missing.append('avatar')
        if not obj.instruments.strip():
            missing.append('instruments')
        if not obj.skill_level:
            missing.append('skill_level')
        if not obj.bio.strip():
            missing.append('bio')
        if not (obj.instagram_handle.strip() or obj.tiktok_handle.strip()):
            missing.append('social_link')
        return missing

    def get_phone_verified(self, obj):
        return obj.phone_verified

    def update(self, instance, validated_data):
        # Reset verification if the user saves a different phone number
        if 'phone' in validated_data and validated_data['phone'] != instance.phone:
            validated_data['phone_verified'] = False
        return super().update(instance, validated_data)

    class Meta:
        model = UserProfile
        fields = [
            'instruments', 'genres', 'skill_level', 'bio', 'location',
            'avatar_url', 'avatar', 'instagram_handle', 'tiktok_handle',
            'phone', 'completeness_score', 'missing_fields', 'phone_verified',
        ]
        extra_kwargs = {
            'avatar': {'required': False, 'allow_null': True},
            'completeness_score': {'read_only': True},
            'missing_fields': {'read_only': True},
            'phone_verified': {'read_only': True},
        }


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True)
    instruments = serializers.CharField(required=False, allow_blank=True)
    genres = serializers.CharField(required=False, allow_blank=True)
    skill_level = serializers.CharField(required=False, allow_blank=True)
    bio = serializers.CharField(required=False, allow_blank=True)
    location = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password2',
                  'instruments', 'genres', 'skill_level', 'bio', 'location']

    def validate(self, data):
        if data['password'] != data.pop('password2'):
            raise serializers.ValidationError({'password2': 'Passwords do not match.'})
        return data

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
    avatar = serializers.SerializerMethodField()
    trust_stats = serializers.SerializerMethodField()

    def get_avatar(self, obj):
        request = self.context.get('request')
        profile = getattr(obj, 'profile', None)
        if not profile:
            return None
        if profile.avatar:
            return request.build_absolute_uri(profile.avatar.url) if request else profile.avatar.url
        return profile.avatar_url or None

    def get_trust_stats(self, obj):
        from jams.models import Review
        received = Review.objects.filter(reviewee=obj)
        total = received.count()
        if total == 0:
            return {'successful_jams': 0, 'would_jam_again_pct': None}
        showed_up = received.filter(showed_up=True).count()
        would_again = received.filter(would_jam_again=True).count()
        return {
            'successful_jams': showed_up,
            'would_jam_again_pct': round(would_again / total * 100),
        }

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'avatar', 'profile', 'trust_stats']
