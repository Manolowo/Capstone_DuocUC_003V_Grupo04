export const mockProviders = [
  { id: 1, nombre: "FerrePro SRL", contacto: "Juan Pérez", telefono: "+56 9 1234 5678", email: "ventas@ferrepro.cl" },
  { id: 2, nombre: "Suministros Norte", contacto: "María Gómez", telefono: "+56 9 9876 5432", email: "info@suminort.cl" },
];

export const mockKpis = {
  totalVentas: 124,
  totalProductos: 542,
  totalClientes: 230,
  gananciasTotales: 152340.5,
};

export const mockUltimasVentas = [
  { id: 101, cliente: "Cliente A", item: "Martillo 16oz", cantidad: 2, monto: 4500, fecha: new Date().toISOString() },
  { id: 102, cliente: "Cliente B", item: "Taladro 500W", cantidad: 1, monto: 89990, fecha: new Date().toISOString() },
];
