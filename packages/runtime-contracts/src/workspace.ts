import { type CanonicalJson, parseIdentity, stageDigest } from '@agentic-workflow-kit/jig-codec';

export const WORKSPACE_CONTRACT_VERSION = 'jig.workspace-contract.v1';
export const WORKSPACE_PORT = 'PORT-WORKSPACE';
export const WORKSPACE_CAPABILITY = 'CB-WORKSPACE';

export const WORKSPACE_OPERATION_TYPES = Object.freeze([
  'OPC-WS-PROVISION',
  'OPC-WS-SETUP',
  'OPC-WS-OBSERVE',
  'OPC-WS-PRESERVE',
  'OPC-WS-RETIRE',
] as const);

export type WorkspaceOperationType = (typeof WORKSPACE_OPERATION_TYPES)[number];
export type WorkspaceOperationEffect = 'effectful' | 'observation';
export type WorkspaceCleanliness = 'clean' | 'dirty' | 'ambiguous';
export type WorkspaceFailureFamily =
  | 'FC-INPUT'
  | 'FC-SUBJECT'
  | 'FC-FENCE'
  | 'FC-AUTHORITY'
  | 'FC-MECHANISM'
  | 'FC-EFFECT'
  | 'FC-TRUST';
export type WorkspaceFailure = Readonly<{ family: WorkspaceFailureFamily; code: string }>;
export type WorkspaceResult<T> = Readonly<{ ok: true; value: T }> | Readonly<{ ok: false; error: WorkspaceFailure }>;

export type WorkspaceCommitProof = Readonly<{
  kind: 'committed-witnessed';
  position: number;
  event: string;
  transaction: string;
  operation: string;
  recordDigest: string;
  witnessDigest: string;
}>;

export type WorkspaceSubject = Readonly<{ run: string; story: string; basis: string }>;

/** One exact per-Operation workspace grant; no workspace identity is invented. */
export type WorkspaceBinding = Readonly<{
  operation: string;
  operationType: WorkspaceOperationType;
  subject: WorkspaceSubject;
  repository: string;
  path: string;
  basis: string;
  recipeDigest: string;
  inputFingerprintDigest: string;
  host: string;
  manifest: string;
}>;

export type WorkspaceOperationIntent = Readonly<{
  version: typeof WORKSPACE_CONTRACT_VERSION;
  operation: string;
  operationType: WorkspaceOperationType;
  effect: WorkspaceOperationEffect;
  port: typeof WORKSPACE_PORT;
  capability: typeof WORKSPACE_CAPABILITY;
  binding: WorkspaceBinding;
  proof: WorkspaceCommitProof;
}>;

export type WorkspaceSetupReceipt = Readonly<{
  version: typeof WORKSPACE_CONTRACT_VERSION;
  operation: string;
  binding: WorkspaceBinding;
  hostFingerprint: string;
  workspaceFingerprint: string;
  recipeDigest: string;
  inputFingerprintDigest: string;
  freshnessFingerprint: string;
  effectDigest: string;
  completed: true;
  proof: WorkspaceCommitProof;
}>;

export type WorkspaceFact = Readonly<{
  version: typeof WORKSPACE_CONTRACT_VERSION;
  kind: 'workspace-fact' | 'setup-fact' | 'preservation-fact';
  operation: string;
  operationType: WorkspaceOperationType;
  binding: WorkspaceBinding;
  hostFingerprint: string;
  workspaceFingerprint: string;
  contentDigest: string;
  cleanliness: WorkspaceCleanliness;
  setupReceipt: WorkspaceSetupReceipt | null;
  preserved: boolean;
  proof: WorkspaceCommitProof;
}>;

export type WorkspaceAttestation = Readonly<{
  version: typeof WORKSPACE_CONTRACT_VERSION;
  provider: 'fixture-only';
  operation: string;
  operationType: WorkspaceOperationType;
  port: typeof WORKSPACE_PORT;
  capability: typeof WORKSPACE_CAPABILITY;
  binding: WorkspaceBinding;
  hostFingerprint: string;
  workspaceFingerprint: string;
  contentDigest: string;
  cleanliness: WorkspaceCleanliness;
  setupReceipt: WorkspaceSetupReceipt | null;
  preserved: boolean;
  proof: WorkspaceCommitProof;
  successClaim: 'observed';
}>;

export type WorkspaceFault = 'none' | 'lost-response' | 'uncertain' | 'duplicate' | 'crash';

export type WorkspaceDispatchRequest = Readonly<{
  operation: string;
  operationType: WorkspaceOperationType;
  binding: WorkspaceBinding;
  proof: WorkspaceCommitProof;
  fault?: WorkspaceFault;
}>;

export type WorkspaceInvocation = Readonly<{
  operation: string;
  operationType: WorkspaceOperationType;
  effect: WorkspaceOperationEffect;
  result: 'returned' | 'lost-response' | 'crashed' | 'disabled';
}>;

export type ScriptedWorkspaceFixture = Readonly<{
  dispatch(input: unknown): WorkspaceResult<WorkspaceAttestation>;
  lookup(input: unknown): WorkspaceResult<
    Readonly<{
      operation: string;
      outcome: 'confirmed-effect' | 'confirmed-absence' | 'indeterminate';
      observationDigest: string;
    }>
  >;
  invocations(): readonly WorkspaceInvocation[];
  reachability(): Readonly<{ providerEnabled: false; dispatchEnabled: false; status: 'unavailable' }>;
}>;

export type WorkspaceTransitionRecorder = Readonly<{
  recordIntent(input: WorkspaceOperationIntent): WorkspaceResult<WorkspaceCommitProof>;
}>;

