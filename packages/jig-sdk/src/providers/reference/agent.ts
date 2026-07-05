import type { AgentPort } from '../../ports.js';
import { ScriptedWorker } from '../../worker.js';

export function createReferenceAgent(scriptedOutput: Record<string, unknown>): AgentPort {
  return new ScriptedWorker(scriptedOutput);
}
