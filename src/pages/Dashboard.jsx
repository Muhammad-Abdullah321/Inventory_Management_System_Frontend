import { useCallback, useEffect, useState } from "react";
import api, { getErrorMessage } from "../api/client.js";
import { Alert, DataTable, Field, formatDate, formatMoney, Loading, PageTitle } from "../components/Common.jsx";

function dateInput(date) {
  return date.toISOString().slice(0, 10);
}

export default function Dashboard() {
  const today = new Date();
  const monthAgo = new Date(today);
  monthAgo.setDate(monthAgo.getDate() - 30);
  const [from, setFrom] = useState(dateInput(monthAgo));
  const [to, setTo] = useState(dateInput(today));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/dashboard", { params: { from, to } });
      setData(response.data.data);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const movementColumns = [
    { key: "createdAt", label: "Date", render: (row) => formatDate(row.createdAt) },
    { key: "product", label: "Product", render: (row) => row.product?.name || "—" },
    { key: "type", label: "Movement" },
    { key: "bucket", label: "Stock bucket" },
    { key: "quantityChange", label: "Change" },
    { key: "actor", label: "Recorded by", render: (row) => row.actor?.name || "System" },
  ];
  const dailyColumns = [
    { key: "date", label: "Date" },
    { key: "bucket", label: "Bucket" },
    { key: "type", label: "Movement" },
    { key: "quantityChange", label: "Net quantity change" },
  ];
  const payableColumns = [
    { key: "vendorName", label: "Vendor" },
    { key: "outstanding", label: "Outstanding", render: (row) => formatMoney(row.outstanding) },
  ];

  return (
    <>
      <PageTitle title="Dashboard" subtitle="Current stock and inventory activity" />
      <Alert message={error} />
      <div className="filter-panel">
        <Field label="From">
          <input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} />
        </Field>
        <Field label="To">
          <input type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} />
        </Field>
      </div>
      {loading && <Loading label="Loading dashboard..." />}
      {data && !loading && (
        <>
          <section className="stat-grid">
            <article className="stat-card"><span>Buying inventory</span><strong>{data.currentStock.buying ?? 0}</strong><small>Purchased stock and raw materials</small></article>
            <article className="stat-card"><span>Warehouse stock</span><strong>{data.currentStock.warehouse}</strong><small>Current units</small></article>
            <article className="stat-card"><span>Shopify-listed stock</span><strong>{data.currentStock.shopifyListed}</strong><small>Current units</small></article>
            <article className="stat-card"><span>Purchases in period</span><strong>{data.periodPurchases.count}</strong><small>{data.periodPurchases.quantity} units received</small></article>
            <article className="stat-card"><span>Purchase value</span><strong>{formatMoney(data.periodPurchases.value)}</strong><small>Selected date range</small></article>
            <article className="stat-card"><span>Vendor payables</span><strong>{formatMoney(data.vendorPayables.total)}</strong><small>Outstanding total</small></article>
          </section>
          <section className="panel">
            <div className="section-heading"><h2>Recent movements</h2><span>Latest 10</span></div>
            <DataTable columns={movementColumns} rows={data.recentMovements || []} emptyMessage="No inventory movements yet." />
          </section>
          <section className="panel">
            <div className="section-heading"><h2>Daily activity</h2><span>Selected date range</span></div>
            <DataTable columns={dailyColumns} rows={data.dailyMovements || []} emptyMessage="No movement activity for these dates." />
          </section>
          <section className="panel">
            <div className="section-heading"><h2>Outstanding by vendor</h2></div>
            <DataTable columns={payableColumns} rows={data.vendorPayables.byVendor || []} emptyMessage="No outstanding vendor balances." />
          </section>
        </>
      )}
      {!data && !loading && !error && <p className="muted">No dashboard data is available.</p>}
    </>
  );
}
