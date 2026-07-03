import React from "react";
import { NavLink, Outlet } from "react-router-dom";

export default function AdminLayout() {
  return (
    <>
      <header className="app-bar">
        <NavLink to="/catalog" className="logo">
          Twirl<i>✦</i>
          <span>Boutique</span>
        </NavLink>
        <NavLink to="/catalog" className="link">
          ← Storefront
        </NavLink>
      </header>
      <main>
        <div className="admin-layout">
          <aside className="side-nav">
            <NavLink end className={({ isActive }) => (isActive ? "on" : "")} to="/admin">
              Overview
            </NavLink>
            <NavLink className={({ isActive }) => (isActive ? "on" : "")} to="/admin/products">
              Products
            </NavLink>
            <NavLink className={({ isActive }) => (isActive ? "on" : "")} to="/admin/orders">
              Orders
            </NavLink>
            <NavLink className={({ isActive }) => (isActive ? "on" : "")} to="/admin/inventory">
              Inventory
            </NavLink>
          </aside>
          <div>
            <Outlet />
          </div>
        </div>
      </main>
    </>
  );
}
