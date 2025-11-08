// src/pages/app/Productos.jsx
import { useEffect, useState } from "react";
import { listTable } from "../../lib/api";

export default function Productos() {
  const [rows, setRows] = useState([]);
  const [cols, setCols] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await listTable("producto", { limit: 50 });
        const data = res?.results || res?.data || [];
        setRows(data);
        setCols(Object.keys(data[0] || {}));
      } catch (e) {
        setErr(e?.message || "Error cargando productos");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">CUW-01 Gestión de Productos</h1>

      {loading && <div className="text-gray-500">Cargando productos…</div>}
      {err && <div className="text-red-600 font-semibold">{err}</div>}

      {!loading && !err && (
        <div className="bg-white rounded-xl border overflow-x-auto shadow">
          <table className="min-w-[700px] w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                {cols.map((c) => (
                  <th key={c} className="p-3 text-left font-semibold">
                    {c.replace(/_/g, " ")}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={cols.length} className="text-center p-4 text-gray-500">
                    Sin resultados
                  </td>
                </tr>
              ) : (
                rows.map((row, i) => (
                  <tr key={i} className="border-t hover:bg-gray-50 transition">
                    {cols.map((c) => (
                      <td key={c} className="p-3">
                        {String(row[c] ?? "").length > 60
                          ? String(row[c]).slice(0, 60) + "…"
                          : String(row[c] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
