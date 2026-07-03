import React, { useEffect, useState } from "react";
import { api } from "../../api.js";
import { useAuth } from "../../auth/AuthContext.jsx";
import { formatMoney } from "../../money.js";

export default function AdminOrders() {
  const { token } = useAuth();
  const [rows, setRows] = useState([]);
  const [statusMap, setStatusMap] = useState({});
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    try {
      const list = await api("/api/admin/orders", {}, token);
      setRows(list);
      const m = {};
      list.forEach((o) => {
        m[o.id] = o.status;
      });
      setStatusMap(m);
    } catch (e) {
      setErr(e.message);
    }
  }

  useEffect(() => {
    load();
  }, [token]);

  async function saveRow(id) {
    setErr("");
    try {
      await api(`/api/admin/orders/${id}`, { method: "PATCH", body: { status: statusMap[id] } }, token);
      await load();
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <>
      <h1 className="page-title">Order management</h1>
      <p className="lede">Update fulfillment status for COD orders.</p>
      {err ? <div className="err">{err}</div> : null}
      <div className="card">
        <h2>Orders queue</h2>
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Customer</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id}>
                <td>#{o.id}</td>
                <td>{o.customer_email}</td>
                <td>{formatMoney(o.total_cents)}</td>
                <td style={{ textTransform: "uppercase" }}>{o.payment_method}</td>
                <td>
                  <select value={statusMap[o.id] || o.status} onChange={(e) => setStatusMap({ ...statusMap, [o.id]: e.target.value })}>
                    <option value="pending">pending</option>
                    <option value="processing">processing</option>
                    <option value="shipped">shipped</option>
                    <option value="cancelled">cancelled</option>
                  </select>
                </td>
                <td>
                  <button type="button" className="btn btn-secondary" style={{ padding: "0.35rem 0.6rem", fontSize: "0.8rem" }} onClick={() => saveRow(o.id)}>
                    Save
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
