export function normalizeTaxId(value: string): string {
  return value.replace(/[\s-]/g, "").trim();
}

export function isValidPolishNip(value: string): boolean {
  const nip = normalizeTaxId(value);
  if (!/^\d{10}$/.test(nip)) return false;

  const digits = nip.split("").map(Number);
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  const checksum =
    weights.reduce((sum, weight, index) => sum + weight * digits[index], 0) %
    11;

  return checksum !== 10 && checksum === digits[9];
}

export function isValidTaxId(countryCode: string, value: string): boolean {
  const normalized = normalizeTaxId(value);
  if (!normalized) return false;

  if (countryCode.toUpperCase() === "PL") {
    return isValidPolishNip(normalized);
  }

  return normalized.length >= 3 && normalized.length <= 32;
}

export function isValidVatId(countryCode: string, value: string): boolean {
  const compact = value.replace(/[\s.-]/g, "").toUpperCase();
  if (!compact) return true;

  const country = countryCode.toUpperCase();

  if (country === "PL") {
    const nip = compact.startsWith("PL") ? compact.slice(2) : compact;
    return isValidPolishNip(nip);
  }

  // VAT IDs differ by country. For non-PL registrations keep validation
  // format-safe without applying Poland-specific checksum rules.
  const withoutPrefix = compact.startsWith(country)
    ? compact.slice(country.length)
    : compact;

  return /^[A-Z0-9]{3,30}$/.test(withoutPrefix);
}
