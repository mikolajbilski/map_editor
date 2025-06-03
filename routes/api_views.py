from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import BackgroundImage, Route, RoutePoint
from .serializers import (
    BackgroundImageSerializer, 
    RouteSerializer, 
    RouteDetailSerializer,
    RoutePointSerializer
)


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object to edit it.
    """
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions are only allowed to the owner
        if isinstance(obj, RoutePoint):
            return obj.route.user == request.user
        return obj.user == request.user


class BackgroundImageViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint that allows background images to be viewed.
    """
    queryset = BackgroundImage.objects.all()
    serializer_class = BackgroundImageSerializer
    permission_classes = [permissions.IsAuthenticated]


class RouteViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows routes to be viewed or edited.
    """
    serializer_class = RouteSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
    
    def get_queryset(self):
        """
        This view should return a list of all the routes
        for the currently authenticated user.
        """
        return Route.objects.filter(user=self.request.user)
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return RouteDetailSerializer
        return RouteSerializer
    
    @action(detail=True, methods=['get'])
    def points(self, request, pk=None):
        """
        Returns a list of all the route points for the specified route.
        """
        route = self.get_object()
        points = route.points.all().order_by('order')
        serializer = RoutePointSerializer(points, many=True)
        return Response(serializer.data)


class RoutePointViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows route points to be viewed or edited.
    """
    serializer_class = RoutePointSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
    
    def get_queryset(self):
        """
        This view should return a list of all the points
        for the specified route if the user is the owner.
        """
        route_id = self.kwargs.get('route_pk')
        if route_id is not None:
            route = get_object_or_404(Route, id=route_id, user=self.request.user)
            return RoutePoint.objects.filter(route=route).order_by('order')
        return RoutePoint.objects.none()
    
    def perform_create(self, serializer):
        """
        Associate the point with the specified route.
        """
        route_id = self.kwargs.get('route_pk')
        route = get_object_or_404(Route, id=route_id, user=self.request.user)
        # Set the order to be the last
        order = route.points.count()
        serializer.save(route=route, order=order)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        route = instance.route
        instance.delete()
        
        # Reorder remaining points
        for i, point in enumerate(route.points.all().order_by('order')):
            if point.order != i:
                point.order = i
                point.save()
        
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    def create(self, request, *args, **kwargs):
        """
        Override create to ensure proper handling of POST requests.
        """
        route_id = self.kwargs.get('route_pk')
        route = get_object_or_404(Route, id=route_id, user=request.user)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(route=route, order=route.points.count())
        return Response(serializer.data, status=status.HTTP_201_CREATED)
