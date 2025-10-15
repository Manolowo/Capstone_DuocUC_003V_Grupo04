import { useEffect, useState } from "react";
import { Backend } from "../lib/api";

export default function Productos() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState(null);
  useEffect(() => {
    (async () => {
      try { setRows((await Backend.productos()).results || []); }
      catch (e) { setErr(e.message || String(e)); }
    })();
  }, []);
  return (
    <List title="Productos" err={err} columns={["id","nombre","descripcion","precio","stock"]} rows={rows} />
  );
}

function List({ title, err, columns, rows }) {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{title}</h1>
      {err && <div className="p-3 rounded bg-red-50 text-red-700 text-sm">{err}</div>}
      <div className="rounded border bg-white overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600"><tr>
            {columns.map(c => <th key={c} className="px-4 py-3 text-left font-medium">{c}</th>)}
          </tr></thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td className="p-6 text-center text-slate-500" colSpan={columns.length}>Sin resultados</td></tr>
            ) : rows.map(r => (
              <tr key={r.id} className="border-t">
                {columns.map(c => <td key={c} className="px-4 py-3">{String(r[c] ?? "")}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
