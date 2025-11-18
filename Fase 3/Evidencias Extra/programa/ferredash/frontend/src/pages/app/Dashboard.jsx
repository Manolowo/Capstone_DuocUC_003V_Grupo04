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
  }, [selectedSucursal]);

  // Construir datos de KPI manteniendo el valor numérico para formateo adaptativo
  const stats = [
    { title: "Total ventas", raw: kpis?.totalVentas ?? null, fallback: "-", sub: "Históricas" },
    { title: "Total productos", raw: kpis?.totalProductos ?? null, fallback: "-", sub: "En catálogo" },
    { title: "Total clientes", raw: kpis?.totalClientes ?? null, fallback: "-", sub: "Activos" },
    { title: "Ticket promedio (7d)", raw: avgTicket ?? null, fallback: "-", sub: "Promedio 7d", currency: true },
    { title: "Ganancias semanales", raw: weeklyGainsTotal ?? null, fallback: "-", sub: "Últimos 7 días", currency: true },
    { title: "Ganancias totales", raw: kpis?.gananciasTotales ?? null, fallback: "-", sub: "Acumulado", currency: true },
  ];

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

  return (
    <div className="p-6 bg-gray-50 min-h-screen">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-800">Dashboard</h1>
          <p className="text-sm text-gray-500">Resumen rápido de ventas, clientes y ganancias</p>
          {error && <p className="text-red-600 font-semibold mt-2">⚠ Error: {error}</p>}
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600">Sucursal:</label>
          <select
            value={selectedSucursal}
            onChange={(e) => setSelectedSucursal(e.target.value)}
            className="border rounded-md px-3 py-2 bg-white text-sm"
          >
            <option value="">Todas</option>
            {sucursales.map((s) => (
              // soportar distintos nombres de id/label devueltos por la API
              <option key={s.id || s.suc_id || s.sucId || s.pk || JSON.stringify(s)} value={s.id ?? s.suc_id ?? s.sucId ?? s.pk ?? s[Object.keys(s)[0]]}>
                {s.suc_nom || s.nombre || s.name || s.nom || s.label || s[Object.keys(s)[1]] || String(s.id)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPIs animados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s, i) => {
          const display = formatValue(s);
            // generar serie simple para las tarjetas de ganancias
            let series = [];
            let chartLabels = [];
            const isGains = s.title === 'Ganancias totales';
            const isWeeklyGains = s.title === 'Ganancias semanales';
            if (isGains) {
              if (kpis?.gananciasSeries && Array.isArray(kpis.gananciasSeries)) {
                series = kpis.gananciasSeries;
                if (kpis?.gananciasLabels && Array.isArray(kpis.gananciasLabels) && kpis.gananciasLabels.length === series.length) {
                  chartLabels = kpis.gananciasLabels;
                }
              } else {
                const base = Number(kpis?.gananciasTotales || 1000);
                series = Array.from({ length: 12 }, (_, idx) => Math.max(0, Math.round(base * (0.6 + 0.8 * Math.sin(idx / 2 + 0.5) + (Math.random() - 0.5) * 0.05))));
                // si la serie tiene 12 puntos, asumir meses
                if (series.length === 12) chartLabels = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
              }
            } else if (isWeeklyGains) {
              if (weeklyGainsSeries && Array.isArray(weeklyGainsSeries) && weeklyGainsSeries.length > 0) {
                series = weeklyGainsSeries;
                if (weeklySalesDates && weeklySalesDates.length === weeklyGainsSeries.length) chartLabels = weeklySalesDates.map(d => localDateFromISO(d).toLocaleDateString('es-CL',{ weekday: 'short' }));
              } else if (kpis?.gananciasSeries && Array.isArray(kpis.gananciasSeries)) {
                series = kpis.gananciasSeries.slice(-7);
              }
            }
            const long = String(display).length > 12;
            const valueSize = long ? 'text-2xl' : 'text-4xl';
            // styles especiales para Ganancias
            const cardBase = `p-6 rounded-2xl border transition-all transform duration-200 hover:shadow-2xl hover:-translate-y-1`;
            const valueColor = isGains ? 'text-white' : (isWeeklyGains ? 'text-white' : 'text-purple-600');
          const valueClass = `${isGains ? (long ? 'text-3xl' : 'text-6xl') : valueSize} font-extrabold ${valueColor} mt-2 break-words leading-tight`;
          const cardBg = isGains ? 'bg-gradient-to-r from-green-600 to-green-500 border-green-600 text-white' : (isWeeklyGains ? 'bg-gradient-to-r from-amber-600 to-amber-500 border-amber-600 text-white' : 'bg-white border-gray-200');

          return (
            <motion.div
                key={i}
                className={`${cardBase} ${cardBg} shadow-lg ${(isGains || isWeeklyGains) ? 'lg:col-span-2 sm:col-span-2' : ''}`}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <h3 className="text-gray-500 text-sm truncate">{s.title}</h3>
                  <p className={valueClass}>{(typeof s.raw === 'number') ? <NumberAnimated value={s.raw} currency={!!s.currency} /> : display}</p>
                  <p className="text-xs text-gray-400 mt-1">{s.sub}</p>
                  {(isGains || isWeeklyGains) && series.length > 0 && (
                    <div className="w-full mt-4">
                      <MiniAreaChart data={series} color={isGains ? '#16a34a' : '#d97706'} height={56} invert={isGains || isWeeklyGains} />
                      {/* Etiquetas de tiempo para Ganancias totales y Ganancias semanales (texto blanco) */}
                      {(chartLabels && chartLabels.length === series.length) ? (
                        <div className="grid gap-1 mt-2 text-xs text-white" style={{ gridTemplateColumns: `repeat(${chartLabels.length}, minmax(0, 1fr))` }}>
                          {chartLabels.map((lab, idx) => (
                            <div key={String(lab) + idx} className="text-center">{lab}</div>
                          ))}
                        </div>
                      ) : (
                        <div className="grid gap-1 mt-2 text-xs text-white" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
                          {((weeklySalesDates && weeklySalesDates.length === 7) ? weeklySalesDates : getLast7Dates()).map((d) => (
                            <div key={d} className="text-center">{localDateFromISO(d).toLocaleDateString('es-CL', { weekday: 'short' })}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {/* pequeño acento decorativo */}
                <div className="flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center bg-white/60 border border-gray-100">
                  {isGains ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2" />
                    </svg>
                  ) : isWeeklyGains ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h4l3 8 4-16 3 8h4" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
                    </svg>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Gráfica adicional: Ventas últimos 7 días */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-8">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Ventas últimos 7 días</h2>
            <p className="text-sm text-gray-400">Resumen</p>
          </div>
          <p className="text-2xl font-extrabold text-blue-600 mt-3">{(weeklySalesCounts ? weeklySalesCounts.reduce((a,b)=>a+b,0) : (kpis?.totalVentas ?? '-'))} ventas</p>
          <div className="mt-4">
            <MiniBarChart data={weeklySalesCounts ?? generateWeeklySales(kpis)} color="#3b82f6" height={64} />
            {/* etiquetas de días (Lun..Dom) */}
            <div className="grid grid-cols-7 gap-1 mt-2 text-xs text-gray-500">
              {((weeklySalesDates && weeklySalesDates.length === 7) ? weeklySalesDates : getLast7Dates()).map((d) => (
                <div key={d} className="text-center">{localDateFromISO(d).toLocaleDateString('es-CL', { weekday: 'short' })}</div>
              ))}
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Productos top</h2>
            <p className="text-sm text-gray-400">Top 3</p>
          </div>
          <ul className="mt-4 space-y-2">
            <li className="flex items-center justify-between"><span className="text-sm text-gray-600">Martillo 16oz</span><span className="font-semibold">124</span></li>
            <li className="flex items-center justify-between"><span className="text-sm text-gray-600">Taladro 500W</span><span className="font-semibold">98</span></li>
            <li className="flex items-center justify-between"><span className="text-sm text-gray-600">Pintura 4L</span><span className="font-semibold">76</span></li>
          </ul>
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

// MiniAreaChart: gráfico SVG ligero para mostrar tendencia simple sin dependencias.
function MiniAreaChart({ data = [], color = '#10b981', height = 48, invert = false }) {
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
  const lastX = points[points.length - 1][0];
  const areaPath = `${path} L ${lastX} ${h} L 0 ${h} Z`;
  const id = `g_${Math.random().toString(36).slice(2,8)}`;
  const strokeCol = invert ? '#ffffff' : color;
  const stop0 = invert ? 'rgba(255,255,255,0.18)' : color;
  const stop1 = invert ? 'rgba(255,255,255,0.06)' : color;
  const pathRef = useRef(null);
  const [draw, setDraw] = useState(false);
  useEffect(() => {
    setTimeout(() => setDraw(true), 60);
  }, [data]);
  useEffect(() => {
    const p = pathRef.current;
    if (!p) return;
    const len = p.getTotalLength();
    p.style.strokeDasharray = len;
    p.style.strokeDashoffset = draw ? '0' : String(len);
    p.style.transition = 'stroke-dashoffset 700ms ease';
  }, [draw, pathRef.current]);

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="mt-3 rounded overflow-visible">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={stop0} stopOpacity="0.9" />
          <stop offset="100%" stopColor={stop1} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${id})`} style={{ opacity: draw ? 1 : 0, transition: 'opacity 400ms ease' }} />
      <path ref={pathRef} d={path} fill="none" stroke={strokeCol} strokeWidth={invert ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round"
            style={{ strokeDasharray: pathRef.current ? pathRef.current.getTotalLength() : 0, strokeDashoffset: draw && pathRef.current ? 0 : (pathRef.current ? pathRef.current.getTotalLength() : 0), transition: 'stroke-dashoffset 700ms ease' }} />
      {points.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={2} fill={strokeCol} style={{ opacity: draw ? 1 : 0, transition: `opacity 300ms ${i * 40}ms` }} />
      ))}
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
            style={{ transformOrigin: `${x + bw / 2}px ${h}px`, transform: `scaleY(${scale})`, transition: 'transform 600ms cubic-bezier(.2,.9,.2,1)' }}
          />
        );
      })}
    </svg>
  );
}

// Helper: generar datos de 7 días para el mini gráfico. Usa kpis.gananciasSeries si existe, o crea mock a partir de kpis.totalVentas
function generateWeeklySales(kpis) {
  if (kpis?.ventasSeries && Array.isArray(kpis.ventasSeries) && kpis.ventasSeries.length >= 7) {
    return kpis.ventasSeries.slice(-7);
  }
  const base = Number(kpis?.totalVentas || 50);
  return Array.from({ length: 7 }, (_, i) => Math.max(0, Math.round(base * (0.5 + 0.6 * Math.sin(i + 1) + (Math.random() - 0.5) * 0.2))));
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
