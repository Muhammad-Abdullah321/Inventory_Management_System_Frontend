import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api, { getErrorMessage } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { Alert, DataTable, Field, formatDate, Loading, PageTitle } from "../components/Common.jsx";
import { isAtLeastQuantity, sellingInventoryTotal } from "../utils/quantity.js";

const matchedColumns = [
  { key: "shopifyName", label: "Product" },
  { key: "sku", label: "SKU" },
  { key: "emsListedQuantity", label: "EMS listed" },
  { key: "shopifyAvailableQuantity", label: "Shopify available" },
];

const unmatchedShopifyColumns = [
  { key: "productTitle", label: "Shopify product" },
  { key: "sku", label: "SKU", render: (row) => row.sku?.trim() || "—" },
  { key: "reason", label: "Reason" },
];

const unmatchedEmsColumns = [
  { key: "name", label: "EMS product" },
  { key: "sku", label: "SKU" },
  { key: "reason", label: "Reason" },
];

const duplicateSkuColumns = [
  { key: "sku", label: "Duplicate SKU" },
  {
    key: "variantCount",
    label: "Variant count",
  },
  {
    key: "proposedTotalForReview",
    label: "Proposed total (review only)",
    render: (row) => row.proposedTotalForReview ?? "Unavailable",
  },
  {
    key: "warnings",
    label: "Warnings",
    render: (row) => row.warnings.length ? row.warnings.join(" ") : "None",
  },
  {
    key: "variants",
    label: "Individual Shopify entries",
    render: (row) => (
      <details>
        <summary>Review {row.variantCount} variants</summary>
        <ul>
          {row.variants.map((variant) => (
            <li key={variant.variantId}>
              <strong>{variant.productTitle}</strong> — {variant.variantTitle || "Untitled variant"}
              <br />
              Product ID: {variant.productId}
              <br />
              Variant ID: {variant.variantId}
              <br />
              Inventory item ID: {variant.inventoryItemId}
              <br />
              Available quantity: {variant.availableQuantity ?? "Unavailable"}
            </li>
          ))}
        </ul>
      </details>
    ),
  },
];

const missingInventoryColumns = [
  { key: "productTitle", label: "Shopify product" },
  { key: "sku", label: "SKU", render: (row) => row.sku?.trim() || "—" },
  { key: "reason", label: "Inventory warning" },
];

const mappingConflictColumns = [
  { key: "sku", label: "SKU" },
  { key: "reason", label: "Conflict" },
  { key: "existingInventoryItemId", label: "EMS item mapping", render: (row) => row.existingInventoryItemId || "—" },
  { key: "shopifyInventoryItemId", label: "Shopify item ID" },
];

const appliedColumns = [
  { key: "sku", label: "SKU" },
  { key: "previousListedQuantity", label: "Previous listed" },
  { key: "shopifyAvailableQuantity", label: "Shopify available" },
  { key: "quantityChange", label: "Change" },
];

