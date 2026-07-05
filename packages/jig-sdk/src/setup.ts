import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig, loadPolicy, loadRepoPolicyFloors, loadWorkProfile } from './loaders.js';
import type { BoundOwnerConfiguration, ConfigDoc, PolicyDoc, RepoPolicyFloorsDoc, WorkProfileDoc } from './types.js';

export type SetupTemplate = 'conservative-manual' | 'assisted-local';
export type SetupProviderPosture = 'reference-scripted' | 'real-local';

export interface SetupAnswers {
  trackId: string;
  template: SetupTemplate;
  providerPosture: SetupProviderPosture;
  setupCommand?: string;
  freshnessCheck?: string;
  force?: boolean;
}

export interface SetupArtifact {
  path: string;
  kind: 'config' | 'policy' | 'work-profile' | 'repo-policy-floors' | 'setup-record';
  reason: string;
}

export interface SetupCommandResult {
  command: string;
  freshnessCheck?: string;
  action: 'skipped-fresh' | 'ran-stale';
}

export interface SetupResult {
  status: 'created' | 'noop';
  outputDir: string;
  template: SetupTemplate;
  providerPosture: SetupProviderPosture;
  reasoning: string[];
  artifacts: SetupArtifact[];
  setupCommand?: SetupCommandResult;
}

interface SetupTemplateSpec {
  version: 'setup-template-v0';
  template: SetupTemplate;
  reasoning: string[];
  policyRules: NonNullable<PolicyDoc['policy']>['rules'];
  workProfile: Pick<WorkProfileDoc['workProfile'], 'model' | 'effort' | 'promptStrategy' | 'roleRealization'>;
  repoPolicyFloorRules: RepoPolicyFloorsDoc['repoPolicyFloors']['rules'];
}

function assertSetupAnswers(answers: SetupAnswers): void {
  if (!answers.trackId || answers.trackId.trim() === '') {
    throw new Error('Invalid setup.trackId: expected a non-empty string');
  }
  if (!['conservative-manual', 'assisted-local'].includes(answers.template)) {
    throw new Error('Invalid setup.template: expected "conservative-manual" or "assisted-local"');
  }
  if (!['reference-scripted', 'real-local'].includes(answers.providerPosture)) {
    throw new Error('Invalid setup.providerPosture: expected "reference-scripted" or "real-local"');
  }
  if (answers.freshnessCheck && !answers.setupCommand) {
    throw new Error('Invalid setup.freshnessCheck: --setup-command is required when --freshness-check is provided');
  }
}

function driverBlock(posture: SetupProviderPosture): ConfigDoc['drivers'] {
  if (posture === 'real-local') {
    return {
      agent: 'codex',
      executionHost: 'real',
      forge: 'github',
      workSource: 'github-issues',
    };
  }

  return {
    agent: 'scripted-stub',
    executionHost: 'local',
    forge: 'reference',
    workSource: 'reference',
  };
}

function templateCandidates(template: SetupTemplate): string[] {
  const sourceDir = fileURLToPath(new URL('.', import.meta.url));
  return [
    resolve(sourceDir, '..', 'templates', 'setup', `${template}.json`),
    resolve(sourceDir, '..', '..', 'templates', 'setup', `${template}.json`),
  ];
}

function loadSetupTemplate(template: SetupTemplate): SetupTemplateSpec {
  const templatePath = templateCandidates(template).find((candidate) => existsSync(candidate));
  if (!templatePath) {
    throw new Error(`Setup template "${template}" was not found in the SDK template assets`);
  }

  const spec = JSON.parse(readFileSync(templatePath, 'utf8')) as SetupTemplateSpec;
  if (spec.version !== 'setup-template-v0' || spec.template !== template || !Array.isArray(spec.reasoning)) {
    throw new Error(`Invalid setup template asset "${templatePath}"`);
  }
  return spec;
}

function policyFor(answers: SetupAnswers, template: SetupTemplateSpec): PolicyDoc {
  return {
    version: 'policy-v0',
    policy: {
      id: `${answers.trackId}:policy:${answers.template}`,
      rules: template.policyRules,
    },
  };
}

function workProfileFor(answers: SetupAnswers, template: SetupTemplateSpec): WorkProfileDoc {
  return {
    version: 'work-profile-v0',
    workProfile: {
      id: `${answers.trackId}:work-profile:${answers.template}`,
      ...template.workProfile,
      ...(answers.setupCommand
        ? {
            setup: {
              command: answers.setupCommand,
              ...(answers.freshnessCheck ? { freshnessCheck: answers.freshnessCheck } : {}),
            },
          }
        : {}),
    },
  };
}

function repoFloorsFor(answers: SetupAnswers, template: SetupTemplateSpec): RepoPolicyFloorsDoc {
  return {
    version: 'repo-policy-floors-v0',
    repoPolicyFloors: {
      id: `${answers.trackId}:repo-policy-floors`,
      rules: template.repoPolicyFloorRules,
    },
  };
}

function configFor(answers: SetupAnswers): ConfigDoc {
  return {
    version: 'config-v0',
    runner: {
      mode: 'local-dry-run',
      recordDir: 'runs',
    },
    drivers: driverBlock(answers.providerPosture),
    track: {
      id: answers.trackId,
      workProfilePath: 'work-profile.json',
      repoPolicyFloorsPath: 'repo-policy-floors.json',
    },
  };
}

