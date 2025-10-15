import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

const ALLOWED = [
  "venta", "producto", "cliente", "categoria", "boleta_pago",
  "caja", "condicion", "estado", "inventario", "rol", "sucursal", "tipo_pago", "usuario"
];

const LIMIT = 20;

export default function DataBrowser() {
  const [tabla, setTabla] = useState("venta");
  const [q, setQ] = useState("");
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState({ count: 0, results: [] });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setErr("");
      try {
        const url = `/api/${tabla}?limit=${LIMIT}&offset=${offset}${q ? `&search=${encodeURIComponent(q)}` : ""}`;
        const r = await fetch(url);
        if (!r.ok) throw new Error(await r.text());
        const j = await r.json();
        if (!alive) return;
        setData({
          count: Number(j.count ?? 0),
          results: Array.isArray(j.results) ? j.results : []
        });
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Error al cargar");
        setData({ count: 0, results: [] });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false };
  }, [tabla, q, offset]);

  const cols = useMemo(() => {
    const first = data.results[0] || {};
    return Object.keys(first);
  }, [data.results]);

  const totalPages = Math.max(1, Math.ceil((data.count || 0) / LIMIT));
  const page = Math.floor(offset / LIMIT) + 1;

  function goto(p) {
    const clamped = Math.min(Math.max(1, p), totalPages);
    setOffset((clamped - 1) * LIMIT);
  }

  return (
    <>
      <h1 className="text-2xl font-semibold mb-4">Tablas (DB)</h1>

      <div className="bg-white border rounded-3xl p-4 mb-4 grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col">
          <label className="text-xs text-slate-500 mb-1">Tabla</label>
          <select
            className="border rounded-xl px-3 py-2 text-sm"
            value={tabla}
            onChange={(e) => { setTabla(e.target.value); setOffset(0); }}
          >
            {ALLOWED.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-xs text-slate-500 mb-1">Buscar (texto)</label>
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              className="pl-9 border rounded-xl px-3 py-2 text-sm w-full"
              placeholder="nombre, descripción, cliente, producto…"
              value={q}
              onChange={(e) => { setQ(e.target.value); setOffset(0); }}
            />
          </div>
        </div>

        <div className="flex items-end justify-end gap-2">
          <button
            disabled={page <= 1}
            onClick={() => goto(page - 1)}
            className="inline-flex items-center gap-1 px-3 py-2 text-sm border rounded-xl disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" /> Anterior
          </button>
          <div className="text-sm text-slate-600">
            {page} / {totalPages} &nbsp;
            <span className="text-slate-400">({data.count} filas)</span>
          </div>
          <button
            disabled={page >= totalPages}
            onClick={() => goto(page + 1)}
            className="inline-flex items-center gap-1 px-3 py-2 text-sm border rounded-xl disabled:opacity-50"
          >
            Siguiente <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {err && (
        <div className="mb-4 p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm">
          {err}
        </div>
      )}

      <div className="bg-white border rounded-3xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b">
              {cols.length ? cols.map(c => (
                <th key={c} className="py-2 px-3 capitalize">{c.replace(/_/g,' ')}</th>
              )) : <th className="py-2 px-3">Sin columnas</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={Math.max(1, cols.length)} className="py-6 text-center text-slate-400">Cargando…</td></tr>
            ) : data.results.length ? (
              data.results.map((row, idx) => (
                <tr key={idx} className="border-b last:border-none">
                  {cols.map(c => (
                    <td key={c} className="py-2 px-3">
                      {formatCell(row[c])}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr><td colSpan={Math.max(1, cols.length)} className="py-6 text-center text-slate-400">Sin resultados</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function formatCell(v) {
  if (v === null || v === undefined) return <span className="text-slate-400">—</span>;
  if (typeof v === "boolean") return v ? "Sí" : "No";
  if (typeof v === "number") return new Intl.NumberFormat("es-CL").format(v);
  // fechas ISO
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) {
    const d = new Date(v);
    if (!isNaN(d)) return d.toLocaleString("es-CL");
  }
  const s = String(v);
  return s.length > 120 ? s.slice(0, 120) + "…" : s;
}
