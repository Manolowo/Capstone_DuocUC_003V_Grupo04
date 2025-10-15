import React, { useEffect, useState } from "react";
import ModuleShell from "./_ModuleShell.jsx";

export default function CUW08_Proveedores() {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/proveedor?limit=50");
        const j = await r.json();
        setRows(j.results || []);
      } catch (err) {
        console.error('CUW08: error cargando proveedores', err);
      }
    })();
  }, []);
  return (
    <ModuleShell title="Gestión de Proveedores (CUW-08)">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-slate-500 border-b">
            <th className="py-2 px-3">Proveedor</th><th className="py-2 px-3">Contacto</th><th className="py-2 px-3">Teléfono</th>
          </tr></thead>
          <tbody>
            {rows.map((p, i) => (
              <tr key={p.id ?? p.nombre ?? i} className="border-b last:border-none">
                <td className="py-2 px-3">{p.nombre ?? "—"}</td>
                <td className="py-2 px-3">{p.contacto ?? "—"}</td>
                <td className="py-2 px-3">{p.telefono ?? "—"}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={3} className="py-6 text-center text-slate-400">Sin datos</td></tr>}
          </tbody>
        </table>
      </div>
    </ModuleShell>
  );
}
