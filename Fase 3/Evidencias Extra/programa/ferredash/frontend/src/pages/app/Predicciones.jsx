import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';

export default function Predicciones() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPred, setSelectedPred] = useState(null);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [modelInfoOpen, setModelInfoOpen] = useState(false);
  const [modelInfoData, setModelInfoData] = useState(null);

  const fetchTops = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/predicciones/all');
      setData(res.data?.tops || {});
    } catch (e) {
      setError(e?.response?.data?.detail || e.message || 'Error al obtener predicciones');
    } finally {
      setLoading(false);
    }
  };

  const runValidation = async () => {
    setValidating(true);
    setValidationResult(null);
    try {
      const res = await api.get('/predicciones/validate');
      setValidationResult(res.data || {});
    } catch (e) {
      setValidationResult({ error: e?.response?.data || e.message });
    } finally {
      setValidating(false);
    }
  };

  useEffect(() => {
    fetchTops();
  }, []);

  const fmtNumber = (v) => {
    if (v == null) return '-';
    try {
      return new Intl.NumberFormat('es-CL').format(v);
    } catch (e) {
      return String(v);
    }
  };

  const formatCurrency = (amount) => {
    if (amount == null) return '-';
    try {
      return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount);
    } catch (e) {
      return `$${fmtNumber(amount)}`;
    }
  };

  const getHorizonColor = (horizon) => {
    const colors = {
      'diario': {
        gradient: 'from-blue-500 to-blue-600',
        badge: 'bg-blue-100 text-blue-800',
        border: 'border-blue-200'
      },
      'semanal': {
        gradient: 'from-purple-500 to-purple-600', 
        badge: 'bg-purple-100 text-purple-800',
        border: 'border-purple-200'
      },
      'mensual': {
        gradient: 'from-emerald-500 to-emerald-600',
        badge: 'bg-emerald-100 text-emerald-800',
        border: 'border-emerald-200'
      }
    };
    return colors[horizon] || colors.diario;
  };

  const getHorizonIcon = (horizon) => {
    const icons = {
      'diario': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      'semanal': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ), 
      'mensual': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    };
    return icons[horizon] || icons.diario;
  };

  const getHorizonTitle = (horizon) => {
    const titles = {
      'diario': 'Pronóstico Diario',
      'semanal': 'Pronóstico Semanal', 
      'mensual': 'Pronóstico Mensual'
    };
    return titles[horizon] || horizon;
  };

  const getHorizonDescription = (horizon) => {
    const descriptions = {
      'diario': 'Ventas esperadas para mañana',
      'semanal': 'Ventas esperadas para la próxima semana', 
      'mensual': 'Ventas esperadas para el próximo mes'
    };
    return descriptions[horizon] || 'Pronóstico de ventas';
  };

  const renderList = (list, horizon = 'diario', model_file = null) => {
    if (!list || list.length === 0) return (
      <div className="text-center py-8">
        <div className="text-gray-300 mb-2">
          <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="text-sm text-gray-500">No hay predicciones disponibles</div>
      </div>
    );

    return (
      <div className="space-y-3">
        {list.map((it, index) => {
          const precio = Number(it.precio_venta || it.precio || 0) || 0;
          const ventasVal = Number(it.ventas_acum_prod || 0) || 0;
          const stockUnits = precio > 0 ? Math.floor(ventasVal / precio) : (Number(it.stock_unidades || 0) || 0);
          const estimated = Number(it.estimated_units || 0) || 0;
          const stockValFlag = String(it.stock_valorizado || '').toLowerCase();

          // stock status: 'none' = no stock, 'warn' = >0 pero < estimado, 'ok' = suficiente
          let stockStatus = 'ok';
          if (stockValFlag === 'no' || stockUnits <= 0) stockStatus = 'none';
          else if (stockUnits < estimated) stockStatus = 'warn';

          const cardBase = 'p-4 rounded-lg transform transition-transform duration-200 ease-out will-change-transform';
          const cardClass = stockStatus === 'none'
            ? `${cardBase} bg-red-50 border border-red-200 hover:shadow-md`
            : (stockStatus === 'warn'
              ? `${cardBase} bg-yellow-50 border border-yellow-200 hover:shadow-md`
              : `${cardBase} bg-white border border-gray-100 hover:shadow-md hover:border-gray-200`);

          return (
          <div 
            key={it.prod_id}
            onClick={() => { setSelectedPred({...it, horizon, model_file}); setModalOpen(true); }}
            role="button"
            tabIndex={0}
            className={cardClass}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-md flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold text-gray-900 truncate leading-tight" title={it.producto}>
                      {it.producto}
                    </h4>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs text-gray-500">ID: {it.prod_id}</span>
                      <span className="text-xs text-gray-300">•</span>
                      <span className="text-xs text-gray-500">{formatCurrency(it.precio_venta)}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="text-right ml-3 flex-shrink-0">
                <div className="text-lg font-bold text-green-600 leading-none">
                  {fmtNumber(it.estimated_units)}
                </div>
                <div className="text-xs font-medium text-green-500 mt-1">
                  Ventas predichas
                </div>
              </div>
            </div>
            
            {/* Información adicional */}
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center">
                  <div className="text-gray-500 font-medium mb-1">Stock</div>
                  {
                    (() => {
                      if (stockStatus === 'none') {
                        return <div className={`font-semibold text-red-700`}>Sin stock</div>;
                      }
                      if (stockStatus === 'warn') {
                        return <div className={`font-semibold text-amber-700`}>{fmtNumber(stockUnits)} unidades</div>;
                      }
                      return <div className={`font-semibold text-green-700`}>{fmtNumber(stockUnits)} unidades</div>;
                    })()
                  }
                </div>
                <div className="text-center">
                  <div className="text-gray-500 font-medium mb-1">Ventas 7d</div>
                  <div className="font-semibold text-gray-700">{fmtNumber(it.rolling_7d_cantidad)}</div>
                </div>
                <div className="text-center">
                  <div className="text-gray-500 font-medium mb-1">Ventas 30d</div>
                  <div className="font-semibold text-gray-700">{fmtNumber(it.rolling_30d_cantidad)}</div>
                </div>
              </div>
            </div>
           </div>
        ); })}
      </div>
    );
  };

  // Modal markup (simple dialog for a selected prediction)
  const Modal = () => {
    if (!modalOpen || !selectedPred) return null;
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
      // trigger entrance animation on mount
      const t = setTimeout(() => setMounted(true), 10);
      return () => { clearTimeout(t); setMounted(false); };
    }, []);
    const horizon = selectedPred.horizon || 'diario';
    const model_file = selectedPred.model_file || null;
    const color = getHorizonColor(horizon);
    const grad = color.gradient;

    // compute stock status for modal (none / warn / ok)
    const precio = Number(selectedPred.precio_venta || selectedPred.precio || 0) || 0;
    const stockVal = Number(selectedPred.ventas_acum_prod || 0) || 0;
    const stockUnits = precio > 0 ? Math.floor(stockVal / precio) : (Number(selectedPred.stock_unidades || 0) || 0);
    const estimated = Number(selectedPred.estimated_units || 0) || 0;
    const stockValFlag = String(selectedPred.stock_valorizado || '').toLowerCase();
    let stockStatus = 'ok';
    if (stockValFlag === 'no' || stockUnits <= 0) stockStatus = 'none';
    else if (stockUnits < estimated) stockStatus = 'warn';
    const statusClass = stockStatus === 'none' ? 'bg-red-100 text-red-800' : (stockStatus === 'warn' ? 'bg-yellow-100 text-amber-800' : 'bg-green-100 text-green-800');
    const statusText = stockStatus === 'none' ? 'Sin stock' : (stockStatus === 'warn' ? 'Bajo stock' : 'Suficiente');

    // modal border color according to stock status
    const modalBorderClass = stockStatus === 'none' ? 'border-red-200' : (stockStatus === 'warn' ? 'border-yellow-200' : 'border-green-200');

    // small helper to compute recommendation metrics (reusable)
    const computeRecommendation = (p) => {
      const est = Number(p.estimated_units || 0) || 0;
      const pr = Number(p.precio_venta || p.precio || 0) || 0;
      const sval = Number(p.ventas_acum_prod || 0) || 0;
      const r7 = Number(p.rolling_7d_cantidad || 0) || 0;
      const r30 = Number(p.rolling_30d_cantidad || 0) || 0;
      const avgDaily = (r30 > 0) ? (r30 / 30) : ((r7 > 0) ? (r7 / 7) : Math.max(1, est));
      const leadDaysMap = { diario: 3, semanal: 7, mensual: 30 };
      const h = p.horizon || 'diario';
      const leadDays = leadDaysMap[h] || 7;
      const demandOverLead = Math.ceil(avgDaily * leadDays);
      const desiredCoverage = Math.max(Math.ceil(est), demandOverLead);
      const rawNeeded = Math.max(0, desiredCoverage - (pr > 0 ? Math.floor(sval / pr) : (Number(p.stock_unidades || 0) || 0)));
      const safetyBuffer = Math.ceil(desiredCoverage * 0.15);
      const cap = Math.ceil(desiredCoverage * 1.5);
      const suggestedQty = Math.min(rawNeeded + safetyBuffer, cap);
      const suggestedValue = suggestedQty * pr;
      return { estimated: est, precio: pr, stockVal: sval, rolling7: r7, rolling30: r30, averageDaily: avgDaily, leadDays, desiredCoverage, suggestedQty, suggestedValue };
    };

    const rec = computeRecommendation(selectedPred);
    const [copied, setCopied] = useState(false);

    const copySuggestion = async () => {
      const text = `Sugerencia: pedir ${rec.suggestedQty} unidades de ${selectedPred.producto} (≈ ${formatCurrency(rec.suggestedValue)})`;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          // fallback
          const ta = document.createElement('textarea');
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      } catch (e) {
        // ignore copy errors silently
      }
    };
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center">
        <div className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${mounted ? 'opacity-100' : 'opacity-0'}`} onClick={() => { setModalOpen(false); setSelectedPred(null); }} />
        <div className={`relative bg-white rounded-lg shadow-lg w-full max-w-2xl z-50 overflow-hidden border ${modalBorderClass} transform transition-all duration-300 ease-out ${mounted ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}> 
          <div className={`px-6 py-4 bg-gradient-to-r ${grad} text-white`}> 
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold">{selectedPred.producto}</h3>
                <div className="text-sm opacity-90 mt-1 flex items-center space-x-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${color.badge}`}>{getHorizonTitle(horizon)}</span>
                  <span className="opacity-90">•</span>
                  <span className="opacity-90">{model_file ? model_file.replace('.pkl','') : ''}</span>
                  <span className={`text-xs px-2 py-0.5 rounded flex items-center space-x-2 ${statusClass}`}>
                    {stockStatus === 'none' ? (
                      <svg className="w-3 h-3 text-red-700" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11V5a1 1 0 10-2 0v2a1 1 0 002 0zm0 6a1 1 0 10-2 0v-4a1 1 0 002 0v4z" clipRule="evenodd"/></svg>
                    ) : stockStatus === 'warn' ? (
                      <svg className="w-3 h-3 text-amber-800" viewBox="0 0 20 20" fill="currentColor"><path d="M8.257 3.099c.765-1.36 2.72-1.36 3.485 0l6.518 11.59A1.75 1.75 0 0116.518 18H3.482A1.75 1.75 0 011.74 14.689L8.257 3.1zM11 13a1 1 0 10-2 0 1 1 0 002 0zm-1-3a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 10z"/></svg>
                    ) : (
                      <svg className="w-3 h-3 text-green-700" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.707a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                    )}
                    <span>{statusText}</span>
                  </span>
                </div>
              </div>
              <button onClick={() => { setModalOpen(false); setSelectedPred(null); }} className="text-white text-2xl leading-none">×</button>
            </div>
          </div>
          <div className="p-6 text-sm text-gray-800 max-h-[60vh] overflow-y-auto scroll-smooth pr-2 custom-scrollbar">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500">ID</div>
                <div className="font-semibold">{selectedPred.prod_id}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Precio venta</div>
                <div className="font-semibold">{formatCurrency(selectedPred.precio_venta)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Stock</div>
                {
                  (() => {
                    if (stockStatus === 'none') {
                      return <div className="font-semibold text-red-700">Sin stock</div>;
                    }
                    if (stockStatus === 'warn') {
                      return <div className="font-semibold text-amber-700">{fmtNumber(stockUnits)} unidades</div>;
                    }
                    return <div className="font-semibold text-green-700">{fmtNumber(stockUnits)} unidades</div>;
                  })()
                }
              </div>
              <div>
                <div className="text-xs text-gray-500">Ventas predichas</div>
                <div className="font-semibold">{selectedPred.estimated_units ?? '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Ventas predichas 7d</div>
                <div className="font-semibold">{fmtNumber(selectedPred.rolling_7d_cantidad)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Ventas predichas 30d</div>
                <div className="font-semibold">{fmtNumber(selectedPred.rolling_30d_cantidad)}</div>
              </div>
            </div>
            <div className="mt-4">
              <h4 className="text-base font-semibold mb-2">Recomendaciones</h4>
              {
                (() => {
                  // reuse computed recommendation
                  const estimated = rec.estimated;
                  const precio = rec.precio;
                  const stockVal = rec.stockVal;
                  const stockLocal = stockUnits;
                  const rolling7 = rec.rolling7;
                  const rolling30 = rec.rolling30;
                  const h = selectedPred.horizon || 'diario';
                  const averageDaily = rec.averageDaily;
                  const desiredCoverage = rec.desiredCoverage;
                  const suggestedQty = rec.suggestedQty;
                  const suggestedValue = rec.suggestedValue;

                  // Build a small visual summary (horizontal bars) to help interpret numbers
                  const metrics = [
                    { key: 'stock', label: 'Stock', value: stockLocal, colorClass: 'bg-green-500' },
                    { key: 'estimated', label: 'Estimado', value: Math.round(estimated), colorClass: 'bg-indigo-500' },
                    { key: 'suggested', label: 'Sugerido', value: Math.round(suggestedQty), colorClass: 'bg-purple-500' },
                    { key: 'r7', label: '7d', value: Math.round(rolling7), colorClass: 'bg-blue-400' },
                    { key: 'r30', label: '30d', value: Math.round(rolling30), colorClass: 'bg-teal-400' }
                  ];

                  const maxVal = Math.max(...metrics.map(m => Math.abs(m.value)), 1);

                  const paragraphs = [];

                  // prepare compact visual (will append at the end)
                  const compactVisual = (
                    <div key="compact_visual" className="w-full mb-2">
                      <div className="text-xs text-gray-500 mb-2">Resumen</div>
                      <div className="space-y-1">
                        {metrics.map(m => (
                          <div key={m.key} className="flex items-center">
                            <div className="text-xs text-gray-600 w-16">{m.label}</div>
                            <div className="flex items-center space-x-2 flex-1">
                              <div className="w-full bg-gray-200 h-2 rounded overflow-hidden">
                                <div className={`${m.colorClass} h-2 rounded`} style={{ width: `${Math.max(4, Math.round((m.value / maxVal) * 100))}%` }} />
                              </div>
                              <div className="text-xs text-gray-700 w-14 text-right">{fmtNumber(m.value)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );

                  // Donut gauge: show stock coverage vs desiredCoverage
                  const coveragePct = desiredCoverage > 0 ? Math.min(1, stockLocal / desiredCoverage) : 0;
                  const donutRadius = 30;
                  const donutCirc = 2 * Math.PI * donutRadius;
                  const dash = Math.max(0.01, coveragePct) * donutCirc;

                  const fullWidthChart = (
                    <div key="full_chart" className="w-full mt-3">
                      <div className="text-xs text-gray-500 mb-2">Cobertura de stock</div>
                      <div className="w-full bg-white border border-gray-100 rounded p-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <svg width="80" height="80" viewBox="0 0 80 80">
                            <g transform="translate(40,40)">
                              <circle r={donutRadius} fill="none" stroke="#E5E7EB" strokeWidth={8} />
                              <circle r={donutRadius} fill="none" stroke="#10B981" strokeWidth={8}
                                strokeDasharray={`${dash} ${donutCirc - dash}`} strokeLinecap="round" transform="rotate(-90)" />
                              <text x="0" y="4" textAnchor="middle" fontSize="12" fill="#111827">{Math.round(coveragePct * 100)}%</text>
                            </g>
                          </svg>
                          <div className="text-sm">
                            <div className="font-semibold">{fmtNumber(stockLocal)} unidades</div>
                            <div className="text-xs text-gray-600">Cobertura vs objetivo: {fmtNumber(desiredCoverage)} u</div>
                          </div>
                        </div>
                        <div className="flex-1 ml-2">
                          <div className="text-xs text-gray-600 mb-1">Detalle</div>
                          <div className="grid grid-cols-3 gap-2 text-xs text-gray-700">
                            <div className="p-2 bg-gray-50 rounded">Estimado<br/><strong>{fmtNumber(estimated)}</strong></div>
                            <div className="p-2 bg-gray-50 rounded">Sugerido<br/><strong>{fmtNumber(suggestedQty)}</strong></div>
                            <div className="p-2 bg-gray-50 rounded">7d / 30d<br/><strong>{fmtNumber(rolling7)} / {fmtNumber(rolling30)}</strong></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );

                  // Impacto económico: comparar ingresos estimados vs valor de la orden sugerida
                  const estRevenue = Math.round(estimated * precio);
                  const sugValue = Math.round(suggestedValue || 0);
                  const maxMoney = Math.max(estRevenue, sugValue, 1);
                  const moneyBars = (
                    <div key="money_impact" className="w-full mt-3">
                      <div className="text-xs text-gray-500 mb-2">Impacto económico</div>
                      <div className="w-full bg-white border border-gray-100 rounded p-3">
                        <div className="text-sm text-gray-700 mb-2">Ingresos estimados vs Valor orden sugerida</div>
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <div className="text-xs w-28 text-gray-600">Ingresos estimados</div>
                            <div className="flex-1 bg-gray-200 h-3 rounded overflow-hidden mx-3">
                              <div className="bg-indigo-500 h-3 rounded" style={{ width: `${Math.max(4, Math.round((estRevenue / maxMoney) * 100))}%` }} />
                            </div>
                            <div className="text-xs text-gray-700 w-28 text-right">{formatCurrency(estRevenue)}</div>
                          </div>
                          <div className="flex items-center">
                            <div className="text-xs w-28 text-gray-600">Valor orden sugerida</div>
                            <div className="flex-1 bg-gray-200 h-3 rounded overflow-hidden mx-3">
                              <div className="bg-purple-500 h-3 rounded" style={{ width: `${Math.max(4, Math.round((sugValue / maxMoney) * 100))}%` }} />
                            </div>
                            <div className="text-xs text-gray-700 w-28 text-right">{formatCurrency(sugValue)}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );

                  if (estimated <= 0) {
                    paragraphs.push(
                      <div key="none" className="text-sm text-gray-800">No hay demanda estimada para este horizonte. Revise el histórico de ventas o el periodo seleccionado.</div>
                    );
                  } else if (stockLocal > 0) {
                    // hay stock
                    if (stockLocal >= estimated) {
                      paragraphs.push(
                        <div key="suficiente" className="text-sm text-gray-800">Stock suficiente: dispone de <strong>{fmtNumber(stockLocal)}</strong> unidades (valor aproximado {formatCurrency(stockVal)}), que cubren la demanda estimada de <strong>{fmtNumber(estimated)}</strong> unidades.</div>
                      );
                      if (stockLocal > estimated * 2) {
                        paragraphs.push(
                          <div key="exceso" className="mt-2 text-sm text-gray-800">Exceso de stock: considere promociones, bundles o descuentos para acelerar rotación y reducir costos de almacenamiento.</div>
                        );
                      } else {
                        paragraphs.push(
                          <div key="mantener" className="mt-2 text-sm text-gray-800">Revisión: controlar rotación semanal y evitar sobreabastecer si la demanda es estable.</div>
                        );
                      }
                    } else {
                      paragraphs.push(
                        <div key="insuficiente" className="text-sm text-gray-800">Stock insuficiente: dispone de <strong>{fmtNumber(stockLocal)}</strong> unidades (valor aproximado {formatCurrency(stockVal)}) frente a la demanda estimada de <strong>{fmtNumber(estimated)}</strong> unidades.</div>
                      );
                      paragraphs.push(
                        <div key="sugerir" className="mt-2 text-sm text-gray-800">Sugerencia de reposición: solicitar <strong>{fmtNumber(suggestedQty)}</strong> unidades (valor estimado {formatCurrency(suggestedValue)}). Incluya un buffer de seguridad y revise tiempos de entrega con su proveedor.</div>
                      );
                    }
                    // recomendaciones operativas
                    paragraphs.push(
                      <div key="ops" className="mt-2 text-sm text-gray-800">Operaciones: priorizar pedidos para artículos con rotación alta ({fmtNumber(rolling7)} en 7d, {fmtNumber(rolling30)} en 30d). Verifique lead times y stock en otros depósitos.</div>
                    );
                  } else {
                    // no hay stock registrado
                    paragraphs.push(
                      <div key="nostock" className="text-sm text-gray-800">Sin stock registrado: no hay inventario disponible para este producto.</div>
                    );
                    paragraphs.push(
                      <div key="sugerir2" className="mt-2 text-sm text-gray-800">Reponer: sugerimos ordenar <strong>{fmtNumber(Math.max(suggestedQty, 1))}</strong> unidades (valor aprox. {formatCurrency(Math.max(suggestedValue, precio))}) para cubrir la demanda del horizonte y evitar ventas perdidas.</div>
                    );
                    paragraphs.push(
                      <div key="acciones" className="mt-2 text-sm text-gray-800">Acciones rápidas: contactar proveedor, revisar mínimo de pedido, evaluar proveedores alternativos o ajustar prioridad de compra.</div>
                    );
                  }

                  // append visuals after text paragraphs so they appear at the end
                  paragraphs.push(compactVisual);
                  paragraphs.push(fullWidthChart);
                  paragraphs.push(moneyBars);

                  return (
                    <div className="space-y-2">
                      {paragraphs}
                      <div className="mt-3 flex items-center justify-end gap-2">
                        <button onClick={copySuggestion} className="px-3 py-2 bg-indigo-600 text-white rounded text-sm hover:opacity-90 active:scale-95 transform transition duration-150">{copied ? 'Copiado' : 'Copiar sugerencia'}</button>
                        <button onClick={() => alert('Generar orden (placeholder)')} className="px-3 py-2 bg-gray-200 text-gray-800 rounded text-sm hover:bg-gray-300 active:scale-95 transform transition duration-150">Generar orden</button>
                      </div>
                    </div>
                  );
                })()
              }
            </div>
          </div>
          <div className="p-4 bg-gray-50 text-right">
            <button onClick={() => { setModalOpen(false); setSelectedPred(null); }} className={`px-4 py-2 rounded text-white bg-gradient-to-r ${grad} shadow-sm hover:opacity-90`}>Cerrar</button>
          </div>
        </div>
      </div>
    );
  };

  const ModelInfoModal = () => {
    if (!modelInfoOpen || !modelInfoData) return null;
    const info = modelInfoData || {};
    const modelName = info.model_file?.replace('.pkl','') || 'N/A';
    const analyzed = info.n_candidates ?? 0;
    const horizon = (info.horizon || 'diario').toLowerCase();
    const color = getHorizonColor(horizon || 'diario');
    const grad = color.gradient;

    // Static content per user request (do NOT use model artifact metadata)
    const selectionCriteriaText = `Criterios de selección para producción:\n\n- Cumplimiento de métricas de precisión (MAPE ≤ 20%)\n- Estabilidad y consistencia entre granularidades (diario / semanal / mensual)\n- Interpretabilidad para stakeholders del negocio\n- Capacidad de escalamiento operativo\n- Balance entre complejidad y performance\n`;

    const [copiedDesc, setCopiedDesc] = useState(false);
    const copyDescription = async (text) => {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          const ta = document.createElement('textarea');
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
        }
        setCopiedDesc(true);
        setTimeout(() => setCopiedDesc(false), 1800);
      } catch (e) {
        // noop
      }
    };

    const staticModels = {
      diario: {
        title: 'Candidato 1: Decision Tree - Granularidad Diaria',
        metrics: { MAPE: '1.8%', R2: '0.996', MSE: '49.672', MAE: '0.895' },
        score: 8.95
      },
      semanal: {
        title: 'Candidato 2: Random Forest - Granularidad Semanal',
        metrics: { MAPE: '8.7%', R2: '0.504', MSE: '12212.927', MAE: '4.333' },
        score: 8.85
      },
      mensual: {
        title: 'Candidato 3: Random Forest - Granularidad Mensual',
        metrics: { MAPE: '15.2%', R2: '0.523', MSE: '36960.125', MAE: '6.105' },
        score: 7.80
      }
    };

    const chosen = staticModels[horizon] || staticModels['diario'];

    const [mounted, setMounted] = useState(false);
    useEffect(() => {
      const t = setTimeout(() => setMounted(true), 10);
      return () => { clearTimeout(t); setMounted(false); };
    }, []);

    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center">
        <div className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${mounted ? 'opacity-100' : 'opacity-0'}`} onClick={() => { setModelInfoOpen(false); setModelInfoData(null); }} />
        <div className={`relative bg-white rounded-lg shadow-lg w-full max-w-xl z-50 overflow-hidden border ${color.border} transform transition-all duration-300 ease-out ${mounted ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}> 
          <div className={`px-6 py-4 bg-gradient-to-r ${grad} text-white`}> 
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold">{modelName} — {chosen.title}</h3>
                <div className="text-sm opacity-90 mt-1">{analyzed} productos analizados</div>
              </div>
              <button onClick={() => { setModelInfoOpen(false); setModelInfoData(null); }} className="text-white text-2xl leading-none">×</button>
            </div>
          </div>
          <div className="p-4 text-sm text-gray-800 max-h-[60vh] overflow-y-auto scroll-smooth pr-2 custom-scrollbar">
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-gray-500">Criterios de selección</div>
                <div>
                  <button onClick={() => copyDescription(selectionCriteriaText)} className="text-xs px-2 py-1 bg-indigo-50 text-indigo-700 rounded mr-2">{copiedDesc ? 'Copiado' : 'Copiar criterios'}</button>
                </div>
              </div>
              <div className="text-sm text-gray-700">
                <ol className="list-decimal list-inside space-y-2">
                  <li>Cumplimiento de métricas de precisión (MAPE ≤ 20%).</li>
                  <li>Estabilidad y consistencia entre granularidades (diario / semanal / mensual).</li>
                  <li>Interpretabilidad para stakeholders del negocio.</li>
                  <li>Capacidad de escalamiento operativo.</li>
                  <li>Balance entre complejidad y performance.</li>
                </ol>
              </div>
            </div>

            <div className="mb-3 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500 mb-1">Descripción del candidato</div>
                <div className="font-semibold text-sm">{chosen.title}</div>
                <div className="text-xs text-gray-600 mt-2">Puntuación de selección: <span className="font-semibold">{chosen.score} / 10</span></div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-2">Métricas del modelo (estáticas)</div>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(chosen.metrics).map(([k,v]) => (
                    <div key={k} className="p-3 bg-white border border-gray-100 rounded-lg shadow-sm flex flex-col items-start">
                      <div className="text-xs text-gray-500">{k}</div>
                      <div className="text-lg font-semibold text-gray-900 mt-1">{String(v)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="text-xs text-gray-500 mb-1">Puntuación de selección</div>
              <div className="font-semibold">{chosen.score} / 10</div>
            </div>

            <div className="mt-4 text-xs text-gray-600">
              <div className="font-medium mb-1">Tabla resumen (criterios y pesos)</div>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-gray-600">
                    <th className="pb-1">Criterio</th>
                    <th className="pb-1">Peso</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td className="py-1">Precisión (MAPE)</td><td>30%</td></tr>
                  <tr><td className="py-1">Interpretabilidad</td><td>20%</td></tr>
                  <tr><td className="py-1">Estabilidad</td><td>20%</td></tr>
                  <tr><td className="py-1">Valor Negocio</td><td>15%</td></tr>
                  <tr><td className="py-1">Facilidad Implementación</td><td>15%</td></tr>
                </tbody>
              </table>
            </div>

          </div>
          <div className="p-4 bg-gray-50 text-right">
            <button onClick={() => { setModelInfoOpen(false); setModelInfoData(null); }} className={`px-4 py-2 rounded text-white bg-gradient-to-r ${grad} shadow-sm hover:opacity-90`}>Cerrar</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <style>{`.custom-scrollbar::-webkit-scrollbar{width:8px;height:8px}.custom-scrollbar::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:9999px}.custom-scrollbar{scrollbar-width:thin;scrollbar-color:#cbd5e1 transparent}`}</style>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-md mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Predicciones de Ventas
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Productos con mayor potencial de venta usando IA
          </p>
        </div>

        {/* Stats and Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-6 flex-1 border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-xl font-bold text-indigo-600 mb-1">
                  {data ? Object.values(data).reduce((total, horizon) => total + (horizon.results?.length || 0), 0) : 0}
                </div>
                <div className="text-sm text-gray-600">Productos pronosticados</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-green-600 mb-1">
                  {data ? Object.values(data).reduce((total, horizon) => total + (horizon.n_candidates || 0), 0) : 0}
                </div>
                <div className="text-sm text-gray-600">Productos analizados</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-purple-600 mb-1">
                  {data ? Object.keys(data).length : 0}
                </div>
                <div className="text-sm text-gray-600">Horizontes activos</div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              onClick={fetchTops} 
              disabled={loading}
              className="inline-flex items-center justify-center px-5 py-3 bg-indigo-600 text-white font-medium rounded-lg shadow hover:bg-indigo-700 transition-colors duration-200 disabled:opacity-50 text-sm"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Actualizando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Actualizar
                </>
              )}
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-3"></div>
              <div className="text-gray-600 font-medium">Cargando predicciones...</div>
            </div>
          </div>
        )}
        
        {/* Error State */}
        {error && (
          <div className="bg-white border border-red-200 rounded-lg p-4 mb-6 shadow-sm">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-3 flex-1">
                <div className="text-red-800 font-medium text-sm mb-1">Error al cargar predicciones</div>
                <div className="text-red-600 text-xs">{error}</div>
                <button 
                  onClick={fetchTops}
                  className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 transition-colors duration-200"
                >
                  Reintentar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Predictions Grid */}
        {!loading && !error && (
          <>
            <div className="mb-4 text-sm text-gray-600 max-w-4xl">
              Haga clic en cualquier producto para abrir las recomendaciones detalladas: sugerencias de reposición, impacto económico y acciones rápidas (copiar sugerencia o generar orden).
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {['diario','semanal','mensual'].map((h) => {
              const block = data?.[h] || { model_file: null, results: [], n_candidates: 0, sample_head: [] };
              const colorScheme = getHorizonColor(h);
              
              return (
                <div 
                  key={h} 
                  className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-all duration-200 flex flex-col"
                >
                  {/* Header con gradiente */}
                  <div className={`bg-gradient-to-r ${colorScheme.gradient} px-4 py-4`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="bg-white bg-opacity-20 p-1.5 rounded-lg">
                          {getHorizonIcon(h)}
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-white mb-0.5">
                            {getHorizonTitle(h)}
                          </h3>
                          <p className="text-white text-opacity-90 text-xs">
                            {getHorizonDescription(h)}
                          </p>
                        </div>
                      </div>
                      <span className="bg-white bg-opacity-20 text-white text-xs px-2 py-1 rounded-full font-medium">
                        {block.results?.length || 0}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-white text-opacity-90 text-xs">
                      <div>
                        Modelo: <span className="font-semibold">{block.model_file?.replace('.pkl', '') || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="font-semibold">{block.n_candidates ?? 0}</span> analizados
                      </div>
                    </div>
                    <div className="mt-2 flex justify-end">
                      <button
                        onClick={() => { setModelInfoData({ ...block, horizon: h }); setModelInfoOpen(true); }}
                        className="text-xs px-2 py-1 bg-white bg-opacity-20 text-white rounded-md hover:bg-opacity-30 transition"
                      >
                        Información del modelo
                      </button>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="p-4 flex-1">
                    <div className="h-96 overflow-y-auto">
                      {renderList(block.results, h, block.model_file)}
                    </div>

                    {block.error && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-start">
                          <div className="flex-shrink-0">
                            <svg className="w-4 h-4 text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div className="ml-2">
                            <div className="text-red-800 font-medium text-xs">Error en predicción</div>
                            <div className="text-red-600 text-xs mt-0.5">
                              {typeof block.error === 'string' ? block.error : JSON.stringify(block.error)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            </div>
          </>
        )}

        {/* Validation Results */}
        {validationResult && (
          <div className="mt-8 bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <div className="bg-gray-800 px-4 py-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-white flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Validación de Modelos
                </h4>
                <button 
                  onClick={() => setValidationResult(null)}
                  className="text-gray-300 hover:text-white text-lg font-bold transition-colors duration-200"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-4">
              <pre className="text-xs text-gray-700 bg-gray-50 p-4 rounded-lg border border-gray-200 overflow-x-auto max-h-64 leading-relaxed">
                {JSON.stringify(validationResult, null, 2)}
              </pre>
            </div>
          </div>
        )}
        {/* Modal global para detalle de predicción */}
        {modalOpen && <Modal />}
        {/* Modal para mostrar información del modelo (por bloque/horizonte) */}
        {modelInfoOpen && <ModelInfoModal />}
      </div>
    </div>
  );
}