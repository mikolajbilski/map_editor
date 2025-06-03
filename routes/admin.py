from django.contrib import admin
from .models import BackgroundImage, Route, RoutePoint

# Register your models here.
admin.site.register(BackgroundImage)
admin.site.register(Route)
admin.site.register(RoutePoint)