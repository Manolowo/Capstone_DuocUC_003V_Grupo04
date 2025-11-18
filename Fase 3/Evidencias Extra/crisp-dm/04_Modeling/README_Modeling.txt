📁 Carpeta: 04_Modeling

Esta carpeta corresponde a la cuarta fase del proceso CRISP-DM: Modelado (Modeling).
Su objetivo es desarrollar, entrenar y comparar modelos predictivos o descriptivos a partir de los datos preparados en la fase anterior.  
Durante esta etapa se prueban diferentes algoritmos, se ajustan hiperparámetros y se seleccionan las mejores alternativas según criterios técnicos y de negocio.

-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

📂 modelos_predictivos

Subcarpeta destinada a almacenar implementaciones, scripts y artefactos asociados a los modelos desarrollados (por ejemplo: archivos de entrenamiento, pickles, notebooks de experimentación, scripts de entrenamiento).  
Aquí se conservan las versiones de los modelos y resultados de pruebas que permiten reproducir los experimentos.

-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

📂 procesado

Carpeta que puede contener datos procesados o conjuntos concretos utilizados para entrenar los modelos (a veces compartida con la fase de preparación).  
Incluye los datasets finales listos para el modelado y cualquier transformación adicional específica del pipeline de entrenamiento.

-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

📓 04_Modeling.ipynb

Notebook de Jupyter que documenta el proceso de modelado: selección de variables, definición de pipelines, entrenamiento, validación cruzada, ajuste de hiperparámetros y evaluación preliminar de métricas.  
Incluye los pasos técnicos y las razones detrás de las decisiones adoptadas para elegir los modelos finales.

-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

📌 Resumen:
La carpeta 04_Modeling concentra el trabajo experimental y técnico para obtener los modelos candidatos.  
Es importante que los artefactos (modelos, scripts y resultados) estén versionados y documentados para facilitar reproducibilidad y la transición a la fase de evaluación y despliegue.