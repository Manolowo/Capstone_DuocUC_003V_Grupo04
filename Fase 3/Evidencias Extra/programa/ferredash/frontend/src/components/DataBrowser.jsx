// frontend/src/components/DataBrowser.jsx
import { useEffect, useMemo, useState } from "react";
import { listTable, createRecord, updateRecord, deleteRecord, getRecord, getTableSchema } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { mockProviders } from "../lib/mockData";

export default function DataBrowser({ table, title }) {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [cols, setCols] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [totalCount, setTotalCount] = useState(0);
  const [productMap, setProductMap] = useState({});
  // Filters for venta
  const [showFilters, setShowFilters] = useState(false);
  const [minPriceFilter, setMinPriceFilter] = useState("");
  const [maxPriceFilter, setMaxPriceFilter] = useState("");
  const [minDiscountFilter, setMinDiscountFilter] = useState("");
  const [maxDiscountFilter, setMaxDiscountFilter] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [sucFilter, setSucFilter] = useState("");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [categories, setCategories] = useState([]);
  const [sucursales, setSucursales] = useState([]);

  // CRUD form state
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState("create"); // create | edit
  const [formData, setFormData] = useState({});
  const [selectedPk, setSelectedPk] = useState(null);
  // Venta-specific state
  const [lineItems, setLineItems] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState([]);

  const params = useMemo(() => {
    const p = { limit: pageSize, offset: (page - 1) * pageSize, search };
    if (table === "venta") {
      if (minPriceFilter) p.min_price = minPriceFilter;
      if (maxPriceFilter) p.max_price = maxPriceFilter;
      if (minDiscountFilter) p.min_discount = minDiscountFilter;
      if (maxDiscountFilter) p.max_discount = maxDiscountFilter;
      if (catFilter) p.cat_id = catFilter;
      if (sucFilter) p.suc_id = sucFilter;
      if (startDateFilter) p.start_date = startDateFilter;
      if (endDateFilter) p.end_date = endDateFilter;
    }
    return p;
  }, [search, page, table, minPriceFilter, maxPriceFilter, minDiscountFilter, maxDiscountFilter, catFilter, sucFilter, startDateFilter, endDateFilter]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, params]);

  // load categories and sucursales for filters when viewing ventas
  useEffect(() => {
    if (table !== "venta") return;
    (async () => {
      try {
        const cats = await listTable("categoria", { limit: 100, offset: 0 });
        setCategories(cats.results || cats.data || []);
      } catch (e) {
        setCategories([]);
      }
      try {
        const sucs = await listTable("sucursal", { limit: 100, offset: 0 });
        setSucursales(sucs.results || sucs.data || []);
      } catch (e) {
        setSucursales([]);
      }
    })();
  }, [table]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      // Prefer server-side search: request the backend with the search param and let it
      // apply appropriate JOINs / ILIKE filters. This avoids fetching every page client-side
      // which caused many requests and UI reloads.
      const res = await listTable(table, params);
      const r = res.results || res.data || [];
      setRows(r);
      setCols(r.length ? Object.keys(r[0]) : []);
      const total = res.data?.count ?? r.length;
      setTotalCount(total);

      // If the table is 'venta' and the backend returned results, we still enhance the
      // displayed rows by fetching product names for the visible product IDs (only those
      // present in the current page), avoiding full-table fetches.
      // (Product-name mapping is handled by a separate effect that watches `rows`.)

      // Fallback: if backend returned nothing and we still have a non-empty search term,
      // optionally try a client-side exhaustive search as a last resort (disabled by default).
      // -- intentionally kept out to prevent heavy traffic; enable only if needed.

    } catch (e) {
      // si es 404 en proveedores, usar mock
      const status = e?.response?.status;
      const msg = e?.response?.data?.detail || e?.message || String(e);
      const is404 = status === 404 || /status code 404/.test(msg) || /404/.test(msg);
      if (table === "proveedor" && is404) {
        setRows(mockProviders);
        setCols(Object.keys(mockProviders[0] || {}));
        setError("");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  // When loading ventas, fetch product names for product id column
  useEffect(() => {
    if (table !== "venta" || rows.length === 0) return;
    // detect product column in rows
    const colCandidates = ["producto_id", "prod_id", "prod", "id_producto", "producto"];
    const prodCol = cols.find((c) => colCandidates.includes(c)) || cols.find((c) => /prod/i.test(c));
    if (!prodCol) return;
    const ids = Array.from(new Set(rows.map((r) => r[prodCol]).filter(Boolean)));
    if (ids.length === 0) return;
    // fetch product details in parallel (bounded)
    Promise.all(ids.map((id) => getRecord("producto", id).catch(() => null))).then((arr) => {
      const map = {};
      arr.forEach((res, i) => {
        const id = ids[i];
        if (res && res.data) {
          // detail endpoint returns object
          map[id] = res.data.prod_nom || res.data.nombre || res.data.prod_nom || String(id);
        } else {
          map[id] = String(id);
        }
      });
      setProductMap(map);
    });
  }, [table, rows, cols]);

  const pkCol = useMemo(() => {
    if (!cols || cols.length === 0) return null;
    const byExact = cols.find((c) => c === "id" || c.toLowerCase() === "id");
    if (byExact) return byExact;
    const byUnderscore = cols.find((c) => c.toLowerCase().endsWith("_id"));
    if (byUnderscore) return byUnderscore;
    const byContains = cols.find((c) => /(^|_)id($|_)/i.test(c) || c.toLowerCase().includes("id"));
    return byContains || cols[0];
  }, [cols]);
  const openCreate = () => {
    setFormMode("create");
    setSelectedPk(null);
    if (table === "venta") {
      setLineItems([]);
      setFormData({});
      setShowForm(true);
      return;
    }

    const prepare = async () => {
      // try to infer columns first from cached cols, then from a sample row, then from schema endpoint
      let knownCols = cols;
      if ((!knownCols || knownCols.length === 0) && table) {
        try {
          const sample = await listTable(table, { limit: 1, offset: 0 });
          const r = sample.results || sample.data || [];
          knownCols = r.length ? Object.keys(r[0]) : knownCols;
        } catch (e) {
          // ignore
        }
      }
      if ((!knownCols || knownCols.length === 0) && table) {
        try {
          const schema = await getTableSchema(table);
          const colsArr = schema?.data?.columns || [];
          knownCols = colsArr.map((c) => c.name);
        } catch (e) {
          // ignore
        }
      }
      const template = {};
      (knownCols || []).forEach((c) => {
        if (c === pkCol) return;
        template[c] = null;
      });
      setFormData(template);
      setShowForm(true);
    };

    prepare();
  };

  const openEdit = (row) => {
    setFormMode("edit");
    setSelectedPk(row[pkCol]);
    const payload = {};
    cols.forEach((c) => {
      if (c === pkCol) return;
      payload[c] = row[c] ?? null;
    });
    setFormData(payload);
    setShowForm(true);
  };

  const handleDelete = async (row) => {
    if (!pkCol) return alert("No se encontró columna PK para eliminar");
    const pk = row[pkCol];
    if (!confirm(`Eliminar registro ${pk}?`)) return;
    try {
      await deleteRecord(table, pk);
      await load();
    } catch (e) {
      alert(e?.response?.data?.detail || e?.message || String(e));
    }
  };

  // When clicking "Ver boleta" on a venta row: open existing boleta or create a new one and associate it
  const handleViewBoleta = async (row) => {
    try {
      // detect boleta id in the venta row
      const bolKeys = ["bol_id", "bol", "boleta_id", "boleta"];
      const bolKey = Object.keys(row).find((k) => bolKeys.includes(k) || /bol/i.test(k));
      let bolId = bolKey ? row[bolKey] : null;
      // If no boleta exists, create one from the venta data
      if (!bolId) {
        // try to compute a sensible total from row fields
        const subtotalKeys = ["ven_subtotal", "subtotal", "ven_precio_unitario", "ven_total", "total"];
        const qtyKeys = ["ven_cantidad", "cantidad", "qty"];
        const priceKeys = ["ven_precio_unitario", "precio", "precio_unitario", "ven_precio"];
        const discountKeys = ["ven_descuento", "descuento", "discount"];

        const getFirst = (keys) => keys.map(k => row[k]).find(v => v !== undefined && v !== null);
        let total = getFirst(subtotalKeys);
        if (total == null) {
          const price = Number(getFirst(priceKeys)) || 0;
          const qty = Number(getFirst(qtyKeys)) || 1;
          const disc = Number(getFirst(discountKeys)) || 0;
          const raw = price * qty;
          total = Math.round((raw - (raw * (disc / 100)) + Number.EPSILON) * 100) / 100;
        }

        const nowIso = new Date().toISOString();
        const boletaPayload = { bol_fecha: nowIso, bol_total: total };
        // carry over client, sucursal, usuario if present in venta row
        const cliKey = Object.keys(row).find(k => /cli|cliente/i.test(k));
        if (cliKey && row[cliKey]) boletaPayload.cli_id = row[cliKey];
        const sucKey = Object.keys(row).find(k => /suc|sucursal/i.test(k));
        if (sucKey && row[sucKey]) boletaPayload.suc_id = row[sucKey];
        const usuId = user?.id || user?.pk || user?.usu_id || null;
        if (usuId) boletaPayload.usu_id = usuId;

        // create boleta and then update the venta row to reference it
        const created = await createRecord("boleta", boletaPayload);
        const boletaObj = created?.data || created;
        bolId = boletaObj?.bol_id || boletaObj?.id || null;

        // update venta to point to the new boleta if we can detect the venta pk and boleta column name
        try {
          if (bolId) {
            const venPk = row[pkCol];
            const bolColName = bolKey || (cols.find(c => /bol/i.test(c)));
            if (venPk && bolColName) {
              const upd = {};
              upd[bolColName] = bolId;
              await updateRecord("venta", venPk, upd);
              // update local row so UI reflects change
              row[bolColName] = bolId;
            }
          }
        } catch (e) {
          // non-fatal: boleta created but venta update failed
          console.warn("Failed to update venta with new boleta:", e);
        }
      }

      // fetch boleta detail to look for a PDF/url field
      const res = await getRecord("boleta", bolId);
      const boleta = res?.data || res;
      const pdf = boleta?.bol_pdf || boleta?.pdf || boleta?.url || null;
      if (pdf) {
        let url = pdf;
        // normalize relative urls
        if (!/^https?:\/\//i.test(url)) {
          if (!url.startsWith("/")) url = "/" + url;
          url = window.location.origin + url;
        }
        window.open(url, "_blank");
        return;
      }

      // fallback: open the boleta API endpoint so the user can inspect the data
      const apiUrl = new URL(`/api/boleta/${bolId}`, window.location.origin).toString();
      window.open(apiUrl, "_blank");
    } catch (err) {
      alert(err?.response?.data?.detail || err?.message || String(err));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (table === "venta" && formMode === "create") {
        // basic validation: require at least one line item
        if (!lineItems || lineItems.length === 0) {
            return alert("Debe agregar al menos un ítem a la venta antes de crear la venta.");
          }
          // NOTE: temporalmente omitimos la creación automática de la boleta.
          // Solo creamos las líneas de venta directamente y no intentamos
          // crear/ligar una boleta para evitar fallos en entornos donde
          // el endpoint de boleta no esté disponible.
        const now = new Date();
        const fechaIso = now.toISOString(); // TIMESTAMP
        const fecha = fechaIso.slice(0, 10);
        const hora = now.toTimeString().slice(0, 8);

        const total = lineItems.reduce((s, it) => s + (it.subtotal || 0), 0);
        // build boleta payload (minimal). Attach usu_id if available from auth.
        const usuId = user?.id || user?.pk || user?.usu_id || null;
        const boletaPayload = { bol_fecha: fechaIso, bol_total: total };
        if (usuId) boletaPayload.usu_id = usuId;

        // Intentar crear boleta (bol_pdf puede quedar vacío). Si falla, no bloquear la
        // creación de las líneas de venta: continuamos pero emitimos una advertencia.
        let boletaId = null;
        try {
          const boletaRes = await createRecord("boleta", boletaPayload);
          const boletaObj = boletaRes.data || boletaRes;
          boletaId = boletaObj?.bol_id || boletaObj?.id || null;
          if (!boletaId) {
            console.warn("Boleta creada pero no devolvió ID:", boletaObj);
          }
        } catch (e) {
          console.warn("No se pudo crear boleta automática (se continuará sin boleta):", e);
          boletaId = null;
        }
  // detect column names in venta schema
  const prodCol = cols.find((c) => ["prod_id", "prod_id", "producto_id", "prod", "id_producto", "producto"].includes(c)) || cols.find((c) => /prod/i.test(c));
  const bolCol = cols.find((c) => ["bol_id", "bol", "boleta_id"].includes(c)) || cols.find((c) => /bol/i.test(c));
        const priceCol = cols.find((c) => /precio|precio_unitario|ven_precio_unitario|precio/i.test(c));
        const qtyCol = cols.find((c) => /cantidad|cant|ven_cantidad|qty/i.test(c));
        const discountCol = cols.find((c) => /descuen|discount|ven_descuento|ven_desc/i.test(c));
        const subtotalCol = cols.find((c) => /subtotal|ven_subtotal|sub_total/i.test(c));
        const fechaCol = cols.find((c) => /ven_fecha|fecha/i.test(c));
        const horaCol = cols.find((c) => /ven_hora|hora/i.test(c));

  // validate required column detection
  if (!prodCol) return alert("No se pudo detectar la columna de producto en la tabla 'venta'. Revisa el esquema del backend.");
  // no requerimos bolCol para crear ventas cuando la boleta está deshabilitada

  const errors = [];
        for (const it of lineItems) {
          const payload = {};
          if (prodCol) payload[prodCol] = it.productId;
          if (bolCol && boletaId) payload[bolCol] = boletaId;
          if (priceCol) payload[priceCol] = it.unitPrice;
          if (qtyCol) payload[qtyCol] = it.quantity;
          if (discountCol) payload[discountCol] = it.discountPercent;
          if (subtotalCol) payload[subtotalCol] = it.subtotal;
          if (fechaCol) payload[fechaCol] = fecha;
          if (horaCol) payload[horaCol] = hora;
          try {
            // debug: log payload to help backend troubleshooting
            try { console.log("[DataBrowser] Creating venta payload:", payload); } catch (e) {}
            await createRecord("venta", payload);
          } catch (err) {
            console.error("Error creando linea de venta:", payload, err);
            errors.push(err?.response?.data?.detail || err?.message || String(err));
          }
        }
        if (errors.length) {
          // show first error, but log all
          alert("Algunas líneas no pudieron crearse: " + errors[0]);
        }

        setShowForm(false);
        await load();
      } else {
        if (formMode === "create") {
          await createRecord(table, formData);
        } else {
          await updateRecord(table, selectedPk, formData);
        }
        setShowForm(false);
        await load();
      }
    } catch (err) {
      // show richer error info to help debugging (also log full error to console)
      try { console.error("[DataBrowser.handleSubmit] error:", err); } catch (e) {}
      const serverData = err?.response?.data;
      const serverDetail = serverData?.detail || serverData || err?.message || String(err);
      alert(JSON.stringify(serverDetail));
    }
  };

  function humanize(c) {
    if (!c) return "";
    const map = {
      ven_id: "ID",
      bol_id: "Boleta",
      prod_id: "Nombre producto",
      prod_nom: "Producto",
      ven_fecha: "Fecha",
      ven_hora: "Hora",
      ven_precio_unitario: "Precio unitario",
      ven_cantidad: "Cantidad",
  ven_subtotal: "Subtotal",
  ven_descuento: "Porcentaje de descuento",
      cli_id: "Cliente ID",
      cli_nom: "Cliente",
      usu_id: "Usuario ID",
    };
    if (map[c]) return map[c];
    // replace underscores and common prefixes
    return c.replace(/_/g, " ").replace(/(^\w)/, (s) => s.toUpperCase());
  }

  function renderCell(row, c) {
    // special for venta product name
    const prodKeys = ["producto_id", "prod_id", "prod", "id_producto", "producto"];
    if (table === "venta" && prodKeys.includes(c)) {
      const id = row[c];
      return productMap[id] || id || "-";
    }
    // format percentage-like columns
    if (/descuen|discount|porcentaje|ven_descuento|ven_desc/i.test(c)) {
      const v = row[c];
      if (v == null || v === "") return "-";
      return `${v}%`;
    }
    // format currency-like columns
    if (/precio|monto|subtotal|total|importe|valor/i.test(c)) {
      const v = row[c];
      if (v == null || v === "") return "-";
      const num = Number(v);
      if (Number.isFinite(num)) return `$ ${num.toLocaleString()}`;
    }
    return formatCell(row[c]);
  }

  const totalPages = Math.max(1, Math.ceil((totalCount || 0) / pageSize));

  // --- Venta helpers ---
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!productSearch || productSearch.trim().length < 2) return setProductResults([]);
      try {
        // fetch first page to get total
        const first = await listTable("producto", { limit: pageSize, offset: 0 });
        const total = first.data?.count ?? (first.data?.length ?? 0);
        let all = first.results || first.data || [];
        const pages = Math.max(1, Math.ceil(total / pageSize));
        for (let p = 2; p <= pages; p++) {
          const resp = await listTable("producto", { limit: pageSize, offset: (p - 1) * pageSize });
          const part = resp.results || resp.data || [];
          all = all.concat(part);
        }
        const q = productSearch.toLowerCase().trim();
        const filtered = all.filter((prod) => {
          return (
            String(prod.prod_nom || prod.nombre || prod.prod_codigobarra || prod.prod_id || prod.id || "").toLowerCase().includes(q)
          );
        }).slice(0, 20);
        setProductResults(filtered);
      } catch (err) {
        setProductResults([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [productSearch]);

  function addLineItemFromProduct(prod) {
    // infer unit price from product fields
    const price = Number(prod.prod_prec_venta_final ?? prod.prod_prec_venta_neto ?? prod.prod_prec_venta_unitario ?? 0) || 0;
    const item = {
      productId: prod.prod_id || prod.id || prod.prod_id || prod.id_producto || prod.prod || null,
      productName: prod.prod_nom || prod.prod_nombre || prod.nombre || prod.prod_nom || String(prod.prod_id || prod.id),
      unitPrice: price,
      quantity: 1,
      discountPercent: 0,
      subtotal: price,
    };
    setLineItems((s) => [...s, item]);
    setProductSearch("");
    setProductResults([]);
  }

  function updateLineItem(idx, patch) {
    setLineItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      // recalc subtotal
      const price = Number(next[idx].unitPrice) || 0;
      const qty = Number(next[idx].quantity) || 0;
      const disc = Number(next[idx].discountPercent) || 0;
      const raw = price * qty;
      const sub = raw - (raw * (disc / 100));
      next[idx].subtotal = Math.round((sub + Number.EPSILON) * 100) / 100;
      return next;
    });
  }

  function removeLineItem(idx) {
    setLineItems((prev) => prev.filter((_, i) => i !== idx));
  }


  return (
    <div className="p-6">
      <div className="flex items-start justify-between">
        <h1 className="text-xl font-semibold mb-4">{title}</h1>
        <div>
          <button onClick={openCreate} className="bg-green-600 text-white px-3 py-1 rounded">{table === 'venta' ? 'Añadir venta' : 'Nuevo'}</button>
        </div>
      </div>

      <div className="mb-3 flex items-center gap-3">
        <input
          className="border rounded px-3 py-2 w-full max-w-xs"
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {table === "venta" && (
          <div className="ml-2">
            <button onClick={() => setShowFilters((s) => !s)} className="px-3 py-1 border rounded text-sm">
              {showFilters ? "Ocultar filtros" : "Mostrar filtros"}
            </button>
          </div>
        )}
        <div className="ml-auto flex items-center gap-2 text-sm text-gray-600">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="px-2 py-1 border rounded">Anterior</button>
          <span>Página {page} / {totalPages}</span>
          <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="px-2 py-1 border rounded">Siguiente</button>
        </div>
      </div>

      {table === "venta" && showFilters && (
        <div className="mb-4 border rounded p-3 bg-gray-50">
          <div className="grid grid-cols-3 gap-3">
            <label className="flex flex-col text-sm">
              <span className="text-xs text-gray-600">Precio mínimo</span>
              <input type="number" step="0.01" value={minPriceFilter} onChange={(e) => setMinPriceFilter(e.target.value)} className="border rounded px-2 py-1" />
            </label>
            <label className="flex flex-col text-sm">
              <span className="text-xs text-gray-600">Precio máximo</span>
              <input type="number" step="0.01" value={maxPriceFilter} onChange={(e) => setMaxPriceFilter(e.target.value)} className="border rounded px-2 py-1" />
            </label>
            <label className="flex flex-col text-sm">
              <span className="text-xs text-gray-600">Descuento mínimo (%)</span>
              <input type="number" step="0.1" value={minDiscountFilter} onChange={(e) => setMinDiscountFilter(e.target.value)} className="border rounded px-2 py-1" />
            </label>
            <label className="flex flex-col text-sm">
              <span className="text-xs text-gray-600">Descuento máximo (%)</span>
              <input type="number" step="0.1" value={maxDiscountFilter} onChange={(e) => setMaxDiscountFilter(e.target.value)} className="border rounded px-2 py-1" />
            </label>
            <label className="flex flex-col text-sm">
              <span className="text-xs text-gray-600">Categoría</span>
              <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="border rounded px-2 py-1">
                <option value="">-- Todas --</option>
                {categories.map((c) => (
                  <option key={c.cat_id || c.id} value={c.cat_id || c.id}>{c.cat_nom || c.nombre || c.name}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col text-sm">
              <span className="text-xs text-gray-600">Sucursal</span>
              <select value={sucFilter} onChange={(e) => setSucFilter(e.target.value)} className="border rounded px-2 py-1">
                <option value="">-- Todas --</option>
                {sucursales.map((s) => (
                  <option key={s.suc_id || s.id} value={s.suc_id || s.id}>{s.suc_nom || s.nombre || s.name}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col text-sm">
              <span className="text-xs text-gray-600">Fecha desde</span>
              <input type="date" value={startDateFilter} onChange={(e) => setStartDateFilter(e.target.value)} className="border rounded px-2 py-1" />
            </label>
            <label className="flex flex-col text-sm">
              <span className="text-xs text-gray-600">Fecha hasta</span>
              <input type="date" value={endDateFilter} onChange={(e) => setEndDateFilter(e.target.value)} className="border rounded px-2 py-1" />
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={() => { setPage(1); }} className="px-3 py-1 bg-blue-600 text-white rounded">Aplicar filtros</button>
            <button onClick={() => {
              setMinPriceFilter(""); setMaxPriceFilter(""); setMinDiscountFilter(""); setMaxDiscountFilter(""); setCatFilter(""); setSucFilter(""); setStartDateFilter(""); setEndDateFilter(""); setPage(1);
            }} className="px-3 py-1 border rounded">Limpiar</button>
          </div>
        </div>
      )}

      {error && <p className="text-red-600 mb-3">Error: {error}</p>}
      {loading ? (
        <p className="text-gray-500">Cargando...</p>
      ) : (
        <>
          <div className="overflow-auto rounded border">
            <table className="min-w-[700px] w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {cols.map((c) => (
                    <th key={c} className="p-3 text-left font-medium">{humanize(c)}</th>
                  ))}
                  <th className="p-3 text-left font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td className="p-3 text-gray-500" colSpan={cols.length + 1}>Sin resultados</td></tr>
                )}
                {rows.map((r, idx) => (
                  <tr key={idx} className="border-t hover:bg-gray-50">
                    {cols.map((c) => (
                      <td key={c} className="p-3">{renderCell(r, c)}</td>
                    ))}
                    <td className="p-3">
                      <div className="flex gap-2">
                        {table === "venta" && (
                          <button onClick={() => handleViewBoleta(r)} className="px-2 py-1 bg-indigo-600 text-white rounded text-sm">Ver boleta</button>
                        )}
                        <button onClick={() => openEdit(r)} className="px-2 py-1 bg-blue-600 text-white rounded text-sm">Editar</button>
                        <button onClick={() => handleDelete(r)} className="px-2 py-1 bg-red-600 text-white rounded text-sm">Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination bottom */}
          <div className="mt-3 flex items-center justify-center gap-3">
            <button onClick={() => setPage(1)} disabled={page === 1} className="px-2 py-1 border rounded">Primera</button>
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="px-2 py-1 border rounded">Anterior</button>
            <span className="text-sm text-gray-600">Página {page} de {totalPages} — {totalCount} registros</span>
            <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="px-2 py-1 border rounded">Siguiente</button>
            <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="px-2 py-1 border rounded">Última</button>
          </div>
        </>
      )}

      {/* Form modal / panel */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-start justify-center p-6">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6">
            <h2 className="text-lg font-semibold mb-4">{formMode === 'create' ? 'Crear' : 'Editar'} registro</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              {table === "venta" ? (
                <div>
                  <div className="mb-3">
                    <label className="block text-sm text-gray-600 mb-1">Buscar producto</label>
                    <input
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Escribe nombre o código..."
                      className="w-full border rounded px-2 py-2"
                    />
                    {productResults.length > 0 && (
                      <ul className="bg-white border mt-1 max-h-40 overflow-auto">
                        {productResults.map((p) => (
                          <li key={p.prod_id || p.id} className="p-2 hover:bg-gray-100 cursor-pointer" onClick={() => addLineItemFromProduct(p)}>
                            {p.prod_nom || p.nombre || `#${p.prod_id || p.id}`} - {p.prod_prec_venta_final ?? p.prod_prec_venta_neto ?? "--"}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="space-y-2">
                    {lineItems.length === 0 && <p className="text-gray-500">No hay productos agregados.</p>}
                    {lineItems.map((it, idx) => (
                      <div key={idx} className="p-2 border rounded flex items-center gap-2">
                        <div className="flex-1">
                          <div className="text-sm font-medium">{it.productName}</div>
                          <div className="text-xs text-gray-500">ID: {it.productId}</div>
                        </div>
                        <div className="w-28">
                          <input type="number" step="0.01" value={it.unitPrice} onChange={(e) => updateLineItem(idx, { unitPrice: Number(e.target.value) })} className="w-full border rounded px-2 py-1 text-right" />
                        </div>
                        <div className="w-20">
                          <input type="number" step="1" value={it.quantity} onChange={(e) => updateLineItem(idx, { quantity: Number(e.target.value) })} className="w-full border rounded px-2 py-1 text-right" />
                        </div>
                        <div className="w-28">
                          <input type="number" step="0.1" value={it.discountPercent} onChange={(e) => updateLineItem(idx, { discountPercent: Number(e.target.value) })} className="w-full border rounded px-2 py-1 text-right" />
                          <div className="text-xs text-gray-500 text-right">%</div>
                        </div>
                        <div className="w-32 text-right">$ {Number(it.subtotal || 0).toLocaleString()}</div>
                        <button type="button" onClick={() => removeLineItem(idx)} className="px-2 py-1 text-red-600">Eliminar</button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 text-right">
                    <div className="text-sm text-gray-600">Total: <b>$ {lineItems.reduce((s, it) => s + (it.subtotal || 0), 0).toLocaleString()}</b></div>
                  </div>

                  <div className="flex items-center justify-end gap-2 mt-4">
                    <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1 rounded border">Cancelar</button>
                    <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded">Crear venta</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    {cols.map((c) => {
                      if (c === pkCol) return null;
                      return (
                        <label key={c} className="flex flex-col text-sm">
                          <span className="mb-1 text-gray-600">{c.replace(/_/g, ' ')}</span>
                          <input
                            value={formData[c] ?? ''}
                            onChange={(e) => setFormData({ ...formData, [c]: e.target.value })}
                            className="border rounded px-2 py-2"
                          />
                        </label>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1 rounded border">Cancelar</button>
                    <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded">Guardar</button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function formatCell(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return v.toLocaleString();
  if (typeof v === "boolean") return v ? "Sí" : "No";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
    try { return new Date(v).toLocaleString(); } catch { return v; }
  }
  return String(v);
}
