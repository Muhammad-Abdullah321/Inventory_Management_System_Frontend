import test from "node:test";
import assert from "node:assert/strict";
import { filterProductsByClassification } from "../src/utils/inventoryProducts.js";

test("inventory classification filters keep raw materials and all finished goods separate", () => {
  const products = [
    { id: "raw", classification: "RAW_MATERIAL" },
    { id: "purchased-finished", classification: "FINISHED_GOOD", isSellingConfigured: false },
    { id: "selling-finished", classification: "FINISHED_GOOD", isSellingConfigured: true },
    { id: "unresolved", classification: "UNRESOLVED" },
  ];

  assert.deepEqual(
    filterProductsByClassification(products, "RAW_MATERIAL").map(({ id }) => id),
    ["raw"]
  );
  assert.deepEqual(
    filterProductsByClassification(products, "FINISHED_GOOD").map(({ id }) => id),
    ["purchased-finished", "selling-finished"]
  );
});
