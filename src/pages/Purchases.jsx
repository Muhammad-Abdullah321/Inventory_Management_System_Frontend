import { useCallback, useEffect, useState } from "react";
import api, { getErrorMessage } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { Alert, DataTable, Field, formatDate, formatMoney, Loading, PageTitle } from "../components/Common.jsx";

const emptyLine = { productId: "", quantity: "1", totalPrice: "" };

export default function Purchases() {
  const { isOwner } = useAuth();
  const [purchases, setPurchases] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [vendorId, setVendorId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState([{ ...emptyLine }]);
  const [selected, setSelected] = useState(null);
  const [payment, setPayment] = useState({ amount: "", paymentDate: new Date().toISOString().slice(0, 10), reference: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadPurchases = useCallback(async () => {
    setLoading(true);
    try {
      const [purchaseResponse, vendorResponse, productResponse] = await Promise.all([
        api.get("/inventoryPurchases"),
        api.get("/vendors"),
        api.get("/products"),
      ]);
      setPurchases(purchaseResponse.data.data);
      setVendors(vendorResponse.data.data);
      setProducts(productResponse.data.data);
      setError("");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPurchases(); }, [loadPurchases]);

  function updateItem(index, key, value) {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  }

  async function createPurchase(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await api.post("/inventoryPurchases", {
        vendorId,
        purchaseDate: purchaseDate ? new Date(`${purchaseDate}T00:00:00`).toISOString() : undefined,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          totalPrice: item.totalPrice,
        })),
      });
      setSuccess(`Purchase recorded. Total ${formatMoney(response.data.data.totalCost)}; buying inventory has been updated.`);
      setVendorId("");
      setPurchaseDate(new Date().toISOString().slice(0, 10));
      setItems([{ ...emptyLine }]);
      await loadPurchases();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function viewPurchase(purchase) {
    setError("");
    setSelected(null);
    try {
      const response = await api.get(`/inventoryPurchases/${purchase.id}`);
      setSelected(response.data.data);
      setPayment({ amount: "", paymentDate: new Date().toISOString().slice(0, 10), reference: "" });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  async function recordPayment(event) {
    event.preventDefault();
    if (!selected) return;
    const amount = Number(payment.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > Number(selected.outstandingBalance)) {
      setError("Enter a positive payment amount no greater than the outstanding balance.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.post(`/inventoryPurchases/${selected.id}/payments`, {
        amount,
        paymentDate: payment.paymentDate ? new Date(`${payment.paymentDate}T00:00:00`).toISOString() : undefined,
        reference: payment.reference.trim() || undefined,
      });
      setSuccess("Payment recorded.");
      await viewPurchase(selected);
      await loadPurchases();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  const purchaseColumns = [
    { key: "purchaseDate", label: "Purchase date", render: (row) => formatDate(row.purchaseDate) },
    { key: "vendor", label: "Vendor", render: (row) => row.vendor?.name || "—" },
    { key: "items", label: "Lines", render: (row) => row.items?.length ?? 0 },
    { key: "totalCost", label: "Total", render: (row) => formatMoney(row.totalCost) },
    { key: "amountPaid", label: "Paid", render: (row) => formatMoney(row.amountPaid) },
    { key: "outstandingBalance", label: "Outstanding", render: (row) => formatMoney(row.outstandingBalance) },
    { key: "actions", label: "Actions", render: (row) => <button className="button button-small" onClick={() => viewPurchase(row)}>Details / payment</button> },
  ];
  const purchasableProducts = products.filter((product) =>
    ["RAW_MATERIAL", "FINISHED_GOOD"].includes(product.classification)
  );

  return (
    <>
      <PageTitle title="Inventory purchases" subtitle="Receive goods and track purchase payments" />
      <Alert message={error} />
      <Alert kind="success" message={success} />
      <section className="panel">
        <div className="section-heading"><h2>Record purchase receipt</h2></div>
        <form className="form-stack" onSubmit={createPurchase}>
          <div className="form-grid">
            <Field label="Vendor" required>
              <select value={vendorId} onChange={(event) => setVendorId(event.target.value)} required>
                <option value="">Select vendor</option>
                {vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}
              </select>
            </Field>
            <Field label="Purchase date">
              <input type="date" value={purchaseDate} onChange={(event) => setPurchaseDate(event.target.value)} />
            </Field>
          </div>
          <h3 className="subheading">Purchase items</h3>
          {items.map((item, index) => (
            <div className="line-item" key={index}>
              <Field label="Product" required>
                <select value={item.productId} onChange={(event) => updateItem(index, "productId", event.target.value)} required>
                  <option value="">Select product</option>
                  {purchasableProducts.map((product) => <option key={product.id} value={product.id}>{product.name}{product.sku ? ` (${product.sku})` : ""}</option>)}
                </select>
              </Field>
              <Field label="Quantity" required><input type="number" min="0.000001" step="0.000001" value={item.quantity} onChange={(event) => updateItem(index, "quantity", event.target.value)} required /></Field>
              <Field label="Total line price" required><input type="number" min="0" step="0.01" value={item.totalPrice} onChange={(event) => updateItem(index, "totalPrice", event.target.value)} required /></Field>
              <button type="button" className="button button-small remove-line" disabled={items.length === 1} onClick={() => setItems((current) => current.filter((_, lineIndex) => lineIndex !== index))}>Remove</button>
            </div>
          ))}
          <div className="form-actions">
            <button type="button" className="button" onClick={() => setItems((current) => [...current, { ...emptyLine }])}>Add item</button>
            <button className="button button-primary" disabled={saving || vendors.length === 0 || purchasableProducts.length === 0}>{saving ? "Submitting..." : "Record purchase"}</button>
          </div>
          {(vendors.length === 0 || purchasableProducts.length === 0) && <p className="form-hint">Add at least one vendor and one classified raw material or finished good before recording a purchase.</p>}
        </form>
      </section>
      {selected && <section className="panel">
        <div className="section-heading"><h2>Purchase details</h2><button className="button button-small" onClick={() => setSelected(null)}>Close</button></div>
        <div className="purchase-summary">
          <span>Vendor <strong>{selected.vendor?.name || "—"}</strong></span>
          <span>Date <strong>{formatDate(selected.purchaseDate)}</strong></span>
          <span>Total <strong>{formatMoney(selected.totalCost)}</strong></span>
          <span>Paid <strong>{formatMoney(selected.amountPaid)}</strong></span>
          <span>Outstanding <strong>{formatMoney(selected.outstandingBalance)}</strong></span>
        </div>
        <DataTable columns={[
          { key: "product", label: "Product", render: (row) => row.product?.name || "—" },
          { key: "quantity", label: "Quantity" },
          { key: "unitCost", label: "Unit cost", render: (row) => formatMoney(row.unitCost) },
          { key: "totalCost", label: "Line total", render: (row) => formatMoney(row.totalCost) },
        ]} rows={selected.items || []} emptyMessage="No purchase line items." />
        <h3 className="subheading">Payments</h3>
        <DataTable columns={[
          { key: "paymentDate", label: "Date", render: (row) => formatDate(row.paymentDate) },
          { key: "amount", label: "Amount", render: (row) => formatMoney(row.amount) },
          { key: "reference", label: "Reference" },
        ]} rows={selected.payments || []} emptyMessage="No payments recorded." />
        {isOwner && Number(selected.outstandingBalance) > 0 && <form className="form-grid payment-form" onSubmit={recordPayment}>
          <h3 className="subheading full-width">Record payment</h3>
          <Field label="Amount" required><input type="number" min="0.01" max={selected.outstandingBalance} step="0.01" value={payment.amount} onChange={(event) => setPayment({ ...payment, amount: event.target.value })} required /></Field>
          <Field label="Payment date"><input type="date" value={payment.paymentDate} onChange={(event) => setPayment({ ...payment, paymentDate: event.target.value })} /></Field>
          <Field label="Reference"><input value={payment.reference} onChange={(event) => setPayment({ ...payment, reference: event.target.value })} /></Field>
          <div className="form-actions"><button className="button button-primary" disabled={saving}>{saving ? "Submitting..." : "Record payment"}</button></div>
        </form>}
      </section>}
      <section className="panel">
        <div className="section-heading"><h2>Purchase history</h2><button className="button button-small" onClick={loadPurchases}>Refresh</button></div>
        {loading ? <Loading label="Loading purchases..." /> : <DataTable columns={purchaseColumns} rows={purchases} emptyMessage="No purchases recorded yet." />}
      </section>
    </>
  );
}
