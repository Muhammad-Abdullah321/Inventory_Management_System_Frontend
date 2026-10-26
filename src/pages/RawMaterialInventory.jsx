import { useCallback, useEffect, useState } from "react";
import api, { getErrorMessage } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { Alert, DataTable, Field, formatDate, formatMoney, Loading, PageTitle } from "../components/Common.jsx";
import { filterProductsByClassification } from "../utils/inventoryProducts.js";
import { latestCompatiblePurchaseCost } from "../utils/purchaseCosts.js";
import { isAtLeastQuantity } from "../utils/quantity.js";

export default function RawMaterialInventory() {
  const { isOwner } = useAuth();
  const [materials, setMaterials] = useState([]);
  const [productId, setProductId] = useState("");
  const [finishedGoodId, setFinishedGoodId] = useState("");
  const [transferQuantity, setTransferQuantity] = useState("");
  const [configureForSelling, setConfigureForSelling] = useState(false);
  const [sellingSku, setSellingSku] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
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
      const rows = products.map((product) => ({
        ...product,
        buyingQuantity: product.stock?.find((entry) => entry.bucket === "BUYING")?.quantity ?? 0,
        purchaseCost: latestCompatiblePurchaseCost(product, purchaseResponse.data.data),
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
  const rawMaterials = filterProductsByClassification(materials, "RAW_MATERIAL");
  const finishedGoods = filterProductsByClassification(materials, "FINISHED_GOOD");
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
    if (configureForSelling) {
      if (selectedFinishedGood?.isSellingConfigured) {
        setError("This product is already configured for selling; its SKU and price will be preserved.");
        return;
      }
      if (!sellingSku.trim()) {
        setError("Enter a nonblank SKU to configure this product for selling.");
        return;
      }
      if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(sellingPrice.trim())) {
        setError("Enter a valid nonnegative selling price with at most two decimal places.");
        return;
      }
      if (!selectedFinishedGood?.unit?.trim()) {
        setError("A valid product unit is required to configure this product for selling.");
        return;
      }
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.post("/inventory/transfers/buying-to-warehouse", {
        productId: finishedGoodId,
        quantity: transferQuantity,
        configureForSelling,
        ...(configureForSelling
          ? { sku: sellingSku.trim(), sellingPrice: sellingPrice.trim() }
          : {}),
      });
      setTransferQuantity("");
      setConfigureForSelling(false);
      setSellingSku("");
      setSellingPrice("");
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
    { key: "buyingQuantity", label: "Buying inventory quantity", align: "right" },
    {
      key: "purchaseCost",
      label: "Latest known purchase cost",
      align: "right",
      render: (product) => product.purchaseCost.cost
        ? `${formatMoney(product.purchaseCost.cost.unitCost)} / ${product.purchaseCost.cost.unit}`
        : "Unavailable",
    },
    {
      key: "costSource",
      label: "Cost source",
      render: (product) => product.purchaseCost.cost
        ? `Purchase · ${product.purchaseCost.cost.vendorName}, ${formatDate(product.purchaseCost.cost.purchaseDate)}`
        : product.purchaseCost.unavailableReason,
    },
  ];

  return (
    <div className="inventory-page buying-inventory-page">
      <PageTitle title="Raw material inventory" subtitle="Raw material BUYING stock and compatible recorded purchase costs" />
      <Alert message={error} />
      <Alert kind="success" message={success} />
      {isOwner && (
        <section className="panel inventory-workflow-panel inventory-adjustment-panel">
          <div className="section-heading">
            <div><h2>Adjust buying inventory</h2><p className="inventory-section-copy">Record a reason for every manual buying-stock correction.</p></div>
          </div>
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
        <section className="panel inventory-workflow-panel buying-transfer-panel">
          <div className="section-heading">
            <div><h2>Transfer finished goods to selling warehouse</h2><p className="inventory-section-copy">Move finished goods from buying stock into warehouse stock. Total tracked quantity is preserved.</p></div>
          </div>
          <form className="form-grid" onSubmit={submitTransfer}>
            <Field label="Finished good" required>
              <select value={finishedGoodId} onChange={(event) => {
                setFinishedGoodId(event.target.value);
                setConfigureForSelling(false);
                setSellingSku("");
                setSellingPrice("");
              }} required>
                <option value="">Select finished good</option>
                {finishedGoods.map((product) => <option key={product.id} value={product.id}>{product.name}{product.sku ? ` (${product.sku})` : ""}</option>)}
              </select>
            </Field>
            <Field label="Quantity to transfer" required>
              <input type="number" min="0.000001" step="0.000001" value={transferQuantity} onChange={(event) => setTransferQuantity(event.target.value)} required />
            </Field>
            {selectedFinishedGood?.isSellingConfigured ? (
              <p className="form-hint full-width">
                Already configured for selling as SKU {selectedFinishedGood.sku} at {formatMoney(selectedFinishedGood.sellingPrice)}. This transfer will preserve that configuration.
              </p>
            ) : (
              <>
                <fieldset className="full-width">
                  <legend>Selling configuration</legend>
                  <label>
                    <input
                      type="radio"
                      name="transfer-selling-configuration"
                      checked={configureForSelling}
                      onChange={() => setConfigureForSelling(true)}
                    />
                    Configure for selling during this transfer
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="transfer-selling-configuration"
                      checked={!configureForSelling}
                      onChange={() => setConfigureForSelling(false)}
                    />
                    Transfer stock only
                  </label>
                </fieldset>
                {configureForSelling && (
                  <>
                    <Field label="Selling SKU" required>
                      <input value={sellingSku} onChange={(event) => setSellingSku(event.target.value)} required />
                    </Field>
                    <Field label="Selling price" required>
                      <input type="number" min="0" step="0.01" value={sellingPrice} onChange={(event) => setSellingPrice(event.target.value)} required />
                    </Field>
                  </>
                )}
              </>
            )}
            <div className="form-actions">
              <button className="button button-primary" disabled={saving || !finishedGoodId}>{saving ? "Submitting..." : "Transfer to selling warehouse"}</button>
              <span className="form-hint">Source: buying stock ({transferableQuantity} available). Destination: warehouse. The transfer preserves total tracked quantity.</span>
            </div>
            {!finishedGoods.length && <p className="form-hint full-width">Create a finished-good buying product before transferring stock.</p>}
          </form>
        </section>
      )}
      <section className="panel inventory-stock-panel">
        <div className="section-heading">
          <h2>Buying stock</h2>
          <button className="button button-small" onClick={loadInventory} disabled={loading}>Refresh</button>
        </div>
        {loading
          ? <Loading label="Loading buying stock and purchase snapshots..." />
          : <DataTable columns={columns} rows={rawMaterials} emptyMessage="No raw materials found." />}
        {!loading && rawMaterials.length > 0 && (
          <p className="form-hint">Purchase cost uses the latest valid purchase line whose recorded unit matches the product’s current unit. Historical lines without a compatible unit are not used. Quantities shown are BUYING stock only.</p>
        )}
      </section>
    </div>
  );
}
