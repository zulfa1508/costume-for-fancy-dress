import React, { useEffect, useState } from "react";
import { api } from "../../api.js";
import { useAuth } from "../../auth/AuthContext.jsx";

export default function AdminInventory() {
  const { token } = useAuth();
  const [rows, setRows] = useState([]);
  const [qty, setQty] = useState({});
  const [err, setErr] = useState("");

  useEffect(() => {
    api("/api/admin/products", {}, token)
      .then((list) => {
        setRows(list);
        const m = {};
        list.forEach((p) => {
          m[p.id] = String(p.stock_qty);
        });
        setQty(m);
      })
      .catch((e) => setErr(e.message));
  }, [token]);

  async function apply() {
    setErr("");
    try {
      for (const p of rows) {
        const v = Number(qty[p.id]);
        if (!Number.isNaN(v) && v >= 0) {
          await api(`/api/admin/inventory/${p.id}`, { method: "PATCH", body: { stockQty: v } }, token);
        }
      }
      const list = await api("/api/admin/products", {}, token);
      setRows(list);
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <>
      <h1 className="page-title">Inventory</h1>
      {err ? <div className="err">{err}</div> : null}
      <div className="card">
        <h2>Stock levels</h2>
        <table className="table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Name</th>
              <th>On hand</th>
              <th>Adjust</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>{p.sku}</td>
                <td>{p.title}</td>
                <td>{p.stock_qty}</td>
                <td>
                  <input type="number" min={0} value={qty[p.id] ?? ""} style={{ width: 80, margin: 0 }} onChange={(e) => setQty({ ...qty, [p.id]: e.target.value })} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" className="btn btn-primary" style={{ marginTop: "1rem" }} onClick={apply}>
          Apply changes
        </button>
      </div>
    </>
  );
}
