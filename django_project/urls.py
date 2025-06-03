from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic.base import TemplateView
from django.conf import settings
from django.conf.urls.static import static
from routes import views as routes_views

# Import APIs if using DRF
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

# Swagger/ReDoc schema view for API documentation
schema_view = get_schema_view(
    openapi.Info(
        title="Map Editor API",
        default_version='v1',
        description="API documentation for the Map Editor application",
        terms_of_service="https://www.google.com/policies/terms/",
        contact=openapi.Contact(email="contact@mapeditor.local"),
        license=openapi.License(name="BSD License"),
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("accounts/", include("accounts.urls")),
    path("accounts/", include("django.contrib.auth.urls")),
    
    # Make sure this includes all routes including our new connect_dots urls
    path("", include("routes.urls")),
    
    # Root URL
    path("", routes_views.home, name="home"),
    
    # API documentation with Swagger/ReDoc
    re_path(r'^api/docs(?P<format>\.json|\.yaml)$', schema_view.without_ui(cache_timeout=0), name='schema-json'),
    path('api/docs/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('api/redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
]

# Always serve media files regardless of DEBUG setting
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Custom 404 handler
handler404 = 'django_project.views.custom_404'
