import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import path from "path";
import { unlink } from "fs/promises";
import pool from "./db.js";
import { signToken, requireAuth, requireAdmin } from "./middleware/auth.js";
import { uploadsDir, uploadImageOptional } from "./uploads.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3001);

app.use(cors({ origin: true, credentials: true }));
app.use("/uploads", express.static(uploadsDir));
app.use(express.json());

async function removeStoredUpload(imageUrl) {
  if (!imageUrl || typeof imageUrl !== "string" || !imageUrl.startsWith("/uploads/")) return;
  try {
    await unlink(path.join(uploadsDir, path.basename(imageUrl)));
  } catch {}
}

app.post("/api/auth/register", async (req, res) => {
  const { email, password, fullName } = req.body || {};
  if (!email || !password || !fullName) {
    return res.status(400).json({ error: "Missing fields" });
  }
  const hash = await bcrypt.hash(String(password), 10);
  try {
    const [r] = await pool.query(
      "INSERT INTO users (email, password_hash, full_name, role) VALUES (?,?,?,'customer')",
      [String(email).toLowerCase().trim(), hash, String(fullName).trim()]
    );
    const token = signToken({ id: r.insertId, role: "customer", email: String(email).toLowerCase().trim() });
    return res.json({ token, user: { id: r.insertId, email: String(email).toLowerCase().trim(), fullName: String(fullName).trim(), role: "customer" } });
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "Email already registered" });
    throw e;
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Missing fields" });
  const [rows] = await pool.query("SELECT id, email, password_hash, full_name, role FROM users WHERE email = ?", [
    String(email).toLowerCase().trim(),
  ]);
  const u = rows[0];
  if (!u || !(await bcrypt.compare(String(password), u.password_hash))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const token = signToken({ id: u.id, role: u.role, email: u.email });
  res.json({ token, user: { id: u.id, email: u.email, fullName: u.full_name, role: u.role } });
});

app.get("/api/categories", async (req, res) => {
  const [rows] = await pool.query("SELECT id, name FROM categories ORDER BY name");
  res.json(rows);
});

app.get("/api/products", async (req, res) => {
  const q = req.query.q ? `%${String(req.query.q).trim()}%` : null;
  const cat = req.query.categoryId ? Number(req.query.categoryId) : null;
  let sql = `SELECT p.id, p.sku, p.title, p.price_cents, p.stock_qty, p.description, p.image_url, c.name AS category_name
    FROM products p JOIN categories c ON c.id = p.category_id WHERE 1=1`;
  const params = [];
  if (q) {
    sql += " AND (p.title LIKE ? OR p.description LIKE ?)";
    params.push(q, q);
  }
  if (cat) {
    sql += " AND p.category_id = ?";
    params.push(cat);
  }
  const sort = req.query.sort;
  if (sort === "price_asc") sql += " ORDER BY p.price_cents ASC";
  else if (sort === "price_desc") sql += " ORDER BY p.price_cents DESC";
  else if (sort === "newest") sql += " ORDER BY p.id DESC";
  else sql += " ORDER BY p.title ASC";
  const [rows] = await pool.query(sql, params);
  res.json(rows);
});

app.get("/api/products/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [rows] = await pool.query(
    `SELECT p.id, p.sku, p.title, p.price_cents, p.stock_qty, p.description, p.image_url, c.name AS category_name, c.id AS category_id
     FROM products p JOIN categories c ON c.id = p.category_id WHERE p.id = ?`,
    [id]
  );
  if (!rows[0]) return res.status(404).json({ error: "Not found" });
  res.json(rows[0]);
});

app.get("/api/products/:id/reviews", async (req, res) => {
  const id = Number(req.params.id);
  const [rows] = await pool.query(
    `SELECT r.id, r.rating, r.comment, r.created_at, u.full_name AS user_name
     FROM reviews r JOIN users u ON u.id = r.user_id WHERE r.product_id = ? ORDER BY r.created_at DESC`,
    [id]
  );
  res.json(rows);
});

