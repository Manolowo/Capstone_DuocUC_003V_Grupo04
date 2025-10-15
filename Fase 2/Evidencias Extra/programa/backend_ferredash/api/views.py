# api/views.py
from __future__ import annotations

from django.db import connection, transaction
from django.utils.timezone import now
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from drf_spectacular.utils import (
    extend_schema, OpenApiParameter, OpenApiTypes, OpenApiExample
)

# -------------------------------
# Utilitarios básicos SQL
# -------------------------------
def dictfetchall(cursor):
    cols = [c[0] for c in cursor.description]
    return [dict(zip(cols, row)) for row in cursor.fetchall()]

def get_columns(table: str):
    sql = """
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name=%s
    ORDER BY ordinal_position
    """
    with connection.cursor() as cur:
        cur.execute(sql, [table])
        return [(r[0], r[1]) for r in cur.fetchall()]

def get_pk_column(table: str) -> str | None:
    sql = """
    SELECT a.attname
    FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    WHERE i.indrelid = %s::regclass AND i.indisprimary;
    """
    with connection.cursor() as cur:
        cur.execute(sql, [f'public."{table}"'])
        rows = cur.fetchall()
    if not rows:
        return None
    return rows[0][0]

def table_exists(table: str) -> bool:
    sql = """
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema='public' AND table_name=%s
    """
    with connection.cursor() as cur:
        cur.execute(sql, [table])
        return cur.fetchone() is not None

# -------------------------------
# Diagnóstico
# -------------------------------
class HealthView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(tags=["health"], summary="Health")
    def get(self, request):
        with connection.cursor() as cur:
            cur.execute("SHOW port;")
            port = int(cur.fetchone()[0])
            cur.execute("SELECT current_database(), current_schema();")
            db, schema = cur.fetchone()
        return Response({"status": "ok", "db": db, "schema": schema, "port": port, "time": now()})

class PingView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(tags=["ping"], summary="Ping")
    def get(self, request):
        return Response({"pong": True, "time": now()})

class ResumenTablasView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(tags=["resumen"], summary="Resumen de tablas")
    def get(self, request):
        sql = """
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema='public' AND table_type='BASE TABLE'
        ORDER BY 1
        """
        with connection.cursor() as cur:
            cur.execute(sql)
            tablas = [r[0] for r in cur.fetchall()]
        return Response({"tablas": tablas})

# -------------------------------
# Dashboard: KPIs
# -------------------------------
class DashboardKpisView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(tags=["dashboard"], summary="KPIs del panel")
    def get(self, request):
        with connection.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM public.venta;")
            total_ventas = cur.fetchone()[0]

            cur.execute("SELECT COUNT(*) FROM public.producto;")
            total_productos = cur.fetchone()[0]

            cur.execute("SELECT COUNT(*) FROM public.cliente;")
            total_clientes = cur.fetchone()[0]

            columnas = dict(get_columns("venta"))
            monto_col = None
            for posible in ["monto_total", "total", "monto", "importe_total", "precio_total"]:
                if posible in columnas:
                    monto_col = posible
                    break
            ganancia = 0.0
            if monto_col:
                cur.execute(f'SELECT COALESCE(SUM("{monto_col}"),0) FROM public.venta;')
                ganancia = float(cur.fetchone()[0] or 0)

        return Response({
            "totalVentas": total_ventas,
            "totalProductos": total_productos,
            "totalClientes": total_clientes,
            "gananciasTotales": ganancia
        })

