from pathlib import Path
import os
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "dev-insecure-key")
DEBUG = os.getenv("DEBUG", "1") == "1"

ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "127.0.0.1,localhost").split(",")

CORS_ALLOWED_ORIGINS = os.getenv(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173"
).split(",")

# =====================
# Aplicaciones instaladas
# =====================

INSTALLED_APPS = [
    "jazzmin",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    "rest_framework",
    "corsheaders",
    "rest_framework_simplejwt",

    "drf_spectacular",
    "drf_spectacular_sidecar",

    "ferredash_api",
]

# =====================
# Middleware
# =====================

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "backend.urls"

# =====================
# Plantillas
# =====================

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "backend" / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "backend.wsgi.application"

# =====================
# Base de Datos
# =====================

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("DB_NAME"),
        "USER": os.getenv("DB_USER"),
        "PASSWORD": os.getenv("DB_PASSWORD"),
        "HOST": os.getenv("DB_HOST", "127.0.0.1"),
        "PORT": os.getenv("DB_PORT", "5432"),
        "CONN_MAX_AGE": 60,
        "ATOMIC_REQUESTS": False,
    }
}

# =====================
# Localización
# =====================

LANGUAGE_CODE = "es-cl"
TIME_ZONE = "America/Santiago"
USE_I18N = True
USE_TZ = True

# =====================
# Archivos estáticos
# =====================

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# =====================
# Django REST Framework
# =====================

REST_FRAMEWORK = {
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 50,
}

# =====================
# DRF Spectacular (Documentación Swagger y Redoc)
# =====================

SPECTACULAR_SETTINGS = {
    "TITLE": "Ferredash API",
    "DESCRIPTION": "API oficial para plataforma Ferredash",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "SECURITY": [{"BearerAuth": []}],
    "SCHEMA_PATH_PREFIX": r"/api",
    "SWAGGER_UI_SETTINGS": {
        "defaultModelExpandDepth": 1,
        "defaultModelsExpandDepth": 0,
        "displayRequestDuration": True,
        "filter": True,
    },
}

# =====================
# Jazzmin Customization
# =====================

JAZZMIN_SETTINGS = {
    "site_title": "Administración de Ferredash",
    "site_header": "Administración de Ferredash",
    "site_brand": "Ferredash Admin",
    "welcome_sign": "Bienvenido al panel de administración",
    "copyright": "Ferredash © 2025",
    "search_model": ["ferredash_api.Usuario", "ferredash_api.Producto"],
    "hide_apps": [],
    "hide_models": [],
    "order_with_respect_to": ["ferredash_api"],
    "apps_icons": {
        "ferredash_api": "fas fa-tools",
    },
    "default_icon_parents": "fas fa-chevron-circle-right",
    "default_icon_children": "fas fa-circle",
    "show_ui_builder": True,
}
