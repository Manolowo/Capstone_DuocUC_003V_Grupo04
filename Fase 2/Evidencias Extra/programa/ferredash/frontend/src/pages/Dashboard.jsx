// frontend/src/pages/Dashboard.jsx
import { useEffect, useState } from "react";
import { getDashboardKpis, getUltimasVentas } from "../lib/api";
import { mockKpis, mockUltimasVentas } from "../lib/mockData";

export default function Dashboard() {
  const [kpis, setKpis] = useState(null);
  const [ventas, setVentas] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [k1, k2] = await Promise.all([
          getDashboardKpis(),
          getUltimasVentas(8),
        ]);
        setKpis(k1.data);
        setVentas(k2.data || []);
      } catch (e) {
        // fallback a mocks cuando el backend falla
        const msg = e?.message || String(e);
        setError(msg);
        setKpis(mockKpis);
        setVentas(mockUltimasVentas);
        // Si quieres no mostrar el error visible, descomenta la siguiente línea:
        // setError("");
      }
    })();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">FerreDash</h1>

      {error && <p className="text-red-600 mb-4">Error: {error}</p>}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi title="Total ventas" value={kpis?.totalVentas ?? "-"} subtitle="últimos 30 días" />
        <Kpi title="Total productos" value={kpis?.totalProductos ?? "-"} subtitle="en catálogo" />
        <Kpi title="Total clientes" value={kpis?.totalClientes ?? "-"} subtitle="activos" />
        <Kpi
          title="Ganancias totales"
          value={kpis ? `$ ${Number(kpis.gananciasTotales).toLocaleString()}` : "-"}
          subtitle="acumulado"
        />
      </div>

      {/* Últimas ventas */}
      <div className="mt-8">
        <h2 className="font-semibold mb-3">Últimas ventas</h2>
        <div className="overflow-auto rounded border">
          <table className="min-w-[700px] w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <Th>#</Th>
                <Th>Cliente</Th>
                <Th>Producto</Th>
                <Th className="text-right">Cant.</Th>
                <Th className="text-right">Monto</Th>
                <Th>Fecha</Th>
              </tr>
            </thead>
            <tbody>
              {ventas.length === 0 && (
                <tr><td className="p-3 text-gray-500" colSpan={6}>Sin resultados</td></tr>
              )}
              {ventas.map((v) => (
                <tr key={v.id} className="border-t">
                  <Td>{v.id}</Td>
                  <Td>{v.cliente}</Td>
                  <Td>{v.item}</Td>
                  <Td className="text-right">{v.cantidad}</Td>
                  <Td className="text-right">
                    {Number(v.monto || 0).toLocaleString()}
                  </Td>
                  <Td>{v.fecha ? new Date(v.fecha).toLocaleString() : "-"}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Kpi({ title, value, subtitle }) {
  return (
    <div className="rounded border p-4 bg-white">
      <p className="text-xs text-gray-500">{title}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
    </div>
  );
}
function Th({ children, className="" }) {
  return <th className={`p-3 text-left font-medium ${className}`}>{children}</th>;
}
function Td({ children, className="" }) {
  return <td className={`p-3 ${className}`}>{children}</td>;
}
