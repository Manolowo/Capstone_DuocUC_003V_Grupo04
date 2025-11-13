#!/usr/bin/env python
import os
import django

os.environ['DJANGO_SETTINGS_MODULE'] = 'backend.settings'
django.setup()

from django.db import connection

with connection.cursor() as cursor:
    # Obtener los bol_ids de sucursal 2
    cursor.execute('SELECT bol_id FROM boleta WHERE suc_id = 2 ORDER BY bol_id')
    suc2_bol_ids = [row[0] for row in cursor.fetchall()]
    print(f'Total boletas de sucursal 2: {len(suc2_bol_ids)}')
    
    # Obtener los bol_ids de sucursal 1 que tienen ventas
    cursor.execute('SELECT DISTINCT bol_id FROM venta ORDER BY bol_id')
    venta_bol_ids = [row[0] for row in cursor.fetchall()]
    print(f'Total bol_ids con ventas: {len(venta_bol_ids)}')
    
    # Tomar aproximadamente la mitad de las ventas
    split = len(venta_bol_ids) // 2
    bol_ids_to_move = venta_bol_ids[split:]
    print(f'Moviendo {len(bol_ids_to_move)} ventas a sucursal 2')
    
    # Actualizar las ventas: cambiar bol_id de sucursal 1 a sucursal 2
    for i, old_bol_id in enumerate(bol_ids_to_move):
        if i < len(suc2_bol_ids):
            new_bol_id = suc2_bol_ids[i]
            cursor.execute(
                'UPDATE venta SET bol_id = %s WHERE bol_id = %s',
                [new_bol_id, old_bol_id]
            )
    
    connection.commit()
    print('Actualización completada')
    
    # Verificar
    cursor.execute('SELECT b.suc_id, COUNT(*) FROM venta v LEFT JOIN boleta b ON b.bol_id = v.bol_id GROUP BY b.suc_id ORDER BY b.suc_id')
    print('Distribución final:')
    for row in cursor.fetchall():
        print(f'  Sucursal {row[0]}: {row[1]} ventas')