export type WorkspaceController = Readonly<{
  provision(input: Readonly<{ binding: WorkspaceBinding; fault?: WorkspaceFault }>): WorkspaceResult<WorkspaceFact>;
  setup(
    input: Readonly<{ binding: WorkspaceBinding; receipt: WorkspaceSetupReceipt | null; fault?: WorkspaceFault }>,
  ): WorkspaceResult<Readonly<{ status: 'no-op' } | WorkspaceFact>>;
  observe(input: Readonly<{ binding: WorkspaceBinding; fault?: WorkspaceFault }>): WorkspaceResult<WorkspaceFact>;
  preserve(input: Readonly<{ binding: WorkspaceBinding; fault?: WorkspaceFault }>): WorkspaceResult<WorkspaceFact>;
  retire(input: Readonly<{ binding: WorkspaceBinding; fault?: WorkspaceFault }>): WorkspaceResult<never>;
  reconcile(
    input: Readonly<{
      operation: string;
      binding: WorkspaceBinding;
    }>,
  ): WorkspaceResult<
    Readonly<{ operation: string; outcome: 'confirmed-effect' | 'confirmed-absence' | 'indeterminate' }>
  >;
  intents(): readonly WorkspaceOperationIntent[];
  facts(): readonly WorkspaceFact[];
  snapshot(): WorkspaceSnapshot;
}>;

export type WorkspaceSnapshot = Readonly<{
  version: typeof WORKSPACE_CONTRACT_VERSION;
  intents: readonly WorkspaceOperationIntent[];
  facts: readonly WorkspaceFact[];
  setupIntentKeys: readonly string[];
  uncertainOperations: readonly string[];
}>;

const DIGEST = /^[0-9a-f]{64}$/u;
const SECRET = /(?:secret|token|password|credential|authorization|api[._ -]?key)/iu;
const MAX_TEXT = 512;

const ok = <T>(value: T): WorkspaceResult<T> => Object.freeze({ ok: true, value });
const fail = (family: WorkspaceFailureFamily, code: string): WorkspaceResult<never> =>
  Object.freeze({ ok: false, error: Object.freeze({ family, code }) });

const isPlain = (value: unknown): value is Record<string, unknown> => {
  try {
    return (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      Object.getPrototypeOf(value) === Object.prototype
    );
  } catch {
    return false;
  }
};

const exactFields = (value: unknown, names: readonly string[]): Record<string, unknown> | undefined => {
  if (!isPlain(value)) return undefined;
  try {
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(value);
    const expected = [...names].sort();
    if (
      keys.some((key) => typeof key !== 'string') ||
      keys.length !== expected.length ||
      [...keys].sort().some((key, index) => key !== expected[index])
    )
      return undefined;
    if (!names.every((name) => descriptors[name]?.enumerable && 'value' in descriptors[name])) return undefined;
    return Object.fromEntries(names.map((name) => [name, descriptors[name].value]));
  } catch {
    return undefined;
  }
};

const safeText = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.length > 0 &&
  value.length <= MAX_TEXT &&
  value.normalize('NFC') === value &&
  !SECRET.test(value);
const safeDigest = (value: unknown): value is string => typeof value === 'string' && DIGEST.test(value);
const identity = (kind: string, value: unknown): value is string =>
  typeof value === 'string' && parseIdentity(kind, value).ok;

const digest = (domain: string, value: unknown): string | undefined => {
  try {
    const result = stageDigest({ domain, excludePaths: [], value: value as CanonicalJson });
    return result.ok ? result.value.digest : undefined;
  } catch {
    return undefined;
  }
};

const same = (left: unknown, right: unknown): boolean => {
  const leftDigest = digest('WORKSPACE-COMPARE', left);
  const rightDigest = digest('WORKSPACE-COMPARE', right);
  return leftDigest !== undefined && leftDigest === rightDigest;
};

const proofCoordinates = (
  operation: string,
  run: string,
): Readonly<{ position: number; event: string; transaction: string }> | undefined => {
  const transaction = operation.slice(0, operation.lastIndexOf('/op/'));
  const prefix = `${run}/txn/`;
  if (!transaction.startsWith(prefix)) return undefined;
  const ordinalText = transaction.slice(prefix.length, transaction.indexOf('/', prefix.length));
  const ordinal = Number(ordinalText);
  if (!/^\d+$/u.test(ordinalText) || !Number.isSafeInteger(ordinal) || ordinal < 1) return undefined;
  return Object.freeze({ position: ordinal - 1, event: `${run}/event/${ordinal}`, transaction });
};

const operationEffect = (operation: WorkspaceOperationType): WorkspaceOperationEffect =>
  operation === 'OPC-WS-OBSERVE' ? 'observation' : 'effectful';

const parseSubject = (value: unknown): WorkspaceSubject | undefined => {
  const raw = exactFields(value, ['run', 'story', 'basis']);
  return raw && safeText(raw.run) && safeText(raw.story) && safeDigest(raw.basis)
    ? Object.freeze({ run: raw.run, story: raw.story, basis: raw.basis })
    : undefined;
};

