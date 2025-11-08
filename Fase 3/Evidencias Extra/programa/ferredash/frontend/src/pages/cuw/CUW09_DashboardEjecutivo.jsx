import React, { useEffect, useState } from "react";
import ModuleShell from "./_ModuleShell.jsx";

export default function CUW09_DashboardEjecutivo() {
  const [kpi, setKpi] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/dashboard/kpis");
        setKpi(await r.json());
      } catch (err) {
        console.error('CUW09: error cargando kpis', err);
      }
    })();
  }, []);
  function Kpi({ title, v, money }) {
    const val = v == null ? "…" : money ? `$ ${new Intl.NumberFormat("es-CL").format(v)}` : new Intl.NumberFormat("es-CL").format(v);
    return (
      <div className="rounded-2xl border bg-white p-4">
        <div className="text-sm text-slate-500">{title}</div>
        <div className="text-2xl font-semibold mt-1">{val}</div>
      </div>
    );
  }

  return (
    <ModuleShell title="Dashboard Ejecutivo (CUW-09)">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi title="Ventas" v={kpi?.totalVentas} />
        <Kpi title="Productos" v={kpi?.totalProductos} />
        <Kpi title="Clientes" v={kpi?.totalClientes} />
        <Kpi title="Ganancias" v={kpi?.gananciasTotales} money />
      </div>
    </ModuleShell>
  );
}
