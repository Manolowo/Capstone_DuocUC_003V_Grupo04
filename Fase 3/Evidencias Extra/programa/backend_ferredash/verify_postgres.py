# verify_postgres.py
# Verificador integral para BD Ferredash en PostgreSQL
# - Lee credenciales desde .env
# - Verifica conexión y versión
# - Chequea permisos básicos (SELECT/INSERT/UPDATE/DELETE)
# - Valida existencia de tablas esperadas
# - Entrega conteos, muestra de filas y relaciones FK más importantes
#
# Ejecución:
#   (.venv) python verify_postgres.py

import os
import sys
from textwrap import indent
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor

# === 1) Configuración esperada de Ferredash ===
SCHEMA = "public"
EXPECTED_TABLES = [
    "boleta",
    "boleta_pago",
    "caja",
    "categoria",
    "cliente",
    "condicion",
    "estado",
    "inventario",
    "producto",
    "rol",
    "sucursal",
    "tipo_pago",
    "usuario",
    "venta",
]

# Relaciones que hemos visto por nombre de FK en tus pantallazos/backups:
# venta.prod_id -> producto.id
# venta.bol_id  -> boleta.id
# usuario.suc_id -> sucursal.id
# usuario.rol_id -> rol.id
# producto.cat_id -> categoria.id
# inventario.suc_id -> sucursal.id
# inventario.prod_id -> producto.id
# caja.suc_id -> sucursal.id
RELATIONS = [
    # venta: foreign keys
    ("venta", "prod_id", "producto", "prod_id"),
    ("venta", "bol_id",  "boleta",   "bol_id"),

    # usuario: foreign keys
    ("usuario", "suc_id", "sucursal", "suc_id"),
    ("usuario", "rol_id", "rol",      "rol_id"),

    # producto: foreign key
    ("producto", "cat_id", "categoria", "cat_id"),

    # inventario: foreign keys
    ("inventario", "suc_id", "sucursal", "suc_id"),
    ("inventario", "prod_id", "producto", "prod_id"),

    # caja: foreign key
    ("caja", "suc_id", "sucursal", "suc_id"),
]


# === 2) Cargar .env ===
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
DB_PORT = os.getenv("DB_PORT", "5432")

def headline(txt):
    print("\n" + "="*len(txt))
    print(txt)
    print("="*len(txt))

def connect():
    try:
        conn = psycopg2.connect(
            dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD,
            host=DB_HOST, port=DB_PORT
        )
        conn.autocommit = True
        return conn
    except Exception as e:
        print("\n❌ Error de conexión a PostgreSQL.")
        print(f"   HOST={DB_HOST} PORT={DB_PORT} DB={DB_NAME} USER={DB_USER}")
        print(f"   Detalle: {e}")
        sys.exit(1)

def fetchone(cur, query, params=None):
    cur.execute(query, params or ())
    return cur.fetchone()

def fetchall(cur, query, params=None):
    cur.execute(query, params or ())
    return cur.fetchall()

def check_server(cur):
    headline("1) INFO SERVIDOR Y USUARIO")
    v = fetchone(cur, "SELECT version();")
    who = fetchone(cur, "SELECT current_database() AS db, current_user AS user;")
    print(f"Versión:\n  {v[0]}")
    print(f"Base/Usuario:\n  DB={who[0]} | USER={who[1]}")

def check_privileges(cur):
    headline("2) PERMISOS BÁSICOS DEL USUARIO EN SCHEMA public")
    # Chequear permisos a nivel de esquema
    schema_ok = fetchone(cur, """
        SELECT has_schema_privilege(current_user, %s, 'USAGE')
    """, (SCHEMA,))[0]
    print(f"USAGE sobre schema '{SCHEMA}': {'OK' if schema_ok else 'NO'}")

    # Para cada tabla, chequear privilegios de tabla
    for t in EXPECTED_TABLES:
        q = """
        SELECT
          has_table_privilege(current_user, %s, 'SELECT')  AS sel,
          has_table_privilege(current_user, %s, 'INSERT')  AS ins,
          has_table_privilege(current_user, %s, 'UPDATE')  AS upd,
          has_table_privilege(current_user, %s, 'DELETE')  AS del
        """
        tbl = f'"{SCHEMA}"."{t}"'
        r = fetchone(cur, q, (tbl, tbl, tbl, tbl))
        flags = "".join([
            "R" if r[0] else "-",
            "I" if r[1] else "-",
            "U" if r[2] else "-",
            "D" if r[3] else "-",
        ])
        print(f"  {tbl:<35} permisos: {flags}  (R=SELECT, I=INSERT, U=UPDATE, D=DELETE)")

def list_existing_tables(cur):
    rows = fetchall(cur, """
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = %s
        ORDER BY table_name;
    """, (SCHEMA,))
    return [r[0] for r in rows]

