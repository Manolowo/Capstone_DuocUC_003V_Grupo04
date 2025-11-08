import { Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Truck,
  UserCog,
  ClipboardList,
  LogOut,
  LineChart,
  ShieldCheck,
  Settings
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { MENU_BY_ROLE } from "../constants/acl";

const icons = {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Truck,
  UserCog,
  ClipboardList,
  LineChart,
  ShieldCheck,
  Settings
};

export default function SidebarLayout() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const menu = MENU_BY_ROLE[user?.role] || MENU_BY_ROLE.vendedor;

  return (
    <div className="flex h-screen bg-gray-50">

      {/* SIDEBAR */}
      <aside
        className={`${collapsed ? "w-20" : "w-64"} bg-white shadow-lg border-r transition-all duration-300 flex flex-col`}>
        <div className="p-4 font-bold text-xl text-purple-700">
          {collapsed ? "FD" : "FerreDash"}
        </div>

        <nav className="flex-1 px-2 space-y-1">
          {menu.map((item, i) => {
            const Icon = icons[item.icon] || LayoutDashboard;
            return (
              <button
                key={i}
                onClick={() => navigate(item.to)}
                className="w-full flex items-center gap-3 p-3 hover:bg-purple-50 rounded-lg text-gray-700"
              >
                <Icon className="w-5 h-5" />
                {!collapsed && <span>{item.label}</span>}
              </button>
            )
          })}
        </nav>

        <button
          onClick={handleLogout}
          className="m-3 flex items-center gap-2 p-2 text-red-500 hover:bg-red-50 rounded-lg"
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </aside>

      {/* CONTENIDO */}
      <main className="flex-1 flex flex-col">
        <header className="h-16 bg-white shadow flex items-center justify-between px-6 border-b">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-gray-600 hover:text-black font-bold"
          >
            ☰
          </button>
          <p className="text-sm text-gray-500">
            Bienvenido, <b>{user?.name || "Usuario"}</b>
          </p>
        </header>

        <section className="flex-1 overflow-auto p-6">
          <Outlet />
        </section>
      </main>
    </div>
  );
}

