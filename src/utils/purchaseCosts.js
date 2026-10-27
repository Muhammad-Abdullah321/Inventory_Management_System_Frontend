function isValidPurchaseCost(item) {
  const asNumber = (value) => {
    if (value === undefined || value === null || String(value).trim() === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };
  const quantity = asNumber(item.quantity);
  const unitCost = asNumber(item.unitCost);
  const totalCost = asNumber(item.totalCost);

  return quantity !== null && quantity > 0 &&
    unitCost !== null && unitCost >= 0 &&
    totalCost !== null && totalCost >= 0;
}

export function latestCompatiblePurchaseCost(product, purchases) {
  const productItems = purchases.flatMap((purchase) =>
    (purchase.items || [])
      .filter((item) => item.productId === product.id)
      .map((item) => ({ item, purchase }))
  );

  if (!productItems.length) {
    return { cost: null, unavailableReason: "No purchase history" };
  }
  if (!product.unit) {
    return { cost: null, unavailableReason: "Product unit is not configured" };
  }

  const itemsWithUnit = productItems.filter(({ item }) => item.unit);
  if (!itemsWithUnit.length) {
    return { cost: null, unavailableReason: "Purchase unit is missing" };
  }

  const compatibleItems = itemsWithUnit
    .filter(({ item }) => item.unit === product.unit)
    .sort((left, right) =>
      new Date(right.purchase.purchaseDate) - new Date(left.purchase.purchaseDate)
    );

  if (!compatibleItems.length) {
    return { cost: null, unavailableReason: "Historical purchase unit is incompatible" };
  }

  const latestValid = compatibleItems.find(({ item }) => isValidPurchaseCost(item));
  if (!latestValid) {
    return { cost: null, unavailableReason: "Purchase cost or quantity is invalid" };
  }

  return {
    cost: {
      unitCost: latestValid.item.unitCost,
      unit: latestValid.item.unit,
      quantity: latestValid.item.quantity,
      totalCost: latestValid.item.totalCost,
      purchaseDate: latestValid.purchase.purchaseDate,
      vendorName: latestValid.purchase.vendor?.name || "—",
    },
    unavailableReason: null,
  };
}
