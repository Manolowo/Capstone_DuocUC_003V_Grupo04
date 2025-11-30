// frontend/src/pages/Inventario.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { listTable, updateRecord, deleteRecord } from "../../lib/api";

const LIMIT = 20;

export default function Inventario() {
  const [q, setQ] = useState("");
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState({ count: 0, results: [] });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValues, setEditValues] = useState({ stock: "", price: "" });
  const [editPrev, setEditPrev] = useState({ stock: null, price: null });
  const [editErrors, setEditErrors] = useState({ stock: "", price: "" });
  const [showFilters, setShowFilters] = useState(false);
  // filtros avanzados (precio / stock)
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [stockMin, setStockMin] = useState("");
  const [stockMax, setStockMax] = useState("");
  
  const tableContainerRef = useRef(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const res = await listTable("inventario", { limit: LIMIT, offset, search: q || undefined });
        const count = Number(res.count ?? res.data?.count ?? 0);
        let results = res.results ?? res.data?.results ?? res.data ?? [];
        results = Array.isArray(results) ? results : [];

        // 1) Siempre filtrar por nombre de producto o código de barras (client-side)
        if (q && String(q).trim() !== "") {
          const qlow = String(q).trim().toLowerCase();
          const extractProductName = (row) => {
            const p = row.producto ?? row.product ?? row.prod_nom ?? row.nombre ?? row.prod_nombre;
            if (p && typeof p === 'object') return (p.prod_nom || p.nombre || p.name || '') + '';
            if (typeof p === 'string') return p + '';
            return (row.prod_nom || row.nombre || row.producto || row.nombre_producto || '') + '';
          };
          const extractBarcode = (row) => {
            const p = row.producto ?? row.product ?? {};
            if (p && typeof p === 'object') {
              return (p.prod_codigobarra || p.codigo || p.sku || p.codigo_barras || '') + '';
            }
            return (row.prod_codigobarra || row.codigo || row.sku || row.codigo_barras || '') + '';
          };

          results = results.filter((r) => {
            const name = (extractProductName(r) || '').toLowerCase();
            const barcode = (extractBarcode(r) || '').toLowerCase();
            return name.includes(qlow) || barcode.includes(qlow) || String(r.inv_id || r.id || r.prod_id || '').toLowerCase().includes(qlow);
          });
        }

        // 2) Aplicar filtros avanzados (precio / stock) si están definidos
        const minP = parseNumber(priceMin);
        const maxP = parseNumber(priceMax);
        const minS = parseNumber(stockMin);
        const maxS = parseNumber(stockMax);

        if (!isNaN(minP) || !isNaN(maxP) || !isNaN(minS) || !isNaN(maxS)) {
          results = results.filter((r) => {
            const price = getPrice(r);
            const stock = getStock(r);
            if (!isNaN(minP) && (price == null || price < minP)) return false;
            if (!isNaN(maxP) && (price == null || price > maxP)) return false;
            if (!isNaN(minS) && (stock == null || stock < minS)) return false;
            if (!isNaN(maxS) && (stock == null || stock > maxS)) return false;
            return true;
          });
        }

        if (!alive) return;
        setData({ count: count || 0, results });
      } catch (e) {
        if (!alive) return;
        setErr(e?.response?.data?.detail || e?.message || String(e));
        setData({ count: 0, results: [] });
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [q, offset, priceMin, priceMax, stockMin, stockMax]);

  const cols = useMemo(() => {
    const first = data.results[0] || {};
    return Object.keys(first);
  }, [data.results]);

  // DEBUG: Ver columnas visibles
  useEffect(() => {
    if (data.results.length > 0) {
      console.log("🔍 COLUMNAS VISIBLES:", visibleCols);
      console.log("🔍 PRIMERA FILA EJEMPLO:", data.results[0]);
    }
  }, [data.results]);

  // Fetch product and sucursal maps to display friendly names and barcodes
  const [productMap, setProductMap] = useState({});
  const [sucursalMap, setSucursalMap] = useState({});

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [pRes, sRes] = await Promise.all([
          listTable("producto", { limit: 2000 }).catch(() => ({})),
          listTable("sucursal", { limit: 2000 }).catch(() => ({})),
        ]);

        if (!alive) return;

        const pRows = pRes.results ?? pRes.data?.results ?? pRes.data ?? [];
        const products = Array.isArray(pRows) ? pRows : [];
        const pMap = {};
        products.forEach((pr) => {
          const id = pr.prod_id ?? pr.id ?? pr.producto_id ?? pr.producto?.id;
          if (id !== undefined) {
            pMap[id] = {
              name: pr.prod_nom ?? pr.nombre ?? pr.prod_nombre ?? pr.producto ?? pr.name,
              barcode: pr.prod_codigobarra ?? pr.codigo ?? pr.sku ?? pr.codigo_barras ?? null,
            };
          }
        });

        const sRows = sRes.results ?? sRes.data?.results ?? sRes.data ?? [];
        const sucursales = Array.isArray(sRows) ? sRows : [];
        const sMap = {};
        sucursales.forEach((s) => {
          const id = s.suc_id ?? s.id ?? s.sucursal_id;
          if (id !== undefined) sMap[id] = s.suc_nom ?? s.nombre ?? s.name ?? s.sucursal_nombre ?? s.sucursal;
        });

        setProductMap(pMap);
        setSucursalMap(sMap);
      } catch (e) {
        // ignore — maps are optional
      }
    })();
    return () => { alive = false; };
  }, []);

  const totalPages = Math.max(1, Math.ceil((data.count || 0) / LIMIT));
  const page = Math.floor(offset / LIMIT) + 1;

  function goto(p) {
    const clamped = Math.min(Math.max(1, p), totalPages);
    setOffset((clamped - 1) * LIMIT);
  }

  // friendly header names - MÁS ESPECÍFICAS
  const headerName = (k) => {
    if (!k) return "";
    const key = String(k).trim();
    if (/^inv_id$/i.test(key) || /inv id/i.test(key)) return "Código de barras";
    if (/inv_stock/i.test(key) || /^stock$/i.test(key)) return "Stock";
    if (/^suc\s*_?id$/i.test(key) || /^suc\b/i.test(key) || /sucurs/i.test(key) || /sucursal/i.test(key)) return "Sucursal";
    if (/producto|prod_/i.test(key)) return "Producto";
    if (/inv\s*por\s*vender|inv[_ ]?por[_ ]?vender/i.test(key)) return "Precio";
    return null; // Ocultar todas las demás columnas
  };

  // compute visible columns - SOLO LAS COLUMNAS PRINCIPALES
  const visibleCols = useMemo(() => {
    const primaryColumns = [
      'inv_id', 'suc_id', 'prod_id', 'producto', 
      'inv_stock', 'stock', 'inv_por_vender_neto'
    ];
    
    return cols.filter((k) => {
      if (!k) return false;
      const key = String(k);
      
      // Mostrar solo columnas principales
      if (primaryColumns.some(primary => key.toLowerCase().includes(primary.toLowerCase()))) {
        return true;
      }
      
      // Ocultar columnas duplicadas y métricas internas
      if (/utilidad|margen|costeo|unidades|cantidad|precio_venta|valor|prod_prec/i.test(key)) {
        return false;
      }
      
      return false; // Por defecto, ocultar
    });
  }, [cols]);

  // cell formatters that can access productMap / sucursalMap in this component's scope
  const formatCell = (v) => {
    if (v === null || v === undefined) return <span className="text-slate-400">—</span>;
    if (typeof v === "boolean") return v ? "Sí" : "No";
    if (typeof v === "number") return new Intl.NumberFormat("es-CL").format(v);
    if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) {
      const d = new Date(v);
      if (!isNaN(d)) return d.toLocaleString("es-CL");
    }
    const s = String(v);
    return s.length > 120 ? s.slice(0, 120) + "…" : s;
  };

  // helpers to extract price and stock from a row using common field names
  const parseNumber = (raw) => {
    if (raw === null || raw === undefined || raw === "") return null;
    if (typeof raw === "number") return raw;
    let s = String(raw).trim();
    s = s.replace(/[^0-9,\.\-]/g, "");
    if (s === "" || s === "-" || s === "," || s === ".") return null;
    const hasDot = s.indexOf('.') !== -1;
    const hasComma = s.indexOf(',') !== -1;
    try {
      if (hasDot && hasComma) {
        if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
          s = s.replace(/\./g, '');
          s = s.replace(/,/g, '.');
          return Number(s);
        }
        s = s.replace(/,/g, '');
        return Number(s);
      }
      if (hasComma && !hasDot) {
        const parts = s.split(',');
        if (parts.length === 2 && parts[1].length <= 3) {
          s = parts[0].replace(/\./g, '') + '.' + parts[1];
          return Number(s);
        }
        s = s.replace(/,/g, '');
        return Number(s);
      }
      s = s.replace(/\./g, '');
      return Number(s);
    } catch (e) {
      return null;
    }
  };

  const getPrice = (row) => {
    if (!row) return null;
    const candidates = [
      "prod_prec_venta_final",
      "precio_venta_final",
      "precio_venta",
      "precio",
      "valor",
      "prod_precio",
      "prod_prec",
      "prod_precio_venta",
      "precio_unitario",
      "precio_unit",
      "inv_por_vender_neto"
    ];
    for (const k of candidates) {
      if (row[k] !== undefined && row[k] !== null) return parseNumber(row[k]);
    }
    const p = row.producto ?? row.product;
    if (p && typeof p === 'object') {
      for (const k of candidates) if (p[k] !== undefined && p[k] !== null) return parseNumber(p[k]);
      if (p.precio) return parseNumber(p.precio);
      if (p.valor) return parseNumber(p.valor);
    }
    const priceKeyRegex = /precio|valor|precio_venta|prod_prec|prod_precio|precio_unitario|por\s*vender|inv[_ ]?por[_ ]?vender|inv[_ ]?por[_ ]?vender[_ ]?neto/i;
    for (const k of Object.keys(row)) {
      if (priceKeyRegex.test(k) && row[k] !== undefined && row[k] !== null) {
        const v = parseNumber(row[k]);
        if (v !== null) return v;
      }
    }
    return null;
  };

  const getStock = (row) => {
    if (!row) return null;
    const candidates = ["inv_stock", "inv_stock_unidades", "stock_unidades", "prod_stock", "stock", "stock_actual", "cantidad", "cantidad_unidades"];
    for (const k of candidates) {
      if (row[k] !== undefined && row[k] !== null) return parseNumber(row[k]);
    }
    if (row.inventario && typeof row.inventario === 'object') {
      const inv = row.inventario;
      for (const k of candidates) if (inv[k] !== undefined && inv[k] !== null) return parseNumber(inv[k]);
    }
    return null;
  };

  const openEdit = (idx, row) => {
    const s = getStock(row);
    const p = getPrice(row);
    setEditingIndex(idx);
    setEditValues({ stock: "", price: "" });
    setEditPrev({ stock: s, price: p });
    setEditErrors({ stock: "", price: "" });
  };

  const closeEdit = () => {
    setEditingIndex(null);
    setEditValues({ stock: "", price: "" });
  };

  // Función de debug para updateRecord
  const debugUpdateRecord = async (table, id, data) => {
    console.log(`🔧 DEBUG API: PUT /${table}/${id}/`, data);
    
    try {
      const response = await updateRecord(table, id, data);
      console.log(`✅ DEBUG API: Success`, response);
      return response;
    } catch (error) {
      console.error(`❌ DEBUG API: Error`, {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      throw error;
    }
  };

  const saveEdit = async () => {
    if (editingIndex == null) return closeEdit();

    const stockVal = parseNumber(editValues.stock === "" ? editPrev.stock : editValues.stock);
    const priceVal = parseNumber(editValues.price === "" ? editPrev.price : editValues.price);
    const errs = { stock: "", price: "" };
    if (stockVal == null || Number.isNaN(stockVal) || Number(stockVal) <= 0) errs.stock = "Stock debe ser mayor que 0";
    if (priceVal == null || Number.isNaN(priceVal) || Number(priceVal) <= 0) errs.price = "Precio debe ser mayor que 0";
    setEditErrors(errs);
    if (errs.stock || errs.price) return;

    const results = Array.isArray(data.results) ? [...data.results] : [];
    const originalRow = results[editingIndex] || {};
    
    console.log("🔄 === INICIANDO ACTUALIZACIÓN ===");
    console.log("📊 Datos a guardar:", { stockVal, priceVal });
    console.log("📝 Fila original:", originalRow);

    try {
      // 1. ENCONTRAR EL ID DEL INVENTARIO
      const invId = originalRow.inv_id || originalRow.id;
      console.log("🔍 ID de inventario encontrado:", invId);

      if (!invId) {
        throw new Error("No se pudo encontrar el ID del inventario");
      }

      // 2. ENCONTRAR EL ID DEL PRODUCTO
      let prodId = null;
      
      if (originalRow.prod_id) {
        prodId = originalRow.prod_id;
      } else if (originalRow.producto_id) {
        prodId = originalRow.producto_id;
      } else if (originalRow.producto && typeof originalRow.producto === 'object') {
        prodId = originalRow.producto.prod_id || originalRow.producto.id || originalRow.producto.producto_id;
      }
      
      console.log("🔍 ID de producto encontrado:", prodId);

      if (!prodId) {
        throw new Error("No se pudo encontrar el ID del producto");
      }

      // 3. ACTUALIZAR INVENTARIO (STOCK Y PRECIO DE VENTA)
      console.log("📦 Actualizando inventario...");
      const invPayload = { 
        inv_stock: stockVal,
        inv_por_vender_neto: priceVal
      };
      
      await debugUpdateRecord("inventario", invId, invPayload);

      // 4. ACTUALIZAR PRODUCTO (PRECIO)
      console.log("💰 Actualizando producto...");
      const prodPayload = { prod_prec_venta_final: priceVal };
      
      await debugUpdateRecord("producto", prodId, prodPayload);

      // 5. ACTUALIZACIÓN OPTIMISTA DE LA UI
      console.log("🎨 Actualizando UI...");
      const updatedRow = { ...originalRow };
      
      // Actualizar campos principales
      updatedRow.inv_stock = stockVal;
      updatedRow.inv_por_vender_neto = priceVal;
      
      // Si hay objeto producto, actualizarlo también
      if (updatedRow.producto && typeof updatedRow.producto === 'object') {
        updatedRow.producto = {
          ...updatedRow.producto,
          prod_prec_venta_final: priceVal
        };
      }

      results[editingIndex] = updatedRow;
      setData({ ...data, results });
      
      console.log("✅ UI actualizada correctamente");
      console.log("📝 Fila actualizada:", updatedRow);
      closeEdit();
      
    } catch (error) {
      console.error("💥 ERROR GENERAL:", error);
      setErr(error.message || "Error al guardar los cambios");
    }
  };

  const deleteRow = (idx) => {
    try {
      const ok = confirm('¿Eliminar este registro de inventario? Esta acción no se puede deshacer.');
      if (!ok) return;
    } catch (e) {
      // if confirm isn't available, fallback to removing without confirmation
    }
    const results = Array.isArray(data.results) ? [...data.results] : [];
    if (idx < 0 || idx >= results.length) return;
    const row = results[idx];
    const pkCandidates = ['inv_id', 'id', 'pk', 'producto_id', 'prod_id', 'inventario_id'];
    let pkVal = null;
    for (const k of pkCandidates) {
      if (row[k] !== undefined && row[k] !== null) { pkVal = row[k]; break; }
    }
    results.splice(idx, 1);
    const newCount = typeof data.count === 'number' ? Math.max(0, data.count - 1) : data.count;
    setData({ ...data, results, count: newCount });
    if (editingIndex !== null) closeEdit();
    if (pkVal != null) {
      (async () => {
        try {
          const invNames = ['inventario', 'inventarios'];
          for (const t of invNames) {
            try { await deleteRecord(t, pkVal); break; } catch (e) { /* try next */ }
          }
        } catch (e) {
          setErr(e?.response?.data?.detail || e?.message || String(e));
        }
      })();
    }
  };

  const formatCurrency = (n) => {
    if (n === null || n === undefined || Number.isNaN(Number(n))) return "-";
    return `$ ${Number(n).toLocaleString("es-CL")}`;
  };

  const computeGananciaEsperada = (row) => {
    const stock = getStock(row);
    const price = getPrice(row);
    if (stock == null || price == null) return null;
    return stock * price;
  };

  const formatCellWithContext = (row, key) => {
    if (/^inv_id$/i.test(key) || /inv id/i.test(key)) {
      const prod = row.producto ?? row.prod_id ?? row.producto_id ?? row.producto;
      if (prod && typeof prod === 'object') {
        return prod.prod_codigobarra ?? prod.codigo ?? prod.sku ?? prod.prod_codigobarra ?? prod.codigo_barras ?? JSON.stringify(prod);
      }
      const bc = row.prod_codigobarra ?? row.codigo ?? row.sku ?? row.codigo_barras;
      if (bc) return bc;
      const id = row.prod_id ?? row.producto ?? row.producto_id ?? row.prodid ?? row.id;
      if (id && productMap && productMap[id]) return productMap[id].barcode ?? productMap[id].name ?? id;
      return row[key];
    }

    if (/inv_stock/i.test(key) || /^stock$/i.test(key)) {
      const v = row[key] ?? row.stock_unidades ?? row.prod_stock ?? row.stock;
      if (v === null || v === undefined) return <span className="text-slate-400">—</span>;
      if (typeof v === 'number') return new Intl.NumberFormat('es-CL').format(v);
      return String(v);
    }

    if (/^suc\b/i.test(key) || /suc\s*_?id/i.test(key) || /sucurs/i.test(key) || /sucursal/i.test(key)) {
      const s = row.sucursal ?? row.suc_id ?? row["suc id"] ?? row.sucursal_id ?? row.sucursalId ?? row.sucId;
      if (s && typeof s === 'object') return s.suc_nom ?? s.nombre ?? s.name ?? JSON.stringify(s);
      if (s && sucursalMap && sucursalMap[s]) return sucursalMap[s];
      return s ?? row[key];
    }

    if (/producto|prod_/i.test(key)) {
      const p = row.producto ?? row.prod_id ?? row.producto_id;
      if (p && typeof p === 'object') return p.prod_nom ?? p.nombre ?? p.prod_nombre ?? JSON.stringify(p);
      if (p && productMap && productMap[p]) return productMap[p].name ?? productMap[p].barcode ?? p;
      return row.prod_nom ?? row.nombre ?? row.producto ?? row[key];
    }

    if (/precio|valor|precio_venta|prod_prec|prod_precio|precio_unitario|por\s*vender|inv[_ ]?por[_ ]?vender/i.test(key)) {
      const v = getPrice(row);
      if (v === null || v === undefined || Number.isNaN(Number(v))) return <span className="text-slate-400">—</span>;
      return formatCurrency(v);
    }

    return formatCell(row[key]);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Gestión de Inventario</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setOffset(0); setQ(""); }}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              Refrescar
            </button>
          </div>
      </div>

      <div className="bg-white border rounded-3xl p-4 mb-4 grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col">
          <label className="text-xs text-slate-500 mb-1">Buscar (texto)</label>
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              className="pl-9 border rounded-xl px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-100"
              placeholder="producto, sucursal, lote, descripción…"
              value={q}
              onChange={(e) => { setQ(e.target.value); setOffset(0); }}
            />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={() => setShowFilters((s) => !s)}
              className="text-sm px-2 py-1 border rounded-xl bg-slate-50 hover:bg-slate-100"
            >
              {showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
            </button>

            <div className="text-sm text-slate-500">Búsqueda: <span className="font-medium">Nombre o código</span></div>
          </div>

          {showFilters && (
            <div className="mt-2 p-3 border rounded-lg bg-slate-50">
              <div className="text-sm text-slate-600 mb-2">Filtros avanzados</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm">Precio mínimo</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={priceMin}
                    onChange={(e) => { setPriceMin(e.target.value); setOffset(0); }}
                    placeholder="ej. 1000"
                    className="w-full border rounded px-2 py-1"
                  />
                </div>
                <div>
                  <label className="text-sm">Precio máximo</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={priceMax}
                    onChange={(e) => { setPriceMax(e.target.value); setOffset(0); }}
                    placeholder="ej. 50000"
                    className="w-full border rounded px-2 py-1"
                  />
                </div>

                <div>
                  <label className="text-sm">Stock mínimo</label>
                  <input
                    type="number"
                    value={stockMin}
                    onChange={(e) => { setStockMin(e.target.value); setOffset(0); }}
                    placeholder="ej. 1"
                    className="w-full border rounded px-2 py-1"
                  />
                </div>
                <div>
                  <label className="text-sm">Stock máximo</label>
                  <input
                    type="number"
                    value={stockMax}
                    onChange={(e) => { setStockMax(e.target.value); setOffset(0); }}
                    placeholder="ej. 100"
                    className="w-full border rounded px-2 py-1"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end mt-3">
                <button
                  onClick={() => { setPriceMin(''); setPriceMax(''); setStockMin(''); setStockMax(''); setOffset(0); }}
                  className="px-3 py-1 rounded bg-slate-100 text-sm"
                >Limpiar</button>
                <button
                  onClick={() => { /* cambios aplicados automáticamente por efecto */ }}
                  className="px-3 py-1 rounded bg-indigo-600 text-white text-sm"
                >Aplicar</button>
              </div>
            </div>
          )}
        </div>

        <div />

        <div className="flex items-end justify-end gap-2">
          <button
            disabled={page <= 1}
            onClick={() => goto(page - 1)}
            className="inline-flex items-center gap-1 px-3 py-2 text-sm border rounded-xl disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" /> Anterior
          </button>

          <div className="text-sm text-slate-600">
            {page} / {totalPages} &nbsp;
            <span className="text-slate-400">({data.count} filas)</span>
          </div>

          <button
            disabled={page >= totalPages}
            onClick={() => goto(page + 1)}
            className="inline-flex items-center gap-1 px-3 py-2 text-sm border rounded-xl disabled:opacity-50"
          >
            Siguiente <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {err && <div className="mb-4 p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm">{err}</div>}

      <div className="bg-white border rounded-3xl overflow-hidden shadow-sm">
        <div 
          ref={tableContainerRef}
          className="overflow-x-auto w-full"
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                {visibleCols.length ? (
                  <>
                    {visibleCols
                      .map((c) => ({ key: c, label: headerName(c) }))
                      .filter(({ key, label }) => label !== null)
                      .map(({ key, label }) => (
                        <th 
                          key={key} 
                          className="py-3 px-4 text-left text-xs font-medium text-slate-600 tracking-wide whitespace-nowrap"
                        >
                          {label || key}
                        </th>
                      ))}
                    <th className="py-3 px-4 text-right text-xs font-medium text-slate-600 tracking-wide whitespace-nowrap">
                      Ganancia Esperada
                    </th>
                    <th className="py-3 px-4 text-center text-xs font-medium text-slate-600 tracking-wide whitespace-nowrap">
                      Acciones
                    </th>
                  </>
                ) : (
                  <>
                    <th className="py-3 px-4 whitespace-nowrap">Sin columnas</th>
                    <th className="py-3 px-4 text-right text-xs font-medium text-slate-600 tracking-wide whitespace-nowrap">
                      Ganancia Esperada
                    </th>
                    <th className="py-3 px-4 text-center text-xs font-medium text-slate-600 tracking-wide whitespace-nowrap">
                      Acciones
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={Math.max(1, visibleCols.length + 3)} className="py-6 text-center text-slate-400">
                    Cargando…
                  </td>
                </tr>
              ) : data.results.length ? (
                data.results.map((row, idx) => (
                  <tr key={idx} className="border-b last:border-none even:bg-white odd:bg-slate-50 hover:bg-slate-100">
                    {visibleCols
                      .map((c) => ({ key: c, label: headerName(c) }))
                      .filter(({ key, label }) => label !== null)
                      .map(({ key }) => {
                        const isPrice = /precio|valor|por\s*vender|inv[_ ]?por[_ ]?vender/i.test(key);
                        const isStock = /inv_stock|stock|cantidad/i.test(key);
                        const align = isPrice ? 'text-right' : isStock ? 'text-center' : '';
                        const isProductCol = /producto|prod_/i.test(key) || headerName(key) === 'Producto';
                        return (
                          <td 
                            key={key} 
                            className={`py-3 px-4 align-top ${align}`}
                          >
                            {isProductCol ? (
                              <div className="max-w-[220px] truncate">{formatCellWithContext(row, key)}</div>
                            ) : (
                              formatCellWithContext(row, key)
                            )}
                          </td>
                        );
                      })}
                    <td className="py-3 px-4 align-top text-right">
                      {formatCurrency(computeGananciaEsperada(row))}
                    </td>
                    <td className="py-3 px-4 align-top text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEdit(idx, row)}
                          className="px-2 py-1 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded-md shadow-sm"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => deleteRow(idx)}
                          className="px-2 py-1 text-sm bg-rose-500 hover:bg-rose-600 text-white rounded-md shadow-sm"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={Math.max(1, visibleCols.length + 3)} className="py-6 text-center text-slate-400">
                    Sin resultados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit modal */}
      {editingIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-medium mb-4">Editar inventario</h3>
            <div className="grid gap-3">
              <label className="text-sm">Stock</label>
              <input
                type="number"
                min={1}
                value={editValues.stock}
                placeholder={editPrev.stock == null ? "" : String(editPrev.stock)}
                onChange={(e) => setEditValues((s) => ({ ...s, stock: e.target.value }))}
                className="border rounded px-3 py-2"
              />
              {editErrors.stock && <div className="text-rose-600 text-sm">{editErrors.stock}</div>}

              <label className="text-sm">Precio</label>
              <input
                type="text"
                value={editValues.price}
                placeholder={editPrev.price == null ? "" : formatCurrency(editPrev.price)}
                onChange={(e) => setEditValues((s) => ({ ...s, price: e.target.value }))}
                className="border rounded px-3 py-2"
              />
              {editErrors.price && <div className="text-rose-600 text-sm">{editErrors.price}</div>}

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={closeEdit} className="px-3 py-1 rounded bg-slate-100">Cancelar</button>
                <button onClick={saveEdit} className="px-3 py-1 rounded bg-indigo-600 text-white">Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}