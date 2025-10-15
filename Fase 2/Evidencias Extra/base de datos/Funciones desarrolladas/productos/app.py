import pandas as pd
import numpy as np
import os

def procesar_productos_unicos():
    # Cargar el archivo Excel original
    df = pd.read_excel('productos_bodega.xlsx')  # Cambia por tu archivo
    
    # Mapeo de columnas del Excel a la estructura de la tabla
    mapeo_columnas = {
        'CODIGO DE BARRA': 'prod_codigobarra',
        'DESCRIPCIÓN': 'prod_desc',
        'P. COMPRA UN (NETO)': 'prod_prec_compra_unitario',
        'P.VENTA UN (NETO)': 'prod_prec_venta_neto',
        'P.VENTA UN (FINAL)': 'prod_prec_venta_final',
        'PRODUCTO AFECTO': 'prod_afecto_iva',
        'UNIDAD MEDIDA': 'prod_tipo_unidad',
        'MARCA': 'prod_marca',
        'TALLA': 'prod_talla',
        'COLOR': 'prod_color',
        'CATEGORIAS': 'categoria_nombre'  # Agregamos la categoría
    }
    
    # Crear nuevo DataFrame con las columnas mapeadas
    df_procesado = df[list(mapeo_columnas.keys())].copy()
    df_procesado = df_procesado.rename(columns=mapeo_columnas)
    
    # Agregar nombre del producto (puedes ajustar esto según necesites)
    # Usamos la descripción como nombre o extraemos parte de ella
    df_procesado['prod_nom'] = df_procesado['prod_desc'].str.slice(0, 100)
    
    # PROCESAR CAMPO DE IVA - VERSIÓN CORREGIDA
    df_procesado['prod_afecto_iva'] = df_procesado['prod_afecto_iva'].fillna('NO')
    df_procesado['prod_afecto_iva'] = (
        df_procesado['prod_afecto_iva']
        .astype(str)
        .str.upper()
        .str.contains('SI|AFECTO|SÍ', na=False)
    )
    
    # Limpiar y estandarizar datos
    df_procesado['prod_codigobarra'] = df_procesado['prod_codigobarra'].astype(str).str.strip()
    df_procesado['prod_desc'] = df_procesado['prod_desc'].astype(str).str.strip()
    df_procesado['prod_marca'] = df_procesado['prod_marca'].astype(str).str.strip().fillna('SIN MARCA')
    df_procesado['prod_talla'] = df_procesado['prod_talla'].astype(str).str.strip().fillna('UNICA')
    df_procesado['prod_color'] = df_procesado['prod_color'].astype(str).str.strip().fillna('SIN COLOR')
    df_procesado['prod_tipo_unidad'] = df_procesado['prod_tipo_unidad'].astype(str).str.strip().fillna('UNIDAD')
    df_procesado['categoria_nombre'] = df_procesado['categoria_nombre'].astype(str).str.strip().fillna('SIN CATEGORIA')
    
    # Limpiar valores numéricos (remover caracteres no numéricos)
    columnas_numericas = ['prod_prec_compra_unitario', 'prod_prec_venta_neto', 'prod_prec_venta_final']
    
    for col in columnas_numericas:
        if col in df_procesado.columns:
            df_procesado[col] = pd.to_numeric(df_procesado[col], errors='coerce')
            df_procesado[col] = df_procesado[col].fillna(0)
    
    # Obtener productos únicos basados en código de barras
    # Si no hay código de barras, usar descripción + marca + talla + color
    mascara_codigo_valido = (df_procesado['prod_codigobarra'].notna() & 
                           (df_procesado['prod_codigobarra'] != 'nan') & 
                           (df_procesado['prod_codigobarra'] != ''))
    
    # Para productos con código de barras válido, usar ese campo para identificar únicos
    df_con_codigo = df_procesado[mascara_codigo_valido].copy()
    df_sin_codigo = df_procesado[~mascara_codigo_valido].copy()
    
    # Crear clave única para productos sin código
    if not df_sin_codigo.empty:
        df_sin_codigo['clave_unica'] = (
            df_sin_codigo['prod_desc'].str.upper() + '|' + 
            df_sin_codigo['prod_marca'].str.upper() + '|' + 
            df_sin_codigo['prod_talla'].str.upper() + '|' + 
            df_sin_codigo['prod_color'].str.upper()
        )
    
    # Combinar resultados
    productos_unicos = pd.DataFrame()
    
    # Agregar productos con código de barras (únicos por código)
    if not df_con_codigo.empty:
        productos_con_codigo = df_con_codigo.drop_duplicates(
            subset=['prod_codigobarra'], 
            keep='first'
        )
        productos_unicos = pd.concat([productos_unicos, productos_con_codigo], ignore_index=True)
    
    # Agregar productos sin código (únicos por clave única)
    if not df_sin_codigo.empty:
        productos_sin_codigo = df_sin_codigo.drop_duplicates(
            subset=['clave_unica'], 
            keep='first'
        )
        productos_sin_codigo = productos_sin_codigo.drop('clave_unica', axis=1)
        productos_unicos = pd.concat([productos_unicos, productos_sin_codigo], ignore_index=True)
    
    # Si no usamos el método anterior, usar descripción completa para identificar únicos
    if productos_unicos.empty:
        productos_unicos = df_procesado.drop_duplicates(
            subset=['prod_desc', 'prod_marca', 'prod_talla', 'prod_color'], 
            keep='first'
        )
    
    # Ordenar por descripción
    productos_unicos = productos_unicos.sort_values('prod_desc')
    
    # Resetear índice para tener un ID secuencial
    productos_unicos = productos_unicos.reset_index(drop=True)
    productos_unicos['prod_id'] = productos_unicos.index + 1
    
    # Reordenar columnas según la estructura de la tabla
    columnas_finales = [
        'prod_id', 'prod_codigobarra', 'prod_nom', 'prod_desc',
        'prod_prec_compra_unitario', 'prod_prec_venta_neto', 'prod_prec_venta_final',
        'prod_afecto_iva', 'prod_tipo_unidad', 'prod_marca', 'prod_talla', 'prod_color',
        'categoria_nombre'
    ]
    
    # Asegurar que todas las columnas existan
    for col in columnas_finales:
        if col not in productos_unicos.columns:
            productos_unicos[col] = None
    
    productos_unicos = productos_unicos[columnas_finales]
    
    # Crear carpeta para los archivos separados por categoría
    carpeta_categorias = 'productos_por_categoria'
    if not os.path.exists(carpeta_categorias):
        os.makedirs(carpeta_categorias)
    
    # Guardar productos únicos completos en un Excel
    productos_unicos.to_excel('productos_unicos_completos.xlsx', index=False)
    
    # Separar por categoría y guardar en archivos individuales
    categorias = productos_unicos['categoria_nombre'].unique()
    
    print(f"\nSeparando productos por categorías...")
    for categoria in categorias:
        # Filtrar productos de esta categoría
        productos_categoria = productos_unicos[productos_unicos['categoria_nombre'] == categoria]
        
        # Limpiar nombre de categoría para usar como nombre de archivo
        nombre_archivo = limpiar_nombre_archivo(categoria)
        
        # Guardar en Excel separado
        ruta_archivo = os.path.join(carpeta_categorias, f'productos_{nombre_archivo}.xlsx')
        productos_categoria.to_excel(ruta_archivo, index=False)
        
        print(f"  - {categoria}: {len(productos_categoria)} productos")
    
    print(f"\nProcesamiento completado!")
    print(f"Productos originales: {len(df)}")
    print(f"Productos únicos encontrados: {len(productos_unicos)}")
    print(f"Categorías encontradas: {len(categorias)}")
    print(f"Archivo principal guardado: 'productos_unicos_completos.xlsx'")
    print(f"Archivos por categoría guardados en carpeta: '{carpeta_categorias}'")
    
    return productos_unicos

