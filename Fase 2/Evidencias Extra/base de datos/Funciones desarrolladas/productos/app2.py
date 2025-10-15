import pandas as pd
import os

def agregar_cat_id():
    # Cargar el archivo actualizado
    df = pd.read_excel('productos_unicos_actualizados.xlsx')
    
    # Diccionario de mapeo: nombre_categoria -> cat_id
    mapeo_categorias = {
        'PVC AZUL X METROS': 1,
        'PVC SANITARIO X METROS': 2,
        'MADERA': 3,
        'TORNILLOS': 4,
        'CLAVOS': 5,
        'ACC. BICICLETAS': 6,
        'ACC. FERRETERIA': 7,
        'ACC. HOGAR': 8,
        'ACC. PESCA': 9,
        'ACC. SOLDADURAS': 10,
        'ACC. TELEFONO': 11,
        'ACC. MASCOTAS': 12,
        'ART. ESCOLARES Y ARTES': 13,
        'ASEO': 14,
        'BATERIAS': 15,
        'BICICLETAS': 16,
        'CERRADURAS Y CHAPAS': 17,
        'CORTINAS': 18,
        'CUERDAS, LAZOS, CABOS, SOGAS': 19,
        'ELECTRICO': 20,
        'ELIMINAR COD.': 21,
        'FERRETERIA': 22,
        'FIJACIONES': 23,
        'FOLIOS': 24,
        'GASFITERIA': 25,
        'HERRAMIENTAS': 26,
        'HERRAMIENTAS ELECTRICAS': 27,
        'HOJALATERIA': 28,
        'HUINCHAS': 29,
        'JARDINERIA': 30,
        'LIMPIEZA': 31,
        'LUBRICANTES': 32,
        'MASCOTAS': 33,
        'MATERIALES CONSTRUCCION': 34,
        'MAYORISTA': 35,
        'PEGAMENTOS': 36,
        'PERNOS': 37,
        'PINTURAS': 38,
        'PLAGAS': 39,
        'SEGURIDAD': 40,
        'SILICONAS Y SELLOS': 41,
        'SISTEMAS DE ALARMAS': 42,
        'TUBERIAS': 43,
        'VEHICULO': 44,
        'Sin Categoria': 45
    }
    
    # Aplicar el mapeo
    print("Agregando cat_id según categoría...")
    df['cat_id'] = df['categoria_nombre'].map(mapeo_categorias)
    
    # Verificar si hay categorías sin mapear
    categorias_sin_mapear = df[df['cat_id'].isna()]['categoria_nombre'].unique()
    if len(categorias_sin_mapear) > 0:
        print(f"⚠️  Categorías sin mapear (se asignará ID 45): {list(categorias_sin_mapear)}")
        df['cat_id'] = df['cat_id'].fillna(45)  # Sin Categoria
    
    # Reordenar columnas para que cat_id esté antes de categoria_nombre
    columnas = list(df.columns)
    # Remover cat_id y categoria_nombre temporalmente
    columnas.remove('cat_id')
    columnas.remove('categoria_nombre')
    # Insertar en la posición deseada
    columnas.insert(columnas.index('prod_color') + 1, 'cat_id')
    columnas.insert(columnas.index('cat_id') + 1, 'categoria_nombre')
    
    df = df[columnas]
    
    # Guardar el archivo final
    df.to_excel('productos_final_con_cat_id.xlsx', index=False)
    
    # Generar script SQL
    generar_sql_productos(df)
    
    print(f"\n✅ Proceso completado!")
    print(f"📊 Total de productos: {len(df)}")
    print(f"📁 Archivo guardado: 'productos_final_con_cat_id.xlsx'")
    
    # Mostrar resumen por categoría
    print("\n📋 Resumen por categoría:")
    resumen = df.groupby(['cat_id', 'categoria_nombre']).size().reset_index(name='cantidad')
    resumen = resumen.sort_values('cantidad', ascending=False)
    
    for _, row in resumen.head(15).iterrows():
        print(f"  - ID {row['cat_id']:2d} ({row['categoria_nombre']}): {row['cantidad']} productos")
    
    if len(resumen) > 15:
        print(f"  ... y {len(resumen) - 15} categorías más")
    
    return df

def generar_sql_productos(df):
    """Genera el script SQL para insertar productos con cat_id"""
    
    sql_commands = ["-- INSERTAR PRODUCTOS CON CAT_ID", ""]
    
    for _, row in df.iterrows():
        # Escapar comillas simples en los textos
        codigobarra = str(row['prod_codigobarra']).replace("'", "''") if pd.notna(row['prod_codigobarra']) else 'NULL'
        nombre = str(row['prod_nom']).replace("'", "''") if pd.notna(row['prod_nom']) else 'NULL'
        descripcion = str(row['prod_desc']).replace("'", "''") if pd.notna(row['prod_desc']) else 'NULL'
        unidad = str(row['prod_tipo_unidad']).replace("'", "''") if pd.notna(row['prod_tipo_unidad']) else 'NULL'
        marca = str(row['prod_marca']).replace("'", "''") if pd.notna(row['prod_marca']) else 'NULL'
        talla = str(row['prod_talla']).replace("'", "''") if pd.notna(row['prod_talla']) else 'NULL'
        color = str(row['prod_color']).replace("'", "''") if pd.notna(row['prod_color']) else 'NULL'
        
        # Manejar valores booleanos
        afecto_iva = 'TRUE' if row['prod_afecto_iva'] else 'FALSE'
        
        # Manejar valores numéricos
        compra = row['prod_prec_compra_unitario'] if pd.notna(row['prod_prec_compra_unitario']) else 'NULL'
        venta_neto = row['prod_prec_venta_neto'] if pd.notna(row['prod_prec_venta_neto']) else 'NULL'
        venta_final = row['prod_prec_venta_final'] if pd.notna(row['prod_prec_venta_final']) else 'NULL'
        
        # Obtener cat_id
        cat_id = row['cat_id'] if pd.notna(row['cat_id']) else 45
        
        sql = f"""INSERT INTO producto (
    prod_codigobarra, prod_nom, prod_desc, prod_prec_compra_unitario,
    prod_prec_venta_neto, prod_prec_venta_final, prod_afecto_iva,
    prod_tipo_unidad, prod_marca, prod_talla, prod_color, cat_id
) VALUES (
    {f"'{codigobarra}'" if codigobarra != 'NULL' else 'NULL'},
    {f"'{nombre}'" if nombre != 'NULL' else 'NULL'},
    {f"'{descripcion}'" if descripcion != 'NULL' else 'NULL'},
    {compra},
    {venta_neto},
    {venta_final},
    {afecto_iva},
    {f"'{unidad}'" if unidad != 'NULL' else 'NULL'},
    {f"'{marca}'" if marca != 'NULL' else 'NULL'},
    {f"'{talla}'" if talla != 'NULL' else 'NULL'},
    {f"'{color}'" if color != 'NULL' else 'NULL'},
    {cat_id}
);"""
        
        sql_commands.append(sql)
    
    # Guardar en archivo
    with open('insert_productos_final.sql', 'w', encoding='utf-8') as f:
        f.write('\n'.join(sql_commands))
    
    print(f"🗃️  Script SQL generado: 'insert_productos_final.sql'")

# Ejecutar la función
if __name__ == "__main__":
    try:
        df_final = agregar_cat_id()
    except FileNotFoundError:
        print("❌ Error: No se encontró el archivo 'productos_unicos_actualizados.xlsx'")
        print("💡 Asegúrate de que el archivo esté en la misma carpeta")
    except Exception as e:
        print(f"❌ Error durante el procesamiento: {str(e)}")