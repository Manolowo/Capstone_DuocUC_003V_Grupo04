import pandas as pd

def listar_sucursales_bodegas():
    # Cargar el archivo de inventario
    df = pd.read_excel('Productos_bodega_raw.xlsx')
    
    print("🔍 SUCURSALES ÚNICAS:")
    sucursales_unicas = df['SUCURSAL'].unique()
    for i, sucursal in enumerate(sorted(sucursales_unicas), 1):
        print(f"  {i}. '{sucursal}'")
    
    print(f"\n📦 BODEGAS ÚNICAS:")
    bodegas_unicas = df['BODEGA'].unique()
    for i, bodega in enumerate(sorted(bodegas_unicas), 1):
        print(f"  {i}. '{bodega}'")
    
    print(f"\n🔗 COMBINACIONES SUCURSAL + BODEGA:")
    combinaciones = df[['SUCURSAL', 'BODEGA']].drop_duplicates()
    for _, row in combinaciones.iterrows():
        print(f"  - '{row['SUCURSAL']}' | '{row['BODEGA']}'")

# Ejecutar
listar_sucursales_bodegas()