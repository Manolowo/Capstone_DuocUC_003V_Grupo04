import React, { useEffect, useState } from "react";

export default function Diagnostico() {
  const [res, setRes] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/health");
        if (!r.ok) throw new Error(await r.text());
        setRes(await r.json());
      } catch (e) {
        setErr(e?.message || "No se pudo consultar /api/health");
      }
    })();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Diagnóstico</h1>
      {err && (
        <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm mb-4">
          {err}
        </div>
      )}
      {res ? (
        <div className="rounded-2xl border bg-white p-4 text-sm">
          <div><b>estado:</b> {res.status}</div>
          <div><b>db:</b> {res.db}</div>
          <div><b>schema:</b> {res.schema}</div>
          <div><b>port:</b> {res.port}</div>
          <div><b>time:</b> {new Date(res.time).toLocaleString("es-CL")}</div>
        </div>
      ) : !err ? (
        <div className="text-slate-500">Cargando…</div>
      ) : null}
    </div>
  );
}
