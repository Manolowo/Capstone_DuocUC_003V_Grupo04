import pandas as pd

def generar_csv_limpio():
    # Leer el archivo Excel original
    df = pd.read_excel('productos_final.xlsx')
    
    print(f"📊 Productos cargados: {len(df)}")
    
    # Convertir booleanos a 1/0 para PostgreSQL (en lugar de True/False)
    df['prod_afecto_iva'] = df['prod_afecto_iva'].astype(str).str.upper().str.strip().isin(['VERDADERO', 'TRUE', '1', 'SI', 'SÍ', 'V']).astype(int)
    
    # Limpiar campos de texto (remover comas que puedan interferir)
    campos_texto = ['prod_codigobarra', 'prod_nom', 'prod_desc', 'prod_tipo_unidad', 'prod_marca', 'prod_talla', 'prod_color']
    for campo in campos_texto:
        if campo in df.columns:
            df[campo] = df[campo].fillna('').astype(str).str.strip().str.replace(',', ';')  # Reemplazar comas por punto y coma
    
    # Guardar como CSV con delimitador punto y coma
    df.to_csv('productos_limpio.csv', index=False, sep=';', encoding='utf-8')
    
    print("✅ CSV limpio generado: 'productos_limpio.csv'")
    print(f"📋 Resumen:")
    print(f"  - Productos con IVA (1): {df['prod_afecto_iva'].sum()}")
    print(f"  - Productos sin IVA (0): {len(df) - df['prod_afecto_iva'].sum()}")
    
    # Mostrar primeras filas del CSV generado
    print(f"\n📝 Primeras 2 filas del CSV:")
    with open('productos_limpio.csv', 'r', encoding='utf-8') as f:
        for i, line in enumerate(f):
            if i < 3:  # Mostrar header + 2 filas
                print(f"Línea {i+1}: {line.strip()}")

generar_csv_limpio()