# -------------------------------
# Dashboard: Últimas ventas (inteligente)
# -------------------------------
class UltimasVentasView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        tags=["dashboard"], summary="Últimas ventas",
        parameters=[OpenApiParameter("limit", OpenApiTypes.INT, required=False)]
    )
    def get(self, request):
        limit = int(request.GET.get("limit", 5))

        cols = get_columns("venta")
        colnames = [c for c, _ in cols]

        # Fecha
        fecha_col = None
        for c, t in cols:
            if t in ("date", "timestamp without time zone", "timestamp with time zone"):
                fecha_col = c
                break
        if not fecha_col:
            for c in ["fecha", "fecha_venta", "fecha_emision", "created_at", "f_emision", "f_creacion"]:
                if c in colnames:
                    fecha_col = c
                    break

        # Monto
        monto_col = next((c for c in ["monto_total", "total", "monto", "importe_total", "precio_total", "subtotal"]
                          if c in colnames), None)

        # Cantidad
        cantidad_col = next((c for c in ["cantidad", "cant", "cantidad_total", "unidades"]
                             if c in colnames), None)

        # FKs
        v_cli_fk = next((c for c in ["cliente_id", "cli_id", "id_cliente"] if c in colnames), None)
        v_prod_fk = next((c for c in ["producto_id", "prod_id", "id_producto"] if c in colnames), None)
        v_bol_fk  = next((c for c in ["boleta_id", "bol_id", "id_boleta", "boleta_pago_id"] if c in colnames), None)

        pk = get_pk_column("venta") or "id"
        monto_expr = f'COALESCE(v."{monto_col}",0)' if monto_col else '0'
        cantidad_expr = f'COALESCE(v."{cantidad_col}",1)' if cantidad_col else '1'

        with connection.cursor() as cur:
            if fecha_col and v_cli_fk and v_prod_fk:
                sql = f"""
                SELECT v.{pk} AS id,
                       COALESCE(c.nombre,'N/A') AS cliente,
                       COALESCE(p.nombre,'Producto') AS item,
                       {cantidad_expr}::int AS cantidad,
                       {monto_expr}::numeric AS monto,
                       v."{fecha_col}" AS fecha
                FROM public.venta v
                LEFT JOIN public.cliente  c ON c.id = v."{v_cli_fk}"
                LEFT JOIN public.producto p ON p.id = v."{v_prod_fk}"
                ORDER BY v."{fecha_col}" DESC NULLS LAST, v.{pk} DESC
                LIMIT %s
                """
                cur.execute(sql, [limit])
                rows = dictfetchall(cur)
            elif fecha_col and v_bol_fk and v_prod_fk:
                bol_pk = get_pk_column("boleta_pago") or "id"
                cur.execute("""
                    SELECT column_name FROM information_schema.columns
                    WHERE table_schema='public' AND table_name='boleta_pago'
                """)
                bol_cols = [r[0] for r in cur.fetchall()]
                bol_cli_fk = next((c for c in ["cliente_id","cli_id","id_cliente"] if c in bol_cols), None)

                if bol_cli_fk:
                    cli_join = f'LEFT JOIN public.cliente c ON c.id = b."{bol_cli_fk}"'
                    cli_sel  = "COALESCE(c.nombre,'N/A')"
                else:
                    cli_join = ""
                    cli_sel  = "'N/A'::text"

                sql = f"""
                SELECT v.{pk} AS id,
                       {cli_sel} AS cliente,
                       COALESCE(p.nombre,'Producto') AS item,
                       {cantidad_expr}::int AS cantidad,
                       {monto_expr}::numeric AS monto,
                       v."{fecha_col}" AS fecha
                FROM public.venta v
                LEFT JOIN public.boleta_pago b ON b."{bol_pk}" = v."{v_bol_fk}"
                {cli_join}
                LEFT JOIN public.producto p ON p.id = v."{v_prod_fk}"
                ORDER BY v."{fecha_col}" DESC NULLS LAST, v.{pk} DESC
                LIMIT %s
                """
                cur.execute(sql, [limit])
                rows = dictfetchall(cur)
            else:
                sql = f"""
                SELECT v.{pk} AS id,
                       'N/A'::text AS cliente,
                       'Producto'::text AS item,
                       {cantidad_expr}::int AS cantidad,
                       {monto_expr}::numeric AS monto,
                       NULL::timestamp AS fecha
                FROM public.venta v
                ORDER BY v.{pk} DESC
                LIMIT %s
                """
                cur.execute(sql, [limit])
                rows = dictfetchall(cur)

        data = []
        for r in rows:
            data.append({
                "id": r.get("id"),
                "cliente": r.get("cliente") or "N/A",
                "item": r.get("item") or "Producto",
                "cantidad": int(r.get("cantidad") or 1),
                "monto": float(r.get("monto") or 0),
                "fecha": (r.get("fecha").isoformat() if r.get("fecha") else None)
            })
        return Response(data)

# -------------------------------
# /api/me (demo sin JWT)
# -------------------------------
def fetch_user_with_role_by_id(user_id: int):
    u_cols = [c for c, _ in get_columns("usuario")]
    u_cols_set = set(u_cols)

    user_pk = get_pk_column("usuario") or ("id" if "id" in u_cols_set else u_cols[0])
    name_col = next((c for c in ["nombre", "name", "username", "usuario", "full_name"] if c in u_cols_set), None)
    mail_col = next((c for c in ["email", "correo", "mail"] if c in u_cols_set), None)
    role_fk  = next((c for c in ["rol_id", "id_rol", "rol", "idrol", "rolid", "id_rol_fk"] if c in u_cols_set), None)

    r_cols = [c for c, _ in get_columns("rol")]
    r_cols_set = set(r_cols)

    role_pk = get_pk_column("rol") or ("id" if "id" in r_cols_set else (r_cols[0] if r_cols else None))
    role_name = next((c for c in ["nombre", "name", "rol", "descripcion", "titulo"] if c in r_cols_set), None)

    sel_name = f'u."{name_col}"' if name_col else "'Usuario'::text"
    sel_mail = f'u."{mail_col}"' if mail_col else "'demo@local'::text"
    sel_role = f'r."{role_name}"' if role_name else "'gerente'::text"

    if role_fk and role_pk:
        join_on = f'r."{role_pk}" = u."{role_fk}"'
    else:
        join_on = "1=0"

    sql = f"""
    SELECT u."{user_pk}" AS id,
           COALESCE({sel_name}, 'Usuario') AS nombre,
           COALESCE({sel_mail}, 'demo@local') AS email,
           COALESCE({sel_role}, 'gerente') AS role
    FROM public."usuario" u
    LEFT JOIN public."rol" r ON {join_on}
    WHERE u."{user_pk}" = %s
    """
    with connection.cursor() as cur:
        cur.execute(sql, [user_id])
        row = cur.fetchone()
        if not row:
            return None
        return {"id": row[0], "name": row[1], "email": row[2], "role": row[3]}