const parseBinding = (value: unknown): WorkspaceBinding | undefined => {
  const raw = exactFields(value, [
    'operation',
    'operationType',
    'subject',
    'repository',
    'path',
    'basis',
    'recipeDigest',
    'inputFingerprintDigest',
    'host',
    'manifest',
  ]);
  const subject = raw && parseSubject(raw.subject);
  if (
    !raw ||
    !subject ||
    !identity('ID-OP', raw.operation) ||
    !WORKSPACE_OPERATION_TYPES.includes(raw.operationType as WorkspaceOperationType) ||
    !safeText(raw.repository) ||
    !safeText(raw.path) ||
    !safeDigest(raw.basis) ||
    !safeDigest(raw.recipeDigest) ||
    !safeDigest(raw.inputFingerprintDigest) ||
    !safeText(raw.host) ||
    !identity('ID-MANIFEST', raw.manifest) ||
    !identity('ID-RUN', subject.run) ||
    !identity('ID-STORY', subject.story) ||
    !subject.story.startsWith(`${subject.run}/story/`) ||
    !raw.operation.startsWith(`${subject.run}/txn/`) ||
    subject.basis !== raw.basis ||
    SECRET.test(raw.repository) ||
    SECRET.test(raw.path) ||
    SECRET.test(raw.host) ||
    SECRET.test(raw.manifest)
  )
    return undefined;
  return Object.freeze({
    operation: raw.operation,
    operationType: raw.operationType as WorkspaceOperationType,
    subject,
    repository: raw.repository,
    path: raw.path,
    basis: raw.basis,
    recipeDigest: raw.recipeDigest,
    inputFingerprintDigest: raw.inputFingerprintDigest,
    host: raw.host,
    manifest: raw.manifest,
  });
};

const parseProof = (value: unknown, operation: string, run?: string): WorkspaceCommitProof | undefined => {
  const raw = exactFields(value, [
    'kind',
    'position',
    'event',
    'transaction',
    'operation',
    'recordDigest',
    'witnessDigest',
  ]);
  const coordinates = run === undefined ? undefined : proofCoordinates(operation, run);
  if (
    raw?.kind !== 'committed-witnessed' ||
    typeof raw.position !== 'number' ||
    !Number.isSafeInteger(raw.position) ||
    raw.position < 0 ||
    !identity('ID-EVENT', raw.event) ||
    !identity('ID-TXN', raw.transaction) ||
    !identity('ID-OP', operation) ||
    raw.operation !== operation ||
    !safeDigest(raw.recordDigest) ||
    raw.recordDigest !== raw.witnessDigest ||
    !operation.startsWith(`${raw.transaction}/op/`) ||
    (run !== undefined &&
      (!coordinates ||
        raw.position !== coordinates.position ||
        raw.event !== coordinates.event ||
        raw.transaction !== coordinates.transaction))
  )
    return undefined;
  return Object.freeze({
    kind: 'committed-witnessed',
    position: raw.position as number,
    event: raw.event,
    transaction: raw.transaction,
    operation,
    recordDigest: raw.recordDigest,
    witnessDigest: raw.witnessDigest,
  });
};

const parseReceipt = (value: unknown): WorkspaceSetupReceipt | undefined => {
  const raw = exactFields(value, [
    'version',
    'operation',
    'binding',
    'hostFingerprint',
    'workspaceFingerprint',
    'recipeDigest',
    'inputFingerprintDigest',
    'freshnessFingerprint',
    'effectDigest',
    'completed',
    'proof',
  ]);
  const binding = raw && parseBinding(raw.binding);
  const proof = raw && binding && parseProof(raw.proof, raw.operation as string, binding.subject.run);
  if (
    !raw ||
    raw.version !== WORKSPACE_CONTRACT_VERSION ||
    !binding ||
    !identity('ID-OP', raw.operation) ||
    binding.operation !== raw.operation ||
    !safeDigest(raw.hostFingerprint) ||
    !safeDigest(raw.workspaceFingerprint) ||
    !safeDigest(raw.recipeDigest) ||
    !safeDigest(raw.inputFingerprintDigest) ||
    !safeDigest(raw.freshnessFingerprint) ||
    !safeDigest(raw.effectDigest) ||
    raw.completed !== true ||
    !proof
  )
    return undefined;
  return Object.freeze({
    version: WORKSPACE_CONTRACT_VERSION,
    operation: raw.operation,
    binding,
    hostFingerprint: raw.hostFingerprint,
    workspaceFingerprint: raw.workspaceFingerprint,
    recipeDigest: raw.recipeDigest,
    inputFingerprintDigest: raw.inputFingerprintDigest,
    freshnessFingerprint: raw.freshnessFingerprint,
    effectDigest: raw.effectDigest,
    completed: true,
    proof,
  });
};