def check_tables_and_counts(cur):
    headline("3) EXISTENCIA DE TABLAS Y CANTIDAD DE REGISTROS")
    existing = set(list_existing_tables(cur))
    missing = [t for t in EXPECTED_TABLES if t not in existing]
    extra = sorted(existing.difference(EXPECTED_TABLES))

    for t in EXPECTED_TABLES:
        if t in existing:
            cnt = fetchone(cur, f'SELECT COUNT(*) FROM "{SCHEMA}"."{t}";')[0]
            print(f"  ✓ {t:<15} → {cnt} filas")
        else:
            print(f"  ✗ {t:<15} → NO EXISTE en schema {SCHEMA}")

    if extra:
        print("\n  (Tablas adicionales encontradas en schema public):")
        for t in extra:
            print(f"    • {t}")

    return existing

def show_samples(cur, existing):
    headline("4) MUESTRA (hasta 5 filas por tabla)")
    for t in EXPECTED_TABLES:
        if t not in existing:
            continue
        print(f"\nTabla: {t}")
        # Obtener nombres de columnas ordenados por ordinal_position
        cols = fetchall(cur, """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = %s AND table_name = %s
            ORDER BY ordinal_position
        """, (SCHEMA, t))
        colnames = [c[0] for c in cols]
        print("  Columnas:", ", ".join(colnames) if colnames else "(desconocidas)")

        # Mostrar hasta 5 filas
        cur.execute(f'SELECT * FROM "{SCHEMA}"."{t}" LIMIT 5;')
        rows = cur.fetchall()
        if not rows:
            print("  (sin filas)")
            continue
        # Formato compacto por fila
        for i, row in enumerate(rows, 1):
            data = ", ".join(f"{c}={repr(v)}" for c, v in zip(colnames, row))
            print(indent(f"{i:>2}. {data}", "  "))

def check_relations(cur, existing):
    headline("5) VALIDACIÓN DE RELACIONES (FK) COMUNES")
    for (tbl, col, ref_tbl, ref_col) in RELATIONS:
        if tbl not in existing or ref_tbl not in existing:
            print(f"  [omitido] {tbl}.{col} -> {ref_tbl}.{ref_col} (tabla faltante)")
            continue

        # Verificar existencia de columnas
        def col_exists(table, column):
            r = fetchone(cur, """
              SELECT 1
              FROM information_schema.columns
              WHERE table_schema=%s AND table_name=%s AND column_name=%s
            """, (SCHEMA, table, column))
            return r is not None

        if not col_exists(tbl, col):
            print(f"  [omitido] {tbl}.{col}: columna no existe")
            continue
        if not col_exists(ref_tbl, ref_col):
            print(f"  [omitido] {ref_tbl}.{ref_col}: columna no existe")
            continue

        # Orfandad: valores que apuntan a nada
        q_orphans = f'''
          SELECT COUNT(*) 
          FROM "{SCHEMA}"."{tbl}" t
          LEFT JOIN "{SCHEMA}"."{ref_tbl}" r
            ON r."{ref_col}" = t."{col}"
          WHERE t."{col}" IS NOT NULL AND r."{ref_col}" IS NULL;
        '''
        orphans = fetchone(cur, q_orphans)[0]

        # Nulos en la FK (si te interesa advertirlos)
        q_nulls = f'SELECT COUNT(*) FROM "{SCHEMA}"."{tbl}" WHERE "{col}" IS NULL;'
        nulls = fetchone(cur, q_nulls)[0]

        print(f"  {tbl}.{col} -> {ref_tbl}.{ref_col}:  orfanos={orphans}  nulos={nulls}")

        # Si hay orfanos, mostrar hasta 5 ejemplos para inspección
        if orphans > 0:
            print("    Ejemplos de filas huérfanas (hasta 5):")
            # obtener nombres de columnas para formateo
            cols = fetchall(cur, """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = %s AND table_name = %s
                ORDER BY ordinal_position
            """, (SCHEMA, tbl))
            colnames = [c[0] for c in cols]

            q_ex = f'''
              SELECT t.*
              FROM "{SCHEMA}"."{tbl}" t
              LEFT JOIN "{SCHEMA}"."{ref_tbl}" r
                ON r."{ref_col}" = t."{col}"
              WHERE t."{col}" IS NOT NULL AND r."{ref_col}" IS NULL
              LIMIT 5;
            '''
            cur.execute(q_ex)
            ex_rows = cur.fetchall()
            for i, row in enumerate(ex_rows, 1):
                # row is a tuple aligned with colnames
                data = ", ".join(f"{c}={repr(v)}" for c, v in zip(colnames, row))
                print(indent(f"{i:>2}. {data}", "      "))

    # fin for RELATIONS

def main():
    conn = connect()
    try:
        cur = conn.cursor()
        check_server(cur)
        check_privileges(cur)
        existing = check_tables_and_counts(cur)
        show_samples(cur, existing)
        check_relations(cur, existing)
    finally:
        try:
            conn.close()
        except Exception:
            pass

if __name__ == "__main__":
    main()