class MeView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(tags=["auth"], summary="Usuario actual (demo)")
    def get(self, request):
        try:
            uid = int(request.query_params.get("id", 1))
        except ValueError:
            uid = 1
        user = fetch_user_with_role_by_id(uid)
        if not user:
            user = {"id": uid, "name": "Demo", "email": "demo@local", "role": "gerente"}
        return Response(user)

# -------------------------------
# CRUD genérico (LIST/CREATE + DETAIL/UPDATE/DELETE)
# -------------------------------
ALLOWED_TABLES = {
    "boleta_pago", "caja", "categoria", "cliente", "condicion", "estado",
    "inventario", "producto", "rol", "sucursal", "tipo_pago", "usuario", "venta",
}

class SqlCrudBase(APIView):
    """Base con helpers comunes para CRUD SQL directo."""
    permission_classes = [AllowAny]
    table_name: str = ""
    default_limit: int = 50
    max_limit: int = 500

    # --- helpers ---
    def _ensure_table(self):
        if self.table_name not in ALLOWED_TABLES or not table_exists(self.table_name):
            return Response({"detail": f"Tabla '{self.table_name}' no permitida o no existe."}, status=404)

    def _limit_offset(self, request):
        try:
            limit = int(request.query_params.get("limit", self.default_limit))
            offset = int(request.query_params.get("offset", 0))
        except (TypeError, ValueError):
            return None, None
        return max(1, min(limit, self.max_limit)), max(0, offset)

    def _valid_payload_cols(self, payload: dict, include_pk: bool = False):
        cols = [c for c, _ in get_columns(self.table_name)]
        pk = get_pk_column(self.table_name)
        allowed = set(cols) if include_pk else {c for c in cols if c != pk}
        return [c for c in payload.keys() if c in allowed]

    def _get_pk_col(self) -> str | None:
        """Devuelve el nombre de la columna PK para la tabla actual.
        Intentará obtener la PK real; si no existe, buscará una columna 'id'.
        Si no hay ninguna, devolverá None.
        """
        pk = get_pk_column(self.table_name)
        if pk:
            return pk
        cols = [c for c, _ in get_columns(self.table_name)]
        if "id" in cols:
            return "id"
        return None