const parseFact = (value: unknown): WorkspaceFact | undefined => {
  const raw = exactFields(value, [
    'version',
    'kind',
    'operation',
    'operationType',
    'binding',
    'hostFingerprint',
    'workspaceFingerprint',
    'contentDigest',
    'cleanliness',
    'setupReceipt',
    'preserved',
    'proof',
  ]);
  const binding = raw && parseBinding(raw.binding);
  const proof = raw && binding && parseProof(raw.proof, raw.operation as string, binding.subject.run);
  const receipt = raw?.setupReceipt === null ? null : parseReceipt(raw?.setupReceipt);
  if (
    !raw ||
    raw.version !== WORKSPACE_CONTRACT_VERSION ||
    !binding ||
    !identity('ID-OP', raw.operation) ||
    raw.operation !== binding.operation ||
    raw.operationType !== binding.operationType ||
    !safeDigest(raw.hostFingerprint) ||
    !safeDigest(raw.workspaceFingerprint) ||
    !safeDigest(raw.contentDigest) ||
    !['clean', 'dirty', 'ambiguous'].includes(raw.cleanliness as string) ||
    raw.setupReceipt === undefined ||
    (raw.setupReceipt !== null && !receipt) ||
    typeof raw.preserved !== 'boolean' ||
    !proof ||
    (raw.kind === 'setup-fact' && (!receipt || raw.operationType !== 'OPC-WS-SETUP')) ||
    (raw.kind === 'workspace-fact' && raw.operationType === 'OPC-WS-SETUP') ||
    (raw.kind === 'preservation-fact' && !raw.preserved) ||
    (raw.operationType === 'OPC-WS-PRESERVE') !== raw.preserved ||
    (raw.operationType === 'OPC-WS-SETUP') !== (receipt !== null) ||
    !['workspace-fact', 'setup-fact', 'preservation-fact'].includes(raw.kind as string)
  )
    return undefined;
  const normalizedReceipt: WorkspaceSetupReceipt | null = receipt ?? null;
  if (
    normalizedReceipt &&
    (!same(normalizedReceipt.binding, binding) ||
      normalizedReceipt.operation !== raw.operation ||
      normalizedReceipt.hostFingerprint !== raw.hostFingerprint ||
      normalizedReceipt.workspaceFingerprint !== raw.workspaceFingerprint ||
      normalizedReceipt.recipeDigest !== binding.recipeDigest ||
      normalizedReceipt.inputFingerprintDigest !== binding.inputFingerprintDigest ||
      normalizedReceipt.freshnessFingerprint !== freshnessFingerprint(binding, raw.hostFingerprint) ||
      normalizedReceipt.effectDigest !==
        digest('WORKSPACE-SETUP-EFFECT', { binding, contentDigest: raw.contentDigest }) ||
      !same(normalizedReceipt.proof, proof))
  )
    return undefined;
  return Object.freeze({
    version: WORKSPACE_CONTRACT_VERSION,
    kind: raw.kind as WorkspaceFact['kind'],
    operation: raw.operation,
    operationType: raw.operationType as WorkspaceOperationType,
    binding,
    hostFingerprint: raw.hostFingerprint,
    workspaceFingerprint: raw.workspaceFingerprint,
    contentDigest: raw.contentDigest,
    cleanliness: raw.cleanliness as WorkspaceCleanliness,
    setupReceipt: normalizedReceipt,
    preserved: raw.preserved,
    proof,
  });
};

const parseSnapshot = (value: unknown): WorkspaceSnapshot | undefined => {
  const raw = exactFields(value, ['version', 'intents', 'facts', 'setupIntentKeys', 'uncertainOperations']);
  if (!raw || raw.version !== WORKSPACE_CONTRACT_VERSION) return undefined;
  const arrays = [raw.intents, raw.facts, raw.setupIntentKeys, raw.uncertainOperations];
  if (
    arrays.some(
      (entry) =>
        !Array.isArray(entry) ||
        Object.getPrototypeOf(entry) !== Array.prototype ||
        Reflect.ownKeys(entry).length !== entry.length + 1 ||
        Reflect.ownKeys(entry).some((key) => typeof key !== 'string'),
    )
  )
    return undefined;
  const intents = (raw.intents as readonly unknown[]).map((entry) => {
    const parsed = exactFields(entry, [
      'version',
      'operation',
      'operationType',
      'effect',
      'port',
      'capability',
      'binding',
      'proof',
    ]);
    const binding = parsed && parseBinding(parsed.binding);
    const proof = parsed && binding && parseProof(parsed.proof, parsed.operation as string, binding.subject.run);
    return parsed &&
      binding &&
      proof &&
      parsed.version === WORKSPACE_CONTRACT_VERSION &&
      parsed.operation === binding.operation &&
      parsed.operationType === binding.operationType &&
      parsed.effect === operationEffect(binding.operationType) &&
      parsed.port === WORKSPACE_PORT &&
      parsed.capability === WORKSPACE_CAPABILITY
      ? (Object.freeze({
          version: WORKSPACE_CONTRACT_VERSION,
          operation: parsed.operation,
          operationType: parsed.operationType as WorkspaceOperationType,
          effect: parsed.effect as WorkspaceOperationEffect,
          port: WORKSPACE_PORT,
          capability: WORKSPACE_CAPABILITY,
          binding,
          proof,
        }) as WorkspaceOperationIntent)
      : undefined;
  });
  const facts = (raw.facts as readonly unknown[]).map(parseFact);
  if (
    intents.some((entry) => !entry) ||
    new Set(intents.map((entry) => entry?.operation)).size !== intents.length ||
    facts.some((entry) => !entry) ||
    (raw.setupIntentKeys as readonly unknown[]).some((entry) => typeof entry !== 'string') ||
    (raw.uncertainOperations as readonly unknown[]).some((entry) => typeof entry !== 'string')
  )
    return undefined;
  return Object.freeze({
    version: WORKSPACE_CONTRACT_VERSION,
    intents: Object.freeze(intents as WorkspaceOperationIntent[]),
    facts: Object.freeze(facts as WorkspaceFact[]),
    setupIntentKeys: Object.freeze([...(raw.setupIntentKeys as string[])]),
    uncertainOperations: Object.freeze([...(raw.uncertainOperations as string[])]),
  });
};

const operationKey = (binding: WorkspaceBinding): string => binding.operation;
const bindingKey = (binding: WorkspaceBinding): string =>
  digest('WORKSPACE-BINDING-KEY', {
    subject: binding.subject,
    repository: binding.repository,
    path: binding.path,
    basis: binding.basis,
    recipeDigest: binding.recipeDigest,
    inputFingerprintDigest: binding.inputFingerprintDigest,
    host: binding.host,
    manifest: binding.manifest,
  }) ?? `${binding.repository}\0${binding.path}\0${binding.basis}\0${binding.host}`;

const freshnessFingerprint = (binding: WorkspaceBinding, hostFingerprint: string): string | undefined =>
  digest('WORKSPACE-SETUP-FRESHNESS', {
    recipeDigest: binding.recipeDigest,
    inputFingerprintDigest: binding.inputFingerprintDigest,
    host: binding.host,
    hostFingerprint,
  });

