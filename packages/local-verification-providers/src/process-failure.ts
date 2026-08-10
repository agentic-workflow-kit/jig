export type ClassifiedProcessFailure = Readonly<{
  family: 'FC-MECHANISM' | 'FC-AUTHORITY';
  code: string;
}>;

export function classifyProcessFailure(
  error: unknown,
  fallback: ClassifiedProcessFailure,
): ClassifiedProcessFailure | undefined {
  const record = (typeof error === 'object' && error !== null ? error : {}) as Record<string, unknown>;
  if (record.signal !== undefined && record.signal !== null)
    return { family: 'FC-MECHANISM', code: 'COMMAND_SIGNALLED' };
  if (record.code === 'ETIMEDOUT') return { family: 'FC-MECHANISM', code: 'MECHANISM_TIMEOUT' };
  if (record.code === 'ENOBUFS') return { family: 'FC-MECHANISM', code: 'COMMAND_OUTPUT_LIMIT_EXCEEDED' };
  if (typeof record.code === 'string') return fallback;
  if (!Number.isSafeInteger(record.status) || (record.status as number) <= 0)
    return { family: 'FC-MECHANISM', code: 'MALFORMED_COMMAND_RESULT' };
  const stderr = typeof record.stderr === 'string' ? record.stderr : '';
  if (/(?:sandbox|operation not permitted|permission denied)/iu.test(stderr))
    return { family: 'FC-AUTHORITY', code: 'SANDBOX_CONFINEMENT_FAILED' };
  return undefined;
}