function writeJson(filePath: string, value: unknown): void {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function validateGeneratedArtifacts(outputDir: string): void {
  loadConfig(join(outputDir, 'jig.config.json'));
  loadPolicy(join(outputDir, 'policy.json'));
  loadWorkProfile(join(outputDir, 'work-profile.json'));
  loadRepoPolicyFloors(join(outputDir, 'repo-policy-floors.json'));
}

function existingFiles(paths: string[]): string[] {
  return paths.filter((path) => existsSync(path));
}

function allExistingArtifactsAreValid(outputDir: string): boolean {
  try {
    validateGeneratedArtifacts(outputDir);
    return true;
  } catch {
    return false;
  }
}

function runSetupCommandIfNeeded(answers: SetupAnswers, cwd: string): SetupCommandResult | undefined {
  if (!answers.setupCommand) {
    return undefined;
  }

  if (answers.freshnessCheck) {
    try {
      execFileSync('sh', ['-c', answers.freshnessCheck], { cwd, stdio: 'ignore' });
      return {
        command: answers.setupCommand,
        freshnessCheck: answers.freshnessCheck,
        action: 'skipped-fresh',
      };
    } catch {
      // Stale or missing setup evidence: run the declared setup command below.
    }
  }

  execFileSync('sh', ['-c', answers.setupCommand], { cwd, stdio: 'inherit' });
  return {
    command: answers.setupCommand,
    ...(answers.freshnessCheck ? { freshnessCheck: answers.freshnessCheck } : {}),
    action: 'ran-stale',
  };
}

export function runDeclaredWorkspaceSetup(
  ownerConfiguration: BoundOwnerConfiguration,
  cwd = process.cwd(),
): SetupCommandResult | undefined {
  const setup = ownerConfiguration.workProfile?.workProfile.setup;
  if (!setup?.command) {
    return undefined;
  }

  return runSetupCommandIfNeeded(
    {
      trackId: ownerConfiguration.trackRef ?? ownerConfiguration.workProfile?.workProfile.id ?? 'workspace',
      template: 'conservative-manual',
      providerPosture: 'reference-scripted',
      setupCommand: setup.command,
      ...(setup.freshnessCheck ? { freshnessCheck: setup.freshnessCheck } : {}),
    },
    cwd,
  );
}

export function createSetupArtifacts(outputDir: string, answers: SetupAnswers): SetupResult {
  assertSetupAnswers(answers);
  const targetDir = resolve(outputDir);
  const artifacts = [
    join(targetDir, 'jig.config.json'),
    join(targetDir, 'policy.json'),
    join(targetDir, 'work-profile.json'),
    join(targetDir, 'repo-policy-floors.json'),
    join(targetDir, 'setup-record.json'),
  ];
  const existing = existingFiles(artifacts);

  if (existing.length > 0 && !answers.force) {
    if (allExistingArtifactsAreValid(targetDir)) {
      return {
        status: 'noop',
        outputDir: targetDir,
        template: answers.template,
        providerPosture: answers.providerPosture,
        reasoning: ['Existing valid setup artifacts found; no files were changed. Pass --force to regenerate.'],
        artifacts: [],
      };
    }
    throw new Error(`Setup would overwrite existing files: ${existing.join(', ')}. Pass --force to regenerate.`);
  }

  mkdirSync(targetDir, { recursive: true });
  const setupCommand = runSetupCommandIfNeeded(answers, targetDir);
  const template = loadSetupTemplate(answers.template);
  const reasoning = [
    ...template.reasoning,
    answers.providerPosture === 'real-local'
      ? 'Real-local posture selects the existing real Codex, execution-host, forge, and work-source driver names.'
      : 'Reference-scripted posture keeps the first run hermetic and fixture-compatible.',
  ];
  const generated = {
    config: configFor(answers),
    policy: policyFor(answers, template),
    workProfile: workProfileFor(answers, template),
    repoPolicyFloors: repoFloorsFor(answers, template),
  };
  const emitted: SetupArtifact[] = [
    { path: artifacts[0], kind: 'config', reason: 'Binds the track, provider posture, work profile, and repo floors.' },
    { path: artifacts[1], kind: 'policy', reason: 'Captures the chosen governance preset.' },
    { path: artifacts[2], kind: 'work-profile', reason: 'Captures model, effort, prompt strategy, and setup command.' },
    { path: artifacts[3], kind: 'repo-policy-floors', reason: 'Keeps repo-owned safety floors tighten-only.' },
    { path: artifacts[4], kind: 'setup-record', reason: 'Records this setup invocation and template reasoning.' },
  ];

  writeJson(artifacts[0], generated.config);
  writeJson(artifacts[1], generated.policy);
  writeJson(artifacts[2], generated.workProfile);
  writeJson(artifacts[3], generated.repoPolicyFloors);
  writeJson(artifacts[4], {
    version: 'setup-record-v0',
    trackId: answers.trackId,
    template: answers.template,
    providerPosture: answers.providerPosture,
    reasoning,
    artifacts: emitted.map((artifact) => ({
      kind: artifact.kind,
      path: artifact.path,
      reason: artifact.reason,
    })),
    ...(setupCommand ? { setupCommand } : {}),
  });

  validateGeneratedArtifacts(targetDir);

  return {
    status: 'created',
    outputDir: targetDir,
    template: answers.template,
    providerPosture: answers.providerPosture,
    reasoning,
    artifacts: emitted,
    ...(setupCommand ? { setupCommand } : {}),
  };
}
