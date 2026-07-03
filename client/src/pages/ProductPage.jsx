import React, { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { formatMoney } from "../money.js";

export default function ProductPage() {
  const { id } = useParams();
  const { token, user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [qty, setQty] = useState(1);
  const [size, setSize] = useState("One size");
  const [err, setErr] = useState("");

  useEffect(() => {
    setErr("");
    api(`/api/products/${id}`)
      .then(setProduct)
      .catch((e) => setErr(e.message));
    api(`/api/products/${id}/reviews`)
      .then(setReviews)
      .catch(() => setReviews([]));
  }, [id]);

  async function addToCart() {
    if (!token || isAdmin) {
      navigate("/auth");
      return;
    }
    setErr("");
    try {
      await api("/api/cart", { method: "POST", body: { productId: Number(id), qty, sizeLabel: size } }, token);
      navigate("/cart");
    } catch (e) {
      setErr(e.message);
    }
  }

  if (!product && !err)
    return (
      <p className="lede" style={{ marginTop: "2rem" }}>
        Loading…
      </p>
    );
  if (!product) return <div className="err">{err}</div>;

  return (
    <>
      <h1 className="page-title">{product.title}</h1>
      {err ? <div className="err">{err}</div> : null}
      <div className="grid-2">
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="ph" style={{ aspectRatio: "1", minHeight: 280, fontSize: "0.9rem" }}>
            {product.image_url ? <img src={product.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "Large product image"}
          </div>
        </div>
        <div className="card">
          <h2>
            Options <span className="badge">Stock aware</span>
          </h2>
          <div className="price-display" style={{ marginBottom: "0.75rem" }}>
            {formatMoney(product.price_cents)}
          </div>
          <label className="field">Size</label>
          <select value={size} onChange={(e) => setSize(e.target.value)}>
            <option>One size</option>
            <option>Toddler (2–3)</option>
            <option>Kids 4–8</option>
            <option>Kids 8–12</option>
          </select>
          <label className="field">Quantity</label>
          <input type="number" min={1} max={product.stock_qty} value={qty} onChange={(e) => setQty(Math.max(1, Math.min(product.stock_qty, Number(e.target.value) || 1)))} />
          <div className="row" style={{ marginTop: "0.5rem" }}>
            <button type="button" className="btn btn-primary" style={{ flex: 2 }} onClick={addToCart} disabled={product.stock_qty < 1}>
              Add to cart
            </button>
            <Link to="/catalog" className="btn btn-secondary">
              Back
            </Link>
          </div>
          <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "1rem 0" }} />
          <p style={{ fontSize: "0.9rem", color: "var(--muted)" }}>
            {product.description}.
          </p>
          {reviews[0] ? (
            <div className="review-box">
              <strong style={{ fontSize: "0.9rem" }}>{"★".repeat(reviews[0].rating)}{"☆".repeat(5 - reviews[0].rating)}</strong>{" "}
              <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>{reviews[0].comment}</span>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
