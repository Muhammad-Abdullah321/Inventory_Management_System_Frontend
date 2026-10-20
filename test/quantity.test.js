import test from "node:test";
import assert from "node:assert/strict";
import { sellingInventoryTotal } from "../src/utils/quantity.js";

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

