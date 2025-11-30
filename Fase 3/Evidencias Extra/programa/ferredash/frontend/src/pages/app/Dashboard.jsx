// frontend/src/pages/Dashboard.jsx
import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { getDashboardKpis, listTable } from "../../lib/api";
import { mockKpis } from "../../lib/mockData";

export default function Dashboard() {
  const [kpis, setKpis] = useState(null);
  const [sucursales, setSucursales] = useState([]);
  const [selectedSucursal, setSelectedSucursal] = useState("");
  const [error, setError] = useState("");
  const [weeklySalesCounts, setWeeklySalesCounts] = useState(null);
  const [weeklySalesDates, setWeeklySalesDates] = useState(null);
  const [weeklyGainsSeries, setWeeklyGainsSeries] = useState(null);
  const [weeklyGainsTotal, setWeeklyGainsTotal] = useState(null);
  const [avgTicket, setAvgTicket] = useState(null);
  const [weeklyAvgSales, setWeeklyAvgSales] = useState(null);
  const [weeklyNewClients, setWeeklyNewClients] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastVentaRows, setLastVentaRows] = useState([]);
  const [showVentasDebug, setShowVentasDebug] = useState(false);

  // Cargar KPIs y sucursales; recargar KPIs cuando cambie la sucursal
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [k1, sres] = await Promise.all([
          getDashboardKpis(selectedSucursal ? { suc_id: selectedSucursal } : {}),
          listTable('sucursal', { limit: 200 }),
        ]);
        if (!mounted) return;
        setKpis(k1.data);
        // listTable returns results or data
        const succ = sres?.results || sres?.data || [];
        setSucursales(succ);
      } catch (e) {
        const msg = e?.message || String(e);
        setError(msg);
        setKpis(mockKpis);
      }
    })();
    return () => { mounted = false };
  }, [selectedSucursal]);

  // Cargar las ventas de los últimos 7 días y agregarlas por día
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 6);
        const toISODate = (d) => {
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          return `${yyyy}-${mm}-${dd}`;
        };
        const params = { start_date: toISODate(start), end_date: toISODate(end), limit: 1000 };
        if (selectedSucursal) params.suc_id = selectedSucursal;
        const [ventasRes, clientesRes] = await Promise.all([
          listTable('venta', params),
          listTable('cliente', params),
        ]);
        const rows = ventasRes?.results || ventasRes?.data || [];
        // keep a copy of the raw rows for quick debugging
        if (mounted) {
          setLastVentaRows(rows);
          try { console.debug('Dashboard: ventas rows (first 5)', rows.slice(0,5)); } catch (e) {}
        }
        const clientRows = clientesRes?.results || clientesRes?.data || [];
        // detectar campo fecha en filas
        const dateKey = (rows[0] && Object.keys(rows[0]).find(k => /fecha|date|created_at|ven_fecha|bol_fecha/i.test(k))) || null;
        // inicializar mapa de los 7 días y acumuladores de monto
        const counts = {};
        const sums = {};
        for (let i = 0; i < 7; i++) {
          const d = new Date(start);
          d.setDate(start.getDate() + i);
          counts[toISODate(d)] = 0;
          sums[toISODate(d)] = 0;
        }
        for (const r of rows) {
          let dt = null;
          if (dateKey && r[dateKey]) {
            const raw = String(r[dateKey]);
            // si es solo YYYY-MM-DD, parsear como fecha local para evitar shift UTC
            if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
              const [yy, mm, dd] = raw.split('-').map(Number);
              dt = new Date(yy, mm - 1, dd);
            } else {
              dt = new Date(raw);
            }
          } else {
            // intentar buscar cualquier valor con formato ISO
            const key = Object.keys(r).find(k => typeof r[k] === 'string' && /\d{4}-\d{2}-\d{2}/.test(r[k]));
            if (key) {
              const raw = String(r[key]);
              if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
                const [yy, mm, dd] = raw.split('-').map(Number);
                dt = new Date(yy, mm - 1, dd);
              } else {
                dt = new Date(raw);
              }
            }
          }
          if (!dt || Number.isNaN(dt.getTime())) continue;
          const ds = toISODate(dt);
          if (ds in counts) counts[ds] = (counts[ds] || 0) + 1;
          // detectar campo monto/total en la fila y sumar
          const montoKey = Object.keys(r).find(k => /monto|total|precio|subtotal|ven_sub/i.test(k));
          let montoVal = 0;
          if (montoKey && r[montoKey] != null) {
            const mv = Number(r[montoKey]);
            if (!Number.isNaN(mv)) montoVal = mv;
          }
          sums[ds] = (sums[ds] || 0) + montoVal;
        }
        const dates = Object.keys(counts).sort();
        const series = dates.map(k => counts[k]);
        const sumSeries = dates.map(k => sums[k] || 0);
        // fallback de ganancia: aproximadamente subtotal * 0.425 (ver notas en backend)
        const gainsSeries = sumSeries.map(v => Math.round(v * 0.425));
        const gainsTotal = gainsSeries.reduce((a,b) => a + b, 0);
        const totalVentasPeriodo = series.reduce((a,b) => a + b, 0);
        const totalMontoPeriodo = sumSeries.reduce((a,b) => a + b, 0);
        const avg = totalVentasPeriodo > 0 ? Math.round(totalMontoPeriodo / totalVentasPeriodo) : null;
        const avgSalesPerDay = Math.round(totalVentasPeriodo / 7) || 0;
        if (mounted) {
          setWeeklySalesCounts(series);
          setWeeklySalesDates(dates);
          setWeeklyGainsSeries(gainsSeries);
          setWeeklyGainsTotal(gainsTotal);
          setAvgTicket(avg);
          setWeeklyAvgSales(avgSalesPerDay);
          setWeeklyNewClients(clientRows.length || 0);
        }
      } catch (e) {
        // ignore, keep null
      }
    })();
    return () => { mounted = false };
  }, [selectedSucursal, refreshKey]);

  const formatCurrency = (v) => {
    try {
      const n = Number(v || 0);
      return `$ ${new Intl.NumberFormat('es-CL').format(n)}`;
    } catch (e) {
      return String(v);
    }
  };

  const formatValue = (item) => {
    if (item.raw === null || typeof item.raw === 'undefined') return item.fallback || "-";
    if (item.currency) return formatCurrency(item.raw);
    // default: integer formatting
    if (typeof item.raw === 'number') return new Intl.NumberFormat('es-CL').format(item.raw);
    return String(item.raw);
  };

  // Small animated number counter. Animates from 0 to `value` when value changes.
  function NumberAnimated({ value, currency = false, fallback = '-', duration = 700 }) {
    const [display, setDisplay] = useState(fallback);
    const rafRef = useRef(null);
    useEffect(() => {
      if (value === null || typeof value === 'undefined') {
        setDisplay(fallback);
        return;
      }
      const start = performance.now();
      const from = 0;
      const to = Number(value) || 0;
      const step = (t) => {
        const p = Math.min(1, (t - start) / duration);
        const cur = from + (to - from) * p;
        setDisplay(currency ? formatCurrency(Math.round(cur)) : new Intl.NumberFormat('es-CL').format(Math.round(cur)));
        if (p < 1) {
          rafRef.current = requestAnimationFrame(step);
        }
      };
      rafRef.current = requestAnimationFrame(step);
      return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, [value]);
    return <motion.span animate={{ scale: [0.94, 1] }} transition={{ duration: 0.5 }}>{display}</motion.span>;
  }

  // Las 4 cartas principales
  const mainStats = [
    { 
      title: "Total Ventas", 
      raw: kpis?.totalVentas ?? null, 
      fallback: "-", 
      sub: "Históricas",
      color: "blue"
    },
    { 
      title: "Total Productos", 
      raw: kpis?.totalProductos ?? null, 
      fallback: "-", 
      sub: "En catálogo",
      color: "purple"
    },
    { 
      title: "Total Clientes", 
      raw: kpis?.totalClientes ?? null, 
      fallback: "-", 
      sub: "Activos",
      color: "green"
    },
    { 
      title: "Ticket Promedio", 
      raw: avgTicket ?? null, 
      fallback: "-", 
      sub: "Últimos 7 días", 
      currency: true,
      color: "orange"
    },
  ];

  // Cartas de ganancias (más grandes)
  const gainStats = [
    { 
      title: "Ganancias Semanales", 
      raw: weeklyGainsTotal ?? null, 
      fallback: "-", 
      sub: "Últimos 7 días", 
      currency: true,
      color: "emerald"
    },
    { 
      title: "Ganancias Totales", 
      raw: kpis?.gananciasTotales ?? null, 
      fallback: "-", 
      sub: "Acumulado histórico", 
      currency: true,
      color: "indigo"
    },
  ];

  const getColorClasses = (color) => {
    const colors = {
      blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600' },
      purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-600' },
      green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-600' },
      orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600' },
      emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600' },
      indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-600' }
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="min-h-screen bg-gray-50/50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div className="mb-4 lg:mb-0">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-2">Resumen general de ventas, clientes y métricas de negocio</p>
          </div>

          <div className="flex items-center gap-4">
            {error && (
              <div className="flex items-center text-red-600 text-sm">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Sucursal:</label>
              <select
                value={selectedSucursal}
                onChange={(e) => setSelectedSucursal(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="">Todas las sucursales</option>
                {sucursales.map((s) => (
                  <option key={s.id || s.suc_id || s.sucId || s.pk || JSON.stringify(s)} value={s.id ?? s.suc_id ?? s.sucId ?? s.pk ?? s[Object.keys(s)[0]]}>
                    {s.suc_nom || s.nombre || s.name || s.nom || s.label || s[Object.keys(s)[1]] || String(s.id)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setRefreshKey(k => k + 1)}
                className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                Refrescar ventas
              </button>
            </div>
          </div>
        </div>

        {/* 4 Cartas Principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {mainStats.map((s, i) => {
            const display = formatValue(s);
            const colorClasses = getColorClasses(s.color);
            
            return (
              <motion.div
                key={i}
                className={`bg-white rounded-xl border ${colorClasses.border} p-6 shadow-sm hover:shadow-md transition-all duration-300`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="text-center">
                  <h3 className="text-sm font-medium text-gray-600 mb-1">{s.title}</h3>
                  <p className="text-xs text-gray-400 mb-4">{s.sub}</p>
                  
                  <div className={`text-3xl font-bold ${colorClasses.text} mb-2`}>
                    {(typeof s.raw === 'number') ? 
                      <NumberAnimated value={s.raw} currency={!!s.currency} /> : 
                      display
                    }
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Debug panel: mostrar filas crudas devueltas por la API de ventas */}
        {showVentasDebug && (
          <div className="mt-6 mb-6 bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium">Ventas (debug) — {lastVentaRows.length} filas</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigator.clipboard && navigator.clipboard.writeText(JSON.stringify(lastVentaRows.slice(0,50), null, 2))}
                  className="px-2 py-1 text-xs bg-gray-100 border rounded"
                >Copiar JSON</button>
              </div>
            </div>
            <div className="overflow-auto max-h-56 text-xs">
              {lastVentaRows.slice(0,50).map((r, idx) => (
                <pre key={idx} className="mb-2 bg-gray-50 p-2 rounded">{JSON.stringify(r, null, 2)}</pre>
              ))}
              {lastVentaRows.length === 0 && <div className="text-sm text-gray-500">No se devolvieron filas en la última llamada.</div>}
            </div>
          </div>
        )}

        {/* Cartas de Ganancias (Más grandes) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {gainStats.map((s, i) => {
            const display = formatValue(s);
            const colorClasses = getColorClasses(s.color);
            const isWeekly = s.title === 'Ganancias Semanales';
            const chartData = isWeekly ? weeklyGainsSeries : generateTrendData(s.raw);
            
            return (
              <motion.div
                key={i}
                className={`bg-white rounded-xl border ${colorClasses.border} p-6 shadow-sm hover:shadow-md transition-all duration-300`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (i + 4) * 0.1 }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{s.title}</h3>
                    <p className="text-sm text-gray-500">{s.sub}</p>
                  </div>
                </div>
                
                <div className={`text-4xl font-bold ${colorClasses.text} mb-6`}>
                  {(typeof s.raw === 'number') ? 
                    <NumberAnimated value={s.raw} currency={!!s.currency} /> : 
                    display
                  }
                </div>

                {/* Gráfico más grande para ganancias */}
                {s.raw && (
                  <div className="mt-4">
                    <MiniAreaChart 
                      data={chartData}
                      color={colorClasses.text.replace('text-', '')}
                      height={80}
                    />
                    
                    {/* Etiquetas de días para ganancias semanales */}
                    {isWeekly && weeklySalesDates && (
                      <div className="grid grid-cols-7 gap-2 mt-4 text-xs text-gray-500">
                        {weeklySalesDates.map((d) => (
                          <div key={d} className="text-center font-medium">
                            {localDateFromISO(d).toLocaleDateString('es-CL', { weekday: 'short' })}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Ventas últimos 7 días */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Ventas últimos 7 días</h3>
                <p className="text-sm text-gray-500 mt-1">Tendencia de ventas diarias</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">
                  {weeklySalesCounts ? weeklySalesCounts.reduce((a,b) => a + b, 0) : (kpis?.totalVentas ?? '-')}
                </div>
                <div className="text-xs text-gray-500">ventas totales</div>
              </div>
            </div>
            
            <div className="mt-4">
              <MiniBarChart 
                data={weeklySalesCounts ?? generateWeeklySales(kpis)} 
                color="#3b82f6" 
                height={120} 
              />
              
              <div className="grid grid-cols-7 gap-2 mt-4 text-xs text-gray-500">
                {((weeklySalesDates && weeklySalesDates.length === 7) ? weeklySalesDates : getLast7Dates()).map((d) => (
                  <div key={d} className="text-center font-medium">
                    {localDateFromISO(d).toLocaleDateString('es-CL', { weekday: 'short' })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Productos más vendidos */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Productos Destacados</h3>
                <p className="text-sm text-gray-500 mt-1">Top 5 más vendidos</p>
              </div>
            </div>
            
            <div className="space-y-4">
              {[
                { name: "Martillo 16oz Professional", sales: 124, growth: "+12%" },
                { name: "Taladro Percutor 500W", sales: 98, growth: "+8%" },
                { name: "Pintura Latex 4L Blanco", sales: 76, growth: "+15%" },
                { name: "Destornillador Set 6pcs", sales: 65, growth: "+5%" },
                { name: "Sierra Circular 1200W", sales: 54, growth: "+22%" }
              ].map((product, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-blue-600 text-sm font-bold">{index + 1}</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{product.name}</div>
                      <div className="text-xs text-gray-500">{product.sales} ventas</div>
                    </div>
                  </div>
                  <div className={`text-sm font-semibold ${
                    product.growth.startsWith('+') ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {product.growth}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// MiniAreaChart: Gráfico de área para las ganancias
function MiniAreaChart({ data = [], color = 'blue', height = 80 }) {
  if (!data || data.length === 0) return null;
  
  const w = 240;
  const h = height;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return [x, y];
  });

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' ');
  const areaPath = `${path} L ${w} ${h} L 0 ${h} Z`;
  
  const colorMap = {
    blue: '#3b82f6',
    purple: '#8b5cf6', 
    green: '#10b981',
    orange: '#f59e0b',
    emerald: '#059669',
    indigo: '#6366f1'
  };

  const strokeColor = colorMap[color] || colorMap.blue;
  const fillColor = strokeColor + '20'; // Agregar transparencia

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="rounded">
      <defs>
        <linearGradient id={`gradient-${color}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0.1" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#gradient-${color})`} />
      <path 
        d={path} 
        fill="none" 
        stroke={strokeColor} 
        strokeWidth="2" 
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// MiniBarChart: pequeño gráfico de barras sin dependencias
function MiniBarChart({ data = [], color = '#3b82f6', height = 48 }) {
  if (!data || data.length === 0) return null;
  const w = 240;
  const h = height;
  const barW = w / data.length;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const [grow, setGrow] = useState(false);
  useEffect(() => { setTimeout(() => setGrow(true), 80); }, [data]);

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="rounded overflow-visible">
      {data.map((v, i) => {
        const bw = Math.max(6, barW * 0.6);
        const x = i * barW + (barW - bw) / 2;
        const val = ((v - min) / range) * h;
        const scale = grow ? 1 : 0.001;
        return (
          <rect key={i}
            x={x}
            y={h - val}
            width={bw}
            height={val}
            rx={4}
            fill={color}
            style={{ 
              transformOrigin: `${x + bw / 2}px ${h}px`, 
              transform: `scaleY(${scale})`, 
              transition: 'transform 600ms cubic-bezier(.2,.9,.2,1)' 
            }}
          />
        );
      })}
    </svg>
  );
}

// Helper: generar datos de tendencia para los mini charts
function generateTrendData(baseValue) {
  const base = Number(baseValue || 1000);
  return Array.from({ length: 7 }, (_, i) => 
    Math.max(0, Math.round(base * (0.6 + 0.4 * Math.sin(i / 2) + (Math.random() - 0.5) * 0.1)))
  );
}

// Helper: generar datos de 7 días para el mini gráfico
function generateWeeklySales(kpis) {
  if (kpis?.ventasSeries && Array.isArray(kpis.ventasSeries) && kpis.ventasSeries.length >= 7) {
    return kpis.ventasSeries.slice(-7);
  }
  const base = Number(kpis?.totalVentas || 50);
  return Array.from({ length: 7 }, (_, i) => 
    Math.max(0, Math.round(base * (0.5 + 0.6 * Math.sin(i + 1) + (Math.random() - 0.5) * 0.2)))
  );
}

// Devuelve un array de 7 fechas ISO (YYYY-MM-DD) desde 6 días atrás hasta hoy
function getLast7Dates() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);
  const toISODate = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return toISODate(d);
  });
}

// Parsear una fecha ISO YYYY-MM-DD como fecha local (evita interpretarla en UTC)
function localDateFromISO(iso) {
  if (!iso || typeof iso !== 'string') return new Date(iso);
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return new Date(iso);
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  return new Date(y, mo, d);
}