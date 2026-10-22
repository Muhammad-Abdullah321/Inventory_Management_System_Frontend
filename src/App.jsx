import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext.jsx";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Products from "./pages/Products.jsx";
import Vendors from "./pages/Vendors.jsx";
import Purchases from "./pages/Purchases.jsx";
import Inventory from "./pages/Inventory.jsx";
import Workers from "./pages/Workers.jsx";
import Manufacturing from "./pages/Manufacturing.jsx";
import ManufacturingHistory from "./pages/ManufacturingHistory.jsx";
import SellingProducts from "./pages/SellingProducts.jsx";
import RawMaterialInventory from "./pages/RawMaterialInventory.jsx";
import BillingRecords from "./pages/BillingRecords.jsx";

function RequireAuth({ children, ownerOnly = false }) {
  const { user, isOwner } = useAuth();
  if (!localStorage.getItem("ems_token") || !user) return <Navigate to="/login" replace />;
  if (ownerOnly && !isOwner) return <Navigate to="/" replace />;
  return children;
}

function OwnerRoute({ children }) {
  return <RequireAuth ownerOnly>{children}</RequireAuth>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<Dashboard />} />
        <Route path="products" element={<Navigate to="/buying-products" replace />} />
        <Route path="buying-products" element={<Products />} />
        <Route path="selling-products" element={<SellingProducts />} />
        <Route path="vendors" element={<Vendors />} />
        <Route path="purchases" element={<Purchases />} />
        <Route path="billing" element={<BillingRecords />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="raw-inventory" element={<RawMaterialInventory />} />
        <Route path="manufacturing" element={<OwnerRoute><Manufacturing /></OwnerRoute>} />
        <Route path="manufacturing/history" element={<OwnerRoute><ManufacturingHistory /></OwnerRoute>} />
        <Route path="workers" element={<OwnerRoute><Workers /></OwnerRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
