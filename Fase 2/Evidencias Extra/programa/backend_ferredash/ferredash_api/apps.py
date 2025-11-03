# api/apps.py

from django.apps import AppConfig

class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'ferredash_api'

    def ready(self):
        import ferredash_api.signals  # Activa los signals
