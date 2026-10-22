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
    <div className="dashboard-page">
      <PageTitle title="Dashboard" subtitle="A current view of inventory, purchasing activity, and vendor payables." />
      <Alert message={error} />
      <section className="panel dashboard-filter" aria-label="Dashboard date range">
        <div className="dashboard-filter-copy">
          <strong>Reporting period</strong>
          <span>Purchase totals and daily movements use this date range.</span>
        </div>
        <div className="dashboard-date-fields">
          <Field label="From">
            <input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} />
          </Field>
          <span className="dashboard-date-separator" aria-hidden="true">to</span>
          <Field label="To">
            <input type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} />
          </Field>
        </div>
      </section>
      {loading && <div className="dashboard-state"><Loading label="Loading dashboard..." /></div>}
      {data && !loading && (
        <>
          <section className="dashboard-stats" aria-label="Inventory and purchasing summary">
            <article className="dashboard-stat dashboard-stat-buying">
              <span className="dashboard-stat-label">Buying inventory</span>
              <strong>{data.currentStock.buying ?? 0}</strong>
              <small>Purchased stock and raw materials</small>
            </article>
            <article className="dashboard-stat dashboard-stat-warehouse">
              <span className="dashboard-stat-label">Warehouse stock</span>
              <strong>{data.currentStock.warehouse}</strong>
              <small>Current units</small>
            </article>
            <article className="dashboard-stat dashboard-stat-shopify">
              <span className="dashboard-stat-label">Shopify-listed stock</span>
              <strong>{data.currentStock.shopifyListed}</strong>
              <small>Current units</small>
            </article>
            <article className="dashboard-stat dashboard-stat-purchases">
              <span className="dashboard-stat-label">Purchases in period</span>
              <strong>{data.periodPurchases.count}</strong>
              <small>{data.periodPurchases.quantity} units received</small>
            </article>
            <article className="dashboard-stat dashboard-stat-value">
              <span className="dashboard-stat-label">Purchase value</span>
              <strong>{formatMoney(data.periodPurchases.value)}</strong>
              <small>Selected date range</small>
            </article>
            <article className="dashboard-stat dashboard-stat-payables">
              <span className="dashboard-stat-label">Vendor payables</span>
              <strong>{formatMoney(data.vendorPayables.total)}</strong>
              <small>Outstanding total</small>
            </article>
          </section>
          <section className="panel dashboard-panel dashboard-recent">
            <div className="section-heading">
              <div><h2>Recent movements</h2><p className="dashboard-section-subtitle">Latest inventory changes across products</p></div>
              <span className="dashboard-section-tag">Latest 10</span>
            </div>
            <DataTable columns={movementColumns} rows={data.recentMovements || []} emptyMessage="No inventory movements yet." />
          </section>
          <div className="dashboard-activity-grid">
            <section className="panel dashboard-panel dashboard-daily">
              <div className="section-heading">
                <div><h2>Daily activity</h2><p className="dashboard-section-subtitle">Net movement by day and stock bucket</p></div>
                <span className="dashboard-section-tag">Selected period</span>
              </div>
              <DataTable columns={dailyColumns} rows={data.dailyMovements || []} emptyMessage="No movement activity for these dates." />
            </section>
            <section className="panel dashboard-panel dashboard-payables">
              <div className="section-heading">
                <div><h2>Outstanding by vendor</h2><p className="dashboard-section-subtitle">Current outstanding balances, not limited to the selected reporting period</p></div>
              </div>
              <DataTable columns={payableColumns} rows={data.vendorPayables.byVendor || []} emptyMessage="No outstanding vendor balances." />
            </section>
          </div>
        </>
      )}
      {!data && !loading && !error && <div className="panel dashboard-empty"><p className="muted">No dashboard data is available.</p></div>}
    </div>
  );
}