const factFromAttestation = (attestation: WorkspaceAttestation): WorkspaceFact =>
  Object.freeze({
    version: WORKSPACE_CONTRACT_VERSION,
    kind:
      attestation.operationType === 'OPC-WS-SETUP'
        ? 'setup-fact'
        : attestation.operationType === 'OPC-WS-PRESERVE' || attestation.preserved
          ? 'preservation-fact'
          : 'workspace-fact',
    operation: attestation.operation,
    operationType: attestation.operationType,
    binding: attestation.binding,
    hostFingerprint: attestation.hostFingerprint,
    workspaceFingerprint: attestation.workspaceFingerprint,
    contentDigest: attestation.contentDigest,
    cleanliness: attestation.cleanliness,
    setupReceipt: attestation.setupReceipt,
    preserved: attestation.preserved,
    proof: attestation.proof,
  });

const validateAttestation = (
  value: unknown,
  intent: WorkspaceOperationIntent,
): WorkspaceResult<WorkspaceAttestation> => {
  const raw = exactFields(value, [
    'version',
    'provider',
    'operation',
    'operationType',
    'port',
    'capability',
    'binding',
    'hostFingerprint',
    'workspaceFingerprint',
    'contentDigest',
    'cleanliness',
    'setupReceipt',
    'preserved',
    'proof',
    'successClaim',
  ]);
  if (!raw) return fail('FC-MECHANISM', 'INVALID_WORKSPACE_ATTESTATION');
  const binding = parseBinding(raw.binding);
  const proof = parseProof(raw.proof, intent.operation, intent.binding.subject.run);
  const receipt = raw.setupReceipt === null ? null : parseReceipt(raw.setupReceipt);
  if (raw.setupReceipt === undefined || (raw.setupReceipt !== null && receipt === undefined))
    return fail('FC-MECHANISM', 'INVALID_WORKSPACE_ATTESTATION');
  const normalizedReceipt: WorkspaceSetupReceipt | null = receipt === undefined ? null : receipt;
  if (
    raw.version !== WORKSPACE_CONTRACT_VERSION ||
    raw.provider !== 'fixture-only' ||
    raw.operation !== intent.operation ||
    raw.operationType !== intent.operationType ||
    raw.port !== WORKSPACE_PORT ||
    raw.capability !== WORKSPACE_CAPABILITY ||
    !binding ||
    !same(binding, intent.binding) ||
    !safeDigest(raw.hostFingerprint) ||
    !safeDigest(raw.workspaceFingerprint) ||
    !safeDigest(raw.contentDigest) ||
    !['clean', 'dirty', 'ambiguous'].includes(raw.cleanliness as string) ||
    (raw.setupReceipt !== null && !normalizedReceipt) ||
    typeof raw.preserved !== 'boolean' ||
    !proof ||
    raw.successClaim !== 'observed'
  )
    return fail('FC-MECHANISM', 'INVALID_WORKSPACE_ATTESTATION');
  if (
    normalizedReceipt &&
    (!same(normalizedReceipt.binding, intent.binding) ||
      normalizedReceipt.operation !== intent.operation ||
      normalizedReceipt.recipeDigest !== intent.binding.recipeDigest ||
      normalizedReceipt.inputFingerprintDigest !== intent.binding.inputFingerprintDigest ||
      normalizedReceipt.hostFingerprint !== raw.hostFingerprint ||
      normalizedReceipt.workspaceFingerprint !== raw.workspaceFingerprint ||
      normalizedReceipt.freshnessFingerprint !== freshnessFingerprint(intent.binding, raw.hostFingerprint) ||
      normalizedReceipt.effectDigest !==
        digest('WORKSPACE-SETUP-EFFECT', { binding: intent.binding, contentDigest: raw.contentDigest }) ||
      !same(normalizedReceipt.proof, proof))
  )
    return fail('FC-FENCE', 'SETUP_RECEIPT_BINDING_MISMATCH');
  if ((intent.operationType === 'OPC-WS-PRESERVE') !== raw.preserved)
    return fail('FC-FENCE', 'PRESERVATION_FACT_OPERATION_MISMATCH');
  if ((intent.operationType === 'OPC-WS-SETUP') !== (normalizedReceipt !== null))
    return fail('FC-FENCE', 'SETUP_RECEIPT_BINDING_MISMATCH');
  return ok(
    Object.freeze({
      version: WORKSPACE_CONTRACT_VERSION,
      provider: 'fixture-only',
      operation: intent.operation,
      operationType: intent.operationType,
      port: WORKSPACE_PORT,
      capability: WORKSPACE_CAPABILITY,
      binding,
      hostFingerprint: raw.hostFingerprint,
      workspaceFingerprint: raw.workspaceFingerprint,
      contentDigest: raw.contentDigest,
      cleanliness: raw.cleanliness as WorkspaceCleanliness,
      setupReceipt: normalizedReceipt,
      preserved: raw.preserved,
      proof,
      successClaim: 'observed',
    }),
  );
};

const validateBinding = (
  binding: unknown,
  expectedType?: WorkspaceOperationType,
): WorkspaceResult<WorkspaceBinding> => {
  const parsed = parseBinding(binding);
  if (!parsed) return fail('FC-INPUT', 'INVALID_WORKSPACE_BINDING');
  if (expectedType && parsed.operationType !== expectedType) return fail('FC-SUBJECT', 'OPERATION_BINDING_MISMATCH');
  return ok(parsed);
};

