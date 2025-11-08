import axios from "axios";

// Usa .env si lo tienes (VITE_API_URL). Si no, cae a localhost:8000/api
const baseURL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

export const api = axios.create({
  baseURL,
  timeout: 15000,
});

// Helpers --------
export const getMe = async (id = 1) => {
  const res = await api.get(`/me`, { params: { id } });
  // devolvemos un objeto con la forma { data, status }
  return { data: res.data, status: res.status };
};

export const getDashboardKpis = async () => {
  const res = await api.get(`/dashboard/kpis`);
  return { data: res.data, status: res.status };
};

export const getUltimasVentas = async (limit = 5) => {
  const res = await api.get(`/dashboard/ultimas-ventas`, { params: { limit } });
  return { data: res.data, status: res.status };
};

/**
 * Lista una tabla del CRUD genérico
 * Normaliza la respuesta para que los consumidores puedan usar `res.data` o `res.results`.
 * Intentará reintentar con formas plurales básicas si la ruta singular devuelve 404.
 * @param {string} table  (venta, cliente, empleado, proveedor, inventario...)
 * @param {object} params {limit, offset, search}
 */
export const listTable = async (table, params = {}) => {
  const tryPaths = [
    `/${table}`,
    `/${table}s`, // ejemplo: proveedor -> proveedores
    `/${table}es`, // ejemplo: proveedor -> provedores (intento extra para -es)
  ];

  let lastErr = null;
  for (const path of tryPaths) {
    try {
      const res = await api.get(path, { params });
      // devolver objeto consistente
      return {
        data: res.data,
        results: res.data?.results || res.data || [],
        status: res.status,
      };
    } catch (e) {
      lastErr = e;
      // si es 404, intentar siguiente variante; cualquier otro error se re-lanza
      if (!(e?.response?.status === 404)) {
        throw e;
      }
      // else continue to next path
    }
  }
  // si todos fallaron, lanzar el último error
  throw lastErr;
};
