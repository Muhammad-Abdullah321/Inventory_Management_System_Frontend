import { useCallback, useEffect, useState } from "react";
import api, { getErrorMessage } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { Alert, DataTable, Field, formatDate, formatMoney, Loading, PageTitle } from "../components/Common.jsx";
import { isAtLeastQuantity } from "../utils/quantity.js";

function latestCompatibleCosts(purchases) {
  const costs = new Map();
  for (const purchase of purchases) {
    for (const item of purchase.items || []) {
      if (
        !item.unit ||
        !item.product?.unit ||
        item.unit !== item.product.unit ||
        Number(item.unitCost) <= 0
      ) continue;
      if (!costs.has(item.productId)) {
        costs.set(item.productId, {
          unitCost: item.unitCost,
          unit: item.unit,
          purchaseDate: purchase.purchaseDate,
          vendorName: purchase.vendor?.name || "—",
        });
      }
    }
  }
  return costs;
}

export default function RawMaterialInventory() {
  const { isOwner } = useAuth();
  const [materials, setMaterials] = useState([]);
  const [productId, setProductId] = useState("");
  const [finishedGoodId, setFinishedGoodId] = useState("");
  const [transferQuantity, setTransferQuantity] = useState("");
  const [quantityChange, setQuantityChange] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadInventory = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [productResponse, purchaseResponse] = await Promise.all([
        api.get("/products"),
        api.get("/inventoryPurchases"),
      ]);
      const products = productResponse.data.data.filter((product) =>
        ["RAW_MATERIAL", "FINISHED_GOOD"].includes(product.classification)
      );
      const costs = latestCompatibleCosts(purchaseResponse.data.data);
      const rows = products.map((product) => ({
        ...product,
        buyingQuantity: product.stock?.find((entry) => entry.bucket === "BUYING")?.quantity ?? 0,
        latestRecordedCost: costs.get(product.id) ?? null,
      }));
      setMaterials(rows);
      setProductId((current) => rows.some((product) => product.id === current)
        ? current
        : rows[0]?.id || "");
      const finishedGoods = rows.filter((product) => product.classification === "FINISHED_GOOD");
      setFinishedGoodId((current) => finishedGoods.some((product) => product.id === current)
        ? current
        : finishedGoods[0]?.id || "");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadInventory(); }, [loadInventory]);

  const selectedProduct = materials.find((product) => product.id === productId);
  const selectedStock = selectedProduct?.stock?.find((entry) => entry.bucket === "BUYING")?.quantity ?? 0;
  const finishedGoods = materials.filter((product) => product.classification === "FINISHED_GOOD");
  const selectedFinishedGood = finishedGoods.find((product) => product.id === finishedGoodId);
  const transferableQuantity = selectedFinishedGood?.stock?.find((entry) => entry.bucket === "BUYING")?.quantity ?? 0;

  async function submitAdjustment(event) {
    event.preventDefault();
    const change = Number(quantityChange);
    const changeText = quantityChange.trim();
    if (saving) return;
    if (!/^-?\d{1,12}(?:\.\d{1,6})?$/.test(changeText) || !Number.isFinite(change) || change === 0) {
      setError("Enter a non-zero quantity with at most six decimal places.");
      return;
    }
    if (changeText.startsWith("-") && !isAtLeastQuantity(selectedStock, changeText.slice(1))) {
      setError("This adjustment would result in negative stock.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.post("/inventory/adjustments", {
        productId,
        bucket: "BUYING",
        quantityChange: quantityChange.trim(),
        reason: reason.trim(),
      });
      setQuantityChange("");
      setReason("");
      const refreshed = await loadInventory();
      setSuccess(refreshed ? "Buying inventory adjustment recorded." : "Adjustment recorded, but inventory could not be refreshed.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function submitTransfer(event) {
    event.preventDefault();
    const quantity = Number(transferQuantity);
    if (saving) return;
    if (!/^\d{1,12}(?:\.\d{1,6})?$/.test(transferQuantity.trim()) || !Number.isFinite(quantity) || quantity <= 0) {
      setError("Enter a positive transfer quantity with at most six decimal places.");
      return;
    }
    if (!isAtLeastQuantity(transferableQuantity, transferQuantity)) {
      setError("Transfer quantity exceeds available buying stock.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.post("/inventory/transfers/buying-to-warehouse", {
        productId: finishedGoodId,
        quantity: transferQuantity,
      });
      setTransferQuantity("");
      await loadInventory();
      setSuccess("Finished-good stock transferred to selling warehouse.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  const columns = [
    { key: "name", label: "Buying product" },
    { key: "classification", label: "Classification" },
    { key: "sku", label: "SKU" },
    { key: "unit", label: "Unit", render: (product) => product.unit || "Not set" },
    { key: "buyingQuantity", label: "Buying inventory quantity" },
    {
      key: "latestRecordedCost",
      label: "Latest known purchase cost",
      render: (product) => product.latestRecordedCost
        ? `${formatMoney(product.latestRecordedCost.unitCost)} / ${product.latestRecordedCost.unit}`
        : "Unavailable",
    },
    {
      key: "costSource",
      label: "Cost source",
      render: (product) => product.latestRecordedCost
        ? `${product.latestRecordedCost.vendorName}, ${formatDate(product.latestRecordedCost.purchaseDate)}`
        : "No compatible unit snapshot",
    },
  ];

  return (
    <>
      <PageTitle title="Buying inventory" subtitle="Purchased raw materials and ready-made finished goods, with recorded purchase costs" />
      <Alert message={error} />
      <Alert kind="success" message={success} />
      {isOwner && (
        <section className="panel">
          <div className="section-heading"><h2>Adjust buying inventory</h2></div>
          <form className="form-grid" onSubmit={submitAdjustment}>
            <Field label="Buying product" required>
              <select value={productId} onChange={(event) => setProductId(event.target.value)} required>
                <option value="">Select buying product</option>
                {materials.map((product) => <option key={product.id} value={product.id}>{product.name}{product.sku ? ` (${product.sku})` : ""}</option>)}
              </select>
            </Field>
            <Field label="Quantity change" required>
              <input type="number" step="0.000001" value={quantityChange} onChange={(event) => setQuantityChange(event.target.value)} required />
            </Field>
            <Field label="Reason" required>
              <input value={reason} onChange={(event) => setReason(event.target.value)} required />
            </Field>
            <div className="form-actions">
              <button className="button button-primary" disabled={saving || !productId}>{saving ? "Submitting..." : "Adjust stock"}</button>
              <span className="form-hint">Current buying quantity: {selectedStock}</span>
            </div>
          </form>
        </section>
      )}
      {isOwner && (
        <section className="panel">
          <div className="section-heading"><h2>Transfer finished goods to selling warehouse</h2></div>
          <form className="form-grid" onSubmit={submitTransfer}>
            <Field label="Finished good" required>
              <select value={finishedGoodId} onChange={(event) => setFinishedGoodId(event.target.value)} required>
                <option value="">Select finished good</option>
                {finishedGoods.map((product) => <option key={product.id} value={product.id}>{product.name}{product.sku ? ` (${product.sku})` : ""}</option>)}
              </select>
            </Field>
            <Field label="Quantity to transfer" required>
              <input type="number" min="0.000001" step="0.000001" value={transferQuantity} onChange={(event) => setTransferQuantity(event.target.value)} required />
            </Field>
            <div className="form-actions">
              <button className="button button-primary" disabled={saving || !finishedGoodId}>{saving ? "Submitting..." : "Transfer to selling warehouse"}</button>
              <span className="form-hint">Available buying quantity: {transferableQuantity}. The transfer preserves total tracked quantity.</span>
            </div>
            {!finishedGoods.length && <p className="form-hint full-width">Create a finished-good buying product before transferring stock.</p>}
          </form>
        </section>
      )}
      <section className="panel">
        <div className="section-heading">
          <h2>Buying stock</h2>
          <button className="button button-small" onClick={loadInventory} disabled={loading}>Refresh</button>
        </div>
        {loading
          ? <Loading label="Loading buying stock and purchase snapshots..." />
          : <DataTable columns={columns} rows={materials} emptyMessage="No classified buying products." />}
        {!loading && materials.length > 0 && (
          <p className="form-hint">Known cost is the latest purchase-line unit cost with a unit matching the product’s current unit. Historical lines without a compatible unit are not used. Quantities shown are buying stock only.</p>
        )}
      </section>
    </>
  );
}
