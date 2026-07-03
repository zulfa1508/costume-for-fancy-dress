import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { formatMoney } from "../money.js";

export default function CartPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [lines, setLines] = useState([]);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    try {
      const rows = await api("/api/cart", {}, token);
      setLines(rows);
    } catch (e) {
      setErr(e.message);
    }
  }

  useEffect(() => {
    load();
  }, [token]);

  const subtotal = lines.reduce((s, l) => s + l.price_cents * l.qty, 0);

  async function updateQty(itemId, qty) {
    setErr("");
    try {
      await api(`/api/cart/${itemId}`, { method: "PATCH", body: { qty: Number(qty) } }, token);
      await load();
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <>
      <h1 className="page-title">Shopping cart</h1>
      {err ? <div className="err">{err}</div> : null}
      <div className="card">
        <h2>
          Items <span className="badge">{lines.length}</span>
        </h2>
        {lines.length === 0 ? (
          <p className="lede" style={{ marginBottom: 0 }}>
            Your cart is empty.
          </p>
        ) : (
          lines.map((l) => (
            <div key={l.id} className="cart-row">
              <span>
                {l.title}
                {l.size_label ? ` · ${l.size_label}` : ""}
              </span>
              <input type="number" min={1} max={l.stock_qty} value={l.qty} style={{ width: 72, margin: 0 }} onChange={(e) => updateQty(l.id, e.target.value)} />
              <strong>{formatMoney(l.price_cents * l.qty)}</strong>
            </div>
          ))
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", gap: "1rem", flexWrap: "wrap" }}>
          <Link to="/catalog" className="btn btn-ghost">
            Continue shopping
          </Link>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Subtotal · Tax · Shipping at checkout (COD)</div>
            <div className="price-display">{formatMoney(subtotal)}</div>
          </div>
        </div>
        <button type="button" className="btn btn-primary btn-block" style={{ marginTop: "1rem" }} disabled={!lines.length} onClick={() => navigate("/checkout")}>
          Proceed to checkout
        </button>
      </div>
    </>
  );
}
