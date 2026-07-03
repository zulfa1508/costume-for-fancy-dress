import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { formatMoney } from "../money.js";

export default function CheckoutPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [lines, setLines] = useState([]);
  const [form, setForm] = useState({ shippingName: "", shippingAddress: "", shippingCity: "", shippingPostal: "" });
  const [err, setErr] = useState("");

  useEffect(() => {
    api("/api/cart", {}, token).then(setLines).catch(() => setLines([]));
  }, [token]);

  const subtotal = lines.reduce((s, l) => s + l.price_cents * l.qty, 0);

  async function placeOrder(e) {
    e.preventDefault();
    setErr("");
    try {
      await api("/api/orders/checkout", { method: "POST", body: { ...form } }, token);
      navigate("/orders");
    } catch (x) {
      setErr(x.message);
    }
  }

  return (
    <>
      <h1 className="page-title">Checkout</h1>
      <p className="lede">Shipping details and cash on delivery.</p>
      <div className="steps">
        <span className="on">
          1 Cart
        </span>
        <span className="on">
          2 Shipping
        </span>
        <span className="on">
          3 COD
        </span>
        <span className="on">
          4 Confirm
        </span>
      </div>
      {err ? <div className="err">{err}</div> : null}
      <form onSubmit={placeOrder}>
        <div className="grid-2">
          <div className="card">
            <h2>Shipping</h2>
            <label className="field">Full name</label>
            <input value={form.shippingName} onChange={(e) => setForm({ ...form, shippingName: e.target.value })} required />
            <label className="field">Address</label>
            <input value={form.shippingAddress} onChange={(e) => setForm({ ...form, shippingAddress: e.target.value })} required />
            <div className="row">
              <div>
                <label className="field">City</label>
                <input value={form.shippingCity} onChange={(e) => setForm({ ...form, shippingCity: e.target.value })} required />
              </div>
              <div>
                <label className="field">Postal</label>
                <input value={form.shippingPostal} onChange={(e) => setForm({ ...form, shippingPostal: e.target.value })} required />
              </div>
            </div>
          </div>
          <div className="card">
            <h2>
              Payment <span className="badge">COD</span>
            </h2>
            <div className="cod-panel">
              <strong>Cash on delivery</strong>
              <p style={{ fontSize: "0.9rem", color: "var(--muted)", margin: 0 }}>Pay the courier in cash when your costumes arrive. Order status starts as pending until you pay on delivery.</p>
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "0.5rem" }}>Order total</div>
            <div className="price-display" style={{ marginBottom: "1rem" }}>
              {formatMoney(subtotal)}
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={!lines.length}>
              Place COD order · {formatMoney(subtotal)}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
