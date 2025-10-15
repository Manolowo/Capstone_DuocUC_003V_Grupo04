// frontend/src/components/Topbar.jsx
import { useEffect, useState } from "react";
import { getMe } from "../lib/api";

export default function Topbar() {
  const [me, setMe] = useState(null);
  useEffect(() => {
    getMe(1).then((res) => setMe(res.data || res)).catch(() => {});
  }, []);

  return (
    <header className="h-14 flex items-center justify-between border-b px-4 bg-white">
      <div className="font-semibold">FerreDash</div>
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span>{me?.name || "Usuario Demo"}</span>
        <span className="text-gray-400">·</span>
        <span className="capitalize">{me?.role || "gerente"}</span>
        <div className="h-8 w-8 rounded-full bg-indigo-600 text-white grid place-content-center">
          {me?.name?.[0]?.toUpperCase() || "U"}
        </div>
      </div>
    </header>
  );
}
