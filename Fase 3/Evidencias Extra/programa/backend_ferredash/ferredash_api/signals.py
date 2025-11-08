
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from django.db import connection

@receiver(post_save, sender=User)
def sync_usuario_table(sender, instance, created, **kwargs):
    with connection.cursor() as cur:
        if created:
            cur.execute("""
                INSERT INTO usuario (usu_nom, usu_mail, usu_password, rol_id, suc_id)
                VALUES (%s, %s, %s, 1, 1)
            """, [instance.username, instance.email, instance.password])
        else:
            cur.execute("""
                UPDATE usuario
                SET usu_nom = %s, usu_mail = %s
                WHERE LOWER(usu_mail) = LOWER(%s)
            """, [instance.username, instance.email, instance.email])