# ---------- LIST + CREATE ----------
class SqlCrudListView(SqlCrudBase):
    @extend_schema(
        tags=["crud"], summary="Listar",
        parameters=[
            OpenApiParameter("limit", OpenApiTypes.INT, required=False),
            OpenApiParameter("offset", OpenApiTypes.INT, required=False),
            OpenApiParameter("search", OpenApiTypes.STR, required=False),
        ],
    )
    def get(self, request, table: str):
        self.table_name = table
        err = self._ensure_table()
        if err: return err

        limit, offset = self._limit_offset(request)
        if limit is None:
            return Response({"detail": "limit/offset inválidos"}, status=400)

        pk_col = self._get_pk_col()
        cols = [c for c, _ in get_columns(self.table_name)]
        order_col = pk_col or (cols[0] if cols else "1")

        search = request.query_params.get("search")
        where, params = "", []
        if search:
            like_cols = [c for c in cols if any(w in c for w in ["nombre", "descripcion", "cliente", "producto"])]
            if like_cols:
                like = " OR ".join([f'"{c}" ILIKE %s' for c in like_cols])
                where = f"WHERE {like}"
                params.extend([f"%{search}%"] * len(like_cols))

        count_sql = f'SELECT COUNT(*) FROM public."{self.table_name}" {where}'
        list_sql  = f'SELECT * FROM public."{self.table_name}" {where} ORDER BY "{order_col}" LIMIT %s OFFSET %s'

        with connection.cursor() as cur:
            cur.execute(count_sql, params)
            total = cur.fetchone()[0]
            cur.execute(list_sql, params + [limit, offset])
            rows = dictfetchall(cur)

        return Response({"table": self.table_name, "count": total, "limit": limit, "offset": offset, "results": rows})

    @extend_schema(
        tags=["crud"], summary="Crear",
        request=OpenApiTypes.OBJECT,
        examples=[OpenApiExample("Ejemplo", value={"campo1": "valor", "campo2": 123})],
        responses={201: OpenApiTypes.OBJECT},
    )
    @transaction.atomic
    def post(self, request, table: str):
        self.table_name = table
        err = self._ensure_table()
        if err: return err

        body = request.data or {}
        cols = self._valid_payload_cols(body, include_pk=False)
        if not cols:
            return Response({"detail": "No hay columnas válidas para insertar."}, status=400)

        pk = self._get_pk_col()
        if not pk:
            return Response({"detail": f"Tabla '{self.table_name}' no tiene columna PK detectable."}, status=400)
        cols_sql = ",".join(f'"{c}"' for c in cols)
        params_sql = ",".join(["%s"] * len(cols))
        values = [body[c] for c in cols]

        with connection.cursor() as cur:
            cur.execute(
                f'INSERT INTO public."{self.table_name}" ({cols_sql}) VALUES ({params_sql}) RETURNING "{pk}";',
                values
            )
            new_id = cur.fetchone()[0]
            cur.execute(f'SELECT * FROM public."{self.table_name}" WHERE "{pk}"=%s;', [new_id])
            created = dictfetchall(cur)[0]

        return Response(created, status=201)

# ---------- DETAIL + UPDATE + DELETE ----------
class SqlCrudDetailView(SqlCrudBase):
    @extend_schema(tags=["crud"], summary="Detalle")
    def get(self, request, table: str, pk: int):
        self.table_name = table
        err = self._ensure_table()
        if err: return err

        pk_col = self._get_pk_col()
        if not pk_col:
            return Response({"detail": f"Tabla '{self.table_name}' no tiene columna PK detectable."}, status=400)
        with connection.cursor() as cur:
            cur.execute(f'SELECT * FROM public."{self.table_name}" WHERE "{pk_col}"=%s;', [pk])
            rows = dictfetchall(cur)
        if not rows:
            return Response({"detail": "No encontrado"}, status=404)
        return Response(rows[0])

    @extend_schema(tags=["crud"], summary="Actualizar (PUT)", request=OpenApiTypes.OBJECT)
    @transaction.atomic
    def put(self, request, table: str, pk: int):
        return self._update(request, table, pk, partial=False)

    @extend_schema(tags=["crud"], summary="Actualizar parcial (PATCH)", request=OpenApiTypes.OBJECT)
    @transaction.atomic
    def patch(self, request, table: str, pk: int):
        return self._update(request, table, pk, partial=True)

    def _update(self, request, table: str, pk: int, partial: bool):
        self.table_name = table
        err = self._ensure_table()
        if err: return err

        body = request.data or {}
        cols = self._valid_payload_cols(body, include_pk=False)
        if not cols:
            return Response({"detail": "No hay columnas válidas para actualizar."}, status=400)

        pk_col = self._get_pk_col()
        if not pk_col:
            return Response({"detail": f"Tabla '{self.table_name}' no tiene columna PK detectable."}, status=400)
        set_sql = ", ".join([f'"{c}"=%s' for c in cols])
        values = [body[c] for c in cols] + [pk]

        with connection.cursor() as cur:
            cur.execute(
                f'UPDATE public."{self.table_name}" SET {set_sql} WHERE "{pk_col}"=%s RETURNING "{pk_col}";',
                values
            )
            if cur.fetchone() is None:
                return Response({"detail": "No encontrado"}, status=404)
            cur.execute(f'SELECT * FROM public."{self.table_name}" WHERE "{pk_col}"=%s;', [pk])
            updated = dictfetchall(cur)[0]
        return Response(updated, status=200)

    @extend_schema(tags=["crud"], summary="Eliminar", responses={204: None})
    @transaction.atomic
    def delete(self, request, table: str, pk: int):
        self.table_name = table
        err = self._ensure_table()
        if err: return err

        pk_col = self._get_pk_col()
        if not pk_col:
            return Response({"detail": f"Tabla '{self.table_name}' no tiene columna PK detectable."}, status=400)
        with connection.cursor() as cur:
            cur.execute(f'DELETE FROM public."{self.table_name}" WHERE "{pk_col}"=%s RETURNING "{pk_col}";', [pk])
            row = cur.fetchone()
            if not row:
                return Response({"detail": "No encontrado"}, status=404)
        return Response(status=204)
