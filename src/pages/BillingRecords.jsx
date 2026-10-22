import { useCallback, useEffect, useState } from "react";
import api, { getErrorMessage } from "../api/client.js";
import { Alert, DataTable, Loading, PageTitle, formatMoney } from "../components/Common.jsx";

const sections = [
  { status: "PAID", title: "Paid" },
  { status: "PARTIALLY_PAID", title: "Partially Paid" },
  { status: "CREDIT", title: "Credit" },
];

export default function BillingRecords() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/inventoryPurchases/billing-summary");
      setRecords(response.data.data);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  const columns = [
    { key: "vendorName", label: "Vendor" },
    { key: "productNames", label: "Products", render: (row) => row.productNames.join(", ") || "—" },
    { key: "totalPurchaseAmount", label: "Total purchases", align: "right", render: (row) => formatMoney(row.totalPurchaseAmount) },
    { key: "amountPaid", label: "Amount paid", align: "right", render: (row) => formatMoney(row.amountPaid) },
    { key: "outstandingBalance", label: "Outstanding balance", align: "right", render: (row) => formatMoney(row.outstandingBalance) },
  ];

  return (
    <div className="billing-page">
      <PageTitle title="Billing records" subtitle="Review vendor purchase totals, recorded payments, and outstanding balances.">
        <button className="button button-small" onClick={loadRecords} disabled={loading}>Refresh</button>
      </PageTitle>
      <Alert message={error} />
      {loading ? <Loading label="Loading billing records..." /> : records.length === 0 ? (
        <section className="panel billing-empty"><p className="muted">No billing records are available because no purchases have been recorded.</p></section>
      ) : sections.map(({ status, title }) => {
        const rows = records.filter((record) => record.status === status);
        return (
          <section className={`panel billing-section billing-${status.toLowerCase()}`} key={status}>
            <div className="section-heading">
              <div><h2>{title}</h2><p className="billing-section-copy">{status === "PAID" ? "Vendors with no outstanding balance." : status === "PARTIALLY_PAID" ? "Vendors with both recorded payments and an outstanding balance." : "Vendors with an outstanding balance and no recorded payments."}</p></div>
              <span className={`record-badge billing-status-badge billing-status-${status.toLowerCase()}`}>{title}</span>
            </div>
            <DataTable
              columns={columns}
              rows={rows}
              emptyMessage={`No vendors with ${title.toLowerCase()} billing records.`}
            />
          </section>
        );
      })}
    </div>
  );
}
