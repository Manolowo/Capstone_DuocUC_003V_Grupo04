from django.urls import path
from .views import (
    HealthView, PingView, ResumenTablasView,
    # Vistas genéricas CRUD
    SqlCrudListView, SqlCrudDetailView,
    # Dashboard
    DashboardKpisView, UltimasVentasView,
    # 🔹 Nuevo: endpoint de usuario actual
    MeView,
)

urlpatterns = [
    # Diagnóstico
    path("health", HealthView.as_view()),
    path("ping", PingView.as_view()),
    path("resumen-tablas", ResumenTablasView.as_view()),

    # Dashboard
    path("dashboard/kpis", DashboardKpisView.as_view()),
    path("dashboard/ultimas-ventas", UltimasVentasView.as_view()),

    # 🔹 Usuario actual (rol, etc.)
    path("me", MeView.as_view(), name="me"),

    # CRUD por tabla (listar/crear) usando vistas genéricas
    path("boleta_pago", SqlCrudListView.as_view(), kwargs={"table": "boleta_pago"}),
    path("caja",        SqlCrudListView.as_view(), kwargs={"table": "caja"}),
    path("categoria",   SqlCrudListView.as_view(), kwargs={"table": "categoria"}),
    path("cliente",     SqlCrudListView.as_view(), kwargs={"table": "cliente"}),
    path("condicion",   SqlCrudListView.as_view(), kwargs={"table": "condicion"}),
    path("estado",      SqlCrudListView.as_view(), kwargs={"table": "estado"}),
    path("inventario",  SqlCrudListView.as_view(), kwargs={"table": "inventario"}),
    path("producto",    SqlCrudListView.as_view(), kwargs={"table": "producto"}),
    path("rol",         SqlCrudListView.as_view(), kwargs={"table": "rol"}),
    path("sucursal",    SqlCrudListView.as_view(), kwargs={"table": "sucursal"}),
    path("tipo_pago",   SqlCrudListView.as_view(), kwargs={"table": "tipo_pago"}),
    path("usuario",     SqlCrudListView.as_view(), kwargs={"table": "usuario"}),
    path("venta",       SqlCrudListView.as_view(), kwargs={"table": "venta"}),

    # CRUD por tabla (detalle/editar/eliminar) usando vistas genéricas
    path("boleta_pago/<int:pk>", SqlCrudDetailView.as_view(), kwargs={"table": "boleta_pago"}),
    path("caja/<int:pk>",        SqlCrudDetailView.as_view(), kwargs={"table": "caja"}),
    path("categoria/<int:pk>",   SqlCrudDetailView.as_view(), kwargs={"table": "categoria"}),
    path("cliente/<int:pk>",     SqlCrudDetailView.as_view(), kwargs={"table": "cliente"}),
    path("condicion/<int:pk>",   SqlCrudDetailView.as_view(), kwargs={"table": "condicion"}),
    path("estado/<int:pk>",      SqlCrudDetailView.as_view(), kwargs={"table": "estado"}),
    path("inventario/<int:pk>",  SqlCrudDetailView.as_view(), kwargs={"table": "inventario"}),
    path("producto/<int:pk>",    SqlCrudDetailView.as_view(), kwargs={"table": "producto"}),
    path("rol/<int:pk>",         SqlCrudDetailView.as_view(), kwargs={"table": "rol"}),
    path("sucursal/<int:pk>",    SqlCrudDetailView.as_view(), kwargs={"table": "sucursal"}),
    path("tipo_pago/<int:pk>",   SqlCrudDetailView.as_view(), kwargs={"table": "tipo_pago"}),
    path("usuario/<int:pk>",     SqlCrudDetailView.as_view(), kwargs={"table": "usuario"}),
    path("venta/<int:pk>",       SqlCrudDetailView.as_view(), kwargs={"table": "venta"}),
]
