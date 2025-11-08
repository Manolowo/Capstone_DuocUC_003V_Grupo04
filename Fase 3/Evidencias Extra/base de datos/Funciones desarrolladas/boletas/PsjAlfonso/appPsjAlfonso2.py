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
    
    # Identificar columna de producto
    columnas_producto = [col for col in df_boletas.columns if 'producto' in col.lower()]
    if not columnas_producto:
        print("❌ No se encontró columna de producto")
        return None
    columna_producto = columnas_producto[0]
    print(f"   Usando columna producto: '{columna_producto}'")
    
    df_filtrado = df_boletas.copy()
    df_filtrado[columna_folio] = pd.to_numeric(df_filtrado[columna_folio], errors='coerce')
    filas_antes = len(df_filtrado)
    df_filtrado = df_filtrado[df_filtrado[columna_folio].notna() & (df_filtrado[columna_folio] > 0)].copy()
    filas_despues = len(df_filtrado)
    print(f"📊 Registros con folio válido: {filas_despues}")
    print(f"🗑️  Registros eliminados (sin folio válido): {filas_antes - filas_despues}")
    
    # 2. Buscar productos en el catálogo
    print("\n🔍 Buscando productos en el catálogo...")
    mapeo_productos = {str(p['prod_nom']).strip().upper(): {'prod_id': p['prod_id'], 'cat_id': p['cat_id']} for _, p in df_productos.iterrows()}
    
    df_filtrado['nombre_limpio'] = df_filtrado[columna_producto].astype(str).str.strip().str.upper()
    df_filtrado['prod_id'] = df_filtrado['nombre_limpio'].map(lambda x: mapeo_productos.get(x, {}).get('prod_id'))
    df_filtrado['cat_id'] = df_filtrado['nombre_limpio'].map(lambda x: mapeo_productos.get(x, {}).get('cat_id'))
    
    productos_no_encontrados_mask = df_filtrado['prod_id'].isna()
    productos_no_encontrados_set = set(df_filtrado[productos_no_encontrados_mask]['nombre_limpio'].unique())
    
    print(f"📊 Productos encontrados en catálogo: {df_filtrado['prod_id'].notna().sum()}")
    print(f"📊 Productos NO encontrados: {productos_no_encontrados_mask.sum()}")
    
    df_filtrado['cat_id'] = df_filtrado['cat_id'].fillna(45)
    
    # 3. Renombrar y agregar columnas
    print("\n📝 Renombrando columnas...")
    columnas_documento = [col for col in df_boletas.columns if 'documento' in col.lower() or 'tipo' in col.lower()]
    columna_documento = columnas_documento[0] if columnas_documento else None
    
    columnas_fecha = [col for col in df_boletas.columns if 'fecha' in col.lower()]
    columna_fecha = columnas_fecha[0] if columnas_fecha else None
    
    columnas_hora = [col for col in df_boletas.columns if 'hora' in col.lower()]  # ✅ NUEVA LÍNEA
    columna_hora = columnas_hora[0] if columnas_hora else None  # ✅ NUEVA LÍNEA
    
    columnas_total = [col for col in df_boletas.columns if 'total' in col.lower()]
    columna_total = columnas_total[0] if columnas_total else None
    
    columnas_pdf = [col for col in df_boletas.columns if any(x in col.lower() for x in ['pdf', 'enlace', 'url', 'hipervinculo'])]
    columna_pdf = columnas_pdf[0] if columnas_pdf else None
    
    print(f"   Columna documento: '{columna_documento}'")
    print(f"   Columna fecha: '{columna_fecha}'")
    print(f"   Columna hora: '{columna_hora}'")  # ✅ NUEVA LÍNEA
    print(f"   Columna total: '{columna_total}'")
    print(f"   Columna PDF: '{columna_pdf}'")
    
    df_boleta = pd.DataFrame()
    df_boleta['bol_id'] = range(1, len(df_filtrado) + 1)
    df_boleta['doc_tipo'] = df_filtrado[columna_documento] if columna_documento else 'Boleta'
    df_boleta['bol_folio'] = df_filtrado[columna_folio].astype(int)
    
    # ✅ FECHA Y HORA
    fecha_actual = datetime.now().date()
    if columna_fecha:
        fechas = pd.to_datetime(df_filtrado[columna_fecha], errors='coerce')
        df_boleta['bol_fecha'] = fechas.dt.date.fillna(fecha_actual)
        df_boleta['bol_fecha_venc'] = fechas.dt.date.fillna(fecha_actual)
    else:
        df_boleta['bol_fecha'] = [fecha_actual] * len(df_filtrado)
        df_boleta['bol_fecha_venc'] = [fecha_actual] * len(df_filtrado)
    
    # ✅ NUEVA: COLUMNA HORA
    if columna_hora:
        df_boleta['bol_hora'] = df_filtrado[columna_hora].astype(str).fillna('')
    else:
        df_boleta['bol_hora'] = ''
    
    # Cliente ID (fijo)
    df_boleta['cli_id'] = 1
    
    # Total
    df_boleta['bol_total'] = pd.to_numeric(df_filtrado[columna_total], errors='coerce').fillna(0) if columna_total else 0
    
    # Resto de columnas
    df_boleta['bol_despacho'] = 'compra en tienda'
    df_boleta['con_id'] = 1
    df_boleta['est_id'] = 1
    df_boleta['bol_pdf'] = df_filtrado[columna_pdf] if columna_pdf else ''
    df_boleta['suc_id'] = 2
    df_boleta['caja_id'] = 1
    df_boleta['usu_id'] = 3
    df_boleta['prod_nom'] = df_filtrado[columna_producto]
    df_boleta['prod_id'] = df_filtrado['prod_id']
    df_boleta['cat_id'] = df_filtrado['cat_id']
    
    # Guardar resultado
    output_file = 'boletas_procesadas.xlsx'
    df_boleta.to_excel(output_file, index=False)
    
    print(f"\n✅ PROCESAMIENTO COMPLETADO!")
    print(f"📁 Archivo guardado: {output_file}")
    print(f"📊 Registros procesados: {len(df_boleta)}")
    print(f"🕒 Ejemplo de hora (primeras 5): {df_boleta['bol_hora'].head().tolist()}")
    
    return df_boleta

# Ejecutar
if __name__ == "__main__":
    try:
        procesar_boletas()
    except Exception as e:
        print(f"❌ Error durante el procesamiento: {str(e)}")
        import traceback
        traceback.print_exc()
