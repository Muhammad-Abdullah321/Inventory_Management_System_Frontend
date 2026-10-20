import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api, { getErrorMessage } from "../api/client.js";
import { Alert, DataTable, Field, formatMoney, Loading, PageTitle } from "../components/Common.jsx";
import { isAtLeastQuantity } from "../utils/quantity.js";

const QUANTITY_SCALE = 1_000_000n;
const parseQuantityMicros = (value) => {
  const text = String(value ?? "");
  if (!/^\d{1,12}(?:\.\d{1,6})?$/.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  const result = BigInt(whole) * QUANTITY_SCALE + BigInt(fraction.padEnd(6, "0") || "0");
  return result > 0n ? result : null;
};
const parseMoneyCents = (value) => {
  const text = String(value ?? "");
  if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  const result = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0") || "0");
  return result > 0n ? result : null;
};
const roundHalfUp = (numerator, denominator) =>
  numerator / denominator + (numerator % denominator * 2n >= denominator ? 1n : 0n);
const isReliablePurchaseItem = (item) => {
  const quantityText = String(item.quantity ?? "");
  if (!/^\d{1,12}(?:\.\d{1,6})?$/.test(quantityText)) return false;
  const [whole, fraction = ""] = quantityText.split(".");
  const quantityMicros = BigInt(whole) * QUANTITY_SCALE + BigInt(fraction.padEnd(6, "0") || "0");
  if (quantityMicros <= 0n) return false;
  const totalCents = parseMoneyCents(item.totalCost);
  const unitCostCents = parseMoneyCents(item.unitCost);
  return totalCents !== null &&
    unitCostCents !== null &&
    roundHalfUp(totalCents * QUANTITY_SCALE, quantityMicros) === unitCostCents;
};
const centsString = (cents) =>
  `${cents / 100n}.${(cents % 100n).toString().padStart(2, "0")}`;
const quantityString = (micros) => {
  const whole = micros / QUANTITY_SCALE;
  const fraction = (micros % QUANTITY_SCALE).toString().padStart(6, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
};

function emptyMaterial() {
  return { productId: "", inputMode: "QUANTITY", quantity: "", cost: "", purchaseItemId: "" };
}

export default function Manufacturing() {
  const [products, setProducts] = useState([]);
  const [purchaseItems, setPurchaseItems] = useState([]);
  const [finishedProduct, setFinishedProduct] = useState({
    name: "",
    sku: "",
    sellingPrice: "",
    unit: "",
  });
  const [outputQuantity, setOutputQuantity] = useState("");
  const [materials, setMaterials] = useState([emptyMaterial()]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const submitLock = useRef(false);

  const loadInputs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [productResponse, purchaseResponse] = await Promise.all([
        api.get("/products"),
        api.get("/inventoryPurchases"),
      ]);
      setProducts(productResponse.data.data);
      setPurchaseItems(purchaseResponse.data.data.flatMap((purchase) =>
        (purchase.items || []).map((item) => ({
          ...item,
          purchaseDate: purchase.purchaseDate,
          vendorName: purchase.vendor?.name || "Vendor",
        }))
      ));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadInputs(); }, [loadInputs]);

  const rawMaterials = products.filter((product) =>
    product.classification === "RAW_MATERIAL" && product.unit
  );
  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);

  function updateMaterial(index, key, value) {
    setMaterials((current) => current.map((line, lineIndex) => {
      if (lineIndex !== index) return line;
      const updated = { ...line, [key]: value };
      if (key === "productId") updated.purchaseItemId = "";
      if (key === "inputMode") {
        updated.quantity = "";
        updated.cost = "";
      }
      return updated;
    }));
  }

  const linePreviews = materials.map((line) => {
    const product = productById.get(line.productId);
    const source = purchaseItems.find((item) =>
      item.id === line.purchaseItemId &&
      item.productId === line.productId &&
      item.unit === product?.unit &&
      isReliablePurchaseItem(item)
    );
    const unitCostCents = source ? parseMoneyCents(source.unitCost) : null;
    let quantityMicros = null;
    let costCents = null;
    let rounded = false;

    if (line.inputMode === "QUANTITY") {
      quantityMicros = parseQuantityMicros(line.quantity);
      if (quantityMicros !== null && unitCostCents !== null) {
        const exactNumerator = quantityMicros * unitCostCents;
        costCents = roundHalfUp(exactNumerator, QUANTITY_SCALE);
        rounded = exactNumerator % QUANTITY_SCALE !== 0n;
      }
    } else {
      costCents = parseMoneyCents(line.cost);
      if (costCents !== null && unitCostCents !== null) {
        const exactNumerator = costCents * QUANTITY_SCALE;
        quantityMicros = roundHalfUp(exactNumerator, unitCostCents);
        rounded = exactNumerator % unitCostCents !== 0n;
      }
    }
    return { line, product, source, quantityMicros, costCents, rounded };
  });
  const unresolvedLineCount = linePreviews.filter((preview) => preview.costCents === null).length;
  const knownMaterialCostCents = linePreviews.reduce(
    (sum, preview) => sum + (preview.costCents ?? 0n),
    0n
  );
  const hasKnownMaterialCost = linePreviews.some((preview) => preview.costCents !== null);

  function validateForm() {
    const outputMicros = parseQuantityMicros(outputQuantity);
    if (!finishedProduct.name.trim()) {
      return "Enter a finished product name.";
    }
    if (!finishedProduct.sku.trim()) {
      return "Enter a non-empty finished product SKU.";
    }
    if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(finishedProduct.sellingPrice.trim())) {
      return "Enter a valid selling price with at most two decimal places.";
    }
    if (!finishedProduct.unit.trim()) {
      return "Enter the finished product unit.";
    }
    if (outputMicros === null) {
      return "Enter a positive output quantity (up to six decimal places).";
    }
    if (!materials.length || materials.some((line) => !line.productId)) {
      return "Select a raw material for every material line.";
    }
    for (const { line, product, source, quantityMicros, costCents } of linePreviews) {
      if (!product || product.classification !== "RAW_MATERIAL" || !product.unit) {
        return "Each material must be a classified raw material with a unit configured.";
      }
      if (line.inputMode === "QUANTITY" && quantityMicros === null) {
        return "Enter a positive material quantity with at most six decimal places for each quantity-mode line.";
      }
      if (line.inputMode === "COST" && costCents === null) {
        return "Enter a positive material cost with at most two decimal places for each cost-mode line.";
      }
      if (line.inputMode === "COST" && !source) {
        return `Cost mode for ${product.name} requires a compatible purchase-line cost source.`;
      }
      if (!isAtLeastQuantity(
        product.stock?.find((entry) => entry.bucket === "BUYING")?.quantity ?? 0,
        quantityString(quantityMicros ?? 0n)
      )) {
        return `Insufficient buying inventory for ${product.name}.`;
      }
    }
    const demandedByProduct = new Map();
    for (const preview of linePreviews) {
      if (preview.quantityMicros === null) continue;
      const total = (demandedByProduct.get(preview.line.productId) || 0n) + preview.quantityMicros;
      demandedByProduct.set(preview.line.productId, total);
    }
    for (const [productId, demandMicros] of demandedByProduct) {
      const product = productById.get(productId);
      if (!isAtLeastQuantity(
        product.stock?.find((entry) => entry.bucket === "BUYING")?.quantity ?? 0,
        quantityString(demandMicros)
      )) {
        return `Combined material lines exceed buying inventory for ${product.name}.`;
      }
    }
    return "";
  }

  async function submitRun(event) {
    event.preventDefault();
    if (submitLock.current || saving) return;
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    submitLock.current = true;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await api.post("/manufacturing/runs", {
        finishedProduct: {
          name: finishedProduct.name.trim(),
          sku: finishedProduct.sku.trim(),
          sellingPrice: finishedProduct.sellingPrice.trim(),
          unit: finishedProduct.unit.trim(),
        },
        outputQuantity,
        materials: materials.map((line) => ({
          productId: line.productId,
          ...(line.inputMode === "QUANTITY" ? { quantity: line.quantity } : { cost: line.cost }),
          ...(line.purchaseItemId ? { purchaseItemId: line.purchaseItemId } : {}),
        })),
      });
      const calculation = response.data.data.calculation;
      setSuccess(calculation?.costingComplete
        ? "Manufacturing run completed. Costs shown are material-only."
        : "Manufacturing run completed with incomplete material costing; unknown costs remain unresolved.");
      setOutputQuantity("");
      setMaterials([emptyMaterial()]);
      await loadInputs();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      submitLock.current = false;
      setSaving(false);
    }
  }

  const previewColumns = [
    { key: "material", label: "Material", render: (row) => row.product?.name || "Select a product" },
    { key: "quantity", label: "Calculated / consumed quantity", render: (row) => row.quantityMicros === null ? "Unknown" : `${quantityString(row.quantityMicros)} ${row.product?.unit || ""}${row.line.inputMode === "COST" ? " (estimated)" : ""}` },
    { key: "cost", label: "Known material cost", render: (row) => row.costCents === null ? "Unresolved" : `${formatMoney(centsString(row.costCents))}${row.rounded ? " (rounded)" : ""}` },
  ];

  return (
    <>
      <PageTitle title="Manufacturing" subtitle="Create or reuse a finished product by SKU, then record a completed run" />
      <Alert message={error} />
      <Alert kind="success" message={success} />
      {loading ? <Loading label="Loading products and purchase cost sources..." /> : (
        <section className="panel">
          <div className="section-heading"><h2>Complete manufacturing run</h2></div>
          <form className="form-stack" onSubmit={submitRun}>
            <div className="form-grid">
              <Field label="New finished product name" required>
                <input value={finishedProduct.name} onChange={(event) => setFinishedProduct({ ...finishedProduct, name: event.target.value })} required />
              </Field>
              <Field label="SKU" required>
                <input value={finishedProduct.sku} onChange={(event) => setFinishedProduct({ ...finishedProduct, sku: event.target.value })} required />
              </Field>
              <Field label="Selling price" required>
                <input type="number" min="0" step="0.01" value={finishedProduct.sellingPrice} onChange={(event) => setFinishedProduct({ ...finishedProduct, sellingPrice: event.target.value })} required />
              </Field>
              <Field label="Finished product unit" required>
                <input placeholder="e.g. piece, box" value={finishedProduct.unit} onChange={(event) => setFinishedProduct({ ...finishedProduct, unit: event.target.value })} required />
              </Field>
              <Field label={`Production quantity${finishedProduct.unit.trim() ? ` (${finishedProduct.unit.trim()})` : ""}`} required>
                <input type="number" min="0.000001" step="0.000001" value={outputQuantity} onChange={(event) => setOutputQuantity(event.target.value)} required />
              </Field>
            </div>
            <h3 className="subheading">Raw material lines</h3>
            {materials.map((line, index) => {
              const material = productById.get(line.productId);
              const matchingSources = purchaseItems.filter((item) =>
                item.productId === line.productId &&
                item.unit === material?.unit &&
                isReliablePurchaseItem(item)
              );
              return (
                <div className="line-item" key={index}>
                  <Field label="Raw material" required>
                    <select value={line.productId} onChange={(event) => updateMaterial(index, "productId", event.target.value)} required>
                      <option value="">Select raw material</option>
                      {rawMaterials.map((product) => <option key={product.id} value={product.id}>{product.name}{product.sku ? ` (${product.sku})` : ""} — {product.unit}</option>)}
                    </select>
                  </Field>
                  <Field label="Input mode" required>
                    <select value={line.inputMode} onChange={(event) => updateMaterial(index, "inputMode", event.target.value)}>
                      <option value="QUANTITY">Enter quantity</option>
                      <option value="COST">Enter cost</option>
                    </select>
                  </Field>
                  {line.inputMode === "QUANTITY"
                    ? <Field label={`Quantity${material?.unit ? ` (${material.unit})` : ""}`} required><input type="number" min="0.000001" step="0.000001" value={line.quantity} onChange={(event) => updateMaterial(index, "quantity", event.target.value)} required /></Field>
                    : <Field label="Intended material cost" required><input type="number" min="0.01" step="0.01" value={line.cost} onChange={(event) => updateMaterial(index, "cost", event.target.value)} required /></Field>}
                  <Field label="Recorded purchase cost source" required={line.inputMode === "COST"}>
                    <select value={line.purchaseItemId} onChange={(event) => updateMaterial(index, "purchaseItemId", event.target.value)} required={line.inputMode === "COST"}>
                      <option value="">No cost source (cost unresolved)</option>
                      {matchingSources.map((item) => <option key={item.id} value={item.id}>{item.vendorName}, {new Date(item.purchaseDate).toLocaleDateString()} — {item.quantity} {item.unit}, {formatMoney(item.totalCost)} total, {formatMoney(item.unitCost)}/{item.unit}</option>)}
                    </select>
                  </Field>
                  <button type="button" className="button button-small remove-line" disabled={materials.length === 1 || saving} onClick={() => setMaterials((current) => current.filter((_, lineIndex) => lineIndex !== index))}>Remove</button>
                </div>
              );
            })}
            <div className="form-actions">
              <button type="button" className="button" disabled={saving} onClick={() => setMaterials((current) => [...current, emptyMaterial()])}>Add material</button>
              <button className="button button-primary" disabled={saving || loading || !rawMaterials.length}>{saving ? "Posting run..." : "Complete run"}</button>
            </div>
            {!rawMaterials.length && <p className="form-hint">A raw material with a configured unit is required.</p>}
          </form>
        </section>
      )}
      {!loading && materials.length > 0 && (
        <section className="panel">
          <div className="section-heading"><h2>Pre-submission calculation</h2><span>Server validates and recalculates on submission</span></div>
          <DataTable columns={previewColumns} rows={linePreviews} emptyMessage="Add a selected material with an input value to preview calculations." />
          <div className="purchase-summary">
            <span>Known material-cost subtotal<strong>{hasKnownMaterialCost ? formatMoney(centsString(knownMaterialCostCents)) : "No known costs"}</strong></span>
            {unresolvedLineCount > 0
              ? <span>Costing status<strong>Incomplete — {unresolvedLineCount} unresolved line(s); no definitive total</strong></span>
              : <span>Costing status<strong>Complete — materials only</strong></span>}
          </div>
          <p className="form-hint">A selected purchase line supplies the recorded unit-cost snapshot. Cost mode estimates the consumed quantity; quantity mode without a source leaves material cost unresolved. Labor and other costs are not included.</p>
        </section>
      )}
    </>
  );
}
