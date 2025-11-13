📊 Proyecto CRISP-DM – Estructura General

Este directorio contiene el desarrollo completo del proyecto bajo la metodología CRISP-DM (Cross Industry Standard Process for Data Mining).  
El objetivo es documentar, ejecutar y mantener un flujo de trabajo estructurado para la creación de un modelo analítico o predictivo basado en datos históricos.  

La organización de carpetas sigue las seis fases del proceso CRISP-DM, desde la comprensión del negocio hasta la implementación y comunicación de resultados.  
Cada carpeta incluye notebooks, scripts y documentación específica que reflejan las tareas realizadas en cada etapa.

-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

🧩 Estructura de carpetas

📁 01_Business_Understanding
Contiene los documentos y notebooks relacionados con la comprensión del negocio.  
Aquí se definen los objetivos del proyecto, las preguntas clave, los criterios de éxito y el propósito del análisis.  
Esta fase establece la base conceptual y estratégica para todo el trabajo posterior.

-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

📁 02_Data_Understanding
Incluye el dataset original y los análisis exploratorios iniciales.  
En esta fase se obtienen, inspeccionan y comprenden los datos disponibles, identificando su calidad, estructura, variables relevantes y posibles problemas.  
Su resultado es un conocimiento profundo del material con el que se trabajará.

-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

📁 03_Data_Preparation
Contiene los procesos y datasets asociados a la limpieza y transformación de los datos.  
Se organizan tres niveles de trabajo:  
- `bruto`: datos originales, sin modificar.  
- `intermedio`: resultados parciales durante la depuración.  
- `procesado`: conjunto de datos final listo para el modelado.  
El notebook de esta fase documenta cada paso realizado para garantizar la trazabilidad y reproducibilidad.

-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

📁 04_Modeling
Reúne los notebooks, scripts y resultados asociados a la construcción, entrenamiento y ajuste de los modelos predictivos o analíticos.  
Aquí se aplican algoritmos, se seleccionan variables, se evalúan métricas de rendimiento y se comparan distintas configuraciones para identificar la mejor solución técnica.

-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

📁 05_Evaluation
Fase enfocada en la evaluación integral del modelo.  
Se validan los resultados obtenidos frente a los criterios de éxito definidos en la fase de negocio.  
También se analizan posibles limitaciones, interpretaciones de resultados y consideraciones para el uso real del modelo.

-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

📁 06_Deployment
Carpeta destinada a la implementación y puesta en marcha del modelo o solución analítica.  
Incluye scripts o documentación sobre la integración del modelo en un entorno productivo, así como instrucciones para su actualización y mantenimiento.  
Su propósito es asegurar que los resultados del análisis generen valor real y sostenible para la organización.

-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

📁 informes
Compila los entregables finales del proyecto:  
- Un Informe Técnico en formato notebook, que reúne toda la documentación y resultados.  
- Una presentación ejecutiva en PowerPoint, diseñada para comunicar los hallazgos y conclusiones del proyecto de forma clara y visual.  

-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

🧠 Resumen general

La estructura crisp-dm permite un desarrollo ordenado, documentado y reproducible de proyectos de análisis de datos.  
Cada carpeta representa una fase del proceso, y los notebooks asociados sirven como registro transparente del trabajo realizado.  

Esta organización garantiza trazabilidad entre los objetivos del negocio y las decisiones técnicas, asegurando que los resultados finales respondan efectivamente a las necesidades de la organización o cliente.