export default function Inventory() {
  const { isOwner } = useAuth();
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [productId, setProductId] = useState("");
  const [bucket, setBucket] = useState("WAREHOUSE");
  const [quantityChange, setQuantityChange] = useState("");
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [transferProductId, setTransferProductId] = useState("");
  const [transferQuantity, setTransferQuantity] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [shopifyPreview, setShopifyPreview] = useState(null);
  const [shopifyResult, setShopifyResult] = useState(null);
  const [shopifyPhase, setShopifyPhase] = useState("");
  const shopifyRequestInProgress = useRef(false);

  const loadInventory = useCallback(async () => {
    setLoading(true);
    try {
      const [productResponse, movementResponse] = await Promise.all([
        api.get("/products"),
        api.get("/inventory/movements", { params: { limit: 100 } }),
      ]);
      setProducts(productResponse.data.data);
      setMovements(movementResponse.data.data);
      const finishedGoods = productResponse.data.data.filter((product) => product.classification === "FINISHED_GOOD");
      setProductId((current) => finishedGoods.some((product) => product.id === current)
        ? current
        : finishedGoods[0]?.id || "");
      setTransferProductId((current) => finishedGoods.some((product) => product.id === current)
        ? current
        : finishedGoods[0]?.id || "");
      setError("");
      return true;
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadInventory(); }, [loadInventory]);

  async function previewShopifySync() {
    if (shopifyRequestInProgress.current) return;
    shopifyRequestInProgress.current = true;
    setShopifyPhase("preview");
    setShopifyPreview(null);
    setShopifyResult(null);
    setError("");
    setSuccess("");
    try {
      const response = await api.post("/shopify/sync/preview");
      setShopifyPreview(response.data.data);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setShopifyPhase("");
      shopifyRequestInProgress.current = false;
    }
  }

  async function applyShopifySync() {
    if (shopifyRequestInProgress.current || !shopifyPreview) return;
    shopifyRequestInProgress.current = true;
    setShopifyPhase("apply");
    setError("");
    setSuccess("");
    try {
      const response = await api.post("/shopify/sync/apply");
      setShopifyResult(response.data.data);
      setShopifyPreview(null);
      const refreshed = await loadInventory();
      setSuccess(
        refreshed
          ? "Shopify sync completed and inventory was refreshed."
          : "Shopify sync completed, but inventory could not be refreshed. Use Refresh to try again."
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setShopifyPhase("");
      shopifyRequestInProgress.current = false;
    }
  }

  function discardShopifyPreview() {
    setShopifyPreview(null);
    setError("");
    setSuccess("");
  }

  const selectedProduct = useMemo(() => products.find((product) => product.id === productId), [products, productId]);
  const selectedQuantity = selectedProduct?.stock?.find((stock) => stock.bucket === bucket)?.quantity ?? 0;

  async function submitAdjustment(event) {
    event.preventDefault();
    const change = Number(quantityChange);
    const changeText = quantityChange.trim();
    if (!/^-?\d{1,12}(?:\.\d{1,6})?$/.test(changeText) || !Number.isFinite(change) || change === 0) {
      setError("Enter a non-zero quantity with at most six decimal places.");
      return;
    }
    if (changeText.startsWith("-") && !isAtLeastQuantity(selectedQuantity, changeText.slice(1))) {
      setError("This adjustment would result in negative stock.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.post("/inventory/adjustments", {
        productId,
        bucket,
        quantityChange: changeText,
        reason: reason.trim(),
        reference: reference.trim() || undefined,
      });
      setSuccess("Stock adjustment recorded.");
      setQuantityChange("");
      setReason("");
      setReference("");
      await loadInventory();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  const transferableProducts = products.filter((product) => product.classification === "FINISHED_GOOD");
  const sellingProducts = transferableProducts;
  const sellingProductIds = new Set(sellingProducts.map((product) => product.id));
  const transferProduct = transferableProducts.find((product) => product.id === transferProductId);
  const transferWarehouseQuantity = transferProduct?.stock?.find((stock) => stock.bucket === "WAREHOUSE")?.quantity ?? 0;

  async function submitTransfer(event) {
    event.preventDefault();
    if (saving) return;
    const quantity = Number(transferQuantity);
    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      setError("Transfer quantity must be a positive whole number.");
      return;
    }
    if (!isAtLeastQuantity(transferWarehouseQuantity, quantity)) {
      setError("Transfer quantity exceeds available warehouse stock.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.post("/inventory/transfers", { productId: transferProductId, quantity });
      setTransferQuantity("");
      const refreshed = await loadInventory();
      setSuccess(refreshed
        ? "Finished-good stock transferred to Shopify-listed allocation."
        : "Transfer completed, but inventory could not be refreshed.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  const stockColumns = [
    { key: "name", label: "Product" },
    { key: "sku", label: "SKU" },
    { key: "warehouse", label: "Warehouse / unlisted", render: (row) => row.stock?.find((entry) => entry.bucket === "WAREHOUSE")?.quantity ?? 0 },
    { key: "shopify", label: "Shopify listed", render: (row) => row.stock?.find((entry) => entry.bucket === "SHOPIFY_LISTED")?.quantity ?? 0 },
    { key: "total", label: "Total tracked", render: (row) => sellingInventoryTotal(row.stock) },
  ];
  const movementColumns = [
    { key: "createdAt", label: "Date", render: (row) => formatDate(row.createdAt) },
    { key: "product", label: "Product", render: (row) => row.product?.name || "—" },
    { key: "type", label: "Movement" },
    { key: "bucket", label: "Bucket" },
    { key: "quantityChange", label: "Quantity change" },
    { key: "reason", label: "Reason" },
    { key: "actor", label: "By", render: (row) => row.actor?.name || "System" },
  ];

  return (
    <>
      <PageTitle title="Selling inventory" subtitle="Finished-good stock allocated between warehouse (unlisted) and Shopify-listed buckets">
        {isOwner && (
          <button
            className="button button-primary"
            onClick={previewShopifySync}
            disabled={Boolean(shopifyPhase) || loading}
          >
            {shopifyPhase === "preview" ? "Loading preview..." : "Sync Shopify"}
          </button>
        )}
      </PageTitle>
      <Alert message={error} />
      <Alert kind="success" message={success} />
      {isOwner && shopifyPreview && (
        <section className="panel" aria-labelledby="shopify-preview-title">
          <div className="section-heading">
            <h2 id="shopify-preview-title">Shopify sync preview</h2>
            <button
              className="button button-small"
              onClick={discardShopifyPreview}
              disabled={Boolean(shopifyPhase)}
            >
              Discard preview
            </button>
          </div>
          <p className="form-hint">
            Review the exact-SKU matches and warnings before applying. Proposed duplicate-SKU totals are for review only; duplicate SKUs remain skipped during apply. Apply fetches current Shopify data again.
          </p>
          <div className="stat-grid">
            <article className="stat-card"><span>Matched products</span><strong>{shopifyPreview.summary.matchedProducts}</strong></article>
            <article className="stat-card"><span>Unmatched Shopify variants</span><strong>{shopifyPreview.summary.unmatchedShopifyVariants}</strong></article>
            <article className="stat-card"><span>EMS products without match</span><strong>{shopifyPreview.summary.emsProductsWithoutShopifyMatch}</strong></article>
            <article className="stat-card"><span>Duplicate / ambiguous SKUs</span><strong>{shopifyPreview.summary.duplicateAmbiguousSkus}</strong></article>
            <article className="stat-card"><span>Missing inventory data</span><strong>{shopifyPreview.summary.missingInventoryData}</strong></article>
            <article className="stat-card"><span>Mapping conflicts</span><strong>{shopifyPreview.summary.mappingConflicts}</strong></article>
          </div>
          <section>
            <div className="section-heading"><h3>Matched products</h3></div>
            <DataTable columns={matchedColumns} rows={shopifyPreview.matchedProducts} emptyMessage="No products are safe to match." />
          </section>
          <section>
            <div className="section-heading"><h3>Unmatched Shopify variants</h3></div>
            <DataTable columns={unmatchedShopifyColumns} rows={shopifyPreview.unmatchedShopifyVariants} emptyMessage="All Shopify variants have a unique EMS match." />
          </section>
          <section>
            <div className="section-heading"><h3>EMS products without a Shopify match</h3></div>
            <DataTable columns={unmatchedEmsColumns} rows={shopifyPreview.emsProductsWithoutShopifyMatch} emptyMessage="All EMS products have a unique Shopify match." />
          </section>
          <section>
            <div className="section-heading"><h3>Duplicate / ambiguous Shopify SKUs</h3></div>
            <DataTable columns={duplicateSkuColumns} rows={shopifyPreview.duplicateAmbiguousSkus} emptyMessage="No duplicate Shopify SKUs." />
          </section>
          <section>
            <div className="section-heading"><h3>Missing inventory data</h3></div>
            <DataTable columns={missingInventoryColumns} rows={shopifyPreview.missingInventoryData} emptyMessage="Inventory data is available for every Shopify variant." />
          </section>
          <section>
            <div className="section-heading"><h3>Shopify item mapping conflicts</h3></div>
            <DataTable columns={mappingConflictColumns} rows={shopifyPreview.mappingConflicts} emptyMessage="No item mapping conflicts." />
          </section>
          <Alert
            kind="error"
            message={shopifyPreview.missingInventoryData.length
              ? "Some inventory data is missing or invalid. The backend will refuse to apply a partial sync."
              : ""}
          />
          <div className="form-actions">
            <button
              className="button button-primary"
              onClick={applyShopifySync}
              disabled={Boolean(shopifyPhase) || loading}
            >
              {shopifyPhase === "apply" ? "Applying sync..." : "Confirm and apply sync"}
            </button>
            <span className="form-hint">Only safe SKU matches and Shopify-listed quantities will be updated.</span>
          </div>
        </section>
      )}
      {isOwner && shopifyResult && (
        <section className="panel" aria-labelledby="shopify-result-title">
          <div className="section-heading"><h2 id="shopify-result-title">Shopify sync result</h2></div>
          <p className="form-hint">
            Updated {shopifyResult.matchedProducts} products; recorded {shopifyResult.movementsRecorded} quantity movements.
            Skipped {shopifyResult.skipped.unmatchedShopifyVariants} unmatched Shopify variants,{" "}
            {shopifyResult.skipped.emsProductsWithoutShopifyMatch} unmatched EMS products,{" "}
            {shopifyResult.skipped.duplicateAmbiguousSkus} duplicate SKUs, and{" "}
            {shopifyResult.skipped.mappingConflicts} mapping conflicts.
          </p>
          <DataTable columns={appliedColumns} rows={shopifyResult.updatedProducts} emptyMessage="No matched products required synchronization." />
        </section>
      )}
      {isOwner && <section className="panel">
        <div className="section-heading"><h2>Transfer finished goods to Shopify allocation</h2></div>
        <form className="form-grid" onSubmit={submitTransfer}>
          <Field label="Finished good" required>
            <select value={transferProductId} onChange={(event) => setTransferProductId(event.target.value)} required>
              <option value="">Select finished good</option>
              {transferableProducts.map((product) => <option key={product.id} value={product.id}>{product.name} ({product.sku})</option>)}
            </select>
          </Field>
          <Field label="Quantity to transfer" required>
            <input type="number" min="1" step="1" value={transferQuantity} onChange={(event) => setTransferQuantity(event.target.value)} required />
          </Field>
          <div className="form-actions">
            <button className="button button-primary" disabled={saving || !transferProductId || Boolean(shopifyPhase)}>{saving ? "Submitting..." : "Transfer stock"}</button>
            <span className="form-hint">Available in warehouse: {transferWarehouseQuantity}. Transfers preserve total tracked stock.</span>
          </div>
          {transferableProducts.length === 0 && <p className="form-hint full-width">Classify a product as a finished good before transferring stock.</p>}
        </form>
      </section>}
      {isOwner && <section className="panel">
        <div className="section-heading"><h2>Adjust stock</h2></div>
        <form className="form-grid" onSubmit={submitAdjustment}>
          <Field label="Product" required>
            <select value={productId} onChange={(event) => setProductId(event.target.value)} required>
              {sellingProducts.map((product) => <option key={product.id} value={product.id}>{product.name} ({product.sku})</option>)}
            </select>
          </Field>
          <Field label="Stock bucket" required>
            <select value={bucket} onChange={(event) => setBucket(event.target.value)}>
              <option value="WAREHOUSE">Warehouse</option><option value="SHOPIFY_LISTED">Shopify listed</option>
            </select>
          </Field>
          <Field label="Quantity change" required>
            <input type="number" step="0.000001" value={quantityChange} onChange={(event) => setQuantityChange(event.target.value)} required />
          </Field>
          <Field label="Reason" required><input value={reason} onChange={(event) => setReason(event.target.value)} required /></Field>
          <Field label="Reference"><input value={reference} onChange={(event) => setReference(event.target.value)} /></Field>
          <div className="form-actions">
            <button className="button button-primary" disabled={saving || !productId || Boolean(shopifyPhase)}>{saving ? "Submitting..." : "Adjust stock"}</button>
            <span className="form-hint">Current {bucket === "WAREHOUSE" ? "warehouse" : "Shopify-listed"} quantity: {selectedQuantity}</span>
          </div>
        </form>
      </section>}
      <section className="panel">
        <div className="section-heading"><h2>Finished-good stock</h2><button className="button button-small" onClick={loadInventory} disabled={loading || Boolean(shopifyPhase)}>Refresh</button></div>
        <p className="form-hint">Warehouse is unlisted owned stock. Shopify-listed is an allocation of owned stock, not additional inventory.</p>
        {loading ? <Loading label="Loading finished-good inventory..." /> : <DataTable columns={stockColumns} rows={sellingProducts} emptyMessage="No products are classified as finished goods." />}
      </section>
      <section className="panel">
        <div className="section-heading"><h2>Movement history</h2><span>Most recent 100</span></div>
        {loading ? <Loading label="Loading movements..." /> : <DataTable columns={movementColumns} rows={movements.filter((movement) => sellingProductIds.has(movement.productId))} emptyMessage="No finished-good inventory movements yet." />}
      </section>
    </>
  );
}
