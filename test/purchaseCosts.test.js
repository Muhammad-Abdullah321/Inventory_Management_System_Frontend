import test from "node:test";
import assert from "node:assert/strict";
import { latestCompatiblePurchaseCost } from "../src/utils/purchaseCosts.js";

const product = { id: "finished-1", unit: "PIECE" };
const purchase = (purchaseDate, items) => ({
  purchaseDate,
  vendor: { name: "Vendor" },
  items,
});
const line = (overrides = {}) => ({
  productId: product.id,
  unit: "PIECE",
  quantity: "2.5",
  unitCost: "4.00",
  totalCost: "10.00",
  ...overrides,
});

test("purchase cost selects the latest valid exact-unit purchase line", () => {
  const result = latestCompatiblePurchaseCost(product, [
    purchase("2026-01-01", [line({ unitCost: "3.00", totalCost: "7.50" })]),
    purchase("2026-02-01", [line({ unitCost: "5.00", totalCost: "12.50" })]),
  ]);

  assert.equal(result.cost.unitCost, "5.00");
  assert.equal(result.cost.unit, "PIECE");
  assert.equal(result.cost.purchaseDate, "2026-02-01");
  assert.equal(result.unavailableReason, null);
});

test("purchase cost rejects unit mismatches and explains missing history", () => {
  assert.deepEqual(
    latestCompatiblePurchaseCost(product, [purchase("2026-01-01", [line({ unit: "PAIR" })])]),
    { cost: null, unavailableReason: "Historical purchase unit is incompatible" }
  );
  assert.deepEqual(
    latestCompatiblePurchaseCost(product, []),
    { cost: null, unavailableReason: "No purchase history" }
  );
});

test("zero-cost purchase lines remain valid while malformed costs are skipped", () => {
  const result = latestCompatiblePurchaseCost(product, [
    purchase("2026-02-01", [line({ unitCost: "0.00", totalCost: "0.00" })]),
  ]);

  assert.equal(result.cost.unitCost, "0.00");
  assert.equal(result.unavailableReason, null);

  const invalid = latestCompatiblePurchaseCost(product, [
    purchase("2026-02-01", [line({ unitCost: "-1.00" })]),
  ]);
  assert.deepEqual(invalid, {
    cost: null,
    unavailableReason: "Purchase cost or quantity is invalid",
  });
});

test("purchase cost falls back to an older valid compatible line", () => {
  const result = latestCompatiblePurchaseCost(product, [
    purchase("2026-02-01", [line({ unitCost: "invalid" })]),
    purchase("2026-01-01", [line({ unitCost: "3.00", totalCost: "7.50" })]),
  ]);

  assert.equal(result.cost.unitCost, "3.00");
  assert.equal(result.cost.purchaseDate, "2026-01-01");
});