app.get("/api/cart", requireAuth, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT ci.id, ci.qty, ci.size_label, p.id AS product_id, p.title, p.sku, p.price_cents, p.stock_qty
     FROM cart_items ci JOIN products p ON p.id = ci.product_id WHERE ci.user_id = ?`,
    [req.user.id]
  );
  res.json(rows);
});

app.post("/api/cart", requireAuth, async (req, res) => {
  const { productId, qty, sizeLabel } = req.body || {};
  const q = Math.max(1, Number(qty || 1));
  const pid = Number(productId);
  if (!pid) return res.status(400).json({ error: "Invalid product" });
  const [prows] = await pool.query("SELECT stock_qty FROM products WHERE id = ?", [pid]);
  if (!prows[0]) return res.status(404).json({ error: "Product not found" });
  const stock = prows[0].stock_qty;
  const [existing] = await pool.query("SELECT id, qty FROM cart_items WHERE user_id = ? AND product_id = ?", [
    req.user.id,
    pid,
  ]);
  const prev = existing[0]?.qty || 0;
  const newQty = Math.min(stock, prev + q);
  const sl = sizeLabel != null ? String(sizeLabel).trim() || null : null;
  if (existing[0]) {
    await pool.query("UPDATE cart_items SET qty = ?, size_label = COALESCE(?, size_label) WHERE id = ?", [
      newQty,
      sl,
      existing[0].id,
    ]);
  } else {
    await pool.query("INSERT INTO cart_items (user_id, product_id, qty, size_label) VALUES (?,?,?,?)", [
      req.user.id,
      pid,
      newQty,
      sl,
    ]);
  }
  res.json({ ok: true });
});

app.patch("/api/cart/:itemId", requireAuth, async (req, res) => {
  const itemId = Number(req.params.itemId);
  const qty = Math.max(1, Number(req.body?.qty || 1));
  const [rows] = await pool.query(
    `SELECT ci.id, p.stock_qty FROM cart_items ci JOIN products p ON p.id = ci.product_id WHERE ci.id = ? AND ci.user_id = ?`,
    [itemId, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: "Not found" });
  const useQty = Math.min(qty, rows[0].stock_qty);
  await pool.query("UPDATE cart_items SET qty = ? WHERE id = ? AND user_id = ?", [useQty, itemId, req.user.id]);
  res.json({ ok: true });
});

app.delete("/api/cart/:itemId", requireAuth, async (req, res) => {
  const itemId = Number(req.params.itemId);
  await pool.query("DELETE FROM cart_items WHERE id = ? AND user_id = ?", [itemId, req.user.id]);
  res.json({ ok: true });
});

app.post("/api/orders/checkout", requireAuth, async (req, res) => {
  const { shippingName, shippingAddress, shippingCity, shippingPostal } = req.body || {};
  if (!shippingName || !shippingAddress || !shippingCity || !shippingPostal) {
    return res.status(400).json({ error: "Missing shipping fields" });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [citems] = await conn.query(
      `SELECT ci.id, ci.qty, ci.product_id, p.title, p.price_cents, p.stock_qty
       FROM cart_items ci JOIN products p ON p.id = ci.product_id WHERE ci.user_id = ? FOR UPDATE`,
      [req.user.id]
    );
    if (!citems.length) {
      await conn.rollback();
      return res.status(400).json({ error: "Cart is empty" });
    }
    let total = 0;
    for (const line of citems) {
      if (line.qty > line.stock_qty) {
        await conn.rollback();
        return res.status(400).json({ error: `Insufficient stock for ${line.title}` });
      }
      total += line.price_cents * line.qty;
    }
    const [or] = await conn.query(
      `INSERT INTO orders (user_id, total_cents, status, payment_method, shipping_name, shipping_address, shipping_city, shipping_postal)
       VALUES (?,?, 'pending', 'cod', ?, ?, ?, ?)`,
      [req.user.id, total, String(shippingName).trim(), String(shippingAddress).trim(), String(shippingCity).trim(), String(shippingPostal).trim()]
    );
    const orderId = or.insertId;
    for (const line of citems) {
      await conn.query(
        `INSERT INTO order_items (order_id, product_id, title_snapshot, unit_price_cents, qty) VALUES (?,?,?,?,?)`,
        [orderId, line.product_id, line.title, line.price_cents, line.qty]
      );
      await conn.query("UPDATE products SET stock_qty = stock_qty - ? WHERE id = ?", [line.qty, line.product_id]);
    }
    await conn.query("DELETE FROM cart_items WHERE user_id = ?", [req.user.id]);
    await conn.commit();
    res.json({ orderId, totalCents: total, paymentMethod: "cod" });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
});

app.get("/api/orders", requireAuth, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT id, total_cents, status, payment_method, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC`,
    [req.user.id]
  );
  res.json(rows);
});

