from rest_framework import serializers
from .models import BackgroundImage, Route, RoutePoint


class BackgroundImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = BackgroundImage
        fields = ['id', 'title', 'image']


class RoutePointSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoutePoint
        fields = ['id', 'x', 'y', 'order']
        read_only_fields = ['id']


class RouteSerializer(serializers.ModelSerializer):
    points = RoutePointSerializer(many=True, read_only=True)
    background_detail = BackgroundImageSerializer(source='background', read_only=True)
    
    class Meta:
        model = Route
        fields = ['id', 'name', 'background', 'background_detail', 'created', 'points']
        read_only_fields = ['id', 'created', 'background_detail']
    
    def create(self, validated_data):
        # Associate the route with the current user
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class RouteDetailSerializer(serializers.ModelSerializer):
    points = RoutePointSerializer(many=True, read_only=True)
    background = BackgroundImageSerializer(read_only=True)
    
    class Meta:
        model = Route
        fields = ['id', 'name', 'background', 'created', 'points']
        read_only_fields = ['id', 'created', 'background']
