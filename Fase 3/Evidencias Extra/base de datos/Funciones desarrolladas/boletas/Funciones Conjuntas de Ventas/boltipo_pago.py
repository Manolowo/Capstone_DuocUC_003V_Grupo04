import pandas as pd
import numpy as np

def generar_boleta_pago():
    # 1. Cargar archivo de ventas actualizadas
    try:
        df_ventas = pd.read_excel("ventas_actualizadas.xlsx")
        print(f"📊 Ventas cargadas: {len(df_ventas)} registros")
    except Exception as e:
        print(f"❌ Error al cargar archivo: {e}")
        return None

    # 2. Generar boleta_pago
    df_boletapago = pd.DataFrame()
    
    # bolpago_id autoincremental
    df_boletapago['bolpago_id'] = range(1, len(df_ventas) + 1)
    
    # bol_id
    df_boletapago['bol_id'] = df_ventas['bol_id']
    
    # bolpago_monto
    df_boletapago['bolpago_monto'] = df_ventas['ven_subtotal']

    # 3. Asignar tipopago_id aleatorio según probabilidades
    # Definición de probabilidades
    opciones = [1, 2, 3, 4]
    probabilidades = [0.60, 0.30, 0.06, 0.04]  # suman 1.0

    df_boletapago['tipopago_id'] = np.random.choice(opciones, size=len(df_ventas), p=probabilidades)

    # 4. Guardar resultado
    output_file = "boleta_pago.xlsx"
    df_boletapago.to_excel(output_file, index=False)
    print(f"✅ Archivo boleta_pago guardado: {output_file}")

    # 5. Resumen de pagos
    resumen = df_boletapago['tipopago_id'].value_counts(normalize=True) * 100
    print("\n📊 Distribución de tipopago_id (%):")
    for pago_id, pct in resumen.items():
        print(f"   - ID {pago_id}: {pct:.1f}%")

    return df_boletapago


# Ejecutar
if __name__ == "__main__":
    try:
        df_boletapago = generar_boleta_pago()
    except Exception as e:
        print(f"❌ Error durante el procesamiento: {e}")
        import traceback
        traceback.print_exc()
