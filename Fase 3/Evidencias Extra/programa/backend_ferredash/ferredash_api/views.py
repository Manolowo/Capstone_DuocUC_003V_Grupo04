from __future__ import annotations
from django.db import connection, transaction
from django.utils.timezone import now
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiTypes, OpenApiExample

# =====================
# Helpers SQL
# =====================

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


# =====================
# Diagnosis
# =====================

class HealthView(APIView):
    permission_classes = [AllowAny]
    def get(self, request):
        with connection.cursor() as cur:
            cur.execute("SHOW port;")
            port = int(cur.fetchone()[0])
            cur.execute("SELECT current_database(), current_schema();")
            db, schema = cur.fetchone()
        return Response({"status": "ok", "db": db, "schema": schema, "port": port, "time": now()})


class PingView(APIView):
    permission_classes = [AllowAny]
    def get(self, request):
        return Response({"pong": True, "time": now()})


# =====================
# Dashboard
# =====================

class DashboardKpisView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

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


class UltimasVentasView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        limit = int(request.GET.get("limit", 5))
        cols = get_columns("venta")
        colnames = [c for c, _ in cols]

        fecha_col = next((c for c, t in cols if t in ("date", "timestamp without time zone", "timestamp with time zone")), None)
        monto_col = next((c for c in ["monto_total", "total", "monto", "importe_total", "precio_total", "subtotal"] if c in colnames), None)
        cantidad_col = next((c for c in ["cantidad", "cant", "cantidad_total", "unidades"] if c in colnames), None)
        v_cli_fk = next((c for c in ["cliente_id", "cli_id", "id_cliente"] if c in colnames), None)
        v_prod_fk = next((c for c in ["producto_id", "prod_id", "id_producto"] if c in colnames), None)

        pk = get_pk_column("venta") or "id"
        monto_expr = f'COALESCE(v."{monto_col}",0)' if monto_col else '0'
        cantidad_expr = f'COALESCE(v."{cantidad_col}",1)' if cantidad_col else '1'

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
        with connection.cursor() as cur:
            cur.execute(sql, [limit])
            rows = dictfetchall(cur)

        for r in rows:
            r["monto"] = float(r.get("monto") or 0)

        return Response(rows)


# =====================
# /api/me  — via JWT
# =====================

class MeView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        email = request.user.email

        sql = """
        SELECT usu_id, usu_nom AS name, usu_mail AS email, r.rol_nom AS role
        FROM usuario u
        LEFT JOIN rol r ON r.rol_id = u.rol_id
        WHERE UPPER(u.usu_mail) = UPPER(%s)
        LIMIT 1
        """

        with connection.cursor() as cur:
            cur.execute(sql, [email])
            row = cur.fetchone()

        if not row:
            return Response({"detail": "Usuario no encontrado"}, status=404)

        return Response({
            "id": row[0],
            "name": row[1],
            "email": row[2],
            "role": row[3]
        })


# =====================
# CRUD Genérico SQL
# =====================

ALLOWED_TABLES = {
    "boleta_pago", "caja", "categoria", "cliente", "condicion", "estado",
    "inventario", "producto", "rol", "sucursal", "tipo_pago", "usuario", "venta",
}

