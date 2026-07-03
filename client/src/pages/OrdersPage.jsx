import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { formatMoney } from "../money.js";

function statusClass(s) {
  if (s === "shipped") return "status shipped";
  return "status pending";
}

export default function OrdersPage() {
  const { token } = useAuth();
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    api("/api/orders", {}, token)
      .then(setRows)
      .catch((e) => setErr(e.message));
  }, [token]);

  return (
    <>
      <h1 className="page-title">Order history</h1>
      {err ? <div className="err">{err}</div> : null}
      <div className="card">
        <h2>Your orders</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Date</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id}>
                <td>#{o.id}</td>
                <td>{new Date(o.created_at).toLocaleDateString()}</td>
                <td>{formatMoney(o.total_cents)}</td>
                <td style={{ textTransform: "uppercase" }}>{o.payment_method}</td>
                <td>
                  <span className={statusClass(o.status)}>{o.status}</span>
                </td>
                <td>
                  <Link className="link" to={`/orders`}>
                    Refresh
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
