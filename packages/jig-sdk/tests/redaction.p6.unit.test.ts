import assert from 'node:assert';
import { test } from 'vitest';
import { RedactionAmbiguityError, redactValue } from '../src/redaction.js';

test('P6-AC-6: a record carrying a real credential is scanned and redacted', () => {
  const redacted = redactValue(
    {
      family: 'evidence.modeled',
      diagnostics: {
        stdout: 'using token sk-test-secret',
        apiKey: 'sk-test-secret',
      },
    },
    {
      enabled: true,
      secrets: {
        CODEX_API_KEY: 'sk-test-secret',
      },
    },
  ) as { diagnostics: { stdout: string; apiKey: string } };

  assert.strictEqual(redacted.diagnostics.stdout, 'using token [REDACTED]');
  assert.strictEqual(redacted.diagnostics.apiKey, '[REDACTED]');
});

test('P6-AC-6: a redaction ambiguity becomes a diagnosable stop', () => {
  assert.throws(
    () =>
      redactValue(
        {
          family: 'evidence.modeled',
          diagnostics: {
            apiKey: '',
          },
        },
        { enabled: true },
      ),
    (error: unknown) =>
      error instanceof RedactionAmbiguityError &&
      /redaction-export-posture-ambiguous/.test(error.message) &&
      error.valueLabel === 'record.diagnostics.apiKey',
  );
});

test('P6-AC-6: disabled redaction leaves records unchanged', () => {
  const record = { family: 'evidence.modeled', diagnostics: { stdout: 'token sk-test-secret' } };

  assert.strictEqual(redactValue(record, { enabled: false }), record);
});