app.get("/api/orders/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const [ords] = await pool.query("SELECT * FROM orders WHERE id = ? AND user_id = ?", [id, req.user.id]);
  if (!ords[0]) return res.status(404).json({ error: "Not found" });
  const [items] = await pool.query(
    "SELECT title_snapshot, unit_price_cents, qty FROM order_items WHERE order_id = ?",
    [id]
  );
  res.json({ order: ords[0], items });
});

app.post("/api/reviews", requireAuth, async (req, res) => {
  const { productId, rating, comment } = req.body || {};
  const r = Number(rating);
  const pid = Number(productId);
  if (!pid || !comment || r < 1 || r > 5) return res.status(400).json({ error: "Invalid review" });
  const [bought] = await pool.query(
    `SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id
     WHERE o.user_id = ? AND oi.product_id = ? LIMIT 1`,
    [req.user.id, pid]
  );
  if (!bought[0]) return res.status(403).json({ error: "Purchase required to review" });
  try {
    await pool.query("INSERT INTO reviews (user_id, product_id, rating, comment) VALUES (?,?,?,?)", [
      req.user.id,
      pid,
      r,
      String(comment).trim(),
    ]);
    res.json({ ok: true });
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "Already reviewed" });
    throw e;
  }
});

app.get("/api/admin/dashboard", requireAuth, requireAdmin, async (req, res) => {
  const [[o]] = await pool.query(
    "SELECT COUNT(*) AS c FROM orders WHERE status IN ('pending','processing')"
  );
  const [[low]] = await pool.query("SELECT COUNT(*) AS c FROM products WHERE stock_qty <= 5");
  const [[avg]] = await pool.query("SELECT AVG(rating) AS a FROM reviews");
  res.json({
    openOrders: o.c,
    lowStockSkus: low.c,
    avgRating: avg.a != null ? Number(avg.a).toFixed(1) : "0",
  });
});

app.get("/api/admin/orders", requireAuth, requireAdmin, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT o.id, o.total_cents, o.status, o.payment_method, o.created_at, u.email AS customer_email
     FROM orders o JOIN users u ON u.id = o.user_id ORDER BY o.created_at DESC`
  );
  res.json(rows);
});

app.patch("/api/admin/orders/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const status = req.body?.status;
  const allowed = ["pending", "processing", "shipped", "cancelled"];
  if (!allowed.includes(status)) return res.status(400).json({ error: "Invalid status" });
  await pool.query("UPDATE orders SET status = ? WHERE id = ?", [status, id]);
  res.json({ ok: true });
});

app.post("/api/admin/categories", requireAuth, requireAdmin, async (req, res) => {
  const name = String(req.body?.name || "").trim();
  if (!name) return res.status(400).json({ error: "Category name is required" });
  try {
    const [r] = await pool.query("INSERT INTO categories (name) VALUES (?)", [name]);
    res.json({ id: r.insertId, name, ok: true });
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "Category already exists" });
    throw e;
  }
});

app.patch("/api/admin/categories/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid category id" });
  const name = String(req.body?.name || "").trim();
  if (!name) return res.status(400).json({ error: "Category name is required" });
  try {
    const [r] = await pool.query("UPDATE categories SET name = ? WHERE id = ?", [name, id]);
    if (!r.affectedRows) return res.status(404).json({ error: "Category not found" });
    res.json({ id, name, ok: true });
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "Category already exists" });
    throw e;
  }
});

app.get("/api/admin/products", requireAuth, requireAdmin, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT p.id, p.sku, p.title, p.category_id, p.price_cents, p.stock_qty, p.description, p.image_url FROM products p ORDER BY p.id`
  );
  res.json(rows);
});

