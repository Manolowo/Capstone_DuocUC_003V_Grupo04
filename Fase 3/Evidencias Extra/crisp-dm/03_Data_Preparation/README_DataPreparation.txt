📁 Carpeta: 03_Data_Preparation

Esta carpeta corresponde a la tercera fase del proceso CRISP-DM: Preparación de los Datos (Data Preparation).  
Su objetivo es transformar los datos brutos en un conjunto limpio, estructurado y adecuado para el modelado.  
Durante esta etapa se seleccionan las variables relevantes, se corrigen errores, se completan valores faltantes y se generan los datasets finales que alimentarán el modelo.

-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

📂 bruto

Subcarpeta que almacena los datos originales utilizados como punto de partida para el proceso de preparación.  
Contiene los mismos archivos provenientes de la fase anterior (Data Understanding), conservados sin alteraciones para mantener trazabilidad y poder realizar comparaciones posteriores.

-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

📂 intermedio

Espacio destinado a guardar los archivos generados durante el proceso de limpieza y transformación, antes de obtener la versión final.  
En esta carpeta se registran datasets que contienen cambios parciales o experimentales, como tratamiento de valores nulos, normalización de variables, codificación de categorías o eliminación de outliers.

-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

📂 procesado

Carpeta que almacena los datasets finales completamente preparados y listos para el modelado.  
Estos archivos representan la versión definitiva de los datos que serán utilizados en la siguiente fase (Modeling).  
En ellos se reflejan todas las decisiones tomadas durante la limpieza y transformación.

-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

📓 03_Data_Preparation.ipynb

Notebook de Jupyter que documenta y ejecuta el proceso completo de preparación de datos.  
Incluye el código y las justificaciones de cada paso realizado: limpieza, selección de variables, transformaciones, fusiones, codificaciones y generación de los datasets intermedios y finales.  
Este notebook garantiza la reproducibilidad del flujo de preparación y sirve como evidencia del trabajo realizado en esta fase.

-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

📌 Resumen: 
La carpeta 03_Data_Preparation constituye el puente entre la exploración de datos y el modelado.  
A través de una organización clara en niveles (bruto, intermedio, procesado), asegura un flujo de trabajo ordenado, reproducible y transparente en el tratamiento de los datos antes de su análisis predictivo.
