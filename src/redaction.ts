export class RedactionAmbiguityError extends Error {
  readonly valueLabel: string;

  constructor(valueLabel: string) {
    super(`redaction-export-posture-ambiguous: could not classify sensitive value "${valueLabel}"`);
    this.name = 'RedactionAmbiguityError';
    this.valueLabel = valueLabel;
  }
}

export interface RedactionOptions {
  enabled?: boolean;
  secrets?: Record<string, string | undefined>;
  ambiguousLabels?: string[];
}

const SECRET_KEY_PATTERN = /(?:token|secret|credential|password|api[_-]?key)/i;
const REDACTED = '[REDACTED]';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function secretValues(options: RedactionOptions): string[] {
  return Object.values(options.secrets ?? {}).filter(
    (value): value is string => typeof value === 'string' && value.length > 0,
  );
}

function redactString(value: string, secrets: string[]): string {
  return secrets.reduce((current, secret) => current.split(secret).join(REDACTED), value);
}

export function redactValue(value: unknown, options: RedactionOptions = {}, path = 'record'): unknown {
  if (options.enabled !== true) {
    return value;
  }

  if (options.ambiguousLabels?.includes(path)) {
    throw new RedactionAmbiguityError(path);
  }

  const secrets = secretValues(options);
  if (typeof value === 'string') {
    return redactString(value, secrets);
  }

  if (Array.isArray(value)) {
    return value.map((item, index) => redactValue(item, options, `${path}[${index}]`));
  }

  if (!isRecord(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => {
      const nextPath = `${path}.${key}`;
      if (SECRET_KEY_PATTERN.test(key)) {
        if (typeof entry !== 'string' || entry.length === 0) {
          throw new RedactionAmbiguityError(nextPath);
        }

        return [key, REDACTED];
      }

      return [key, redactValue(entry, options, nextPath)];
    }),
  );
}
