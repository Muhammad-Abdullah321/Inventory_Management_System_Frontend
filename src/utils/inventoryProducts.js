export function filterProductsByClassification(products, classification) {
  return products.filter((product) => product.classification === classification);
}
