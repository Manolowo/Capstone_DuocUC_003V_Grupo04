import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';

export default function Predicciones() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);

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

  const renderList = (list) => {
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
        {list.map((it, index) => (
          <div 
            key={it.prod_id} 
            className="bg-white rounded-lg border border-gray-100 p-4 hover:shadow-md transition-all duration-200 hover:border-gray-200"
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
                  unidades
                </div>
              </div>
            </div>
            
            {/* Información adicional */}
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center">
                  <div className="text-gray-500 font-medium mb-1">Stock valorizado</div>
                  <div className="font-semibold text-gray-700">{formatCurrency(it.ventas_acum_prod)}</div>
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
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6">
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
            <button 
              onClick={runValidation} 
              disabled={validating}
              className="inline-flex items-center justify-center px-5 py-3 bg-gray-700 text-white font-medium rounded-lg shadow hover:bg-gray-800 transition-colors duration-200 disabled:opacity-50 text-sm"
            >
              {validating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Validando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Validar Modelos
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
                  </div>
                  
                  {/* Content */}
                  <div className="p-4 flex-1">
                    <div className="h-96 overflow-y-auto">
                      {renderList(block.results)}
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
      </div>
    </div>
  );
}