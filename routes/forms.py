from django import forms
from .models import RoutePoint


class RoutePointForm(forms.ModelForm):
    class Meta:
        model = RoutePoint
        fields = ["x", "y"]