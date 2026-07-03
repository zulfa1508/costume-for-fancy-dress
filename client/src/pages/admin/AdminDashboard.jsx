import React, { useEffect, useState } from "react";
import { api } from "../../api.js";
import { useAuth } from "../../auth/AuthContext.jsx";

export default function AdminDashboard() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api("/api/admin/dashboard", {}, token)
      .then(setData)
      .catch((e) => setErr(e.message));
  }, [token]);

  return (
    <>
      <h1 className="page-title">Admin dashboard</h1>
      {err ? <div className="err">{err}</div> : null}
      {data ? (
        <div className="stats">
          <div className="stat">
            <div className="num">{data.openOrders}</div>
            <div className="lbl">Open orders</div>
          </div>
          <div className="stat">
            <div className="num">{data.lowStockSkus}</div>
            <div className="lbl">Low stock SKUs</div>
          </div>
          <div className="stat">
            <div className="num">{data.avgRating}</div>
            <div className="lbl">Avg rating</div>
          </div>
        </div>
      ) : null}
      <div className="card">
        <h2>Today</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Event</th>
              <th>Module</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>COD order placed</td>
              <td>Order management</td>
            </tr>
            <tr>
              <td>Stock decremented on ship</td>
              <td>Inventory</td>
            </tr>
            <tr>
              <td>New review</td>
              <td>User content</td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
