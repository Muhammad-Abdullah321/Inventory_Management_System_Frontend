import test from "node:test";
import assert from "node:assert/strict";
import { getAvailableRawMaterials } from "../src/utils/manufacturing.js";

test("available raw materials require positive BUYING stock and a configured unit", () => {
  const products = [
    {
      id: "zero-stock",
      classification: "RAW_MATERIAL",
      unit: "kg",
      stock: [{ bucket: "BUYING", quantity: "0" }],
    },
    {
      id: "fractional-stock",
      classification: "RAW_MATERIAL",
      unit: "kg",
      stock: [
        { bucket: "WAREHOUSE", quantity: "4" },
        { bucket: "BUYING", quantity: "0.000001" },
      ],
    },
    {
      id: "warehouse-only",
      classification: "RAW_MATERIAL",
      unit: "kg",
      stock: [{ bucket: "WAREHOUSE", quantity: "5" }],
    },
    {
      id: "finished-good",
      classification: "FINISHED_GOOD",
      unit: "kg",
      stock: [{ bucket: "BUYING", quantity: "3" }],
    },
    {
      id: "missing-unit",
      classification: "RAW_MATERIAL",
      unit: "",
      stock: [{ bucket: "BUYING", quantity: "3" }],
    },
  ];

  assert.deepEqual(
    getAvailableRawMaterials(products).map((product) => product.id),
    ["fractional-stock"]
  );
});
