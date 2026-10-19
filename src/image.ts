/** Optimize only trusted Sanity image CDN URLs; do not rewrite other hosts. */
const SANITY_IMAGE_PATH = /^https:\/\/cdn\.sanity\.io\/images\//i;

export function imageUrl(source: string, width: number, quality = 75): string {
  if (!source) return '/reborn-icon.svg';
  if (!SANITY_IMAGE_PATH.test(source)) return source;
  const url = new URL(source);
  url.searchParams.set('w', String(Math.round(width)));
  url.searchParams.set('auto', 'format');
  url.searchParams.set('fit', 'max');
  url.searchParams.set('q', String(quality));
  return url.toString();
}

export function imageSrcSet(source: string, widths: number[]): string | undefined {
  if (!SANITY_IMAGE_PATH.test(source)) return undefined;
  return widths.map(width => `${imageUrl(source, width)} ${width}w`).join(', ');
}
