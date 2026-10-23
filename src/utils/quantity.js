const QUANTITY_SCALE = 1_000_000n;
const QUANTITY_PATTERN = /^(\d+)(?:\.(\d{1,6}))?$/;

function parseQuantityMicros(value) {
  const match = String(value).match(QUANTITY_PATTERN);
  if (!match) throw new TypeError("Stock quantity must have at most six decimal places");
  return BigInt(match[1]) * QUANTITY_SCALE +
    BigInt((match[2] || "").padEnd(6, "0") || "0");
}

export function addQuantities(...values) {
  const total = values.reduce((sum, value) => sum + parseQuantityMicros(value), 0n);
  const whole = total / QUANTITY_SCALE;
  const fraction = (total % QUANTITY_SCALE).toString().padStart(6, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

export function isAtLeastQuantity(balance, requested) {
  return parseQuantityMicros(balance) >= parseQuantityMicros(requested);
}

export function sellingInventoryTotal(stock = []) {
  return addQuantities(
    ...stock
      .filter((entry) => entry.bucket === "WAREHOUSE" || entry.bucket === "SHOPIFY_LISTED")
      .map((entry) => entry.quantity)
  );
}

export function sellingInventorySummary(stock = [], shopifyInventorySyncedAt) {
  const listedStock = stock.find((entry) => entry.bucket === "SHOPIFY_LISTED");
  const warehouseStock = stock.find((entry) => entry.bucket === "WAREHOUSE");
  const shopifyQuantityKnown = Boolean(shopifyInventorySyncedAt && listedStock);

  return {
    onShopify: shopifyQuantityKnown ? listedStock.quantity : null,
    inWarehouse: warehouseStock?.quantity ?? 0,
    totalAvailable: shopifyQuantityKnown ? sellingInventoryTotal(stock) : null,
  };
}
