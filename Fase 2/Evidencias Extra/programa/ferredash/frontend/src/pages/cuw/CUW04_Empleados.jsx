import React, { useEffect, useState } from "react";
import ModuleShell from "./_ModuleShell.jsx";

export default function CUW04_Empleados() {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/usuario?limit=50");
        const j = await r.json();
        setRows(j.results || []);
      } catch (err) {
        console.error('CUW04: error cargando usuarios', err);
      }
    })();
  }, []);
  return (
    <ModuleShell title="Gestión de Empleados (CUW-04)">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-slate-500 border-b">
            <th className="py-2 px-3">Nombre</th><th className="py-2 px-3">Email</th><th className="py-2 px-3">Rol</th>
          </tr></thead>
          <tbody>
            {rows.map((r,i)=>(
                <tr key={r.id ?? r.username ?? i} className="border-b last:border-none">
                <td className="py-2 px-3">{r.nombre ?? r.username ?? "—"}</td>
                <td className="py-2 px-3">{r.email ?? "—"}</td>
                <td className="py-2 px-3">{r.rol ?? r.rol_id ?? "—"}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={3} className="py-6 text-center text-slate-400">Sin datos</td></tr>}
          </tbody>
        </table>
      </div>
    </ModuleShell>
  );
}
