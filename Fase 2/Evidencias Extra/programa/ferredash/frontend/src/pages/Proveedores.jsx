import DataBrowser from "../components/DataBrowser";
export default function Proveedores() {
  // usar plural por defecto para coincidir con endpoints REST típicos
  return <DataBrowser table="proveedores" title="CUW-08 Gestión de Proveedores" />;
}