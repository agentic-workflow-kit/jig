import type { ConfigDoc } from './types.js';

export interface DriverSelection {
  agent: string;
  executionHost: string;
  forge: string;
  workSource: string;
}

const REFERENCE_SELECTION: DriverSelection = {
  agent: 'reference',
  executionHost: 'reference',
  forge: 'reference',
  workSource: 'reference',
};

const SUPPORTED_SELECTIONS: Record<keyof DriverSelection, Set<string>> = {
  agent: new Set(['reference', 'scripted-stub', 'codex']),
  executionHost: new Set(['reference', 'local', 'real']),
  forge: new Set(['reference', 'github']),
  workSource: new Set(['reference', 'github-issues']),
};

export class ProviderSelectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderSelectionError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readDriverSelection(config: ConfigDoc): DriverSelection {
  const raw = config.drivers;
  if (raw === undefined) {
    return REFERENCE_SELECTION;
  }

  if (!isRecord(raw)) {
    throw new ProviderSelectionError(
      'Unknown provider driver selection. Use reference drivers or omit config.drivers.',
    );
  }

  return {
    agent: typeof raw.agent === 'string' ? raw.agent : REFERENCE_SELECTION.agent,
    executionHost: typeof raw.executionHost === 'string' ? raw.executionHost : REFERENCE_SELECTION.executionHost,
    forge: typeof raw.forge === 'string' ? raw.forge : REFERENCE_SELECTION.forge,
    workSource: typeof raw.workSource === 'string' ? raw.workSource : REFERENCE_SELECTION.workSource,
  };
}

export function assertSupportedDriverSelection(selection: DriverSelection): void {
  for (const [seam, driver] of Object.entries(selection) as Array<[keyof DriverSelection, string]>) {
    if (!SUPPORTED_SELECTIONS[seam].has(driver)) {
      throw new ProviderSelectionError(
        `Unsupported driver selection "${seam}=${driver}". Supported drivers: agent=reference|scripted-stub|codex, executionHost=reference|local|real, forge=reference|github, workSource=reference|github-issues.`,
      );
    }
  }
}

export function driverSelectionUsesRealDriver(selection: DriverSelection): boolean {
  return (
    selection.agent === 'codex' ||
    selection.executionHost === 'real' ||
    selection.forge === 'github' ||
    selection.workSource === 'github-issues'
  );
}

export function driverSelectionsEqual(left: DriverSelection, right: DriverSelection): boolean {
  return (
    left.agent === right.agent &&
    left.executionHost === right.executionHost &&
    left.forge === right.forge &&
    left.workSource === right.workSource
  );
}
