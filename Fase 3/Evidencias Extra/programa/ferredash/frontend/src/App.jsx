import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";

import Login from "./pages/Login.jsx";
import SidebarLayout from "./layouts/SidebarLayout.jsx";

import Dashboard from "./pages/app/Dashboard.jsx";
import Clientes from "./pages/app/Clientes.jsx";
import Productos from "./pages/app/Productos.jsx";
import Inventario from "./pages/app/Inventario.jsx";
import Ventas from "./pages/app/Ventas.jsx";

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/app"
        element={
          <PrivateRoute>
            <SidebarLayout />
          </PrivateRoute>
        }
      >
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="productos" element={<Productos />} />
        <Route path="inventario" element={<Inventario />} />
        <Route path="ventas" element={<Ventas />} />
      </Route>

      <Route path="/" element={<Navigate to="/login" />} />
    </Routes>
  );
}
