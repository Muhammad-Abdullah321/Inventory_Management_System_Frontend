import { useCallback, useEffect, useState } from "react";
import api, { getErrorMessage } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { Alert, DataTable, Field, formatMoney, Loading, PageTitle } from "../components/Common.jsx";
import useUnits from "../hooks/useUnits.js";

const blankProduct = {
  name: "",
  classification: "",
  unit: "",
};

export default function Products() {
  const { isOwner } = useAuth();
  const [products, setProducts] = useState([]);
  const { units, loading: unitsLoading, error: unitsError, reload: loadUnits } = useUnits();
  const [form, setForm] = useState(blankProduct);
  const [editingId, setEditingId] = useState("");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/products");
      setProducts(response.data.data);
      setError("");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  function beginEdit(product) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      classification: product.classification,
      unit: product.unit || "",
    });
    setSuccess("");
    setError("");
  }

  function clearForm() {
    setEditingId("");
    setForm(blankProduct);
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    const payload = {
      ...form,
      name: form.name.trim(),
      classification: form.classification,
      unit: form.unit,
    };
    try {
      if (editingId) await api.put(`/products/${editingId}`, payload);
      else await api.post("/products/buying", payload);
      setSuccess(editingId ? "Product updated." : "Product created.");
      clearForm();
      await loadProducts();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function viewProduct(product) {
    setSelected(null);
    setError("");
    try {
      const response = await api.get(`/products/${product.id}`);
      setSelected(response.data.data);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  async function deleteProduct(product) {
    if (!window.confirm(`Delete ${product.name}? This is only possible if the product has no stock or history.`)) return;
    setError("");
    setSuccess("");
    try {
      const response = await api.delete(`/products/${product.id}`);
      setSuccess(response.data.message || "Product deleted.");
      await loadProducts();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  const columns = [
    { key: "name", label: "Product" },
    { key: "sku", label: "SKU" },
    { key: "classification", label: "Classification" },
    { key: "unit", label: "Unit", render: (row) => row.unit || "Not set" },
    { key: "sellingPrice", label: "Selling price", render: (row) => row.isSellingConfigured ? formatMoney(row.sellingPrice) : "Not configured" },
    { key: "stock", label: "Buying / warehouse", render: (row) => `${row.stock?.find((entry) => entry.bucket === "BUYING")?.quantity ?? 0} / ${row.stock?.find((entry) => entry.bucket === "WAREHOUSE")?.quantity ?? 0}` },
    { key: "actions", label: "Actions", render: (row) => (
      <div className="table-actions">
        <button className="button button-small" onClick={() => viewProduct(row)}>Details</button>
        {isOwner && <>
          <button className="button button-small" onClick={() => beginEdit(row)}>Edit</button>
          {(!row.stock || row.stock.length === 0) && <button className="button button-small button-danger" onClick={() => deleteProduct(row)}>Delete</button>}
        </>}
      </div>
    ) },
  ];
  const buyingProducts = products.filter((product) =>
    ["RAW_MATERIAL", "FINISHED_GOOD"].includes(product.classification)
  );
  const unresolvedProducts = products.filter((product) => product.classification === "UNRESOLVED");

  return (
    <>
      <PageTitle title="Buying products" subtitle="Create products for purchasing; finished goods can be configured for selling without creating a second product record." />
      <Alert message={error} />
      <Alert message={unitsError ? `Unable to load unit options: ${unitsError}` : ""} />
      <Alert kind="success" message={success} />
      {isOwner && (
        <section className="panel">
          <div className="section-heading"><h2>{editingId ? "Edit product" : "Add product"}</h2></div>
          <form className="form-grid" onSubmit={submit}>
            <Field label="Product name" required><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></Field>
            <Field label="Classification" required>
              <select value={form.classification} onChange={(event) => setForm({ ...form, classification: event.target.value })} required>
                <option value="">Select classification</option>
                {editingId && form.classification === "UNRESOLVED" && <option value="UNRESOLVED">Unresolved</option>}
                <option value="RAW_MATERIAL">Raw material</option>
                <option value="FINISHED_GOOD">Finished good</option>
              </select>
            </Field>
            <Field label="Unit" required>
              <select
                value={form.unit}
                onChange={(event) => setForm({ ...form, unit: event.target.value })}
                disabled={unitsLoading || Boolean(unitsError)}
                required
              >
                <option value="">{unitsLoading ? "Loading units..." : "Select unit"}</option>
                {units.map((unit) => <option key={unit.value} value={unit.value}>{unit.label}</option>)}
              </select>
            </Field>
            <div className="form-actions">
              <button className="button button-primary" disabled={saving || unitsLoading || Boolean(unitsError) || !units.length}>{saving ? "Saving..." : editingId ? "Save changes" : "Create buying product"}</button>
              {unitsError && <button type="button" className="button" onClick={loadUnits} disabled={unitsLoading}>Retry loading units</button>}
              {editingId && <button type="button" className="button" onClick={clearForm}>Cancel</button>}
            </div>
          </form>
          <p className="form-hint">Buying setup requires name, classification, and unit only. Configure a finished good for selling separately. Product setup does not add stock.</p>
        </section>
      )}
      {selected && (
        <section className="panel detail-panel">
          <div className="section-heading"><h2>Product details</h2><button className="button button-small" onClick={() => setSelected(null)}>Close</button></div>
          <dl className="detail-grid">
            <div><dt>Name</dt><dd>{selected.name}</dd></div><div><dt>SKU</dt><dd>{selected.sku}</dd></div>
            <div><dt>Selling price</dt><dd>{selected.isSellingConfigured ? formatMoney(selected.sellingPrice) : "Not configured"}</dd></div>
            <div><dt>Classification</dt><dd>{selected.classification}</dd></div>
            <div><dt>Unit</dt><dd>{selected.unit || "Not set"}</dd></div>
            <div><dt>Selling setup</dt><dd>{selected.isSellingConfigured ? "Configured" : "Not configured"}</dd></div>
            {(selected.stock || []).map((stock) => <div key={stock.id}><dt>{stock.bucket}</dt><dd>{stock.quantity}</dd></div>)}
          </dl>
        </section>
      )}
      <section className="panel">
        <div className="section-heading"><h2>Purchasable product catalog</h2><button className="button button-small" onClick={loadProducts}>Refresh</button></div>
        {loading ? <Loading label="Loading products..." /> : <DataTable columns={columns} rows={buyingProducts} emptyMessage="No classified purchasable products yet. Add a raw material or finished good above." />}
      </section>
      {!loading && unresolvedProducts.length > 0 && <section className="panel">
        <div className="section-heading"><h2>Legacy products needing classification</h2></div>
        <p className="form-hint">These existing products are unresolved and are not eligible for purchasing or manufacturing until classified.</p>
        <DataTable columns={columns} rows={unresolvedProducts} emptyMessage="No unresolved products." />
      </section>}
    </>
  );
}
