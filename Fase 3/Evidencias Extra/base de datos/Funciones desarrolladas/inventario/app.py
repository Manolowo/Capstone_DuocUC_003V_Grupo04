import pandas as pd
import numpy as np
import math

def procesar_inventario():
    # Cargar los archivos
    print("📂 Cargando archivos...")
    df_inventario_raw = pd.read_excel('Productos_bodega_raw.xlsx')
    df_productos = pd.read_excel('productos_final.xlsx')
    
    # Diccionario de sucursales normalizado
    sucursales = {
        'Casa Matriz': 1,
        'Sucursal Gabriela Mistral 933': 1,  # Es Casa Matriz
        'Sucursal Pasaje ALfonso': 2,        # Es Psj. Alfonso
        'Casa Matriz': 1,                    # Bodega Casa Matriz
        'sucursal 2': 1,                     # Bodega sucursal 2 = Casa Matriz
        'sucursal 1': 2,                     # Bodega sucursal 1 = Psj. Alfonso
        'BD SUCURSAL': 2                     # Bodega BD SUCURSAL = Psj. Alfonso
    }
    
    print(f"📊 Inventario raw: {len(df_inventario_raw)} registros")
    print(f"📊 Productos únicos: {len(df_productos)} productos")
    
    # Mapeo de columnas del inventario raw a la tabla inventario
    mapeo_columnas = {
        'STOCK': 'inv_stock',
        'COSTEO BOD (NETO)': 'inv_costeo_neto',
        'POR VENDER (NETO)': 'inv_por_vender_neto',
        'UTILIDAD (NETA)': 'inv_utilidad_neta',
        'MARGEN UN ($)': 'inv_margen_unitario',
        'MARGEN (%)': 'inv_margen_pct'
    }
    
    # Crear DataFrame procesado
    df_procesado = df_inventario_raw[list(mapeo_columnas.keys()) + ['SUCURSAL', 'CODIGO DE BARRA']].copy()
    df_procesado = df_procesado.rename(columns=mapeo_columnas)
    
    # Agregar suc_id basado en SUCURSAL
    df_procesado['suc_id'] = df_procesado['SUCURSAL'].map(sucursales)
    
    # Buscar prod_id basado en CODIGO DE BARRA
    print("🔍 Buscando IDs de productos...")
    
    # Crear diccionario de código de barras a prod_id
    # Limpiar códigos de barras en ambos DataFrames
    df_productos['codigo_limpio'] = df_productos['prod_codigobarra'].astype(str).str.strip().str.replace('.0', '', regex=False)
    df_procesado['codigo_limpio'] = df_procesado['CODIGO DE BARRA'].astype(str).str.strip().str.replace('.0', '', regex=False)
    
    mapeo_productos = dict(zip(
        df_productos['codigo_limpio'], 
        df_productos['prod_id']
    ))
    
    # Aplicar el mapeo
    df_procesado['prod_id'] = df_procesado['codigo_limpio'].map(mapeo_productos)
    
    # Verificar productos no encontrados
    productos_no_encontrados = df_procesado[df_procesado['prod_id'].isna()]
    if len(productos_no_encontrados) > 0:
        print(f"⚠️  Productos no encontrados: {len(productos_no_encontrados)}")
        # Guardar reporte de productos no encontrados
        productos_no_encontrados[['SUCURSAL', 'CODIGO DE BARRA']].to_excel('productos_no_encontrados_inventario.xlsx', index=False)
        print("📁 Reporte guardado: 'productos_no_encontrados_inventario.xlsx'")
    
    # Filtrar solo los registros con prod_id válido
    df_final = df_procesado[df_procesado['prod_id'].notna()].copy()
    
    # Convertir prod_id a entero (eliminar decimales si los hay)
    df_final['prod_id'] = df_final['prod_id'].astype(float).astype(int)
    
    # Limpiar y convertir datos numéricos
    columnas_numericas = ['inv_stock', 'inv_costeo_neto', 'inv_por_vender_neto', 
                         'inv_utilidad_neta', 'inv_margen_unitario', 'inv_margen_pct']
    
    for col in columnas_numericas:
        df_final[col] = pd.to_numeric(df_final[col], errors='coerce')
        df_final[col] = df_final[col].fillna(0)
    
    # Reemplazar stock negativo por 0
    df_final['inv_stock'] = df_final['inv_stock'].apply(lambda x: max(0, x))
    
    # Eliminar inv_margen_unitario (redundante)
    df_final = df_final.drop('inv_margen_unitario', axis=1)
    
    # Agrupar registros con mismo prod_id y suc_id
    print("🔄 Agrupando registros duplicados...")
    
    # Columnas a sumar al agrupar
    columnas_sumar = ['inv_stock', 'inv_costeo_neto', 'inv_por_vender_neto', 'inv_utilidad_neta']
    
    # Agrupar y sumar
    df_agrupado = df_final.groupby(['suc_id', 'prod_id'])[columnas_sumar + ['inv_margen_pct']].agg({
        'inv_stock': 'sum',
        'inv_costeo_neto': 'sum', 
        'inv_por_vender_neto': 'sum',
        'inv_utilidad_neta': 'sum',
        'inv_margen_pct': 'mean'  # Para el margen porcentual, tomamos el promedio
    }).reset_index()
    
    # 🔥 REDONDEAR HACIA ARRIBA los valores numéricos
    print("🔢 Redondeando valores hacia arriba...")
    columnas_redondear = ['inv_stock', 'inv_costeo_neto', 'inv_por_vender_neto', 'inv_utilidad_neta', 'inv_margen_pct']
    
    for col in columnas_redondear:
        df_agrupado[col] = df_agrupado[col].apply(lambda x: math.ceil(x) if pd.notna(x) else 0)
    
    # Ordenar por prod_id desde 1 en adelante
    df_agrupado = df_agrupado.sort_values('prod_id').reset_index(drop=True)
    
    # Agregar ID autoincremental
    df_agrupado['inv_id'] = df_agrupado.index + 1
    
    # Reordenar columnas
    columnas_finales = [
        'inv_id', 'suc_id', 'prod_id', 'inv_stock', 'inv_costeo_neto', 
        'inv_por_vender_neto', 'inv_utilidad_neta', 'inv_margen_pct'
    ]
    
    df_final = df_agrupado[columnas_finales]
    
    # Guardar resultados
    df_final.to_excel('inventario_para_insertar.xlsx', index=False)
    
    print(f"\n✅ Procesamiento completado!")
    print(f"📊 Registros originales: {len(df_inventario_raw)}")
    print(f"📊 Registros después de filtrado: {len(df_procesado[df_procesado['prod_id'].notna()])}")
    print(f"📊 Registros finales agrupados: {len(df_final)}")
    print(f"📊 Registros sin producto: {len(productos_no_encontrados)}")
    print(f"📁 Archivo guardado: 'inventario_para_insertar.xlsx'")
    
    # Mostrar resumen por sucursal
    print(f"\n📋 Resumen por sucursal:")
    resumen_sucursal = df_final.groupby('suc_id').size()
    for suc_id, cantidad in resumen_sucursal.items():
        nombre_suc = "Casa Matriz" if suc_id == 1 else "Psj. Alfonso"
        print(f"  - {nombre_suc} (ID {suc_id}): {cantidad} productos")
    
    # Mostrar ejemplo de agrupación con valores redondeados
    print(f"\n📝 Ejemplo de agrupación (valores redondeados):")
    ejemplo = df_final.head(3)
    for _, row in ejemplo.iterrows():
        print(f"  - Prod ID {row['prod_id']} | Suc ID {row['suc_id']} | Stock: {row['inv_stock']} | Costeo: {row['inv_costeo_neto']}")
    
    return df_final

# Ejecutar el procesamiento
if __name__ == "__main__":
    try:
        # Procesar el inventario
        inventario_final = procesar_inventario()
        
    except FileNotFoundError as e:
        print(f"❌ Error: No se encontró el archivo {e}")
        print("💡 Asegúrate de que 'Productos_bodega_raw.xlsx' y 'productos_final.xlsx' estén en la carpeta")
    except Exception as e:
        print(f"❌ Error durante el procesamiento: {str(e)}")
        import traceback
        traceback.print_exc()