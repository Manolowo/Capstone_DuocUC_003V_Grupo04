import React, { useEffect, useState } from "react";
import { listTable, updateRecord, deleteRecord } from "../../lib/api";
import ErrorBoundary from "../../components/ErrorBoundary";

export default function Empleados() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [showJson, setShowJson] = useState(false);
  const [roleMap, setRoleMap] = useState({});
  const [sucursales, setSucursales] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({});
  const [modalErr, setModalErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        // pedir usuarios y roles en paralelo para mapear rol_id -> nombre
        const [uRes, rRes] = await Promise.all([
          listTable("usuario", { limit: 50, offset: 0 }),
          listTable("rol", { limit: 100, offset: 0 }).catch(() => ({ results: [] })),
        ]);

        console.log("[Empleados] usuarios raw:", uRes);
        console.log("[Empleados] roles raw:", rRes);

        const results = uRes.results ?? uRes.data?.results ?? uRes.data ?? [];
        const roleRows = rRes.results ?? rRes.data?.results ?? rRes.data ?? [];
        if (!alive) return;
        const finalRows = Array.isArray(results) ? results : [];
        const finalRoles = Array.isArray(roleRows) ? roleRows : [];

        // construir mapa rol_id -> nombre (intentar varios campos)
        const rMap = {};
        finalRoles.forEach((r) => {
          const id = r.rol_id ?? r.id ?? r.pk ?? r.role_id;
          const name = (r.rol_nom ?? r.nombre ?? r.name ?? r.rol ?? r.role ?? '');
          if (id !== undefined && id !== null) rMap[String(id)] = String(name || '').trim();
        });

        console.log('[Empleados] roleMap:', rMap);
        setRoleMap(rMap);

        // fetch sucursales for relation
        try {
          const sres = await listTable("sucursal", { limit: 200, offset: 0 });
          const srows = sres.results ?? sres.data?.results ?? sres.data ?? [];
          setSucursales(Array.isArray(srows) ? srows : []);
        } catch (e) {
          setSucursales([]);
        }

        console.log("[Empleados] filas detectadas:", finalRows.length, finalRows.slice(0,3));
        setRows(finalRows);
      } catch (e) {
        if (!alive) return;
        console.error("[Empleados] error listTable:", e);
        setErr(e?.response?.data?.detail || e?.message || String(e));
        setRows([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const extractName = (u) => {
    return (
      u?.nombre || u?.nombre_completo || u?.full_name || u?.name || u?.usu_nom || u?.usuario || u?.username || String(u?.id || u?.pk || "")
    );
  };

  const extractEmail = (u) => u?.email || u?.correo || u?.usu_email || u?.mail || "";
  const extractPhone = (u) => u?.telefono || u?.tel || u?.phone || u?.telefono_movil || "";
  const extractRole = (u) => {
    // prefer mapping via rol_id when available
    try {
      const rid = u?.rol_id ?? u?.usu_rol_id ?? u?.role_id ?? null;
      if (rid !== null && rid !== undefined && roleMap) {
        const key = String(rid);
        if (roleMap[key]) return roleMap[key];
      }
    } catch (e) {
      // ignore
    }
    // Only return a role if the record explicitly contains one of these fields.
    const candidate = u?.rol ?? u?.usu_rol ?? u?.role ?? u?.perfil ?? u?.cargo ?? u?.tipo ?? null;
    if (candidate === null || candidate === undefined) return "";
    const raw = String(candidate).trim().toLowerCase();
    if (!raw) return "";
    // common full-word matches
    if (/admin|administrador|administration|^adm$/i.test(raw)) return 'Admin';
    if (/vend|vendedor|sales|seller/i.test(raw)) return 'Vendedor';
    // single-letter abbreviations (A, V, etc.)
    if (raw.length === 1) {
      if (raw === 'a') return 'Admin';
      if (raw === 'v') return 'Vendedor';
      // return the uppercase single-letter if unknown
      return raw.toUpperCase();
    }
    // If it contains digits like "vendedor1" normalize by removing digits then match
    const stripped = raw.replace(/\d+$/,'');
    if (/^vendedor|vend/i.test(stripped)) return 'Vendedor';
    if (/^admin|adm/i.test(stripped)) return 'Admin';
    // Otherwise return a capitalized version of the explicit value
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  };
  const extractAvatar = (u) => {
    const p = u?.foto || u?.avatar || u?.imagen || u?.picture || u?.foto_url || u?.avatar_url;
    if (!p) return null;
    // normalize relative urls (guardamos contra entornos sin `window`, p. ej. SSR)
    try {
      if (typeof window === 'undefined') return p;
      if (!/^https?:\/\//i.test(p) && p.startsWith('/')) return window.location.origin + p;
      return p;
    } catch (e) {
      return p;
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Empleados</h1>
        <div className="text-sm text-slate-500">{loading ? 'Cargando empleados…' : `${rows.length} empleados`}</div>
      </div>

      {err && <div className="mb-4 p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm">{err}</div>}

      <ErrorBoundary>
      {showJson && (
        <pre className="mb-4 max-h-64 overflow-auto bg-slate-50 border p-3 text-xs">{JSON.stringify(rows, null, 2)}</pre>
      )}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="p-4 border rounded-lg animate-pulse bg-white" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {rows.length === 0 && (
            <div className="text-slate-500">No se encontraron empleados.</div>
          )}

          {rows.map((u, idx) => {
            try {
              return (
                <div key={idx} className="bg-white border rounded-lg p-4 shadow-sm flex gap-3 items-center cursor-pointer hover:shadow-lg hover:-translate-y-1 transform transition-all duration-200 ease-out" onClick={() => {
                  setSelectedUser(u);
                  // preferir rol_id cuando exista en el registro (viene de la tabla `rol`)
                  const rid = (u.rol_id ?? u.role_id ?? u.usu_rol_id ?? null);
                  setFormData({
                    nombre: u.usu_nom ?? u.nombre ?? u.name,
                    email: u.usu_mail ?? u.email ?? u.mail,
                    // almacenar como string para el control <select>
                    rol_id: rid !== null && rid !== undefined ? String(rid) : '',
                    // mantener role de texto como fallback
                    role: u.rol ?? u.role ?? u.perfil ?? '',
                    suc_id: u.suc_id ?? u.sucursal_id ?? u.suc ?? null,
                  });
                  setModalErr("");
                  setShowModal(true);
                }}>
                  <div className="w-16 h-16 rounded-full bg-slate-100 overflow-hidden flex-shrink-0">
                    {extractAvatar(u) ? (
                      <img src={extractAvatar(u)} alt={extractName(u)} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">{(extractName(u) || "?").slice(0,1)}</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium truncate">{extractName(u) || '—'}</div>
                      {extractRole(u) ? (
                        (() => {
                          const r = extractRole(u);
                          const cls = r === 'Admin' ? 'bg-rose-100 text-rose-800' : (r === 'Vendedor' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-700');
                          return (<span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{r}</span>);
                        })()
                      ) : null}
                    </div>
                    <div className="mt-2 text-xs text-slate-600 flex flex-col gap-1">
                      {extractEmail(u) && <span className="truncate">✉ {extractEmail(u)}</span>}
                      {extractPhone(u) && <span className="truncate">📞 {extractPhone(u)}</span>}
                    </div>
                  </div>
                </div>
              );
            } catch (e) {
              console.error("Error rendering employee card:", e, u);
              return (
                <div key={"err-"+idx} className="bg-white border rounded-lg p-4 shadow-sm">
                  <div className="text-sm text-red-600">Error mostrando empleado</div>
                </div>
              );
            }
          })}
        </div>
      )}
      </ErrorBoundary>

      {/* Modal detalle/editar usuario */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg p-6 transform transition-all duration-200 ease-out scale-100">
            <h3 className="text-lg font-medium mb-3">Detalle usuario</h3>
            {modalErr && <div className="text-sm text-rose-600 mb-2">{modalErr}</div>}
            <div className="grid grid-cols-1 gap-3">
              <label className="text-sm">Nombre</label>
              <input className="border rounded px-2 py-1 focus:ring-2 focus:ring-indigo-200" value={formData.nombre ?? ''} onChange={(e) => setFormData(s => ({...s, nombre: e.target.value}))} />

              <label className="text-sm">Email</label>
              <input className="border rounded px-2 py-1 focus:ring-2 focus:ring-indigo-200" value={formData.email ?? ''} onChange={(e) => setFormData(s => ({...s, email: e.target.value}))} />

              <label className="text-sm">Rol</label>
              {/* Si hay roles cargados desde la tabla `rol` mostramos un select, si no, dejamos un input de texto */}
              {Object.keys(roleMap || {}).length > 0 ? (
                <select className="border rounded px-2 py-1 focus:ring-2 focus:ring-indigo-200" value={formData.rol_id ?? ''} onChange={(e) => setFormData(s => ({...s, rol_id: e.target.value}))}>
                  <option value="">-- Sin rol --</option>
                  {Object.entries(roleMap).map(([id, name]) => (
                    <option key={id} value={id}>{name || `Rol ${id}`}</option>
                  ))}
                </select>
              ) : (
                <input className="border rounded px-2 py-1 focus:ring-2 focus:ring-indigo-200" value={formData.role ?? ''} onChange={(e) => setFormData(s => ({...s, role: e.target.value}))} />
              )}

              <label className="text-sm">Sucursal</label>
              <select className="border rounded px-2 py-1 focus:ring-2 focus:ring-indigo-200" value={formData.suc_id ?? ''} onChange={(e) => setFormData(s => ({...s, suc_id: e.target.value || null}))}>
                <option value="">-- Sin sucursal --</option>
                {sucursales.map((s) => (
                  <option key={s.suc_id ?? s.id} value={s.suc_id ?? s.id}>{s.suc_nom ?? s.nombre ?? s.name}</option>
                ))}
              </select>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => { setShowModal(false); setSelectedUser(null); }} className="px-3 py-1 rounded border hover:bg-slate-50">Cerrar</button>
              <button disabled={saving} onClick={async () => {
                // guardar cambios
                setModalErr("");
                setSaving(true);
                try {
                  const pk = selectedUser.usu_id ?? selectedUser.id ?? selectedUser.pk ?? selectedUser.usu_id;
                  if (!pk) throw new Error('No se pudo determinar PK del usuario');
                  const payload = {};
                  if (formData.nombre !== undefined) payload.usu_nom = formData.nombre;
                  if (formData.email !== undefined) payload.usu_mail = formData.email;
                  // Preferir enviar rol_id (relación con tabla `rol`) cuando esté presente
                  if (formData.rol_id !== undefined) {
                    payload.rol_id = formData.rol_id === '' ? null : (isNaN(Number(formData.rol_id)) ? formData.rol_id : Number(formData.rol_id));
                  } else if (formData.role !== undefined) {
                    // fallback: enviar texto libre
                    payload.rol = formData.role;
                  }
                  if (formData.suc_id !== undefined) payload.suc_id = formData.suc_id || null;
                  await updateRecord('usuario', pk, payload);
                  // actualizar filas localmente (mergeando lo enviado)
                  setRows(prev => prev.map(r => {
                    const rpk = r.usu_id ?? r.id ?? r.pk ?? r.usu_id;
                    if (String(rpk) === String(pk)) {
                      const merged = { ...r, ...payload };
                      return merged;
                    }
                    return r;
                  }));
                  setShowModal(false);
                  setSelectedUser(null);
                } catch (err) {
                  console.error('Error guardando usuario:', err);
                  setModalErr(err?.response?.data?.detail || err?.message || String(err));
                } finally {
                  setSaving(false);
                }
              }} className="px-3 py-1 bg-indigo-600 text-white rounded">Guardar</button>

              <button disabled={deleting} onClick={async () => {
                // eliminar usuario
                if (!confirm('¿Eliminar este usuario? Esta acción no se puede deshacer.')) return;
                try {
                  setDeleting(true);
                  const pk = selectedUser.usu_id ?? selectedUser.id ?? selectedUser.pk ?? selectedUser.usu_id;
                  if (!pk) throw new Error('No se pudo determinar PK del usuario');
                  await deleteRecord('usuario', pk);
                  setRows(prev => prev.filter(r => String(r.usu_id ?? r.id ?? r.pk ?? '') !== String(pk)));
                  setShowModal(false);
                  setSelectedUser(null);
                } catch (err) {
                  console.error('Error eliminando usuario:', err);
                  setModalErr(err?.response?.data?.detail || err?.message || String(err));
                } finally {
                  setDeleting(false);
                }
              }} className="px-3 py-1 bg-rose-600 text-white rounded">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}