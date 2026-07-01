import { PlanValidator } from './plan-validator.js';
import { loadJson, loadConfig, loadPolicy } from './loaders.js';
import { LocalHarness } from './harness.js';
import { ScriptedWorker } from './worker.js';
import { RecordManager } from './records.js';

export async function run() {
  const args = process.argv.slice(2);

  if (args[0] !== 'run' || !args[1]) {
    console.error('Usage: jig run <plan> [--config <config>] [--policy <policy>] [--scripted-output <output>]');
    process.exit(1);
  }

  const planPath = args[1];
  const configPath = getArg(args, '--config') || 'test/fixtures/m5b-local-mvp/local-config.json';
  const policyPath = getArg(args, '--policy') || 'test/fixtures/m5b-local-mvp/local-policy.json';
  const scriptedOutputPath = getArg(args, '--scripted-output') || 'test/fixtures/m5b-local-mvp/scripted-worker-success.json';

  try {
    const planInstance = loadJson(planPath);
    PlanValidator.validate(planInstance);

    const config = loadConfig(configPath);
    const policy = loadPolicy(policyPath);
    const scriptedOutput = loadJson(scriptedOutputPath);

    const worker = new ScriptedWorker(scriptedOutput);
    const recordManager = new RecordManager();
    const harness = new LocalHarness(worker, recordManager);

    const status = await harness.run(planInstance, config, policy);

    if (status !== 'success') {
      process.exit(1);
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

function getArg(args, name) {
  const index = args.indexOf(name);
  if (index !== -1 && args[index + 1]) {
    return args[index + 1];
  }
  return null;
}
