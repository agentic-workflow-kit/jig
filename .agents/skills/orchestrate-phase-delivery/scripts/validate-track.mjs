#!/usr/bin/env node

import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultRepoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const defaultTrackPath = join(defaultRepoRoot, 'docs/delivery/greenfield/track.json');
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

function duplicateJsonKeys(source) {
  const duplicates = [];
  const containers = [];
  for (let index = 0; index < source.length; index += 1) {
    const value = source[index];
    if (value === '{') containers.push({ type: 'object', keys: new Set() });
    else if (value === '[') containers.push({ type: 'array' });
    else if (value === '}' || value === ']') containers.pop();
    else if (value === '"') {
      let end = index + 1;
      for (; end < source.length; end += 1) {
        if (source[end] === '\\') end += 1;
        else if (source[end] === '"') break;
      }
      let next = end + 1;
      while (next < source.length && /\s/.test(source[next])) next += 1;
      const container = containers.at(-1);
      if (container?.type === 'object' && source[next] === ':') {
        try {
          const key = JSON.parse(source.slice(index, end + 1));
          if (container.keys.has(key)) duplicates.push(key);
          else container.keys.add(key);
        } catch {
          // The full JSON parse below reports malformed string syntax.
        }
      }
      index = end;
    }
  }
  return [...new Set(duplicates)];
}

export function validateTrack(track) {
  const errors = [];
  if (!isRecord(track)) return ['track must be a JSON object'];
  if (track.schema_version !== 1) errors.push('track schema_version must be 1');
  if (!Array.isArray(track.stories)) return [...errors, 'track stories must be an array'];
  if (!Array.isArray(track.phases)) return [...errors, 'track phases must be an array'];

  const storiesById = new Map();
  for (const story of track.stories) {
    if (
      !isRecord(story) ||
      !/^GF-\d{3}$/.test(story.id) ||
      !Number.isInteger(story.phase) ||
      story.phase < 0 ||
      !Array.isArray(story.dependencies) ||
      story.dependencies.some((dependency) => typeof dependency !== 'string') ||
      typeof story.story_file !== 'string' ||
      !story.story_file
    ) {
      errors.push('every story needs an ID, phase, dependency list, and story_file');
      continue;
    }
    if (storiesById.has(story.id)) errors.push(`duplicate story ID: ${story.id}`);
    const canonicalStoryFile = `docs/delivery/greenfield/stories/${story.id}.md`;
    if (story.story_file !== canonicalStoryFile) errors.push(`${story.id} must reference ${canonicalStoryFile}`);
    storiesById.set(story.id, story);
  }

  const phaseMembership = new Map();
  const phaseIds = new Set();
  for (const phase of track.phases) {
    if (!isRecord(phase) || !Number.isInteger(phase.id) || !Array.isArray(phase.stories)) {
      errors.push('every phase needs an integer ID and story list');
      continue;
    }
    if (phaseIds.has(phase.id)) errors.push(`duplicate phase ID: ${phase.id}`);
    phaseIds.add(phase.id);
    for (const id of phase.stories) {
      if (typeof id !== 'string') {
        errors.push(`phase contains invalid story ${String(id)}`);
        continue;
      }
      if (!storiesById.has(id)) {
        errors.push(`phase contains unknown story ${id}`);
        continue;
      }
      if (phaseMembership.has(id)) errors.push(`story appears in multiple phases: ${id}`);
      phaseMembership.set(id, phase.id);
    }
  }

  for (const story of track.stories.filter(isRecord)) {
    if (typeof story.id !== 'string' || !Array.isArray(story.dependencies)) continue;
    if (phaseMembership.get(story.id) !== story.phase)
      errors.push(`${story.id} phase membership does not match story.phase`);
    for (const dependency of story.dependencies) {
      const predecessor = storiesById.get(dependency);
      if (!predecessor) errors.push(`${story.id} depends on unknown story ${dependency}`);
      else if (predecessor.phase > story.phase) errors.push(`${story.id} depends on ${dependency} from a later phase`);
    }
  }

  const visiting = new Set();
  const visited = new Set();
  const visit = (id) => {
    if (visiting.has(id)) {
      errors.push(`dependency cycle includes ${id}`);
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of storiesById.get(id)?.dependencies ?? [])
      if (storiesById.has(dependency)) visit(dependency);
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of storiesById.keys()) visit(id);

  return [...new Set(errors)];
}

export function validateTrackFile(trackPath = defaultTrackPath, repoRoot = defaultRepoRoot) {
  let source;
  try {
    source = readFileSync(trackPath, 'utf8');
  } catch (error) {
    return [`cannot read track JSON: ${error instanceof Error ? error.message : String(error)}`];
  }
  const duplicateKeys = duplicateJsonKeys(source);
  if (duplicateKeys.length) return duplicateKeys.map((key) => `duplicate JSON key: ${key}`);

  let track;
  try {
    track = JSON.parse(source);
  } catch (error) {
    return [`cannot read track JSON: ${error instanceof Error ? error.message : String(error)}`];
  }
  const errors = validateTrack(track);
  if (Array.isArray(track?.stories))
    for (const story of track.stories) {
      if (typeof story?.story_file !== 'string') continue;
      const storyPath = join(repoRoot, story.story_file);
      if (!existsSync(storyPath)) errors.push(`story file is missing: ${story.story_file}`);
      else if (!lstatSync(storyPath).isFile()) errors.push(`story file is not a regular file: ${story.story_file}`);
    }
  return errors;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log(`Usage: node .agents/skills/orchestrate-phase-delivery/scripts/validate-track.mjs

Validate the repository's delivery track before phase orchestration consumes its DAG.`);
    process.exit(0);
  }
  if (args.length) {
    console.error(`unexpected argument: ${args[0]}; use --help for usage`);
    process.exit(2);
  }

  const errors = validateTrackFile();
  if (errors.length) {
    console.error('Delivery track validation failed:');
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    const track = JSON.parse(readFileSync(defaultTrackPath, 'utf8'));
    console.log(
      JSON.stringify({
        valid: true,
        stories: track.stories.length,
        phases: track.phases.length,
      }),
    );
  }
}
