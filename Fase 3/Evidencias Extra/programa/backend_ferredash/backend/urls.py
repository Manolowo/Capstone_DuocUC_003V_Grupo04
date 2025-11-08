from django.contrib import admin
from django.urls import path, include
from django.shortcuts import render

from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)

from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

def home(request):
    return render(request, "home.html")

urlpatterns = [
    path("", home, name="home"),
    path("admin/", admin.site.urls),

    # API
    path("api/", include("ferredash_api.urls")),

    # Schema
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    path("api/swagger/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),

    # JWT
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]
