// src/constants/acl.js
export const MENU_BY_ROLE = {
  gerente: [
    { to: "/panel", label: "Panel" },
    { to: "/inventario", label: "Inventario" },
    { to: "/reportes", label: "Reportes" },
    { to: "/empleados", label: "Empleados" },
    { to: "/proveedores", label: "Proveedores" },
    { to: "/ejecutivo", label: "Ejecutivo" },
    { to: "/ventas", label: "Ventas" },      // opcional
    { to: "/clientes", label: "Clientes" },  // opcional
  ],
  vendedor: [
    { to: "/panel", label: "Panel" },
    { to: "/ventas", label: "Ventas" },
    { to: "/clientes", label: "Clientes" },
  ],
  data_analyst: [
    { to: "/panel", label: "Panel" },
    { to: "/reportes", label: "Reportes" }, // o "ModelosPredictivos"
    { to: "/ejecutivo", label: "Ejecutivo" },
  ],
};

export const START_ROUTE_BY_ROLE = {
  gerente: "/panel",
  vendedor: "/ventas",
  data_analyst: "/reportes",
};
