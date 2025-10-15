// src/layouts/SidebarLayout.jsx
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

export default function SidebarLayout() {
  return (
    <div className="flex h-dvh w-full bg-slate-50 text-slate-900">
      <Sidebar />
      <div className="flex min-w-0 grow flex-col">
        <Topbar />
        <main className="min-w-0 grow p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
