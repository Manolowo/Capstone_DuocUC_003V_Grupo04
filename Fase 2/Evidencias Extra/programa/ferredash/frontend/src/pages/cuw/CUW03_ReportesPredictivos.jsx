import React, { useEffect, useState } from "react";
import ModuleShell from "./_ModuleShell.jsx";

export default function CUW03_ReportesPredictivos() {
  const [kpi, setKpi] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/dashboard/kpis");
        setKpi(await r.json());
      } catch (err) {
        console.error('CUW03: error cargando kpis', err);
      }
    })();
  }, []);
  return (
    <ModuleShell title="Consulta de Reportes Predictivos (CUW-03)" desc="Indicadores y predicciones clave">
      <pre className="text-xs">{JSON.stringify(kpi, null, 2)}</pre>
    </ModuleShell>
  );
}
