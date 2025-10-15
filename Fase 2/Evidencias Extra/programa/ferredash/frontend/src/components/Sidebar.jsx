import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Sidebar() {
  const { user } = useAuth();

  const menuByRole = {
    gerente: [
      { name: "Panel", path: "/" },
      { name: "Inventario", path: "/inventario" },
      { name: "Reportes", path: "/reportes" },
      { name: "Empleados", path: "/empleados" },
      { name: "Proveedores", path: "/proveedores" },
      { name: "Ejecutivo", path: "/ejecutivo" },
    ],
    vendedor: [
      { name: "Panel", path: "/" },
      { name: "Ventas", path: "/ventas" },
      { name: "Clientes", path: "/clientes" },
    ],
    data_analyst: [
      { name: "Panel", path: "/" },
      { name: "Modelos Predictivos", path: "/modelos" },
    ],
  };

  const items = menuByRole[user?.role || "gerente"];

  return (
    <aside className="w-56 bg-white border-r h-screen p-4">
      <h1 className="text-lg font-semibold text-indigo-600 mb-4">FerreDash</h1>
      <nav className="flex flex-col gap-2">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `block px-3 py-2 rounded-md text-sm ${
                isActive ? "bg-indigo-600 text-white" : "text-gray-700 hover:bg-gray-100"
              }`
            }
          >
            {item.name}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
