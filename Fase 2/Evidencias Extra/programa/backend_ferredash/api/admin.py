from django.contrib import admin

# Intenta importar models_db, pero no falles si aún no existe
try:
    from . import models_db  # generado por inspectdb
except Exception:
    models_db = None

# Registra modelos solo si models_db está disponible
if models_db:
    for mdl_name in [
        "Boleta", "BoletaPago", "Caja", "Categoria", "Cliente", "Condicion",
        "Estado", "Inventario", "Producto", "Rol", "Sucursal", "TipoPago",
        "Usuario", "Venta",
    ]:
        mdl = getattr(models_db, mdl_name, None)
        if mdl:
            admin.site.register(mdl)
