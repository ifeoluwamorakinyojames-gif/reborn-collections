/** Shared storefront rules. Keep these independent of React for fast unit testing. */
export type PricedProduct = { price: number; salePrice?: number };

export function effectivePrice(product: PricedProduct): number {
  const original = Number(product.price) || 0;
  const sale = Number(product.salePrice) || 0;
  return sale > 0 && sale < original ? sale : original;
}

export function phoneNumber(input: string): string {
  const digits = String(input || '').replace(/\D/g, '');
  return digits.startsWith('0') ? '234' + digits.slice(1) : digits;
}

export function collectionSlug(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '-');
}
