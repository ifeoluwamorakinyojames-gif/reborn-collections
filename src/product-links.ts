/** Stable product IDs make ad links survive edits to product names. */
export function productSlug(name: string): string {
  return String(name || 'fashion-item')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90) || 'fashion-item';
}

export function productPath(product: { id: string; name: string }): string {
  return '/product/' + encodeURIComponent(product.id) + '/' + productSlug(product.name);
}

/** Returns null for ordinary website paths. Never use a slug to identify a product. */
export function productIdFromPath(pathname: string): string | null {
  const match = /^\/product\/([^/]+)(?:\/[^/]*)?\/?$/.exec(pathname);
  if (!match) return null;
  try {
    const id = decodeURIComponent(match[1]);
    return /^[a-zA-Z0-9._-]{1,128}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}
