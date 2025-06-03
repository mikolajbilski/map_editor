from django.urls import path

from .views import SignUpView, GenerateTokenView


urlpatterns = [
    path("signup/", SignUpView.as_view(), name="signup"),
    path("api-token/", GenerateTokenView.as_view(), name="api_token"),
]
