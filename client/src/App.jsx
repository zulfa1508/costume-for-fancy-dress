import React from "react";
import { NavLink, Outlet, Route, Routes, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import CatalogPage from "./pages/CatalogPage.jsx";
import ProductPage from "./pages/ProductPage.jsx";
import CartPage from "./pages/CartPage.jsx";
import CheckoutPage from "./pages/CheckoutPage.jsx";
import OrdersPage from "./pages/OrdersPage.jsx";
import ReviewsPage from "./pages/ReviewsPage.jsx";
import AdminLayout from "./pages/admin/AdminLayout.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import AdminProducts from "./pages/admin/AdminProducts.jsx";
import AdminOrders from "./pages/admin/AdminOrders.jsx";
import AdminInventory from "./pages/admin/AdminInventory.jsx";

function CustomerShell() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <>
      <header className="app-bar">
        <NavLink to="/catalog" className="logo">
          Twirl<i>✦</i>
          <span>Boutique</span>
        </NavLink>
        <div className="role-toggle">
          {user ? (
            <>
              <span>
                {user.fullName} · {user.role}
              </span>
              <button type="button" className="btn btn-secondary" style={{ padding: "0.4rem 0.75rem", fontSize: "0.78rem" }} onClick={() => { logout(); navigate("/auth"); }}>
                Log out
              </button>
            </>
          ) : (
            <span>Sign in to cart and checkout</span>
          )}
        </div>
      </header>
      <nav className="tabs">
        {!user && <NavLink className={({ isActive }) => (isActive ? "active" : "")} to="/auth">Login / Register</NavLink>}
        <NavLink className={({ isActive }) => (isActive ? "active" : "")} to="/catalog">
          Catalog
        </NavLink>
        {user && !isAdmin && (
          <>
            <NavLink className={({ isActive }) => (isActive ? "active" : "")} to="/cart">
              Cart
            </NavLink>
            <NavLink className={({ isActive }) => (isActive ? "active" : "")} to="/checkout">
              Checkout
            </NavLink>
            <NavLink className={({ isActive }) => (isActive ? "active" : "")} to="/orders">
              Order history
            </NavLink>
            <NavLink className={({ isActive }) => (isActive ? "active" : "")} to="/reviews">
              Reviews
            </NavLink>
          </>
        )}
        {isAdmin && (
          <NavLink className={({ isActive }) => (isActive ? "active" : "")} to="/admin">
            Admin
          </NavLink>
        )}
      </nav>
      <main>
        <Outlet />
      </main>
    </>
  );
}

function RequireAuth({ children }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/auth" replace />;
  return children;
}

function RequireCustomer({ children }) {
  const { token, isAdmin } = useAuth();
  if (!token) return <Navigate to="/auth" replace />;
  if (isAdmin) return <Navigate to="/admin" replace />;
  return children;
}

function RequireAdmin({ children }) {
  const { token, isAdmin } = useAuth();
  if (!token) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/catalog" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route element={<CustomerShell />}>
        <Route path="/" element={<Navigate to="/catalog" replace />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/product/:id" element={<ProductPage />} />
        <Route
          path="/cart"
          element={
            <RequireCustomer>
              <CartPage />
            </RequireCustomer>
          }
        />
        <Route
          path="/checkout"
          element={
            <RequireCustomer>
              <CheckoutPage />
            </RequireCustomer>
          }
        />
        <Route
          path="/orders"
          element={
            <RequireCustomer>
              <OrdersPage />
            </RequireCustomer>
          }
        />
        <Route
          path="/reviews"
          element={
            <RequireCustomer>
              <ReviewsPage />
            </RequireCustomer>
          }
        />
      </Route>
      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <AdminLayout />
          </RequireAdmin>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="inventory" element={<AdminInventory />} />
      </Route>
      <Route path="*" element={<Navigate to="/catalog" replace />} />
    </Routes>
  );
}
