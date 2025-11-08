import React, { useEffect, useState } from "react";
import ModuleShell from "./_ModuleShell.jsx";

export default function CUW05_RegistroVentas() {
  const [ventas, setVentas] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/venta?limit=50");
        const j = await r.json();
        setVentas(j.results || []);
      } catch (err) {
        console.error('CUW05: error cargando ventas', err);
      }
    })();
  }, []);
  return (
    <ModuleShell title="Registro de Ventas (CUW-05)">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-slate-500 border-b">
            <th className="py-2 px-3">Cliente</th><th className="py-2 px-3">Producto</th>
            <th className="py-2 px-3">Cant.</th><th className="py-2 px-3">Monto</th><th className="py-2 px-3">Fecha</th>
          </tr></thead>
          <tbody>
              {ventas.map((v, i) => (
                <tr key={v.id ?? `${v.cliente ?? v.cliente_id}_${v.producto ?? v.producto_id}_${i}`} className="border-b last:border-none">
                  <td className="py-2 px-3">{v.cliente ?? v.cliente_id ?? "—"}</td>
                  <td className="py-2 px-3">{v.producto ?? v.producto_id ?? "—"}</td>
                  <td className="py-2 px-3">{v.cantidad ?? 0}</td>
                  <td className="py-2 px-3">$ {new Intl.NumberFormat("es-CL").format(v.monto ?? 0)}</td>
                  <td className="py-2 px-3">{v.fecha ? new Date(v.fecha).toLocaleString("es-CL") : "—"}</td>
                </tr>
              ))}
            {!ventas.length && <tr><td colSpan={5} className="py-6 text-center text-slate-400">Sin datos</td></tr>}
          </tbody>
        </table>
      </div>
    </ModuleShell>
  );
}
