const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeText(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeOptionalText(value: FormDataEntryValue | null): string | null {
  const trimmed = normalizeText(value);
  return trimmed.length > 0 ? trimmed : null;
}

export function parseBooleanInput(value: FormDataEntryValue | null): boolean | null {
  const normalized = normalizeText(value);
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return null;
}

export function parseIntegerInput(value: FormDataEntryValue | null): number | null {
  const normalized = normalizeText(value);
  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isInteger(parsed) ? parsed : null;
}

export function parseUuidInput(value: FormDataEntryValue | null): string | null {
  const normalized = normalizeText(value);
  if (!normalized || !UUID_REGEX.test(normalized)) {
    return null;
  }

  return normalized;
}

export function parseEnumInput<TValue extends string>(
  value: FormDataEntryValue | null,
  options: readonly TValue[],
): TValue | null {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }

  return options.find((option) => option === normalized) ?? null;
}

export function limitText(value: string, maxLength: number): string {
  return value.slice(0, maxLength);
}

export function dedupeStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

export function isUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}
