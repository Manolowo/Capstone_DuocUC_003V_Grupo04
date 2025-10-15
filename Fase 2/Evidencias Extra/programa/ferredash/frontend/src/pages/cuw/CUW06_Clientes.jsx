import React, { useEffect, useState } from "react";
import ModuleShell from "./_ModuleShell.jsx";

export default function CUW06_Clientes() {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/cliente?limit=50");
        const j = await r.json();
        setRows(j.results || []);
      } catch (err) {
        console.error('CUW06: error cargando clientes', err);
      }
    })();
  }, []);
  return (
    <ModuleShell title="Gestión de Clientes (CUW-06)">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-slate-500 border-b">
            <th className="py-2 px-3">Cliente</th><th className="py-2 px-3">Email</th><th className="py-2 px-3">Teléfono</th>
          </tr></thead>
          <tbody>
            {rows.map((c, i) => (
              <tr key={c.id ?? c.email ?? i} className="border-b last:border-none">
                <td className="py-2 px-3">{c.nombre ?? "—"}</td>
                <td className="py-2 px-3">{c.email ?? "—"}</td>
                <td className="py-2 px-3">{c.telefono ?? "—"}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={3} className="py-6 text-center text-slate-400">Sin datos</td></tr>}
          </tbody>
        </table>
      </div>
    </ModuleShell>
  );
}
