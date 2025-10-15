import pandas as pd
import numpy as np
from datetime import datetime

def combinar_boletas_sucursales():
    # 1. Cargar ambos archivos
    try:
        df_casa = pd.read_excel("Ventas CasaMatriz.xlsx")
        df_psj = pd.read_excel("Ventas PsjAlfonso.xlsx")
        print(f"📊 Casa Matriz: {len(df_casa)} registros")
        print(f"📊 Psj Alfonso: {len(df_psj)} registros")
    except Exception as e:
        print(f"❌ Error al cargar archivos: {e}")
        return None

    # 2. Agregar columna 'sucursal' para saber el origen
    df_casa['sucursal'] = 'CasaMatriz'
    df_psj['sucursal'] = 'PsjAlfonso'

    # 3. Combinar DataFrames
    df_combinado = pd.concat([df_casa, df_psj], ignore_index=True)
    print(f"📊 Total combinados: {len(df_combinado)} registros")

    # 4. Reemplazar prod_id faltantes por 8066
    if 'prod_id' not in df_combinado.columns:
        print("⚠️ No se encontró la columna 'prod_id'. Se creará con valor 8066.")
        df_combinado['prod_id'] = 8066
    else:
        faltantes = df_combinado['prod_id'].isna().sum()
        print(f"🔍 Valores faltantes en 'prod_id': {faltantes}")
        df_combinado['prod_id'] = df_combinado['prod_id'].fillna(8066)

    # 5. Asegurar columnas de fecha y hora
    if 'bol_fecha' in df_combinado.columns:
        df_combinado['bol_fecha'] = pd.to_datetime(df_combinado['bol_fecha'], errors='coerce').dt.date
    else:
        print("⚠️ No se encontró 'bol_fecha'. Se asignará fecha actual.")
        df_combinado['bol_fecha'] = datetime.now().date()

    if 'bol_hora' in df_combinado.columns:
        def normalizar_hora(valor):
            if pd.isna(valor):
                return pd.to_datetime("00:00:00").time()
            try:
                return pd.to_datetime(str(valor)).time()
            except:
                return pd.to_datetime("00:00:00").time()
        df_combinado['bol_hora'] = df_combinado['bol_hora'].apply(normalizar_hora)
    else:
        df_combinado['bol_hora'] = pd.to_datetime("00:00:00").time()

    # 6. Ordenar por fecha y hora
    df_combinado = df_combinado.sort_values(by=['bol_fecha', 'bol_hora'], ascending=[False, False]).reset_index(drop=True)

    # 7. Guardar resultado
    output_file = "boletas_combinadas.xlsx"
    df_combinado.to_excel(output_file, index=False)
    print(f"✅ Archivo combinado guardado: {output_file}")

    # 8. Resumen final
    total_faltantes_reemplazados = df_combinado['prod_id'].eq(8066).sum()
    print(f"📝 Total de prod_id=8066 en el archivo final: {total_faltantes_reemplazados}")
    print(f"📊 Total registros: {len(df_combinado)}")
    print(f"🕒 Rango de fechas: {df_combinado['bol_fecha'].min()} - {df_combinado['bol_fecha'].max()}")

    return df_combinado


# Ejecutar
if __name__ == "__main__":
    try:
        df_final = combinar_boletas_sucursales()
    except Exception as e:
        print(f"❌ Error durante el procesamiento: {e}")
        import traceback
        traceback.print_exc()
