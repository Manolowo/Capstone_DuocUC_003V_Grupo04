// frontend/src/pages/Dashboard.jsx
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getDashboardKpis, getUltimasVentas } from "../../lib/api";
import { mockKpis, mockUltimasVentas } from "../../lib/mockData";

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
        const msg = e?.message || String(e);
        setError(msg);
        setKpis(mockKpis);
        setVentas(mockUltimasVentas);
      }
    })();
  }, []);

  const stats = [
    { title: "Total ventas", value: kpis?.totalVentas ?? "-", sub: "Últimos 30 días" },
    { title: "Total productos", value: kpis?.totalProductos ?? "-", sub: "En catálogo" },
    { title: "Total clientes", value: kpis?.totalClientes ?? "-", sub: "Activos" },
    { title: "Ganancias totales", value: kpis ? `$ ${Number(kpis.gananciasTotales).toLocaleString()}` : "-", sub: "Acumulado" },
  ];

  return (
    <div className="p-6 space-y-8">

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold text-gray-800">Dashboard</h1>
        {error && <p className="text-red-600 font-semibold">⚠ Error: {error}</p>}
      </div>

      {/* KPIs animados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <motion.div
            key={i}
            className="bg-white shadow-lg p-6 rounded-2xl border border-gray-200 hover:shadow-2xl transition-all"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <h3 className="text-gray-500 text-sm">{s.title}</h3>
            <p className="text-4xl font-extrabold text-purple-600 mt-2">{s.value}</p>
            <p className="text-xs text-gray-400">{s.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Últimas ventas */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Últimas ventas</h2>

        <div className="overflow-auto rounded-xl border bg-white shadow">
          <table className="min-w-[700px] w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
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
                <tr><td className="p-4 text-gray-500 text-center" colSpan={6}>Sin resultados</td></tr>
              )}
              {ventas.map((v) => (
                <tr key={v.id} className="border-t hover:bg-gray-50 transition">
                  <Td>{v.id}</Td>
                  <Td>{v.cliente}</Td>
                  <Td>{v.item}</Td>
                  <Td className="text-right">{v.cantidad}</Td>
                  <Td className="text-right">{Number(v.monto || 0).toLocaleString()}</Td>
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

function Th({ children, className = "" }) {
  return <th className={`p-3 text-left font-semibold ${className}`}>{children}</th>;
}
function Td({ children, className = "" }) {
  return <td className={`p-3 ${className}`}>{children}</td>;
}
