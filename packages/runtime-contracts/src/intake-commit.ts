import type { IntakeRequest, IntakeResult, LedgerResult, ScriptedLedger, ScriptedLedgerFault } from './ledger.js';

type Commit = (
  request: IntakeRequest,
  fault?: Extract<
    ScriptedLedgerFault,
    'intake-after-flush' | 'intake-after-witness' | 'intake-missing-companion' | 'intake-mismatched-companion'
  >,
) => LedgerResult<IntakeResult>;

const commits = new WeakMap<object, Commit>();

export function registerScriptedIntake(ledger: ScriptedLedger, commit: Commit): void {
  commits.set(ledger, commit);
}

export function commitScriptedIntake(
  ledger: ScriptedLedger,
  request: IntakeRequest,
  fault?: Extract<
    ScriptedLedgerFault,
    'intake-after-flush' | 'intake-after-witness' | 'intake-missing-companion' | 'intake-mismatched-companion'
  >,
): LedgerResult<IntakeResult> {
  const commit = commits.get(ledger);
  return commit ? commit(request, fault) : { ok: false, error: { family: 'FC-AUTHORITY', code: 'CP_INTAKE_REQUIRED' } };
}
