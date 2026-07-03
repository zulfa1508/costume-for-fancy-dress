import React, { useEffect, useState } from "react";
import { api, apiForm } from "../../api.js";
import { useAuth } from "../../auth/AuthContext.jsx";

function emptyForm(categories) {
  return {
    sku: "",
    title: "",
    categoryId: categories[0] ? String(categories[0].id) : "",
    priceRupees: "",
    description: "",
    stockQty: "0",
    imageUrl: "",
  };
}

function formFromProduct(p) {
  return {
    sku: p.sku,
    title: p.title,
    categoryId: String(p.category_id),
    priceRupees: String((p.price_cents / 100).toFixed(2)),
    description: p.description || "",
    stockQty: String(p.stock_qty),
    imageUrl: p.image_url || "",
  };
}

export default function AdminProducts() {
  const { token } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sel, setSel] = useState("new");
  const [form, setForm] = useState(() => emptyForm([]));
  const [imageUrlDirty, setImageUrlDirty] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [clearImage, setClearImage] = useState(false);
  const [filePreview, setFilePreview] = useState(null);
  const [newCategory, setNewCategory] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editCategoryName, setEditCategoryName] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    if (!imageFile) {
      setFilePreview(null);
      return;
    }
    const u = URL.createObjectURL(imageFile);
    setFilePreview(u);
    return () => URL.revokeObjectURL(u);
  }, [imageFile]);

  async function loadCategories() {
    const rows = await api("/api/categories", {}, token);
    setCategories(rows);
    return rows;
  }

  async function loadProducts() {
    const rows = await api("/api/admin/products", {}, token);
    setProducts(rows);
    return rows;
  }

  useEffect(() => {
    loadCategories().catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!categories.length) return;
    setForm((f) => (f.categoryId ? f : { ...f, categoryId: String(categories[0].id) }));
  }, [categories]);

  useEffect(() => {
    loadProducts()
      .then((rows) => {
        if (rows.length) {
          setSel(rows[0].id);
          setForm(formFromProduct(rows[0]));
        } else {
          setSel("new");
          setForm(emptyForm(categories));
        }
        setImageFile(null);
        setClearImage(false);
        setImageUrlDirty(false);
      })
      .catch((e) => setErr(e.message));
  }, [token]);

  useEffect(() => {
    if (!categories.length) {
      setEditCategoryId("");
      setEditCategoryName("");
      return;
    }
    if (!editCategoryId || !categories.some((c) => String(c.id) === String(editCategoryId))) {
      const first = String(categories[0].id);
      setEditCategoryId(first);
      setEditCategoryName(categories[0].name);
      return;
    }
    const active = categories.find((c) => String(c.id) === String(editCategoryId));
    setEditCategoryName(active ? active.name : "");
  }, [categories]);

  function selectProduct(id) {
    if (id === "new") {
      setSel("new");
      setForm(emptyForm(categories));
      setImageFile(null);
      setClearImage(false);
      setImageUrlDirty(false);
      setErr("");
      setOk("");
      return;
    }
    const p = products.find((x) => x.id === id);
    if (!p) return;
    setSel(id);
    setForm(formFromProduct(p));
    setImageFile(null);
    setClearImage(false);
    setImageUrlDirty(false);
    setErr("");
    setOk("");
  }

  function buildFormData(isNew) {
    const fd = new FormData();
    fd.append("title", form.title.trim());
    fd.append("categoryId", form.categoryId);
    fd.append("priceRupees", form.priceRupees);
    fd.append("description", form.description || "");
    fd.append("stockQty", form.stockQty);
    fd.append("sku", form.sku.trim());
    if (isNew) {
      fd.append("imageUrl", form.imageUrl || "");
    } else {
      if (clearImage) fd.append("clearImage", "1");
      else if (imageUrlDirty) fd.append("imageUrl", form.imageUrl || "");
    }
    if (imageFile) fd.append("image", imageFile);
    return fd;
  }

  async function save(e) {
    e.preventDefault();
    setErr("");
    setOk("");
    const isNew = sel === "new";
    if (isNew && !form.sku.trim()) {
      setErr("SKU is required for new products");
      return;
    }
    try {
      if (isNew) {
        const fd = buildFormData(true);
        const { id: newId } = await apiForm("/api/admin/products", fd, token, "POST");
        setOk("Product created.");
        const rows = await loadProducts();
        const np = rows.find((x) => x.id === newId) || rows[rows.length - 1];
        if (np) {
          setSel(np.id);
          setForm(formFromProduct(np));
        }
        setImageFile(null);
        setClearImage(false);
        setImageUrlDirty(false);
      } else {
        const fd = buildFormData(false);
        await apiForm(`/api/admin/products/${sel}`, fd, token, "PATCH");
        setOk("Saved.");
        const rows = await loadProducts();
        const updated = rows.find((x) => x.id === sel);
        if (updated) setForm(formFromProduct(updated));
        setImageFile(null);
        setClearImage(false);
        setImageUrlDirty(false);
      }
    } catch (x) {
      setErr(x.message);
    }
  }

  async function createCategory() {
    const name = newCategory.trim();
    if (!name) {
      setErr("Category name is required");
      return;
    }
    setErr("");
    setOk("");
    try {
      const created = await api("/api/admin/categories", { method: "POST", body: { name } }, token);
      const rows = await loadCategories();
      const found = rows.find((c) => c.id === created.id) || rows.find((c) => c.name === created.name);
      if (found) {
        setForm((f) => ({ ...f, categoryId: String(found.id) }));
        setEditCategoryId(String(found.id));
        setEditCategoryName(found.name);
      }
      setNewCategory("");
      setOk("Category created.");
    } catch (x) {
      setErr(x.message);
    }
  }

  async function updateCategory() {
    const id = Number(editCategoryId);
    const name = editCategoryName.trim();
    if (!id) {
      setErr("Select a category to update");
      return;
    }
    if (!name) {
      setErr("Category name is required");
      return;
    }
    setErr("");
    setOk("");
    try {
      await api(`/api/admin/categories/${id}`, { method: "PATCH", body: { name } }, token);
      const rows = await loadCategories();
      const found = rows.find((c) => c.id === id);
      if (found) {
        if (String(form.categoryId) === String(id)) {
          setForm((f) => ({ ...f, categoryId: String(id) }));
        }
        setEditCategoryName(found.name);
      }
      setOk("Category updated.");
    } catch (x) {
      setErr(x.message);
    }
  }

  const current = sel !== "new" ? products.find((x) => x.id === sel) : null;
  const previewSrc =
    filePreview || (clearImage ? null : form.imageUrl?.trim() ? form.imageUrl.trim() : current?.image_url || null);

  return (
    <>
      <h1 className="page-title">Product management</h1>
      <p className="lede">Add new products, update details, set an image URL, or upload JPEG, PNG, GIF, or WebP (max 5MB).</p>
      {err ? <div className="err">{err}</div> : null}
      {ok ? <p className="lede" style={{ color: "var(--accent-deep)" }}>{ok}</p> : null}
      <div className="card" style={{ marginBottom: "1rem" }}>
        <h2>Category management</h2>
        <div className="row" style={{ marginBottom: "0.9rem" }}>
          <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="New category name" style={{ marginBottom: 0 }} />
          <button type="button" className="btn btn-secondary" onClick={createCategory}>
            Create category
          </button>
        </div>
        <div className="row">
          <select
            value={editCategoryId}
            onChange={(e) => {
              const id = e.target.value;
              setEditCategoryId(id);
              const currentCategory = categories.find((c) => String(c.id) === id);
              setEditCategoryName(currentCategory ? currentCategory.name : "");
            }}
            style={{ marginBottom: 0 }}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input value={editCategoryName} onChange={(e) => setEditCategoryName(e.target.value)} placeholder="Rename selected category" style={{ marginBottom: 0 }} />
          <button type="button" className="btn btn-secondary" onClick={updateCategory}>
            Update category
          </button>
        </div>
      </div>
      <div className="card" style={{ marginBottom: "1rem" }}>
        <label className="field">Product</label>
        <select value={sel === "new" ? "new" : String(sel)} onChange={(e) => selectProduct(e.target.value === "new" ? "new" : Number(e.target.value))}>
          <option value="new">+ Add new product</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.sku} — {p.title}
            </option>
          ))}
        </select>
      </div>
      <div className="card">
        <h2>
          {sel === "new" ? "New product" : "Edit product"}{" "}
          {sel !== "new" && current ? <span className="badge">{current.sku}</span> : <span className="badge">Draft</span>}
        </h2>
        <form onSubmit={save}>
          <label className="field">SKU</label>
          <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required placeholder="SKU-999" />
          <label className="field">Title</label>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <label className="field">Category</label>
          <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <label className="field">Price (INR)</label>
          <input value={form.priceRupees} onChange={(e) => setForm({ ...form, priceRupees: e.target.value })} required />
          <label className="field">Description</label>
          <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <label className="field">Stock quantity</label>
          <input value={form.stockQty} onChange={(e) => setForm({ ...form, stockQty: e.target.value })} required />
          <label className="field">Image URL (optional)</label>
          <input
            value={form.imageUrl}
            onChange={(e) => {
              setForm({ ...form, imageUrl: e.target.value });
              setImageUrlDirty(true);
              setClearImage(false);
            }}
            placeholder="https://… or leave empty if uploading a file"
            disabled={!!imageFile || clearImage}
          />
          <label className="field">Upload image (optional)</label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            style={{ marginBottom: "0.75rem" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              setImageFile(f || null);
              if (f) setClearImage(false);
            }}
          />
          {sel !== "new" && (current?.image_url || form.imageUrl) ? (
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem", fontWeight: 700, color: "var(--muted)", fontSize: "0.88rem" }}>
              <input
                type="checkbox"
                checked={clearImage}
                onChange={(e) => {
                  setClearImage(e.target.checked);
                  if (e.target.checked) setImageFile(null);
                }}
              />
              Remove current image
            </label>
          ) : null}
          {previewSrc ? (
            <div className="card" style={{ padding: "0.75rem", marginBottom: "1rem", maxWidth: 320 }}>
              <div className="field" style={{ marginBottom: "0.5rem" }}>
                Preview
              </div>
              <img src={previewSrc} alt="" style={{ width: "100%", borderRadius: "var(--radius-sm)", display: "block" }} />
            </div>
          ) : null}
          <button type="submit" className="btn btn-primary">
            {sel === "new" ? "Create product" : "Save changes"}
          </button>
        </form>
      </div>
    </>
  );
}
