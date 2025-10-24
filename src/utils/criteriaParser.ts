/**
 * Parse free-form criteria text into a normalized list of criteria strings.
 * Handles numbered lists, bullets, newlines, semicolons, and comma-separated values
 * while respecting parentheses (so items like "Cloud (AWS, Azure)" stay intact).
 */
export function parseCriteriaInput(raw: string): string[] {
  if (!raw || typeof raw !== 'string') {
    return [];
  }

  const normalizedNewlines = raw.replace(/\r\n?/g, '\n');

  // Normalize common bullet markers and numbered prefixes to newlines
  let flattened = normalizedNewlines
    .replace(/[\u2022\u2023\u25E6\u2043\u2219]/g, '\n') // bullet characters
    .replace(/(?:^|\n)\s*[-*+]+\s+/g, '\n') // leading -, *, +
    .replace(/(?:^|\n)\s*\(?\d{1,2}[\).\:]?\s+/g, '\n'); // numbered lists like 1. or (1)

  // Split on newlines and semicolons first
  const provisional = flattened
    .split(/\n|;/)
    .map(item => item.trim())
    .filter(item => item.length > 0);

  const results: string[] = [];

  const pushIfValid = (value: string) => {
    const cleaned = value.trim().replace(/^[\-*+\d\).:\s]+/, '').replace(/\s+/g, ' ');
    if (cleaned.length >= 2) {
      results.push(cleaned);
    }
  };

  if (provisional.length === 0) {
    pushIfValid(flattened);
  } else {
    provisional.forEach(entry => pushIfValid(entry));
  }

  // If we only detected a single item, attempt comma-based splitting while respecting parentheses
  if (results.length <= 1) {
    const single = results[0] ?? normalizedNewlines;
    const commaSplit = splitByCommaRespectingParens(single);
    if (commaSplit.length > 1) {
      results.splice(0, results.length, ...commaSplit);
    }
  }

  // Remove duplicates (case-insensitive) and return
  const seen = new Set<string>();
  return results.filter(item => {
    const key = item.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function splitByCommaRespectingParens(text: string): string[] {
  const items: string[] = [];
  let buffer = '';
  let depth = 0;

  for (const char of text) {
    if (char === '(') depth += 1;
    if (char === ')' && depth > 0) depth -= 1;

    if (char === ',' && depth === 0) {
      const candidate = buffer.trim();
      if (candidate.length > 0) {
        items.push(candidate);
      }
      buffer = '';
      continue;
    }

    buffer += char;
  }

  const finalCandidate = buffer.trim();
  if (finalCandidate.length > 0) {
    items.push(finalCandidate);
  }

  return items;
}
