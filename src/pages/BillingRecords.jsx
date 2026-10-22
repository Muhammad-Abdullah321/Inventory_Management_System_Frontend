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
    { key: "totalPurchaseAmount", label: "Total purchases", render: (row) => formatMoney(row.totalPurchaseAmount) },
    { key: "amountPaid", label: "Amount paid", render: (row) => formatMoney(row.amountPaid) },
    { key: "outstandingBalance", label: "Outstanding balance", render: (row) => formatMoney(row.outstandingBalance) },
  ];

  return (
    <>
      <PageTitle title="Billing records" subtitle="Vendor-level purchase totals and payment balances">
        <button className="button button-small" onClick={loadRecords} disabled={loading}>Refresh</button>
      </PageTitle>
      <Alert message={error} />
      {loading ? <Loading label="Loading billing records..." /> : records.length === 0 ? (
        <p className="muted">No billing records are available because no purchases have been recorded.</p>
      ) : sections.map(({ status, title }) => {
        const rows = records.filter((record) => record.status === status);
        return (
          <section className="panel" key={status}>
            <div className="section-heading"><h2>{title}</h2></div>
            <DataTable
              columns={columns}
              rows={rows}
              emptyMessage={`No vendors with ${title.toLowerCase()} billing records.`}
            />
          </section>
        );
      })}
    </>
  );
}
