// src/constants/acl.js
export const MENU_BY_ROLE = {
  admin: [
    { to: "/app/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
    { to: "/app/predicciones", label: "Predicciones", icon: "LineChart" },
    { to: "/app/inventario", label: "Inventario", icon: "ClipboardList" },
    { to: "/app/ventas", label: "Ventas", icon: "ShoppingCart" },
    { to: "/app/clientes", label: "Clientes", icon: "Users" },
    { to: "/app/empleados", label: "Empleados", icon: "UserCog" },
  ],
  vendedor: [
    { to: "/app/inventario", label: "Inventario", icon: "ClipboardList" },
    { to: "/app/ventas", label: "Ventas", icon: "ShoppingCart" },
    { to: "/app/clientes", label: "Clientes", icon: "Users" },
  ],
};

export const START_ROUTE_BY_ROLE = {
  admin: "/app/dashboard",
  vendedor: "/app/ventas",
};
