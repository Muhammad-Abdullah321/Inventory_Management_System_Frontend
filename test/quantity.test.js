import test from "node:test";
import assert from "node:assert/strict";
import {
  sellingInventorySummary,
  sellingInventoryTotal,
} from "../src/utils/quantity.js";

test("selling inventory total includes warehouse and Shopify-listed stock, not buying stock", () => {
  assert.equal(
    sellingInventoryTotal([
      { bucket: "BUYING", quantity: "100.5" },
      { bucket: "WAREHOUSE", quantity: "3.125" },
      { bucket: "SHOPIFY_LISTED", quantity: "2.25" },
    ]),
    "5.375"
  );
});

test("selling inventory summary distinguishes unknown Shopify stock from synced zero", () => {
  const stock = [
    { bucket: "WAREHOUSE", quantity: "10" },
    { bucket: "SHOPIFY_LISTED", quantity: "0" },
  ];

  assert.deepEqual(sellingInventorySummary(stock, null), {
    onShopify: null,
    inWarehouse: "10",
    totalAvailable: null,
  });
  assert.deepEqual(sellingInventorySummary(stock, "2026-10-23T12:00:00.000Z"), {
    onShopify: "0",
    inWarehouse: "10",
    totalAvailable: "10",
  });
  assert.deepEqual(
    sellingInventorySummary(
      [{ bucket: "WAREHOUSE", quantity: "10" }],
      "2026-10-23T12:00:00.000Z"
    ),
    {
      onShopify: null,
      inWarehouse: "10",
      totalAvailable: null,
    }
  );
});
