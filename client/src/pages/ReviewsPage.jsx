import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../auth/AuthContext.jsx";

export default function ReviewsPage() {
  const { token } = useAuth();
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ productId: "", rating: 5, comment: "" });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    api("/api/products").then((rows) => {
      setProducts(rows);
      setForm((f) => ({ ...f, productId: f.productId || (rows[0] ? String(rows[0].id) : "") }));
    });
  }, []);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    try {
      await api(
        "/api/reviews",
        { method: "POST", body: { productId: Number(form.productId), rating: Number(form.rating), comment: form.comment } },
        token
      );
      setMsg("Review submitted.");
      setForm((f) => ({ ...f, comment: "" }));
    } catch (x) {
      setErr(x.message);
    }
  }

  return (
    <>
      <h1 className="page-title">Reviews</h1>
      {err ? <div className="err">{err}</div> : null}
      {msg ? <p className="lede" style={{ color: "var(--accent-deep)" }}>{msg}</p> : null}
      <div className="grid-2">
        <div className="card">
          <h2>Write a review</h2>
          <form onSubmit={submit}>
            <label className="field">Product</label>
            <select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.sku})
                </option>
              ))}
            </select>
            <label className="field">Rating</label>
            <select value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })}>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} stars
                </option>
              ))}
            </select>
            <label className="field">Comment</label>
            <textarea rows={4} value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} required placeholder="Share fit, fabric, delivery…" />
            <button type="submit" className="btn btn-primary btn-block">
              Submit
            </button>
          </form>
        </div>
        <div className="card">
          <h2>Moderation note</h2>
          <p style={{ fontSize: "0.9rem", color: "var(--muted)" }}>Course projects can add an admin approval queue later. Submitted reviews are stored immediately.</p>
        </div>
      </div>
    </>
  );
}
