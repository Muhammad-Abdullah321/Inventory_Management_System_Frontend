import { useCallback, useEffect, useState } from "react";
import api, { getErrorMessage } from "../api/client.js";
import { Alert, DataTable, formatDate, formatMoney, Loading, PageTitle } from "../components/Common.jsx";
import { Button } from "../components/ui/button.jsx";
import { filterProductsByClassification } from "../utils/inventoryProducts.js";
import { latestCompatiblePurchaseCost } from "../utils/purchaseCosts.js";

const getStockQuantity = (product, bucket) =>
  product.stock?.find((entry) => entry.bucket === bucket)?.quantity ?? 0;

export default function FinishedGoodsInventory() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadInventory = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [productResponse, purchaseResponse, manufacturingResponse] = await Promise.all([
        api.get("/products"),
        api.get("/inventoryPurchases"),
        api.get("/manufacturing/cost-summary"),
      ]);
      const manufacturingCosts = new Map(
        manufacturingResponse.data.data.map((summary) => [summary.productId, summary])
      );
      const finishedGoods = filterProductsByClassification(productResponse.data.data, "FINISHED_GOOD")
        .map((product) => ({
          ...product,
          purchaseCost: latestCompatiblePurchaseCost(product, purchaseResponse.data.data),
          manufacturingCost: manufacturingCosts.get(product.id) ?? null,
        }));
      setProducts(finishedGoods);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadInventory(); }, [loadInventory]);

  const columns = [
    { key: "name", label: "Finished good" },
    { key: "sku", label: "SKU" },
    { key: "unit", label: "Unit", render: (product) => product.unit || "Not set" },
    { key: "buying", label: "Buying stock", align: "right", render: (product) => getStockQuantity(product, "BUYING") },
    { key: "warehouse", label: "Warehouse stock", align: "right", render: (product) => getStockQuantity(product, "WAREHOUSE") },
    {
      key: "shopifyListed",
      label: "Shopify-listed stock",
      align: "right",
      render: (product) => product.shopifyInventorySyncedAt
        ? getStockQuantity(product, "SHOPIFY_LISTED")
        : "Unknown",
    },
    {
      key: "purchaseCost",
      label: "Latest compatible purchase cost / unit",
      align: "right",
      render: (product) => product.purchaseCost.cost
        ? `${formatMoney(product.purchaseCost.cost.unitCost)} / ${product.purchaseCost.cost.unit}`
        : "Unavailable",
    },
    {
      key: "purchaseSource",
      label: "Purchase cost source",
      render: (product) => product.purchaseCost.cost
        ? `Purchase · ${product.purchaseCost.cost.vendorName}, ${formatDate(product.purchaseCost.cost.purchaseDate)}`
        : product.purchaseCost.unavailableReason,
    },
    {
      key: "manufacturingCost",
      label: "Manufacturing materials cost / unit",
      align: "right",
      render: (product) => product.manufacturingCost
        ? `${formatMoney(product.manufacturingCost.perUnitMaterialCost)} / ${product.manufacturingCost.outputUnit}${product.manufacturingCost.perUnitMaterialCostRounded ? " (rounded)" : ""}`
        : "Unavailable",
    },
    {
      key: "manufacturingSource",
      label: "Manufacturing cost source",
      render: (product) => product.manufacturingCost
        ? `Materials only · ${formatDate(product.manufacturingCost.runDate)}`
        : "No complete compatible materials-cost run",
    },
  ];

  return (
    <div className="inventory-page finished-goods-inventory-page">
      <PageTitle
        title="Finished goods inventory"
        subtitle="Finished-good stock with purchase and manufacturing materials costs shown separately."
      />
      <Alert message={error} />
      <section className="panel inventory-stock-panel">
        <div className="section-heading">
          <h2>Finished goods stock and costs</h2>
          <Button type="button" variant="outline" size="sm" onClick={loadInventory} disabled={loading}>Refresh</Button>
        </div>
        {loading
          ? <Loading label="Loading finished goods inventory..." />
          : <DataTable columns={columns} rows={products} emptyMessage="No finished goods found." />}
        {!loading && products.length > 0 && (
          <p className="form-hint">
            Purchase cost uses a recorded purchase line with a unit matching the current product unit. Manufacturing cost is materials only; it excludes labor and overhead. The two costs are separate and are not combined.
          </p>
        )}
      </section>
    </div>
  );
}
