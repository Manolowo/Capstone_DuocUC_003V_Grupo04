// frontend/src/components/Topbar.jsx
import { useAuth } from "../context/AuthContext";

export default function Topbar() {
  const { user } = useAuth();

  return (
    <header className="h-14 flex items-center justify-between border-b px-4 bg-white">
      <div className="font-semibold">FerreDash</div>
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span>{user?.name || "Usuario Demo"}</span>
        <span className="text-gray-400">·</span>
        <span className="capitalize">{user?.role || "gerente"}</span>
        <div className="h-8 w-8 rounded-full bg-indigo-600 text-white grid place-content-center">
          {user?.name?.[0]?.toUpperCase() || "U"}
        </div>
      </div>
    </header>
  );
}
