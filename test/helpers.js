// Shared test helpers: plans built inline, checked in memory or written into a temporary folder that is removed after the
// test. Paths are built with resolve() from forward-slash names, so the same test runs on Linux, macOS and Windows. The
// line a test expects is found with lineOf(), which counts lines the way the reader does, so a test never holds a line
// number worked out by hand for one system only. No test reads the clock, the time zone or the locale.

import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { checkText, main } from '../src/index.js';

export async function withFiles(files, fn) {
  const dir = await mkdtemp(resolve(tmpdir(), 'tokenomics-check-'));
  try {
    for (const [rel, content] of Object.entries(files)) {
      await mkdir(dirname(resolve(dir, rel)), { recursive: true });
      await writeFile(resolve(dir, rel), content);
    }
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// The line (from 1) of the n-th place where needle starts in text.
export function lineOf(text, needle, n = 1) {
  let at = -1;
  for (let i = 0; i < n; i += 1) {
    at = text.indexOf(needle, at + 1);
    if (at < 0) throw new Error(`${needle} is not in the text ${n} times`);
  }
  return text.slice(0, at).split('\n').length;
}

// A bucket: share is { percent } or { amount }.
export const bucket = (name, kind, share, vesting) => ({ name, kind, ...share, ...(vesting === undefined ? {} : { vesting }) });

// Three buckets that pass every check at the default thresholds: a team behind a cliff of 12 months, the liquidity at
// launch and a treasury over 48 months.
export const BUCKETS = [
  bucket('Team', 'team', { percent: 20 }, { cliffMonths: 12, linearMonths: 24 }),
  bucket('Liquidity', 'liquidity', { percent: 10 }, { launchPercent: 100 }),
  bucket('Treasury', 'treasury', { percent: 70 }, { launchPercent: 10, linearMonths: 48 })
];

// A plan with every field the checks need; over replaces fields, and a field set to undefined is left out.
export function plan(over = {}, buckets = BUCKETS) {
  const base = { name: 'Test Token', symbol: 'TST', decimals: 18, maxSupply: '1000000', mintable: false, tradingAtLaunch: true, allocations: buckets };
  const out = { ...base, ...over };
  for (const [k, v] of Object.entries(out)) if (v === undefined) delete out[k];
  return out;
}

export const planText = (obj) => `${JSON.stringify(obj, null, 2)}\n`;

// The findings of a plan given as an object, through the reader and the checks.
export const findingsOf = (obj, options) => checkText(planText(obj), options).findings;

// The ids of the findings of a plan.
export const idsOf = (obj, options) => findingsOf(obj, options).map((f) => f.id);

// The findings of one check.
export const ofCheck = (obj, id, options) => findingsOf(obj, options).filter((f) => f.id === id);

// Runs the command line with exactly these arguments, in a folder.
export async function cli(argv, base) {
  let out = '';
  let err = '';
  const code = await main(argv, { out: (t) => { out += t; }, err: (t) => { err += t; } }, undefined, base);
  return { code, out, err };
}

// Writes the files and runs the command line in the folder.
export async function run(files, args) {
  return withFiles(files, (dir) => cli(args, dir));
}

// A clean plan, and one whose buckets add up to 90 percent, for the command line tests.
export const GOOD = planText(plan());
export const BAD = planText(plan({}, [BUCKETS[0], BUCKETS[1], bucket('Treasury', 'treasury', { percent: 60 }, { launchPercent: 10, linearMonths: 48 })]));

// The time a hostile test may take: four times as long when the runner collects coverage, which sets NODE_V8_COVERAGE.
export const allowed = (ms) => (process.env.NODE_V8_COVERAGE ? ms * 4 : ms);
