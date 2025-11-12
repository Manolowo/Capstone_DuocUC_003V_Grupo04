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
        try:
            with connection.cursor() as cur:
                cur.execute("SET client_encoding TO 'UTF8'")
        except Exception:
            pass
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
        try:
            with connection.cursor() as cur:
                cur.execute("SET client_encoding TO 'UTF8'")
        except Exception:
            pass
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
        try:
            with connection.cursor() as cur:
                cur.execute("SET client_encoding TO 'UTF8'")
        except Exception:
            pass
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
    "boleta_pago", "boleta", "caja", "categoria", "cliente", "condicion", "estado",
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
        # Ensure client encoding is UTF8 for this DB session so multibyte characters
        # (like emojis or certain accented characters) aren't mangled.
        try:
            with connection.cursor() as cur:
                cur.execute("SET client_encoding TO 'UTF8'")
        except Exception:
            # ignore if the DB doesn't support this command
            pass

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

        # detect a sensible date and time columns to allow ordering by newest first
        date_col = None
        time_col = None

        # Priorizar nombres específicos para venta
        if self.table_name == "venta":
            if "ven_fecha" in cols:
                date_col = "ven_fecha"
            if "ven_hora" in cols:
                time_col = "ven_hora"

        # Si no se encontraron, buscar nombres genéricos
        if not date_col:
            date_col = next((c for c in cols if any(k in c.lower() for k in ("fecha","created_at","date","ven_fecha","bol_fecha"))), None)
        if not time_col:
            time_col = next((c for c in cols if any(k in c.lower() for k in ("hora","time","ven_hora","bol_hora"))), None)

        # detect price/discount columns for filters
        price_col = next((c for c in cols if any(k in c.lower() for k in ("bol_total","monto","total","precio","subtotal","importe"))), None)
        discount_col = next((c for c in cols if any(k in c.lower() for k in ("descuen","discount","ven_descuento"))), None)

        # build dynamic WHERE clauses based on query params (only when matching columns exist)
        where_clauses = []
        params = []
        join_sql = ""
        table_alias = "t"

        # If listing ventas, alias as v for joins
        if self.table_name == "venta":
            table_alias = "v"

        # date range filters
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        if date_col and start_date:
            where_clauses.append(f'{table_alias}."{date_col}" >= %s')
            params.append(start_date)
        if date_col and end_date:
            where_clauses.append(f'{table_alias}."{date_col}" <= %s')
            params.append(end_date)

        # price filters
        min_price = request.query_params.get("min_price")
        max_price = request.query_params.get("max_price")
        if price_col and min_price:
            where_clauses.append(f'{table_alias}."{price_col}" >= %s')
            params.append(min_price)
        if price_col and max_price:
            where_clauses.append(f'{table_alias}."{price_col}" <= %s')
            params.append(max_price)

        # discount filters
        min_discount = request.query_params.get("min_discount")
        max_discount = request.query_params.get("max_discount")
        if discount_col and min_discount:
            where_clauses.append(f'{table_alias}."{discount_col}" >= %s')
            params.append(min_discount)
        if discount_col and max_discount:
            where_clauses.append(f'{table_alias}."{discount_col}" <= %s')
            params.append(max_discount)

        # category filter: accept multiple param names; for producto table it's direct; for venta we join producto
        cat_id = request.query_params.get("cat_id") or request.query_params.get("cat") or request.query_params.get("categoria")
        if cat_id:
            if self.table_name == "producto":
                if "cat_id" in cols:
                    where_clauses.append(f'{table_alias}."cat_id" = %s')
                    params.append(cat_id)
            elif self.table_name == "venta":
                # need to join producto to filter by its category
                v_prod_fk = next((c for c in cols if any(k in c.lower() for k in ("prod_id", "producto_id", "prod", "producto"))), None)
                if v_prod_fk:
                    # determine producto primary key name (usually 'id' or 'prod_id')
                    prod_pk = get_pk_column("producto") or "id"
                    join_sql = (join_sql or "") + f' LEFT JOIN public.producto p ON p."{prod_pk}" = {table_alias}."{v_prod_fk}" '
                    where_clauses.append('p."cat_id" = %s')
                    params.append(cat_id)
                    try:
                        print(f"[SqlCrudListView.get] Applying category filter cat_id={cat_id}, detected v_prod_fk={v_prod_fk}, prod_pk={prod_pk}, join_sql={join_sql}")
                    except Exception:
                        pass

        # sucursal filter: accept multiple param names; for boleta it's direct, for venta we join boleta
        # for producto we join inventario to find products available in a sucursal
        suc_id = request.query_params.get("suc_id") or request.query_params.get("suc") or request.query_params.get("sucursal")
        if suc_id:
            if self.table_name == "boleta":
                if "suc_id" in cols:
                    where_clauses.append(f'{table_alias}."suc_id" = %s')
                    params.append(suc_id)
            elif self.table_name == "inventario":
                # inventory table has suc_id directly
                if "suc_id" in cols:
                    where_clauses.append(f'{table_alias}."suc_id" = %s')
                    params.append(suc_id)
            elif self.table_name == "producto":
                # product listing should be filterable by sucursal via inventario
                # determine producto PK name
                prod_pk = get_pk_column("producto") or "prod_id"
                # join inventario table to filter products present in sucursal
                join_sql = (join_sql or "") + f' LEFT JOIN public.inventario inv ON inv.prod_id = {table_alias}."{prod_pk}" '
                where_clauses.append('inv."suc_id" = %s')
                params.append(suc_id)
                try:
                    print(f"[SqlCrudListView.get] Applying sucursal filter to producto via inventario suc_id={suc_id}, prod_pk={prod_pk}, join_sql={join_sql}")
                except Exception:
                    pass
            elif self.table_name == "venta":
                # detect boleta fk in venta
                v_bol_fk = next((c for c in cols if any(k in c.lower() for k in ("bol_id", "boleta_id", "bol", "boleta"))), None)
                if v_bol_fk:
                    # join boleta as b and filter by its suc_id
                    join_sql = (join_sql or "") + f' LEFT JOIN public.boleta b ON b.bol_id = {table_alias}."{v_bol_fk}" '
                    where_clauses.append('b."suc_id" = %s')
                    params.append(suc_id)
                    try:
                        print(f"[SqlCrudListView.get] Applying sucursal filter suc_id={suc_id}, detected v_bol_fk={v_bol_fk}, join_sql={join_sql}")
                    except Exception:
                        pass

        # server-side search support: if a `search` query param is present, build sensible WHERE clauses
        search_q = request.query_params.get("search")
        if search_q:
            sparam = f"%{search_q}%"
            # specialized search for ventas: include producto name/code, boleta folio and cliente name
            if self.table_name == "venta":
                # producto join
                v_prod_fk = next((c for c in cols if any(k in c.lower() for k in ("prod_id","producto_id","prod","producto"))), None)
                if v_prod_fk:
                    prod_pk = get_pk_column("producto") or "prod_id" or "id"
                    join_sql = (join_sql or "") + f' LEFT JOIN public.producto p ON p."{prod_pk}" = {table_alias}."{v_prod_fk}" '
                    where_clauses.append('(COALESCE(p."prod_nom",\'\') ILIKE %s OR COALESCE(p."prod_codigobarra",\'\') ILIKE %s)')
                    params.extend([sparam, sparam])

                # boleta join (to search folio) and cliente join (to search cliente nombre)
                v_bol_fk = next((c for c in cols if any(k in c.lower() for k in ("bol_id","boleta_id","bol","boleta"))), None)
                if v_bol_fk:
                    join_sql = (join_sql or "") + f' LEFT JOIN public.boleta b ON b.bol_id = {table_alias}."{v_bol_fk}" '
                    where_clauses.append('(COALESCE(b."bol_folio"::text,\'\') ILIKE %s)')
                    params.append(sparam)
                    # join cliente via boleta
                    join_sql = (join_sql or "") + ' LEFT JOIN public.cliente c ON c.cli_id = b.cli_id '
                    where_clauses.append('COALESCE(c."cli_nom",\'\') ILIKE %s')
                    params.append(sparam)

                # also allow searching by venta primary key exact match
                try:
                    if pk_col:
                        where_clauses.append(f'{table_alias}."{pk_col}"::text = %s')
                        params.append(search_q)
                except Exception:
                    pass
            else:
                # generic search: try to match against textual columns if any
                try:
                    col_info = get_columns(self.table_name)
                    text_cols = [c for c, t in col_info if any(k in (t or "").lower() for k in ("char", "text", "varchar"))]
                    if text_cols:
                        cond = " OR ".join(f'{table_alias}."{c}" ILIKE %s' for c in text_cols)
                        where_clauses.append('(' + cond + ')')
                        params.extend([sparam] * len(text_cols))
                    else:
                        # fallback: cast pk to text and like-search
                        if pk_col:
                            where_clauses.append(f'{table_alias}."{pk_col}"::text ILIKE %s')
                            params.append(sparam)
                except Exception:
                    # if anything goes wrong, ignore server-side search gracefully
                    pass

        # build base SQL
        base_from = f'FROM public."{self.table_name}" {table_alias}'
        if join_sql:
            base_from = base_from + join_sql

        where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

        # CORREGIDO: Lógica de ordenamiento simplificada y sin duplicados
        sort_by = request.query_params.get("sort")
        if self.table_name == "venta":
            # For venta: ORDER by date DESC NULLS LAST, then time DESC NULLS LAST
            if date_col and time_col:
                order_clause = f'ORDER BY {table_alias}."{date_col}" DESC NULLS LAST, {table_alias}."{time_col}" DESC NULLS LAST'
            elif date_col:
                order_clause = f'ORDER BY {table_alias}."{date_col}" DESC NULLS LAST'
            else:
                # Fallback to PK if no date column found
                order_clause = f'ORDER BY {table_alias}."{pk_col}" DESC'
        elif date_col and time_col:
            # For other tables with both date and time: order by date then time
            order_clause = f'ORDER BY {table_alias}."{date_col}" DESC NULLS LAST, {table_alias}."{time_col}" DESC NULLS LAST'
        elif date_col:
            # For tables with only date: order by date then PK
            order_clause = f'ORDER BY {table_alias}."{date_col}" DESC NULLS LAST, {table_alias}."{pk_col}" DESC'
        else:
            # Default: order by PK descending
            order_clause = f'ORDER BY {table_alias}."{pk_col}" DESC'

        count_sql = f'SELECT COUNT(*) {base_from} {where_sql}'
        data_sql = f'SELECT {table_alias}.* {base_from} {where_sql} {order_clause} LIMIT %s OFFSET %s'

        with connection.cursor() as cur:
            # debug: show SQL and params to help troubleshoot filters
            try:
                print(f"[SqlCrudListView.get] table={self.table_name} date_col={date_col} time_col={time_col}")
                print("[SqlCrudListView.get] order_clause:", order_clause)
                print("[SqlCrudListView.get] data_sql:", data_sql)
                print("[SqlCrudListView.get] params:", params, "limit:", limit, "offset:", offset)
            except Exception:
                pass
            # total count with same filters
            cur.execute(count_sql, params)
            total = cur.fetchone()[0]
            cur.execute(data_sql, params + [limit, offset])
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

        # If inserting into venta, ensure we include server-side date/time
        # columns (if present in the DB) so new ventas have current timestamp
        # and sort properly. We only add them when they are missing from the payload.
        if self.table_name == "venta":
            try:
                db_cols = [c for c, _ in get_columns(self.table_name)]
                
                # Buscar columna de fecha
                fecha_col = None
                if "ven_fecha" in db_cols:
                    fecha_col = "ven_fecha"
                else:
                    fecha_col = next((c for c in db_cols if any(k in c.lower() for k in ("ven_fecha","bol_fecha","fecha","created_at","date"))), None)
                
                # Buscar columna de hora  
                hora_col = None
                if "ven_hora" in db_cols:
                    hora_col = "ven_hora"
                else:
                    hora_col = next((c for c in db_cols if any(k in c.lower() for k in ("ven_hora","hora","time"))), None)
                
                # Solo agregar si no están en el payload y existen en la tabla
                current_time = now()
                if fecha_col and fecha_col not in cols and fecha_col in db_cols:
                    cols.append(fecha_col)
                    body[fecha_col] = current_time.date()
                    
                if hora_col and hora_col not in cols and hora_col in db_cols:
                    cols.append(hora_col)
                    body[hora_col] = current_time.time().replace(microsecond=0)
                    
            except Exception as e:
                print(f"Error setting date/time for venta: {e}")
                # Continuar sin fecha/hora si hay error

        # If no valid columns were found in the payload, return a helpful error
        if not cols:
            allowed = [c for c, _ in get_columns(self.table_name)]
            return Response({
                "detail": "No valid payload columns for table",
                "payload_keys": list(body.keys()),
                "allowed_columns": allowed
            }, status=400)

        cols_sql = ",".join(f'"{c}"' for c in cols)
        params_sql = ",".join(["%s"] * len(cols))
        values = [body[c] for c in cols]

        try:
            with connection.cursor() as cur:
                # Attempt to fix possible sequence desynchronization for serial PKs
                try:
                    pk_col_escaped = pk
                    seq_sql = f"SELECT pg_get_serial_sequence('public.\"{self.table_name}\"', %s)"
                    cur.execute(seq_sql, [pk_col_escaped])
                    seq_name = cur.fetchone()[0]
                    if seq_name:
                        # set sequence last_value to max(pk) so nextval() returns max+1
                        fix_sql = f"SELECT setval(%s, COALESCE((SELECT MAX(\"{pk}\") FROM public.\"{self.table_name}\"), 0), true)"
                        cur.execute(fix_sql, [seq_name])
                except Exception:
                    # non-fatal: if sequence fix fails, continue and let the insert attempt run
                    pass
                # perform insert
                cur.execute(
                    f'INSERT INTO "{self.table_name}" ({cols_sql}) VALUES ({params_sql}) RETURNING "{pk}"',
                    values
                )
                new_id = cur.fetchone()[0]
                cur.execute(f'SELECT * FROM "{self.table_name}" WHERE "{pk}"=%s', [new_id])
                created = dictfetchall(cur)[0]
        except Exception as e:
            # mark transaction for rollback so outer atomic doesn't try to commit an aborted transaction
            try:
                transaction.set_rollback(True)
            except Exception:
                pass
            # debug logging to console to inspect what's being sent
            try:
                print("[SqlCrudListView.post] ERROR inserting into table:", self.table_name)
                print("payload:", body)
                print("cols:", cols)
                print("values:", values)
                print("error:", str(e))
            except Exception:
                pass
            return Response({"detail": str(e)}, status=500)

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


    # NOTE: SchemaView moved to module level below. It was previously nested here
    # inside SqlCrudDetailView which prevented importing it from other modules.

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
# =====================
# Schema endpoint (module-level so it can be imported from urls)

class SchemaView(APIView):
    """Return column metadata for a given table name (column_name, data_type)"""
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, table: str):
        if not table_exists(table):
            return Response({"detail": "Table not found"}, status=404)
        try:
            cols = get_columns(table)
            return Response({"columns": [{"name": c, "type": t} for c, t in cols]})
        except Exception as e:
            return Response({"detail": str(e)}, status=500)

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