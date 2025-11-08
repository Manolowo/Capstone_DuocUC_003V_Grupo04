// frontend/src/components/DataBrowser.jsx
import { useEffect, useMemo, useState } from "react";
import { listTable } from "../lib/api";
import { mockProviders } from "../lib/mockData";

export default function DataBrowser({ table, title }) {
  const [rows, setRows] = useState([]);
  const [cols, setCols] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const params = useMemo(() => ({ limit: 50, offset: 0, search }), [search]);

  useEffect(() => {
    setLoading(true);
    setError("");
    listTable(table, params)
      .then((res) => {
        const r = res.results || res.data || [];
        setRows(r);
        setCols(r.length ? Object.keys(r[0]) : []);
      })
      .catch((e) => {
        // si es 404 en proveedores, usar mock. Hacerlo robusto por si el error no tiene response
        const status = e?.response?.status;
        const msg = e?.response?.data?.detail || e?.message || String(e);
        const is404 = status === 404 || /status code 404/.test(msg) || /404/.test(msg);
        if (table === "proveedor" && is404) {
          setRows(mockProviders);
          setCols(Object.keys(mockProviders[0] || {}));
          setError("");
        } else {
          setError(msg);
        }
      })
      .finally(() => setLoading(false));
  }, [table, params]);

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">{title}</h1>

      <input
        className="border rounded px-3 py-2 w-full max-w-xs mb-3"
        placeholder="Buscar..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {error && <p className="text-red-600 mb-3">Error: {error}</p>}
      {loading ? (
        <p className="text-gray-500">Cargando...</p>
      ) : (
        <div className="overflow-auto rounded border">
          <table className="min-w-[700px] w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {cols.map((c) => (
                  <th key={c} className="p-3 text-left font-medium">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td className="p-3 text-gray-500" colSpan={cols.length}>Sin resultados</td></tr>
              )}
              {rows.map((r, idx) => (
                <tr key={idx} className="border-t">
                  {cols.map((c) => (
                    <td key={c} className="p-3">
                      {formatCell(r[c])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatCell(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return v.toLocaleString();
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
    try { return new Date(v).toLocaleString(); } catch { return v; }
  }
  return String(v);
}