app.post("/api/admin/products", requireAuth, requireAdmin, uploadImageOptional, async (req, res) => {
  const sku = String(req.body.sku || "").trim();
  const title = String(req.body.title || "").trim();
  const categoryId = Number(req.body.categoryId);
  const description = req.body.description != null ? String(req.body.description) : "";
  const stockQty = Number(req.body.stockQty);
  const priceRupees = Number(req.body.priceRupees);
  if (!sku || !title || !Number.isFinite(categoryId) || !Number.isFinite(stockQty) || stockQty < 0 || !Number.isFinite(priceRupees)) {
    return res.status(400).json({ error: "Missing or invalid fields" });
  }
  const priceCents = Math.round(priceRupees * 100);
  let image_url = req.body.imageUrl != null ? String(req.body.imageUrl).trim() || null : null;
  if (req.file) image_url = `/uploads/${req.file.filename}`;
  try {
    const [r] = await pool.query(
      `INSERT INTO products (sku, title, category_id, price_cents, description, stock_qty, image_url) VALUES (?,?,?,?,?,?,?)`,
      [sku, title, categoryId, priceCents, description, stockQty, image_url]
    );
    res.json({ id: r.insertId, ok: true });
  } catch (e) {
    if (req.file) await removeStoredUpload(`/uploads/${req.file.filename}`);
    if (e.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "SKU already exists" });
    throw e;
  }
});

app.patch("/api/admin/products/:id", requireAuth, requireAdmin, uploadImageOptional, async (req, res) => {
  const id = Number(req.params.id);
  const [curRows] = await pool.query("SELECT image_url FROM products WHERE id = ?", [id]);
  if (!curRows[0]) return res.status(404).json({ error: "Not found" });
  const prevImage = curRows[0].image_url;

  const sets = [];
  const vals = [];

  if (req.body.title !== undefined) {
    sets.push("title = ?");
    vals.push(String(req.body.title).trim());
  }
  if (req.body.categoryId !== undefined && req.body.categoryId !== "") {
    sets.push("category_id = ?");
    vals.push(Number(req.body.categoryId));
  }
  if (req.body.priceRupees !== undefined && req.body.priceRupees !== "") {
    sets.push("price_cents = ?");
    vals.push(Math.round(Number(req.body.priceRupees) * 100));
  }
  if (req.body.description !== undefined) {
    sets.push("description = ?");
    vals.push(String(req.body.description));
  }
  if (req.body.stockQty !== undefined && req.body.stockQty !== "") {
    sets.push("stock_qty = ?");
    vals.push(Number(req.body.stockQty));
  }
  if (req.body.sku !== undefined && String(req.body.sku).trim() !== "") {
    sets.push("sku = ?");
    vals.push(String(req.body.sku).trim());
  }

  let newImage;
  const clearImg = req.body.clearImage === "1" || req.body.clearImage === "true" || req.body.clearImage === true;
  if (req.file) {
    newImage = `/uploads/${req.file.filename}`;
  } else if (clearImg) {
    newImage = null;
  } else if (req.body.imageUrl !== undefined) {
    newImage = String(req.body.imageUrl || "").trim() || null;
  }

  if (newImage !== undefined) {
    sets.push("image_url = ?");
    vals.push(newImage);
    if (prevImage && prevImage.startsWith("/uploads/") && prevImage !== newImage) await removeStoredUpload(prevImage);
    if (newImage === null && prevImage && prevImage.startsWith("/uploads/")) await removeStoredUpload(prevImage);
  }

  if (!sets.length) return res.json({ ok: true });

  vals.push(id);
  try {
    await pool.query(`UPDATE products SET ${sets.join(", ")} WHERE id = ?`, vals);
    res.json({ ok: true });
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "SKU already exists" });
    if (req.file) await removeStoredUpload(`/uploads/${req.file.filename}`);
    throw e;
  }
});

app.patch("/api/admin/inventory/:productId", requireAuth, requireAdmin, async (req, res) => {
  const productId = Number(req.params.productId);
  const stockQty = Number(req.body?.stockQty);
  if (Number.isNaN(stockQty) || stockQty < 0) return res.status(400).json({ error: "Invalid stock" });
  await pool.query("UPDATE products SET stock_qty = ? WHERE id = ?", [stockQty, productId]);
  res.json({ ok: true });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Server error" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});