const validateIntent = (value: WorkspaceOperationIntent): WorkspaceResult<WorkspaceOperationIntent> => {
  const binding = validateBinding(value?.binding, value?.operationType);
  if (
    !binding.ok ||
    value?.version !== WORKSPACE_CONTRACT_VERSION ||
    value.operation !== binding.value.operation ||
    value.port !== WORKSPACE_PORT ||
    value.capability !== WORKSPACE_CAPABILITY ||
    value.effect !== operationEffect(binding.value.operationType)
  )
    return fail('FC-AUTHORITY', 'INVALID_WORKSPACE_INTENT');
  const proof = binding.ok ? parseProof(value.proof, value.operation, binding.value.subject.run) : undefined;
  if (!proof) return fail('FC-AUTHORITY', 'UNWITNESSED_WORKSPACE_INTENT');
  return ok(Object.freeze({ ...value, binding: binding.value, proof }));
};

export function createScriptedWorkspaceFixture(): ScriptedWorkspaceFixture {
  const invocations: WorkspaceInvocation[] = [];
  const dispatched = new Set<string>();
  const uncertain = new Set<string>();
  const operationBindings = new Map<string, WorkspaceBinding>();
  const operationOutcomes = new Map<string, 'confirmed-effect' | 'confirmed-absence' | 'indeterminate'>();

  const dispatch = (input: unknown): WorkspaceResult<WorkspaceAttestation> => {
    const raw =
      exactFields(input, ['operation', 'operationType', 'binding', 'proof', 'fault']) ??
      exactFields(input, ['operation', 'operationType', 'binding', 'proof']);
    const binding = raw && parseBinding(raw.binding);
    const proof = raw && binding && parseProof(raw.proof, raw.operation as string, binding.subject.run);
    if (
      !raw ||
      !binding ||
      !proof ||
      raw.operation !== binding.operation ||
      raw.operationType !== binding.operationType
    )
      return fail('FC-AUTHORITY', 'INVALID_SCRIPTED_DISPATCH');
    const fault = raw.fault === undefined ? 'none' : raw.fault;
    if (!['none', 'lost-response', 'uncertain', 'duplicate', 'crash'].includes(fault as string))
      return fail('FC-INPUT', 'INVALID_SCRIPTED_FAULT');
    if (dispatched.has(operationKey(binding)) || fault === 'duplicate')
      return fail('FC-EFFECT', 'DUPLICATE_WORKSPACE_OPERATION');
    dispatched.add(operationKey(binding));
    const effect = operationEffect(binding.operationType);
    const result =
      binding.operationType === 'OPC-WS-RETIRE'
        ? 'disabled'
        : fault === 'crash'
          ? 'crashed'
          : fault === 'lost-response' || fault === 'uncertain'
            ? 'lost-response'
            : 'returned';
    invocations.push(
      Object.freeze({ operation: binding.operation, operationType: binding.operationType, effect, result }),
    );
    if (fault === 'lost-response' || fault === 'uncertain') {
      uncertain.add(binding.operation);
      operationBindings.set(binding.operation, binding);
      operationOutcomes.set(binding.operation, 'indeterminate');
      return fail('FC-EFFECT', 'UNCERTAIN_WORKSPACE_EFFECT');
    }
    if (fault === 'crash') {
      uncertain.add(binding.operation);
      operationBindings.set(binding.operation, binding);
      operationOutcomes.set(binding.operation, 'confirmed-absence');
      return fail('FC-MECHANISM', 'WORKSPACE_PROCESS_CRASHED');
    }
    if (binding.operationType === 'OPC-WS-RETIRE') return fail('FC-AUTHORITY', 'REAL_RETIRE_DISABLED');
    const hostFingerprint = digest('WORKSPACE-HOST', { host: binding.host, manifest: binding.manifest });
    const workspaceFingerprint = digest('WORKSPACE-PATH', {
      repository: binding.repository,
      path: binding.path,
      basis: binding.basis,
    });
    const contentDigest = digest('WORKSPACE-CONTENT', {
      repository: binding.repository,
      path: binding.path,
      basis: binding.basis,
    });
    const setupFreshness = hostFingerprint && freshnessFingerprint(binding, hostFingerprint);
    const setupEffect = digest('WORKSPACE-SETUP-EFFECT', { binding, contentDigest });
    if (!hostFingerprint || !workspaceFingerprint || !contentDigest || !setupFreshness || !setupEffect)
      return fail('FC-MECHANISM', 'SCRIPTED_FACT_UNAVAILABLE');
    const receipt =
      binding.operationType === 'OPC-WS-SETUP'
        ? Object.freeze({
            version: WORKSPACE_CONTRACT_VERSION,
            operation: binding.operation,
            binding,
            hostFingerprint,
            workspaceFingerprint,
            recipeDigest: binding.recipeDigest,
            inputFingerprintDigest: binding.inputFingerprintDigest,
            freshnessFingerprint: setupFreshness,
            effectDigest: setupEffect,
            completed: true as const,
            proof,
          })
        : null;
    return ok(
      Object.freeze({
        version: WORKSPACE_CONTRACT_VERSION,
        provider: 'fixture-only',
        operation: binding.operation,
        operationType: binding.operationType,
        port: WORKSPACE_PORT,
        capability: WORKSPACE_CAPABILITY,
        binding,
        hostFingerprint,
        workspaceFingerprint,
        contentDigest,
        cleanliness: 'clean',
        setupReceipt: receipt,
        preserved: binding.operationType === 'OPC-WS-PRESERVE',
        proof,
        successClaim: 'observed',
      }),
    );
  };

  const lookup = (
    input: unknown,
  ): WorkspaceResult<
    Readonly<{
      operation: string;
      outcome: 'confirmed-effect' | 'confirmed-absence' | 'indeterminate';
      observationDigest: string;
    }>
  > => {
    const raw = exactFields(input, ['operation', 'binding']);
    const binding = raw && parseBinding(raw.binding);
    if (!raw || !identity('ID-OP', raw.operation) || !binding || binding.operation !== raw.operation)
      return fail('FC-INPUT', 'INVALID_WORKSPACE_LOOKUP');
    if (!uncertain.has(raw.operation)) return fail('FC-EFFECT', 'LOOKUP_REQUIRES_UNCERTAINTY');
    if (!same(binding, operationBindings.get(raw.operation))) return fail('FC-FENCE', 'LOOKUP_BINDING_MISMATCH');
    const outcome = operationOutcomes.get(raw.operation);
    const observationDigest =
      outcome && digest('WORKSPACE-LOOKUP-OBSERVATION', { operation: raw.operation, binding, outcome });
    if (!outcome || !observationDigest) return fail('FC-TRUST', 'LOOKUP_OBSERVATION_UNAVAILABLE');
    return ok(
      Object.freeze({
        operation: raw.operation,
        outcome,
        observationDigest,
      }),
    );
  };

  return Object.freeze({
    dispatch,
    lookup,
    invocations: () => Object.freeze([...invocations]),
    reachability: () =>
      Object.freeze({
        providerEnabled: false as const,
        dispatchEnabled: false as const,
        status: 'unavailable' as const,
      }),
  });
}

