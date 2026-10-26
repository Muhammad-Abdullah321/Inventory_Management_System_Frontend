import { isAtLeastQuantity } from "./quantity.js";

const MINIMUM_STOCK_QUANTITY = "0.000001";

export function getAvailableRawMaterials(products) {
  return products.filter((product) => {
    const buyingQuantity =
      product.stock?.find((entry) => entry.bucket === "BUYING")?.quantity ?? "0";

    return product.classification === "RAW_MATERIAL" &&
      Boolean(product.unit) &&
      isAtLeastQuantity(buyingQuantity, MINIMUM_STOCK_QUANTITY);
  });
}
