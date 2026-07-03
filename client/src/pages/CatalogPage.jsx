import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { formatMoney } from "../money.js";

export default function CatalogPage() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [sort, setSort] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    api("/api/categories")
      .then(setCategories)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (categoryId) params.set("categoryId", categoryId);
    if (sort === "price_low") params.set("sort", "price_asc");
    if (sort === "price_high") params.set("sort", "price_desc");
    if (sort === "newest") params.set("sort", "newest");
    setErr("");
    api(`/api/products?${params.toString()}`)
      .then(setItems)
      .catch((e) => setErr(e.message));
  }, [q, categoryId, sort]);

  return (
    <>
      <h1 className="page-title">Costume catalog</h1>
      {err ? <div className="err">{err}</div> : null}
      <div className="row" style={{ marginBottom: "1rem" }}>
        <div style={{ flex: 2, minWidth: 200 }}>
          <label className="field">Search</label>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Fairy, princess, unicorn…" />
        </div>
        <div>
          <label className="field">Category</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field">Sort</label>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="">Featured</option>
            <option value="price_low">Price low → high</option>
            <option value="price_high">Price high → low</option>
            <option value="newest">Newest</option>
          </select>
        </div>
      </div>
      <div className="product-grid">
        {items.map((p) => (
          <article key={p.id} className="product">
            <div className="ph">{p.image_url ? <img src={p.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "Image placeholder"}</div>
            <div className="body">
              <div className="title">{p.title}</div>
              <div className="meta">
                {p.category_name} · {p.stock_qty > 5 ? `In stock: ${p.stock_qty}` : p.stock_qty > 0 ? `Low stock: ${p.stock_qty}` : "Out of stock"}
              </div>
              <div className="price">{formatMoney(p.price_cents)}</div>
              <Link to={`/product/${p.id}`} className="btn btn-primary btn-block" style={{ marginTop: "0.65rem", textAlign: "center" }}>
                View
              </Link>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
