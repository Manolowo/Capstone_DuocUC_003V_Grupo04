from django.contrib import admin
from . import models

for mdl_name in [
    "Boleta", "BoletaPago", "Caja", "Categoria", "Cliente", "Condicion",
    "Estado", "Inventario", "Producto", "Rol", "Sucursal", "TipoPago",
    "Usuario", "Venta",
]:
    mdl = getattr(models, mdl_name, None)
    if mdl:
        admin.site.register(mdl)