class SqlCrudBase(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    table_name: str = ""
    default_limit: int = 50
    max_limit: int = 500

    def _ensure_table(self):
        if self.table_name not in ALLOWED_TABLES or not table_exists(self.table_name):
            return Response({"detail": f"Tabla '{self.table_name}' no permitida."}, status=404)

    def _limit_offset(self, request):
        try:
            limit = int(request.query_params.get("limit", self.default_limit))
            offset = int(request.query_params.get("offset", 0))
        except:
            return None, None
        return max(1, min(limit, self.max_limit)), max(0, offset)

    def _valid_payload_cols(self, payload: dict, include_pk: bool = False):
        cols = [c for c, _ in get_columns(self.table_name)]
        pk = get_pk_column(self.table_name)
        allowed = set(cols) if include_pk else {c for c in cols if c != pk}
        return [c for c in payload.keys() if c in allowed]

    def _get_pk_col(self):
        pk = get_pk_column(self.table_name)
        if pk: return pk
        cols = [c for c, _ in get_columns(self.table_name)]
        return "id" if "id" in cols else None


class SqlCrudListView(SqlCrudBase):
    def get(self, request, table: str):
        self.table_name = table
        err = self._ensure_table()
        if err: return err

        limit, offset = self._limit_offset(request)
        pk_col = self._get_pk_col()
        cols = [c for c, _ in get_columns(self.table_name)]
        order_col = pk_col or cols[0]

        sql = f'SELECT * FROM public."{self.table_name}" ORDER BY "{order_col}" LIMIT %s OFFSET %s'
        with connection.cursor() as cur:
            cur.execute(f'SELECT COUNT(*) FROM public."{self.table_name}"')
            total = cur.fetchone()[0]
            cur.execute(sql, [limit, offset])
            rows = dictfetchall(cur)

        return Response({
            "table": self.table_name,
            "count": total,
            "limit": limit,
            "offset": offset,
            "results": rows
        })

    @transaction.atomic
    def post(self, request, table: str):
        self.table_name = table
        err = self._ensure_table()
        if err: return err

        body = request.data
        cols = self._valid_payload_cols(body, include_pk=False)
        pk = self._get_pk_col()

        cols_sql = ",".join(f'"{c}"' for c in cols)
        params_sql = ",".join(["%s"] * len(cols))
        values = [body[c] for c in cols]

        with connection.cursor() as cur:
            cur.execute(
                f'INSERT INTO "{self.table_name}" ({cols_sql}) VALUES ({params_sql}) RETURNING "{pk}"',
                values
            )
            new_id = cur.fetchone()[0]
            cur.execute(f'SELECT * FROM "{self.table_name}" WHERE "{pk}"=%s', [new_id])
            created = dictfetchall(cur)[0]

        return Response(created, status=201)


class SqlCrudDetailView(SqlCrudBase):
    def get(self, request, table: str, pk: int):
        self.table_name = table
        err = self._ensure_table()
        if err: return err
        pk_col = self._get_pk_col()

        with connection.cursor() as cur:
            cur.execute(f'SELECT * FROM "{self.table_name}" WHERE "{pk_col}"=%s', [pk])
            rows = dictfetchall(cur)
        return Response(rows[0] if rows else {"detail": "No encontrado"})

    @transaction.atomic
    def patch(self, request, table: str, pk: int):
        self.table_name = table
        err = self._ensure_table()
        if err: return err
        body = request.data

        pk_col = self._get_pk_col()
        cols = self._valid_payload_cols(body, include_pk=False)
        set_sql = ", ".join([f'"{c}"=%s' for c in cols])
        values = [body[c] for c in cols] + [pk]

        with connection.cursor() as cur:
            cur.execute(
                f'UPDATE "{self.table_name}" SET {set_sql} WHERE "{pk_col}"=%s RETURNING "{pk_col}"',
                values
            )
            if cur.fetchone() is None:
                return Response({"detail": "No encontrado"}, status=404)
            cur.execute(f'SELECT * FROM "{self.table_name}" WHERE "{pk_col}"=%s', [pk])
            updated = dictfetchall(cur)[0]

        return Response(updated)

    @transaction.atomic
    def delete(self, request, table: str, pk: int):
        self.table_name = table
        err = self._ensure_table()
        if err: return err
        pk_col = self._get_pk_col()

        with connection.cursor() as cur:
            cur.execute(f'DELETE FROM "{self.table_name}" WHERE "{pk_col}"=%s RETURNING "{pk_col}"', [pk])
            if not cur.fetchone():
                return Response({"detail": "No encontrado"}, status=404)

        return Response(status=204)

# =====================
# Login personalizado para frontend
# =====================

from .serializers import CustomLoginSerializer

class CustomLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = CustomLoginSerializer(data=request.data)
        if serializer.is_valid():
            return Response(serializer.validated_data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
