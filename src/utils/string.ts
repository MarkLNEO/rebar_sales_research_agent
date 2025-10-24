/**
 * Convert a slug (e.g., "data_breach") into a human-friendly label.
 * Preserves spacing and capitalizes each word.
 */
export function slugToTitle(slug: string): string {
  if (!slug) return '';
  const cleaned = slug
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.replace(/\b\w/g, char => char.toUpperCase());
}

/**
 * Normalize arbitrary text into a slug identifier.
 */
export function toSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}
