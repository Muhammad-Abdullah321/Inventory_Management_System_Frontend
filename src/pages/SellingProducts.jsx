import { useCallback, useEffect, useState } from "react";
import api, { getErrorMessage } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { Alert, DataTable, formatMoney, Loading, PageTitle } from "../components/Common.jsx";

export default function SellingProducts() {
  const { isOwner } = useAuth();
  const [products, setProducts] = useState([]);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState({ sku: "", sellingPrice: "" });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/products/buying");
      setProducts(response.data.data.filter((product) => product.classification === "FINISHED_GOOD"));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  function beginEdit(product) {
    setEditingId(product.id);
    setForm({ sku: product.sku || "", sellingPrice: String(product.sellingPrice ?? "") });
    setError("");
    setSuccess("");
  }

  async function saveSellingDetails(event) {
    event.preventDefault();
    if (saving || !editingId) return;
    const sku = form.sku.trim();
    const sellingPrice = Number(form.sellingPrice);
    if (!sku) {
      setError("Enter a non-empty SKU.");
      return;
    }
    if (!Number.isFinite(sellingPrice) || sellingPrice < 0) {
      setError("Enter a valid non-negative selling price.");
      return;
    }
    if (products.some((product) => product.id !== editingId && product.sku === sku)) {
      setError("Another EMS product already uses this SKU. Use a unique SKU before saving.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.put(`/products/${encodeURIComponent(editingId)}/selling`, { sku, sellingPrice });
      setSuccess("Selling details updated. Product stock was not changed.");
      setEditingId("");
      await loadProducts();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  const columns = [
    { key: "name", label: "Finished product" },
    { key: "sku", label: "SKU" },
    { key: "unit", label: "Unit", render: (product) => product.unit || "Not set" },
    { key: "sellingPrice", label: "Selling price", render: (product) => product.isSellingConfigured ? formatMoney(product.sellingPrice) : "Not configured" },
    { key: "actions", label: "Actions", render: (product) => isOwner
      ? <button className="button button-small" disabled={!product.unit} onClick={() => beginEdit(product)}>{product.isSellingConfigured ? "Edit selling details" : "Configure for selling"}</button>
      : "—" },
  ];
  const configuredProducts = products.filter((product) => product.isSellingConfigured);
  const candidates = products.filter((product) => !product.isSellingConfigured);

  return (
    <div className="catalog-page selling-products-page">
      <PageTitle title="Selling products" subtitle="Manage selling details for existing finished goods without creating duplicate product records." />
      <Alert message={error} />
      <Alert kind="success" message={success} />
      {candidates.some((product) => !product.unit) && <Alert message="Finished goods without a configured unit cannot be configured for selling until their unit is resolved." />}
      {isOwner && editingId && (
        <section className="panel catalog-form-panel selling-configuration-panel">
          <div className="section-heading">
            <div><h2>Configure finished good for selling</h2><p className="catalog-section-copy">Only selling SKU and price are editable in this workflow.</p></div>
          </div>
          <form className="form-grid" onSubmit={saveSellingDetails}>
            <Field label="SKU" required>
              <input value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value })} required />
            </Field>
            <Field label="Selling price" required>
              <input type="number" min="0" step="0.01" value={form.sellingPrice} onChange={(event) => setForm({ ...form, sellingPrice: event.target.value })} required />
            </Field>
            <div className="form-actions">
              <button className="button button-primary" disabled={saving}>{saving ? "Saving..." : "Save selling details"}</button>
              <button type="button" className="button" onClick={() => setEditingId("")} disabled={saving}>Cancel</button>
            </div>
          </form>
          <p className="form-hint">The existing product name, classification, unit, stock, and purchase history are preserved.</p>
        </section>
      )}
      <section className="panel catalog-list-panel selling-configured-list">
        <div className="section-heading">
          <div><h2>Configured selling products</h2><p className="catalog-section-copy">Finished goods with selling details set.</p></div>
          <button className="button button-small" onClick={loadProducts} disabled={loading}>Refresh</button>
        </div>
        {loading
          ? <Loading label="Loading finished goods..." />
          : <DataTable columns={columns} rows={configuredProducts} emptyMessage="No finished goods are configured for selling yet." />}
      </section>
      <section className="panel catalog-list-panel selling-candidate-list">
        <div className="section-heading"><div><h2>Finished goods available to configure</h2><p className="catalog-section-copy">Existing finished goods not yet configured for selling.</p></div></div>
        {loading
          ? <Loading label="Loading finished goods..." />
          : <DataTable columns={columns} rows={candidates} emptyMessage="No unconfigured finished goods." />}
      </section>
    </div>
  );
}
