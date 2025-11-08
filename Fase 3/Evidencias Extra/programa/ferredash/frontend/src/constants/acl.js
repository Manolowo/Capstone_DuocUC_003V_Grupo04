// src/constants/acl.js
export const MENU_BY_ROLE = {
  gerente: [
    { to: "/app/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
    { to: "/app/inventario", label: "Inventario", icon: "ClipboardList" },
    { to: "/app/productos", label: "Productos", icon: "Package" },
    { to: "/app/ventas", label: "Ventas", icon: "ShoppingCart" },
    { to: "/app/clientes", label: "Clientes", icon: "Users" },
    { to: "/app/proveedores", label: "Proveedores", icon: "Truck" },
    { to: "/app/empleados", label: "Empleados", icon: "UserCog" },
    { to: "/app/reportes", label: "Reportes", icon: "LineChart" },
    { to: "/app/ejecutivo", label: "Ejecutivo", icon: "ShieldCheck" },
  ],
  vendedor: [
    { to: "/app/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
    { to: "/app/ventas", label: "Ventas", icon: "ShoppingCart" },
    { to: "/app/clientes", label: "Clientes", icon: "Users" },
  ],
  data_analyst: [
    { to: "/app/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
    { to: "/app/reportes", label: "Reportes", icon: "LineChart" },
    { to: "/app/ejecutivo", label: "Ejecutivo", icon: "ShieldCheck" },
  ],
};

export const START_ROUTE_BY_ROLE = {
  gerente: "/app/dashboard",
  vendedor: "/app/ventas",
  data_analyst: "/app/reportes",
};
