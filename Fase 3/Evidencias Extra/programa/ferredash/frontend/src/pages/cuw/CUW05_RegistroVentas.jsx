import React, { useEffect, useState } from "react";
import { listTable, api } from "../../lib/api";
import ModuleShell from "./_ModuleShell.jsx";

export default function CUW05_RegistroVentas() {
  const [data, setData] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [sucursales, setSucursales] = useState([]);
  const [selectedSuc, setSelectedSuc] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [items, setItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [productSearchResults, setProductSearchResults] = useState({});

  useEffect(() => {
    // Debounce la búsqueda y permite cancelar la petición anterior
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const r = await fetch(`/api/venta?limit=50${q ? `&search=${encodeURIComponent(q)}` : ""}`, { signal: controller.signal });
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        const j = await r.json();
        if (!active) return;
        // Acepta tanto { results: [] } como una lista directa
        setData(j.results ?? j ?? []);
      } catch (err) {
        if (err.name === 'AbortError') return; // petición cancelada
        console.error('CUW05: error cargando ventas', err);
        if (active) setData([]);
      } finally {
        if (active) setLoading(false);
      }
    }, 250);

    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [q]);

  // cargar sucursales para el formulario
  useEffect(() => {
    (async () => {
      try {
        const res = await listTable("sucursal", { limit: 200, offset: 0 });
        setSucursales(res.results || res.data || []);
      } catch (e) {
        setSucursales([]);
      }
    })();
  }, []);

  const addItem = () => {
    setItems((s) => [...s, { prod_id: "", prod_nom: "", cantidad: 1, precio_unitario: 0, descuento: 0 }]);
  };
  const removeItem = (idx) => {
    setItems((s) => s.filter((_, i) => i !== idx));
  };
  const updateItem = (idx, key, value) => {
    setItems((s) => s.map((it, i) => (i === idx ? { ...it, [key]: value } : it)));
  };

  const searchProduct = async (term, idx) => {
    if (!term) {
      setProductSearchResults((r) => ({ ...r, [idx]: [] }));
      return;
    }
    try {
      const res = await listTable("producto", { limit: 10, offset: 0, search: term });
      const arr = res.results || res.data || [];
      setProductSearchResults((r) => ({ ...r, [idx]: arr }));
    } catch (e) {
      setProductSearchResults((r) => ({ ...r, [idx]: [] }));
    }
  };

  const chooseProduct = (idx, prod) => {
    updateItem(idx, "prod_id", prod.prod_id ?? prod.id ?? prod.prod_id);
    updateItem(idx, "prod_nom", prod.prod_nom || prod.nombre || prod.name || "");
    // optionally set a suggested price if product exposes it
    if (prod.precio || prod.precio_unitario || prod.price) {
      updateItem(idx, "precio_unitario", prod.precio || prod.precio_unitario || prod.price || 0);
    }
    // clear search results for that row
    setProductSearchResults((r) => ({ ...r, [idx]: [] }));
  };

  const submitBatch = async () => {
    if (!items.length) return alert('Agrega al menos una línea');
    setSubmitting(true);
    try {
      const payload = { suc_id: selectedSuc || undefined, cli_id: clienteId || undefined, items: items.map(it => ({ prod_id: it.prod_id || it.prod, cantidad: it.cantidad, precio_unitario: it.precio_unitario, descuento: it.descuento })) };
      const res = await api.post('/venta/batch', payload);
      alert(`Boleta creada: ${res.data.bol_id}`);
      // limpiar formulario y recargar listado
      setShowCreate(false);
      setSelectedSuc("");
      setClienteId("");
      setItems([]);
      setQ(''); // trigger reload
    } catch (e) {
      console.error('Error creando boleta', e);
      alert('Error creando boleta: ' + (e?.response?.data?.detail || e.message || String(e)));
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <ModuleShell title="Registro de Ventas (CUW-05)">
      <div className="mb-3 flex items-center justify-between">
        <div style={{display: 'flex', gap: 8}}>
        <input
          type="search"
          aria-label="Buscar por producto o ID"
          className="border rounded-xl px-3 py-2 text-sm"
          placeholder="Buscar por nombre de producto o ID…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        </div>
        <div>
          <button className="bg-blue-600 text-white px-3 py-2 rounded-md text-sm" onClick={() => setShowCreate(s => !s)}>{showCreate ? 'Cancelar' : 'Añadir venta'}</button>
        </div>
      </div>

      {showCreate && (
        <div className="mb-4 border rounded-md p-3 bg-white">
          <div className="grid grid-cols-3 gap-3 items-end">
            <div>
              <label className="text-xs text-slate-600">Sucursal</label>
              <select className="w-full border rounded px-2 py-1" value={selectedSuc} onChange={(e) => setSelectedSuc(e.target.value)}>
                <option value="">(Seleccionar)</option>
                {sucursales.map(s => <option key={s.suc_id || s.id} value={s.suc_id || s.id}>{s.suc_nom || s.nombre || `Sucursal ${s.suc_id || s.id}`}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-600">Cliente (ID opc.)</label>
              <input className="w-full border rounded px-2 py-1" value={clienteId} onChange={(e) => setClienteId(e.target.value)} placeholder="ID cliente (opcional)" />
            </div>
            <div className="text-right">
              <button className="bg-green-600 text-white px-3 py-1 rounded-md text-sm" onClick={addItem}>Agregar Línea</button>
            </div>
          </div>

          <div className="mt-3">
            {items.length === 0 && <div className="text-sm text-slate-500">Sin líneas. Agrega al menos una.</div>}
            {items.map((it, idx) => (
              <div key={idx} className="p-2 border rounded mb-2">
                <div className="grid grid-cols-6 gap-2 items-end">
                  <div className="col-span-2">
                    <label className="text-xs">Producto</label>
                    <input className="w-full border rounded px-2 py-1" value={it.prod_nom || it.prod_id} onChange={(e) => { updateItem(idx, 'prod_nom', e.target.value); searchProduct(e.target.value, idx); }} placeholder="Buscar por nombre o pegar ID" />
                    {productSearchResults[idx] && productSearchResults[idx].length > 0 && (
                      <div className="border mt-1 max-h-40 overflow-auto bg-white">
                        {productSearchResults[idx].map(p => (
                          <div key={p.prod_id || p.id} className="p-1 hover:bg-slate-100 cursor-pointer" onClick={() => chooseProduct(idx, p)}>
                            {p.prod_nom || p.nombre || p.id} (ID {p.prod_id || p.id})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-xs">Cant.</label>
                    <input type="number" className="w-full border rounded px-2 py-1" value={it.cantidad} min={1} onChange={(e) => updateItem(idx, 'cantidad', Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="text-xs">Precio</label>
                    <input type="number" className="w-full border rounded px-2 py-1" value={it.precio_unitario} onChange={(e) => updateItem(idx, 'precio_unitario', Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="text-xs">Descuento</label>
                    <input type="number" className="w-full border rounded px-2 py-1" value={it.descuento} onChange={(e) => updateItem(idx, 'descuento', Number(e.target.value))} />
                  </div>
                  <div className="col-span-1 text-right">
                    <button className="text-red-600" onClick={() => removeItem(idx)}>Eliminar</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 text-right">
            <button className="bg-gray-200 px-3 py-1 rounded mr-2" onClick={() => { setShowCreate(false); }}>Cancelar</button>
            <button className="bg-blue-600 text-white px-3 py-1 rounded" onClick={submitBatch} disabled={submitting}>{submitting ? 'Guardando...' : 'Crear Boleta y Ventas'}</button>
          </div>
        </div>
      )}
      {loading && (
        <div className="mb-3 text-sm text-slate-500">Cargando...</div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b">
              <th className="py-2 px-3">Sucursal</th>
              <th className="py-2 px-3">Cliente</th>
              <th className="py-2 px-3">Producto</th>
              <th className="py-2 px-3">Cant.</th>
              <th className="py-2 px-3">Monto</th>
              <th className="py-2 px-3">Fecha</th>
            </tr>
          </thead>
          <tbody>
              {data.map((v, i) => (
                <tr key={v.id ?? `${v.cliente ?? v.cliente_id}_${v.producto ?? v.producto_id}_${i}`} className="border-b last:border-none">
                  <td className="py-2 px-3">{v.sucursal_nombre ?? (v.suc_id ? `ID ${v.suc_id}` : '—')}</td>
                  <td className="py-2 px-3">{v.cliente_nombre ?? v.cliente ?? v.cliente_id ?? "—"}</td>
                  <td className="py-2 px-3">{v.producto ?? v.producto_id ?? "—"}</td>
                  <td className="py-2 px-3">{v.cantidad ?? 0}</td>
                  <td className="py-2 px-3">$ {new Intl.NumberFormat("es-CL").format(v.monto ?? 0)}</td>
                  <td className="py-2 px-3">{v.fecha ? new Date(v.fecha).toLocaleString("es-CL") : "—"}</td>
                </tr>
              ))}
            {!data.length && <tr><td colSpan={5} className="py-6 text-center text-slate-400">Sin datos</td></tr>}
          </tbody>
        </table>
      </div>
    </ModuleShell>
  );
}
