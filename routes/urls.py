from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.authtoken.views import obtain_auth_token
from . import views
from . import api_views

# Create a router for the API
router = DefaultRouter()
router.register(r'backgrounds', api_views.BackgroundImageViewSet, basename='api-background')
router.register(r'routes', api_views.RouteViewSet, basename='api-route')

# URL patterns for regular views
urlpatterns = [
    # Existing routes
    path('routes/', views.user_routes, name='user_routes'),
    path('routes/choose_background/', views.choose_background, name='choose_background'),
    path('routes/create/<int:bg_id>/', views.create_route, name='create_route'),
    path('routes/edit/<int:route_id>/', views.edit_route, name='edit_route'),
    path('routes/points/<int:point_id>/delete/', views.delete_route_point, name='delete_route_point'),

    # Connect Dots routes
    path('connect_dots/', views.connect_dots_list, name='connect_dots'),
    path('connect_dots/create/', views.connect_dots_create, name='connect_dots_create'),
    path('connect_dots/edit/<int:board_id>/', views.connect_dots_edit, name='connect_dots_edit'),
    path('connect_dots/delete/<int:board_id>/', views.connect_dots_delete, name='connect_dots_delete'),

    # Connect Dots - Draw Paths
    path('play/', views.board_list, name='board_list_play'),
    path('play/<int:board_id>/', views.draw_path, name='draw_path'),
]

# Add API URLs
urlpatterns += [
    # API root
    path('api/', include(router.urls)),

    # Route points nested under routes
    path('api/routes/<int:route_pk>/points/',
         api_views.RoutePointViewSet.as_view({'get': 'list', 'post': 'create'}),
         name='api-route-points'),
    path('api/routes/<int:route_pk>/points/<int:pk>/',
         api_views.RoutePointViewSet.as_view({
             'get': 'retrieve',
             'put': 'update',
             'patch': 'partial_update',
             'delete': 'destroy'
         }),
         name='api-route-point-detail'),

    # API token authentication
    path('api/token/', obtain_auth_token, name='api-token'),
]