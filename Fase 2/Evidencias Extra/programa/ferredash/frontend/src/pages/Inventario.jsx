// frontend/src/pages/Inventario.jsx
import { useEffect, useMemo, useState } from "react";
import { listTable } from "../lib/api";

export default function Inventario() {
  const [data, setData] = useState([]);
  const [cols, setCols] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await listTable("inventario", { limit: 50, search });
        const rows = res?.results || res?.data || [];
        setData(rows);
        setCols(Object.keys(rows[0] || {}));
      } catch (e) {
        setErr(e?.response?.data?.detail || e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [search]);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">CUW-02 Gestión de Inventario</h1>

      <div className="flex items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar…"
          className="border rounded-md px-3 py-2 w-full max-w-sm"
        />
      </div>

      {loading && <div>Cargando inventario…</div>}
      {err && <div className="text-red-600">Error: {err}</div>}

      {!loading && !err && (
        <div className="bg-white rounded-lg border overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {cols.map((c) => (
                  <th key={c} className="text-left p-3 font-medium text-gray-600">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.length === 0 && (
                <tr>
                  <td className="p-4 text-gray-500" colSpan={cols.length || 1}>
                    Sin resultados
                  </td>
                </tr>
              )}
              {data.map((row, i) => (
                <tr key={i} className="border-t">
                  {cols.map((c) => (
                    <td key={c} className="p-3">
                      {formatCell(row[c])}
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
  if (v == null) return "-";
  if (typeof v === "boolean") return v ? "Sí" : "No";
  return String(v);
}
