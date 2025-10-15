import React, { useEffect, useState } from "react";
import ModuleShell from "./_ModuleShell.jsx";

export default function CUW02_Inventario() {
  const [data, setData] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Debounce la búsqueda y permite cancelar la petición anterior
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const r = await fetch(`/api/inventario?limit=50${q ? `&search=${encodeURIComponent(q)}` : ""}`, { signal: controller.signal });
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        const j = await r.json();
        if (!active) return;
        // Acepta tanto { results: [] } como una lista directa
        setData(j.results ?? j ?? []);
      } catch (err) {
        if (err.name === 'AbortError') return; // petición cancelada
        console.error('Error cargando inventario:', err);
        if (active) setData([]);
      } finally {
        if (active) setLoading(false);
      }
    }, 250);

    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [q]);

  return (
    <ModuleShell title="Gestión de Inventario (CUW-02)" desc="Consulta y control de stock">
      <div className="mb-3">
        <input
          type="search"
          aria-label="Buscar producto"
          className="border rounded-xl px-3 py-2 text-sm"
          placeholder="Buscar…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      {loading && (
        <div className="mb-3 text-sm text-slate-500">Cargando...</div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-slate-500 border-b">
            <th className="py-2 px-3">Producto</th>
            <th className="py-2 px-3">SKU</th>
            <th className="py-2 px-3">Stock</th>
            <th className="py-2 px-3">Ubicación</th>
          </tr></thead>
          <tbody>
            {data.map((r, i) => (
              <tr key={r.id ?? r.sku ?? i} className="border-b last:border-none">
                <td className="py-2 px-3">{r.producto ?? r.nombre ?? "—"}</td>
                <td className="py-2 px-3">{r.sku ?? "—"}</td>
                <td className="py-2 px-3">{r.stock ?? r.cantidad ?? 0}</td>
                <td className="py-2 px-3">{r.ubicacion ?? "—"}</td>
              </tr>
            ))}
            {!data.length && <tr><td colSpan={4} className="py-6 text-center text-slate-400">Sin resultados</td></tr>}
          </tbody>
        </table>
      </div>
    </ModuleShell>
  );
}
