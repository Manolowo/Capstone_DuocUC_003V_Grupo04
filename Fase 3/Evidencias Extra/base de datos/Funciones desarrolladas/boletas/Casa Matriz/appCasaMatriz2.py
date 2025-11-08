import pandas as pd
import numpy as np
from datetime import datetime

def procesar_boletas():
    # Cargar los archivos
    df_boletas = pd.read_excel('todas_las_boletas_combinadas.xlsx')
    df_productos = pd.read_excel('productos_final.xlsx')
    
    print(f"📊 Boletas originales: {len(df_boletas)}")
    print(f"📊 Productos en catálogo: {len(df_productos)}")
    
    # Mostrar columnas disponibles
    print(f"\n📋 COLUMNAS DISPONIBLES EN BOLETAS:")
    for i, col in enumerate(df_boletas.columns, 1):
        print(f"   {i}. '{col}'")
    
    # 1. Filtrar registros sin folio
    print("\n🔍 Filtrando registros sin folio...")
    columnas_folio = [col for col in df_boletas.columns if 'folio' in col.lower()]
    if not columnas_folio:
        print("❌ No se encontró columna de folio")
        return None
    columna_folio = columnas_folio[0]
    print(f"   Usando columna folio: '{columna_folio}'")

    columnas_producto = [col for col in df_boletas.columns if 'producto' in col.lower()]
    if not columnas_producto:
        print("❌ No se encontró columna de producto")
        return None
    columna_producto = columnas_producto[0]
    print(f"   Usando columna producto: '{columna_producto}'")
    
    # Filtrar folios válidos
    df_filtrado = df_boletas.copy()
    df_filtrado[columna_folio] = pd.to_numeric(df_filtrado[columna_folio], errors='coerce')
    filas_antes = len(df_filtrado)
    df_filtrado = df_filtrado[df_filtrado[columna_folio].notna() & (df_filtrado[columna_folio] > 0)].copy()
    filas_despues = len(df_filtrado)
    print(f"📊 Registros con folio válido: {filas_despues}")
    print(f"🗑️  Registros eliminados (sin folio válido): {filas_antes - filas_despues}")
    
    # 2. Buscar productos en catálogo
    print("\n🔍 Buscando productos en el catálogo...")
    mapeo_productos = {}
    productos_no_encontrados_set = set()
    for _, producto in df_productos.iterrows():
        nombre = str(producto['prod_nom']).strip().upper()
        mapeo_productos[nombre] = {'prod_id': producto['prod_id'], 'cat_id': producto['cat_id']}
    
    df_filtrado['nombre_limpio'] = df_filtrado[columna_producto].astype(str).str.strip().str.upper()
    df_filtrado['prod_id'] = df_filtrado['nombre_limpio'].map(lambda x: mapeo_productos.get(x, {}).get('prod_id'))
    df_filtrado['cat_id'] = df_filtrado['nombre_limpio'].map(lambda x: mapeo_productos.get(x, {}).get('cat_id'))
    
    productos_no_encontrados_mask = df_filtrado['prod_id'].isna()
    if productos_no_encontrados_mask.any():
        productos_no_encontrados_list = df_filtrado[productos_no_encontrados_mask]['nombre_limpio'].unique()
        productos_no_encontrados_set = set(productos_no_encontrados_list)
    
    productos_encontrados = df_filtrado['prod_id'].notna().sum()
    productos_no_encontrados = df_filtrado['prod_id'].isna().sum()
    
    print(f"📊 Productos encontrados: {productos_encontrados}")
    print(f"📊 Productos NO encontrados: {productos_no_encontrados}")
    
    df_filtrado['cat_id'] = df_filtrado['cat_id'].fillna(45)
    
    # 3. Renombrar y agregar columnas
    print("\n📝 Renombrando columnas...")
    columnas_documento = [col for col in df_boletas.columns if 'documento' in col.lower() or 'tipo' in col.lower()]
    columna_documento = columnas_documento[0] if columnas_documento else None

    columnas_fecha = [col for col in df_boletas.columns if 'fecha' in col.lower()]
    columna_fecha = columnas_fecha[0] if columnas_fecha else None

    columnas_hora = [col for col in df_boletas.columns if 'hora' in col.lower()]
    columna_hora = columnas_hora[0] if columnas_hora else None

    columnas_total = [col for col in df_boletas.columns if 'total' in col.lower()]
    columna_total = columnas_total[0] if columnas_total else None

    columnas_pdf = [col for col in df_boletas.columns if 'pdf' in col.lower() or 'enlace' in col.lower() or 'url' in col.lower() or 'hipervinculo' in col.lower()]
    columna_pdf = columnas_pdf[0] if columnas_pdf else None

    print(f"   Columna documento: '{columna_documento}'")
    print(f"   Columna fecha: '{columna_fecha}'")
    print(f"   Columna hora: '{columna_hora}'")
    print(f"   Columna total: '{columna_total}'")
    print(f"   Columna PDF: '{columna_pdf}'")
    
    df_boleta = pd.DataFrame()
    df_boleta['bol_id'] = range(1, len(df_filtrado) + 1)
    df_boleta['doc_tipo'] = df_filtrado[columna_documento] if columna_documento else 'Boleta'
    df_boleta['bol_folio'] = df_filtrado[columna_folio].astype(int)
    
    # Fecha
    if columna_fecha:
        fechas = pd.to_datetime(df_filtrado[columna_fecha], errors='coerce')
        bol_fecha = []
        bol_fecha_venc = []
        fecha_actual = datetime.now().date()
        fechas_invalidas = 0
        for fecha in fechas:
            if pd.isna(fecha):
                bol_fecha.append(fecha_actual)
                bol_fecha_venc.append(fecha_actual)
                fechas_invalidas += 1
            else:
                fecha_date = fecha.date()
                bol_fecha.append(fecha_date)
                bol_fecha_venc.append(fecha_date)
        df_boleta['bol_fecha'] = bol_fecha
        df_boleta['bol_fecha_venc'] = bol_fecha_venc
        if fechas_invalidas > 0:
            print(f"   ⚠️  {fechas_invalidas} fechas inválidas reemplazadas con fecha actual")
    else:
        fecha_actual = datetime.now().date()
        df_boleta['bol_fecha'] = [fecha_actual] * len(df_filtrado)
        df_boleta['bol_fecha_venc'] = [fecha_actual] * len(df_filtrado)
    
    # HORA
    if columna_hora:
        df_boleta['Hora'] = df_filtrado[columna_hora].astype(str)
    else:
        df_boleta['Hora'] = ""
        print("   ⚠️  No se encontró columna 'Hora', se deja vacía.")
    
    # Cliente, total y demás
    df_boleta['cli_id'] = 1
    df_boleta['bol_total'] = pd.to_numeric(df_filtrado[columna_total], errors='coerce').fillna(0) if columna_total else 0
    df_boleta['bol_despacho'] = 'compra en tienda'
    df_boleta['con_id'] = 1
    df_boleta['est_id'] = 1
    df_boleta['bol_pdf'] = df_filtrado[columna_pdf] if columna_pdf else ''
    df_boleta['suc_id'] = 1
    df_boleta['caja_id'] = 1
    df_boleta['usu_id'] = 2
    df_boleta['prod_nom'] = df_filtrado[columna_producto]
    df_boleta['prod_id'] = df_filtrado['prod_id']
    df_boleta['cat_id'] = df_filtrado['cat_id']
    
    # Guardar
    output_file = 'boletas_procesadas.xlsx'
    df_boleta.to_excel(output_file, index=False)
    
    print(f"\n✅ PROCESAMIENTO COMPLETADO!")
    print(f"📊 Registros procesados: {len(df_boleta)}")
    print(f"📁 Archivo guardado: {output_file}")
    
    # Resumen
    print(f"\n📋 RESUMEN FINAL:")
    print(f"   - Total boletas: {len(df_boleta)}")
    print(f"   - Rango de folios: {df_boleta['bol_folio'].min()} - {df_boleta['bol_folio'].max()}")
    print(f"   - Rango de fechas: {df_boleta['bol_fecha'].min()} - {df_boleta['bol_fecha'].max()}")
    print(f"   - Productos encontrados: {productos_encontrados} ({productos_encontrados/len(df_boleta)*100:.1f}%)")
    print(f"   - Productos NO encontrados: {productos_no_encontrados} ({productos_no_encontrados/len(df_boleta)*100:.1f}%)")
    
    # Muestra con hora incluida
    print(f"\n📝 MUESTRA DE DATOS:")
    columnas_muestra = ['bol_id', 'bol_folio', 'Hora', 'prod_nom', 'prod_id', 'cat_id', 'bol_total', 'bol_pdf']
    muestra = df_boleta.head()[columnas_muestra]
    for _, row in muestra.iterrows():
        pdf_truncado = str(row['bol_pdf'])[:50] + "..." if len(str(row['bol_pdf'])) > 50 else str(row['bol_pdf'])
        prod_nombre = str(row['prod_nom'])[:30] if pd.notna(row['prod_nom']) else "(sin nombre)"
        print(f"   ID {row['bol_id']} | Folio {row['bol_folio']} | Hora {row['Hora']} | Prod: {prod_nombre}... | PDF: {pdf_truncado}")
    
    return df_boleta

if __name__ == "__main__":
    try:
        procesar_boletas()
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
