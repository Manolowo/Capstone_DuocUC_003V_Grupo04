import { Routes, Route, Navigate } from "react-router-dom";
import SidebarLayout from "./layouts/SidebarLayout";
import Dashboard from "./pages/Dashboard";
import Inventario from "./pages/Inventario";
import Ventas from "./pages/Ventas";
import Clientes from "./pages/Clientes";
import Reportes from "./pages/Reportes";
import Empleados from "./pages/Empleados";
import Proveedores from "./pages/Proveedores";
import Ejecutivo from "./pages/Ejecutivo";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<SidebarLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="inventario" element={<Inventario />} />
        <Route path="ventas" element={<Ventas />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="reportes" element={<Reportes />} />
        <Route path="empleados" element={<Empleados />} />
        <Route path="proveedores" element={<Proveedores />} />
        <Route path="ejecutivo" element={<Ejecutivo />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
