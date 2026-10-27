import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  Boxes,
  CalendarDays,
  ChartColumn,
  CircleDollarSign,
  ClipboardList,
  PackageCheck,
  PackageOpen,
  Wallet,
} from "lucide-react";
import api, { getErrorMessage } from "../api/client.js";
import { Alert, DataTable, Field, formatDate, formatMoney, Loading } from "../components/Common.jsx";

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
    { key: "type", label: "Movement", render: (row) => <span className="movement-kind">{row.type ?? "—"}</span> },
    { key: "bucket", label: "Stock bucket", render: (row) => <span className="movement-bucket">{row.bucket ?? "—"}</span> },
    {
      key: "quantityChange",
      label: "Change",
      align: "right",
      render: (row) => (
        <span className={`movement-quantity${Number(row.quantityChange) < 0 ? " movement-quantity-negative" : Number(row.quantityChange) > 0 ? " movement-quantity-positive" : ""}`}>
          {row.quantityChange ?? "—"}
        </span>
      ),
    },
    { key: "actor", label: "Recorded by", render: (row) => row.actor?.name || "System" },
  ];
  const dailyColumns = [
    { key: "date", label: "Date" },
    { key: "bucket", label: "Bucket" },
    { key: "type", label: "Movement" },
    { key: "quantityChange", label: "Net quantity change", align: "right" },
  ];
  const payableColumns = [
    { key: "vendorName", label: "Vendor" },
    { key: "outstanding", label: "Outstanding", align: "right", render: (row) => formatMoney(row.outstanding) },
  ];
  const summaryCards = [
    {
      label: "Buying inventory",
      value: data?.currentStock.buying ?? 0,
      detail: "Purchased stock and raw materials",
      group: "Inventory",
      icon: Boxes,
      tone: "buying",
      to: "/raw-inventory",
    },
    {
      label: "Warehouse stock",
      value: data?.currentStock.warehouse,
      detail: "Current units",
      group: "Inventory",
      icon: PackageOpen,
      tone: "warehouse",
      to: "/inventory",
    },
    {
      label: "Shopify-listed stock",
      value: data?.currentStock.shopifyListed,
      detail: "Current units",
      group: "Inventory",
      icon: PackageCheck,
      tone: "shopify",
      to: "/inventory",
    },
    {
      label: "Purchases in period",
      value: data?.periodPurchases.count,
      detail: `${data?.periodPurchases.quantity ?? 0} units received`,
      group: "Purchasing",
      icon: ClipboardList,
      tone: "purchases",
    },
    {
      label: "Purchase value",
      value: formatMoney(data?.periodPurchases.value),
      detail: "Selected date range",
      group: "Purchasing",
      icon: CircleDollarSign,
      tone: "value",
    },
    {
      label: "Vendor payables",
      value: formatMoney(data?.vendorPayables.total),
      detail: "Outstanding total",
      group: "Payables",
      icon: Wallet,
      tone: "payables",
    },
  ];

  return (
    <div className="dashboard-page">
      <header className="dashboard-heading">
        <div className="dashboard-heading-copy">
          <span className="dashboard-eyebrow">Operations overview</span>
          <h1>Dashboard</h1>
          <p>A clear view of inventory, purchasing activity, and vendor payables.</p>
        </div>
        <section className="dashboard-filter" aria-label="Dashboard date range">
          <div className="dashboard-filter-title">
            <span className="dashboard-filter-icon"><CalendarDays aria-hidden="true" /></span>
            <div className="dashboard-filter-copy">
              <strong>Reporting period</strong>
              <span>Purchases and daily movements</span>
            </div>
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
      </header>
      <Alert message={error} />
      {loading && <div className="dashboard-state"><Loading label="Loading dashboard..." /></div>}
      {data && !loading && (
        <>
          <section className="dashboard-stats" aria-label="Inventory and purchasing summary">
            {summaryCards.map(({ label, value, detail, group, icon: Icon, tone, to }) => {
              const card = (
                <>
                  <div className="dashboard-stat-top">
                    <span className="dashboard-stat-label">{label}</span>
                    <span className="dashboard-stat-icon"><Icon aria-hidden="true" /></span>
                  </div>
                  <strong>{value}</strong>
                  <div className="dashboard-stat-bottom">
                    <small>{detail}</small>
                    <span>{group}</span>
                  </div>
                </>
              );

              return to
                ? <Link className={`dashboard-stat dashboard-stat-${tone}`} key={label} to={to}>{card}</Link>
                : <article className={`dashboard-stat dashboard-stat-${tone}`} key={label}>{card}</article>;
            })}
          </section>
          <section className="panel dashboard-panel dashboard-recent">
            <div className="section-heading">
              <div className="dashboard-section-title">
                <span className="dashboard-section-icon"><Activity aria-hidden="true" /></span>
                <div><h2>Recent movements</h2><p className="dashboard-section-subtitle">Latest inventory changes across products</p></div>
              </div>
              <span className="dashboard-section-tag">Latest 10</span>
            </div>
            <DataTable columns={movementColumns} rows={data.recentMovements || []} emptyMessage="No inventory movements yet." />
          </section>
          <div className="dashboard-activity-grid">
            <section className="panel dashboard-panel dashboard-daily">
              <div className="section-heading">
                <div className="dashboard-section-title">
                  <span className="dashboard-section-icon dashboard-section-icon-teal"><ChartColumn aria-hidden="true" /></span>
                  <div><h2>Daily activity</h2><p className="dashboard-section-subtitle">Net movement by day and stock bucket</p></div>
                </div>
                <span className="dashboard-section-tag">Selected period</span>
              </div>
              <DataTable columns={dailyColumns} rows={data.dailyMovements || []} emptyMessage="No movement activity for these dates." />
            </section>
            <section className="panel dashboard-panel dashboard-payables">
              <div className="section-heading">
                <div className="dashboard-section-title">
                  <span className="dashboard-section-icon dashboard-section-icon-amber"><Wallet aria-hidden="true" /></span>
                  <div><h2>Outstanding by vendor</h2><p className="dashboard-section-subtitle">Current outstanding balances, not limited to the selected reporting period</p></div>
                </div>
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