export function createWorkspaceTransitionRecorder(): WorkspaceTransitionRecorder & {
  intents(): readonly WorkspaceOperationIntent[];
} {
  const recorded: WorkspaceOperationIntent[] = [];
  return Object.freeze({
    recordIntent: (input: WorkspaceOperationIntent): WorkspaceResult<WorkspaceCommitProof> => {
      const intent = validateIntent(input);
      if (!intent.ok) return intent;
      if (recorded.some((entry) => entry.operation === intent.value.operation))
        return fail('FC-EFFECT', 'DUPLICATE_WORKSPACE_INTENT');
      recorded.push(intent.value);
      return ok(intent.value.proof);
    },
    intents: () => Object.freeze([...recorded]),
  });
}

function createWorkspaceControllerInternal(
  input: Readonly<{ transition: WorkspaceTransitionRecorder; fixture?: ScriptedWorkspaceFixture }>,
  snapshot?: WorkspaceSnapshot,
): WorkspaceController {
  const fixture = input.fixture ?? createScriptedWorkspaceFixture();
  const intents: WorkspaceOperationIntent[] = [...(snapshot?.intents ?? [])];
  const facts: WorkspaceFact[] = [...(snapshot?.facts ?? [])];
  const preserved = new Set<string>(facts.filter((fact) => fact.preserved).map((fact) => bindingKey(fact.binding)));
  const setupIntents = new Set<string>(snapshot?.setupIntentKeys ?? []);
  const uncertain = new Set<string>(snapshot?.uncertainOperations ?? []);

  const execute = (bindingInput: unknown, fault: WorkspaceFault = 'none'): WorkspaceResult<WorkspaceFact> => {
    const bindingResult = validateBinding(bindingInput);
    if (!bindingResult.ok) return bindingResult;
    const binding = bindingResult.value;
    const intentDigest = digest('WORKSPACE-INTENT', { binding, operation: binding.operation });
    if (!intentDigest) return fail('FC-INPUT', 'WORKSPACE_INTENT_DIGEST_FAILED');
    const coordinates = proofCoordinates(binding.operation, binding.subject.run);
    if (!coordinates) return fail('FC-AUTHORITY', 'WORKSPACE_PROOF_COORDINATES_INVALID');
    const intent: WorkspaceOperationIntent = Object.freeze({
      version: WORKSPACE_CONTRACT_VERSION,
      operation: binding.operation,
      operationType: binding.operationType,
      effect: operationEffect(binding.operationType),
      port: WORKSPACE_PORT,
      capability: WORKSPACE_CAPABILITY,
      binding,
      proof: Object.freeze({
        kind: 'committed-witnessed',
        position: coordinates.position,
        event: coordinates.event,
        transaction: coordinates.transaction,
        operation: binding.operation,
        recordDigest: intentDigest,
        witnessDigest: intentDigest,
      }),
    });
    if (intents.some((existing) => existing.operation === intent.operation))
      return fail('FC-EFFECT', 'DUPLICATE_WORKSPACE_INTENT');
    const recorded = input.transition.recordIntent(intent);
    if (!recorded.ok) return recorded;
    intents.push(intent);
    const dispatched = fixture.dispatch({
      operation: binding.operation,
      operationType: binding.operationType,
      binding,
      proof: recorded.value,
      fault,
    });
    if (!dispatched.ok) {
      if (dispatched.error.family === 'FC-EFFECT' || dispatched.error.code === 'WORKSPACE_PROCESS_CRASHED')
        uncertain.add(binding.operation);
      return dispatched;
    }
    const attestation = validateAttestation(dispatched.value, intent);
    if (!attestation.ok) return attestation;
    if (attestation.value.cleanliness !== 'clean')
      return fail(
        'FC-SUBJECT',
        attestation.value.cleanliness === 'dirty' ? 'WORKSPACE_DIRTY' : 'WORKSPACE_CLEANLINESS_AMBIGUOUS',
      );
    const fact = factFromAttestation(attestation.value);
    facts.push(fact);
    if (fact.preserved) preserved.add(bindingKey(binding));
    return ok(fact);
  };

  const setup = (
    value: Readonly<{ binding: WorkspaceBinding; receipt: WorkspaceSetupReceipt | null; fault?: WorkspaceFault }>,
  ): WorkspaceResult<Readonly<{ status: 'no-op' } | WorkspaceFact>> => {
    const bindingResult = validateBinding(value?.binding, 'OPC-WS-SETUP');
    if (!bindingResult.ok) return bindingResult;
    const binding = bindingResult.value;
    if (value.receipt !== null && !same(parseReceipt(value.receipt)?.binding, binding))
      return fail('FC-FENCE', 'SETUP_RECEIPT_BINDING_MISMATCH');
    const receipt = value.receipt === null ? null : parseReceipt(value.receipt);
    if (value.receipt !== null && !receipt) return fail('FC-FENCE', 'INVALID_SETUP_RECEIPT');
    const expectedHostFingerprint = digest('WORKSPACE-HOST', { host: binding.host, manifest: binding.manifest });
    const expectedFreshness = expectedHostFingerprint && freshnessFingerprint(binding, expectedHostFingerprint);
    if (!expectedHostFingerprint || !expectedFreshness) return fail('FC-INPUT', 'SETUP_FRESHNESS_INPUT_INVALID');
    const storedSetupFact =
      receipt &&
      facts.find(
        (fact) =>
          fact.kind === 'setup-fact' &&
          fact.operation === binding.operation &&
          same(fact.binding, binding) &&
          fact.setupReceipt !== null &&
          same(fact.setupReceipt, receipt),
      );
    if (
      receipt &&
      receipt.recipeDigest === binding.recipeDigest &&
      receipt.inputFingerprintDigest === binding.inputFingerprintDigest &&
      receipt.hostFingerprint === expectedHostFingerprint &&
      receipt.freshnessFingerprint === expectedFreshness &&
      receipt.completed &&
      storedSetupFact
    )
      return ok(Object.freeze({ status: 'no-op' as const }));
    const key = `${binding.operation}\0${bindingKey(binding)}\0${binding.recipeDigest}\0${binding.inputFingerprintDigest}`;
    if (setupIntents.has(key)) return fail('FC-EFFECT', 'DUPLICATE_SETUP_INTENT');
    setupIntents.add(key);
    return execute(binding, value.fault);
  };

  const preserveOperation = (
    value: Readonly<{ binding: WorkspaceBinding; fault?: WorkspaceFault }>,
  ): WorkspaceResult<WorkspaceFact> => {
    const bindingResult = validateBinding(value?.binding, 'OPC-WS-PRESERVE');
    if (!bindingResult.ok) return bindingResult;
    return execute(bindingResult.value, value.fault);
  };

  const retire = (value: Readonly<{ binding: WorkspaceBinding; fault?: WorkspaceFault }>): WorkspaceResult<never> => {
    const bindingResult = validateBinding(value?.binding, 'OPC-WS-RETIRE');
    if (!bindingResult.ok) return bindingResult;
    if (!preserved.has(bindingKey(bindingResult.value))) return fail('FC-AUTHORITY', 'PRESERVATION_REQUIRED');
    const result = execute(bindingResult.value, value.fault);
    return result.ok ? fail('FC-AUTHORITY', 'REAL_RETIRE_DISABLED') : result;
  };

  const reconcile = (
    value: Readonly<{
      operation: string;
      binding: WorkspaceBinding;
    }>,
  ): WorkspaceResult<
    Readonly<{ operation: string; outcome: 'confirmed-effect' | 'confirmed-absence' | 'indeterminate' }>
  > => {
    const bindingResult = validateBinding(value?.binding);
    if (!bindingResult.ok) return bindingResult;
    if (value.operation !== bindingResult.value.operation || !uncertain.has(value.operation))
      return fail('FC-EFFECT', 'RECONCILIATION_BINDING_REQUIRED');
    const observation = fixture.lookup({
      operation: value.operation,
      binding: bindingResult.value,
    });
    if (!observation.ok) return observation;
    if (observation.value.outcome !== 'indeterminate') uncertain.delete(value.operation);
    return ok(Object.freeze({ operation: value.operation, outcome: observation.value.outcome }));
  };

  return Object.freeze({
    provision: (value) => {
      const binding = validateBinding(value?.binding, 'OPC-WS-PROVISION');
      return binding.ok ? execute(binding.value, value.fault) : binding;
    },
    setup,
    observe: (value) => {
      const binding = validateBinding(value?.binding, 'OPC-WS-OBSERVE');
      return binding.ok ? execute(binding.value, value.fault) : binding;
    },
    preserve: preserveOperation,
    retire,
    reconcile,
    intents: () => Object.freeze([...intents]),
    facts: () => Object.freeze([...facts]),
    snapshot: () =>
      Object.freeze({
        version: WORKSPACE_CONTRACT_VERSION,
        intents: Object.freeze([...intents]),
        facts: Object.freeze([...facts]),
        setupIntentKeys: Object.freeze([...setupIntents]),
        uncertainOperations: Object.freeze([...uncertain]),
      }),
  });
}

export function createWorkspaceController(
  input: Readonly<{ transition: WorkspaceTransitionRecorder; fixture?: ScriptedWorkspaceFixture }>,
): WorkspaceController {
  return createWorkspaceControllerInternal(input);
}

export function restoreWorkspaceController(
  input: Readonly<{
    transition: WorkspaceTransitionRecorder;
    fixture?: ScriptedWorkspaceFixture;
    snapshot: unknown;
  }>,
): WorkspaceResult<WorkspaceController> {
  const snapshot = parseSnapshot(input?.snapshot);
  if (!snapshot) return fail('FC-TRUST', 'INVALID_WORKSPACE_SNAPSHOT');
  for (const intent of snapshot.intents) {
    const recorded = input.transition.recordIntent(intent);
    if (!recorded.ok) return recorded;
  }
  return ok(
    createWorkspaceControllerInternal(
      {
        transition: input.transition,
        fixture: input.fixture,
      },
      snapshot,
    ),
  );
}