def limpiar_nombre_archivo(nombre):
    """Limpia el nombre para que sea válido como nombre de archivo"""
    # Caracteres no permitidos en nombres de archivo
    caracteres_invalidos = ['<', '>', ':', '"', '/', '\\', '|', '?', '*']
    
    nombre_limpio = nombre
    for char in caracteres_invalidos:
        nombre_limpio = nombre_limpio.replace(char, '_')
    
    # Limitar longitud del nombre
    if len(nombre_limpio) > 50:
        nombre_limpio = nombre_limpio[:50]
    
    # Remover espacios extras
    nombre_limpio = nombre_limpio.strip()
    
    # Si queda vacío, usar nombre por defecto
    if not nombre_limpio:
        nombre_limpio = 'SIN_CATEGORIA'
    
    return nombre_limpio

# Ejecutar el procesamiento
if __name__ == "__main__":
    try:
        productos_unicos = procesar_productos_unicos()
        
        # Mostrar muestra de los datos
        print("\nPrimeros 5 productos únicos:")
        print(productos_unicos.head()[['prod_id', 'prod_codigobarra', 'prod_nom', 'categoria_nombre']])
        
        # Mostrar resumen por categoría
        print("\nResumen por categoría:")
        resumen_categorias = productos_unicos['categoria_nombre'].value_counts()
        for categoria, cantidad in resumen_categorias.items():
            print(f"  - {categoria}: {cantidad} productos")
        
    except FileNotFoundError:
        print("Error: No se encontró el archivo 'productos_bodega.xlsx'")
        print("Por favor, asegúrate de que el archivo esté en la misma carpeta que este script")
    except Exception as e:
        print(f"Error durante el procesamiento: {str(e)}")