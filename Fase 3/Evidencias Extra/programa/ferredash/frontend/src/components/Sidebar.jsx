import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Users, Package,
  Store, LineChart, Settings, UserCog, ShieldCheck
} from "lucide-react";

export default function Sidebar() {
  const { user } = useAuth();
  const menuByRole = {
    admin: [
      { name: "Panel", path: "/", icon: LayoutDashboard },
      { name: "Predicciones", path: "/app/predicciones", icon: LineChart },
      { name: "Inventario", path: "/inventario", icon: ClipboardList },
      { name: "Ventas", path: "/ventas", icon: ShoppingCart },
      { name: "Clientes", path: "/clientes", icon: Users },
      { name: "Empleados", path: "/empleados", icon: UserCog },
      { name: "Configuración", path: "/config", icon: Settings },
    ],
    vendedor: [
      { name: "Inventario", path: "/inventario", icon: ClipboardList },
      { name: "Ventas", path: "/ventas", icon: ShoppingCart },
      { name: "Clientes", path: "/clientes", icon: Users },
    ],
  };

  // Si el rol no es admin o vendedor, usar admin por defecto
  const currentRole = (user?.role === 'vendedor') ? 'vendedor' : 'admin';
  const items = menuByRole[currentRole];

  console.log("✅ Rol:", currentRole);
  console.log("✅ Productos en menú:", items.some(item => item.name === "Productos"));

  return (
    <motion.aside
      initial={{ x: -90, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="h-screen w-64 bg-[#0A0F24] text-white border-r border-purple-600/30 
                 shadow-2xl backdrop-blur-2xl flex flex-col p-6 space-y-6"
    >
      {/* LOGO */}
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-extrabold text-purple-400 tracking-wider"
      >
        FERREDASH<span className="text-purple-600">•AI</span>
      </motion.h1>

      {/* MENU */}
      <nav className="flex flex-col gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all
                ${isActive
                  ? "bg-purple-600/30 text-purple-300 border border-purple-500/50"
                  : "text-gray-300 hover:bg-purple-600/10 hover:text-white"}
              `}
            >
              <Icon size={18} />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* USER FOOTER */}
      <div className="mt-auto text-xs text-purple-300/70 tracking-wider">
        <UserCog size={14} className="inline-block mr-2" />
        {user?.name || "Usuario"} — {currentRole}
      </div>
    </motion.aside>
  );
}