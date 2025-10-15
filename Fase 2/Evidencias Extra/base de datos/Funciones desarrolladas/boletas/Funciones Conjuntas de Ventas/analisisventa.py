import pandas as pd

def actualizar_precio_unitario_y_cantidad():
    # 1. Cargar archivos
    try:
        df_boletas = pd.read_excel("boletas_combinadas.xlsx")
        df_productos = pd.read_excel("productos_final.xlsx")
        print(f"📊 Boletas cargadas: {len(df_boletas)} registros")
        print(f"📊 Productos cargados: {len(df_productos)} registros")
    except Exception as e:
        print(f"❌ Error al cargar archivos: {e}")
        return None

    # 2. Crear diccionario de prod_id -> prod_prec_venta_final
    mapeo_precios = pd.Series(df_productos['prod_prec_venta_final'].values, index=df_productos['prod_id']).to_dict()

    # 3. Actualizar ven_precio_unitario y ven_cantidad según reglas
    precios_actualizados = []
    cantidades_actualizadas = []

    for idx, row in df_boletas.iterrows():
        prod_id = row['prod_id']
        ven_subtotal = row['ven_subtotal']
        ven_cantidad = row['ven_cantidad']

        if (prod_id not in mapeo_precios) or (prod_id == 8066):
            # Caso especial: prod_id no existe o es 8066
            precios_actualizados.append(ven_subtotal)
            cantidades_actualizadas.append(1)
        else:
            precios_actualizados.append(mapeo_precios[prod_id])
            cantidades_actualizadas.append(ven_cantidad)

    df_boletas['ven_precio_unitario'] = precios_actualizados
    df_boletas['ven_cantidad'] = cantidades_actualizadas

    # 4. Guardar resultado
    output_file = "boletas_actualizadas.xlsx"
    df_boletas.to_excel(output_file, index=False)
    print(f"✅ Archivo guardado: {output_file}")

    # 5. Resumen
    total_8066 = df_boletas['prod_id'].eq(8066).sum()
    total_no_existentes = df_boletas['prod_id'].apply(lambda x: x not in mapeo_precios).sum() - total_8066
    print(f"📝 Total prod_id=8066: {total_8066}")
    print(f"📝 Total prod_id no existentes en productos_final: {total_no_existentes}")

    return df_boletas

# Ejecutar
if __name__ == "__main__":
    try:
        df_actualizado = actualizar_precio_unitario_y_cantidad()
    except Exception as e:
        print(f"❌ Error durante el procesamiento: {e}")
        import traceback
        traceback.print_exc()
