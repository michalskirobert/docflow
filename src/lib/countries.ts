export type CountryOption = {
  code: string;
  postalMask?: string;
  postalPattern?: RegExp;
};

// Mask tokens: 9 = digit, A = letter. Other characters are inserted automatically.
export const COUNTRIES: CountryOption[] = [
  { code: "PL", postalMask: "99-999", postalPattern: /^\d{2}-\d{3}$/ },
  { code: "DE", postalMask: "99999", postalPattern: /^\d{5}$/ },
  { code: "FR", postalMask: "99999", postalPattern: /^\d{5}$/ },
  { code: "IT", postalMask: "99999", postalPattern: /^\d{5}$/ },
  { code: "ES", postalMask: "99999", postalPattern: /^\d{5}$/ },
  { code: "CZ", postalMask: "999 99", postalPattern: /^\d{3} \d{2}$/ },
  { code: "SK", postalMask: "999 99", postalPattern: /^\d{3} \d{2}$/ },
  { code: "NL", postalMask: "9999 AA", postalPattern: /^\d{4} [A-Z]{2}$/i },
  // UK postcodes have several valid lengths, so keep validation flexible rather than forcing one wrong mask.
  { code: "GB", postalPattern: /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i },
  { code: "US", postalMask: "99999", postalPattern: /^\d{5}$/ },
  {
    code: "CA",
    postalMask: "A9A 9A9",
    postalPattern: /^[A-Z]\d[A-Z] \d[A-Z]\d$/i,
  },
  { code: "ID", postalMask: "99999", postalPattern: /^\d{5}$/ },
  { code: "AU", postalMask: "9999", postalPattern: /^\d{4}$/ },
  { code: "JP", postalMask: "999-9999", postalPattern: /^\d{3}-\d{4}$/ },
  { code: "AT", postalMask: "9999", postalPattern: /^\d{4}$/ },
  { code: "BE", postalMask: "9999", postalPattern: /^\d{4}$/ },
  { code: "DK", postalMask: "9999", postalPattern: /^\d{4}$/ },
  { code: "FI", postalMask: "99999", postalPattern: /^\d{5}$/ },
  { code: "SE", postalMask: "999 99", postalPattern: /^\d{3} \d{2}$/ },
  { code: "NO", postalMask: "9999", postalPattern: /^\d{4}$/ },
  { code: "IE" },
  { code: "PT", postalMask: "9999-999", postalPattern: /^\d{4}-\d{3}$/ },
  { code: "RO", postalMask: "999999", postalPattern: /^\d{6}$/ },
  { code: "HU", postalMask: "9999", postalPattern: /^\d{4}$/ },
  { code: "GR", postalMask: "999 99", postalPattern: /^\d{3} \d{2}$/ },
  { code: "BG", postalMask: "9999", postalPattern: /^\d{4}$/ },
  { code: "HR", postalMask: "99999", postalPattern: /^\d{5}$/ },
  { code: "SI", postalMask: "9999", postalPattern: /^\d{4}$/ },
  { code: "LT", postalMask: "99999", postalPattern: /^\d{5}$/ },
  { code: "LV", postalMask: "LV-9999", postalPattern: /^LV-\d{4}$/i },
  { code: "EE", postalMask: "99999", postalPattern: /^\d{5}$/ },
];

const countryRule = (countryCode?: string) =>
  COUNTRIES.find((country) => country.code === countryCode);

export const getCountryOptions = (locale: string) => {
  const displayNames = new Intl.DisplayNames([locale], { type: "region" });
  return COUNTRIES.map((country) => ({
    ...country,
    label: displayNames.of(country.code) ?? country.code,
  })).sort((a, b) => a.label.localeCompare(b.label, locale));
};

export const getPostalPlaceholder = (countryCode?: string) =>
  countryRule(countryCode)?.postalMask?.replace(/9/g, "0") ?? "";

export const getPostalMaxLength = (countryCode?: string) =>
  countryRule(countryCode)?.postalMask?.length ?? 20;

export const isPostalNumeric = (countryCode?: string) => {
  const mask = countryRule(countryCode)?.postalMask;
  return Boolean(mask && !mask.includes("A"));
};

export const isValidPostalCode = (countryCode: string, value: string) => {
  const postal = value.trim().toUpperCase();
  if (!postal) return false;
  const rule = countryRule(countryCode)?.postalPattern;
  return rule
    ? rule.test(postal)
    : /^[A-Z0-9][A-Z0-9 -]{1,18}[A-Z0-9]$/i.test(postal);
};

export const formatPostalCode = (countryCode: string, value: string) => {
  const rule = countryRule(countryCode);
  const mask = rule?.postalMask;
  const raw = value.toUpperCase();

  if (!mask) return raw.replace(/[^A-Z0-9 -]/g, "").slice(0, 20);

  // Keep only characters that can fill mask tokens. Literal separators/prefixes
  // are generated from the mask and therefore never count as user input.
  const tokenChars = raw.replace(/[^A-Z0-9]/g, "");
  let sourceIndex = 0;
  let result = "";

  for (let maskIndex = 0; maskIndex < mask.length; maskIndex += 1) {
    const token = mask[maskIndex];

    if (token !== "9" && token !== "A") {
      // Literal alphabetic prefixes (e.g. LV-) are part of the mask, not input.
      if (/[A-Z]/.test(token)) {
        result += token;
        if (tokenChars[sourceIndex] === token) sourceIndex += 1;
        continue;
      }
      if (sourceIndex < tokenChars.length) result += token;
      continue;
    }

    while (sourceIndex < tokenChars.length) {
      const char = tokenChars[sourceIndex++];
      if (token === "9" && /\d/.test(char)) {
        result += char;
        break;
      }
      if (token === "A" && /[A-Z]/.test(char)) {
        result += char;
        break;
      }
    }
  }

  return result.slice(0, mask.length);
};
