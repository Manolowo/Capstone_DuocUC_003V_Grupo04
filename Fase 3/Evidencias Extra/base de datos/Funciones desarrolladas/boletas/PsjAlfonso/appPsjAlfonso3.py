import pandas as pd
import numpy as np
from datetime import datetime

def limpiar_y_ordenar_boletas():
    # Cargar el archivo de boletas procesadas
    df = pd.read_excel('boletas_procesadas.xlsx')
    
    print(f"📊 Boletas cargadas: {len(df)}")
    
    # 1. Eliminar SOLO filas sin bol_folio (vacías o nulas)
    print("🔍 Filtrando boletas sin folio...")
    df_limpio = df.copy()
    
    filas_antes = len(df_limpio)
    
    mascara_valido = (
        df_limpio['bol_folio'].notna() & 
        (df_limpio['bol_folio'].astype(str).str.strip() != '') & 
        (df_limpio['bol_folio'].astype(str).str.strip() != 'nan')
    )
    
    df_limpio = df_limpio[mascara_valido].copy()
    filas_despues = len(df_limpio)
    
    print(f"📊 Boletas con folio: {filas_despues}")
    print(f"🗑️  Boletas eliminadas (sin folio): {filas_antes - filas_despues}")
    
    # 2. Ordenar por fecha (más reciente primero)
    print("📅 Ordenando por fecha (más reciente primero)...")
    
    # Asegurar que las fechas sean correctas
    df_limpio['bol_fecha'] = pd.to_datetime(df_limpio['bol_fecha'], errors='coerce').dt.date
    df_limpio['bol_fecha_venc'] = pd.to_datetime(df_limpio['bol_fecha_venc'], errors='coerce').dt.date
    
    # ✅ NUEVO: Procesar columna bol_hora si existe
    if 'bol_hora' in df_limpio.columns:
        print("🕒 Procesando columna de hora...")
        # Convertir a formato uniforme HH:MM:SS (rellenando ceros)
        def normalizar_hora(valor):
            if pd.isna(valor):
                return ''
            valor = str(valor).strip()
            if valor == '':
                return ''
            try:
                # Intenta parsear como hora estándar
                hora = pd.to_datetime(valor, errors='coerce').time()
                return hora.strftime("%H:%M:%S") if hora else ''
            except Exception:
                # Si no se puede convertir, dejar como texto original
                return valor
        df_limpio['bol_hora'] = df_limpio['bol_hora'].apply(normalizar_hora)
    else:
        print("⚠️  No se encontró columna 'bol_hora', se omitirá.")
        df_limpio['bol_hora'] = ''
    
    # Ordenar descendente (más reciente primero)
    df_limpio = df_limpio.sort_values('bol_fecha', ascending=False)
    
    # 3. Reiniciar IDs desde 1
    print("🆔 Reiniciando IDs...")
    df_limpio = df_limpio.reset_index(drop=True)
    df_limpio['bol_id'] = df_limpio.index + 1
    
    # 4. Guardar resultado
    output_file = 'boletas_finales_limpias.xlsx'
    df_limpio.to_excel(output_file, index=False)
    
    print(f"\n✅ PROCESAMIENTO COMPLETADO!")
    print(f"📊 Boletas finales: {len(df_limpio)}")
    print(f"📁 Archivo guardado: {output_file}")
    
    # Resumen
    print(f"\n📋 RESUMEN FINAL:")
    print(f"   - Total boletas válidas: {len(df_limpio)}")
    print(f"   - Rango de folios: {df_limpio['bol_folio'].min()} - {df_limpio['bol_folio'].max()}")
    print(f"   - Folios únicos: {df_limpio['bol_folio'].nunique()}")
    
    # Rango de fechas
    try:
        fecha_min = df_limpio['bol_fecha'].min()
        fecha_max = df_limpio['bol_fecha'].max()
        print(f"   - Rango de fechas: {fecha_min} - {fecha_max}")
    except:
        print(f"   - Rango de fechas: No disponible")
    
    print(f"   - Categorías únicas: {len(df_limpio['cat_id'].unique())}")
    
    # Distribución por fecha
    print(f"\n📊 DISTRIBUCIÓN POR FECHA (Top 5 más recientes):")
    distribucion_fechas = df_limpio['bol_fecha'].value_counts().head(5)
    for fecha, cantidad in distribucion_fechas.items():
        print(f"   - {fecha}: {cantidad} boletas")
    
    # ✅ Mostrar muestra con hora incluida
    print(f"\n📝 MUESTRA DE DATOS (más recientes primero):")
    columnas_muestra = ['bol_id', 'bol_folio', 'bol_fecha', 'bol_hora', 'bol_fecha_venc', 'prod_nom', 'cat_id', 'bol_total']
    columnas_presentes = [c for c in columnas_muestra if c in df_limpio.columns]
    muestra = df_limpio.head()[columnas_presentes]
    
    for _, row in muestra.iterrows():
        print(f"   ID {row['bol_id']} | Folio {row['bol_folio']} | Fecha: {row['bol_fecha']} {row['bol_hora']} | Prod: {str(row['prod_nom'])[:20]}...")
    
    return df_limpio


# Ejecutar la función
if __name__ == "__main__":
    try:
        boletas_finales = limpiar_y_ordenar_boletas()
    except Exception as e:
        print(f"❌ Error durante el procesamiento: {str(e)}")
        import traceback
        traceback.print_exc()
