// Command line: tokenomics-check <plan.json> [options]

import { readFileSync } from 'node:fs';
import { parseDecimal } from './amounts.js';
import { DEFAULTS } from './analyze.js';
import { InputError, LIMITS, checkFile } from './check.js';
import { LEVELS } from './data.js';
import { PLAN_LIMITS } from './plan.js';
import { listChecksJson, listChecksMarkdown, listChecksText, toJson, toMarkdown, toSarif, toText } from './report.js';
import { RULES } from './rules.js';
import { safeText } from './text.js';

export const VERSION = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;

const FORMATS = { text: toText, markdown: toMarkdown, json: toJson, sarif: toSarif };
const LISTS = { text: listChecksText, markdown: listChecksMarkdown, json: listChecksJson };
const MAX_MONTHS = PLAN_LIMITS.maxMonth * 2;

export const USAGE = `Usage: tokenomics-check <plan.json> [options]

Reads the token plan of a new cryptocurrency or token (name, symbol, decimals, supply, mint and burn flags, and the
buckets with their vesting) and lists the problems to fix before the token is deployed: buckets that do not add up to
the supply, percents out of range, decimals or amounts the chain cannot hold, a stated maximum supply that nothing
enforces, insider buckets released at launch or with no cliff, vesting that is too short or too long, schedules that
release more than a bucket or never finish, months that release a large share of the circulating supply, and trading
with no liquidity at launch. It prints the release and the circulating supply month by month. It reads the file and is
not an adviser: it fetches nothing, runs nothing, reads no clock and writes nothing to disk.

Options:
  --format <name>           text, markdown, json or sarif (default: text)
  --json                    the same as --format json
  --min-severity <level>    the lowest level of a finding that is shown: ${LEVELS.join(', ')} (default: info)
  --fail-on <level>         the lowest level of a finding that fails the run: ${LEVELS.join(', ')} (default: error)
  --months <n>              the last month of the table, 0 to ${MAX_MONTHS} (default: the last release, at least 12)
  --cliff-share <percent>   supply-cliff: the share of the circulating supply one month may release (default: ${DEFAULTS.cliffShare})
  --min-cliff <months>      insider-no-cliff: the first month an insider bucket may release in after launch (default: ${DEFAULTS.minCliff})
  --min-vesting <months>    vesting-too-short: the month before which an insider bucket may not be fully released (default: ${DEFAULTS.minVesting})
  --max-vesting <months>    vesting-too-long: the last month a bucket may release in without a note (default: ${DEFAULTS.maxVesting})
  --explain                 show the points of the documentation behind each finding (text, markdown and JSON)
  --list-checks             list the checks with their level and kind, and exit
  --help                    show this text
  --version                 show the version

Checks: ${RULES.map((r) => r.id).join(', ')}.

Exit codes: 0 no finding at or above the fail-on level, 1 a finding at or above it, 2 usage or input error.
`;

const isUrl = (f) => /^[a-z][a-z0-9+.-]*:\/\//i.test(f);

// A whole number of months from the command line.
function monthsOf(flag, value, min, max) {
  if (!/^[0-9]{1,5}$/.test(value) || Number(value) < min || Number(value) > max) throw new Error(`${flag} takes a whole number of months from ${min} to ${max}`);
  return Number(value);
}

export function parseArgs(argv) {
  const o = { paths: [], format: null, json: false, minSeverity: null, failOn: null, months: null, cliffShare: null, minCliff: null, minVesting: null, maxVesting: null, explain: false, listChecks: false, help: false, version: false };
  const once = (name, current, value) => {
    if (current !== null) throw new Error(`${name} was given twice`);
    return value;
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    const next = () => {
      const v = argv[i + 1];
      if (v === undefined || (v.startsWith('--') && v.length > 2)) throw new Error(`${a} needs a value`);
      if (v === '-') throw new Error('reading from standard input is not supported; give a file');
      i += 1;
      return v;
    };
    if (a === '--help' || a === '-h') o.help = true;
    else if (a === '--version' || a === '-v') o.version = true;
    else if (a === '--explain') o.explain = true;
    else if (a === '--json') o.json = true;
    else if (a === '--list-checks') o.listChecks = true;
    else if (a === '--format') o.format = once(a, o.format, next());
    else if (a === '--min-severity') o.minSeverity = once(a, o.minSeverity, next());
    else if (a === '--fail-on') o.failOn = once(a, o.failOn, next());
    else if (a === '--months') o.months = once(a, o.months, monthsOf(a, next(), 0, MAX_MONTHS));
    else if (a === '--cliff-share') o.cliffShare = once(a, o.cliffShare, next());
    else if (a === '--min-cliff') o.minCliff = once(a, o.minCliff, monthsOf(a, next(), 0, MAX_MONTHS));
    else if (a === '--min-vesting') o.minVesting = once(a, o.minVesting, monthsOf(a, next(), 0, MAX_MONTHS));
    else if (a === '--max-vesting') o.maxVesting = once(a, o.maxVesting, monthsOf(a, next(), 0, MAX_MONTHS));
    else if (a === '-') throw new Error('reading from standard input is not supported; give a file');
    else if (a.startsWith('-')) throw new Error(`unknown argument ${a}`);
    else {
      if (o.paths.length === 1) throw new Error('give one plan file');
      o.paths.push(a);
    }
  }
  if (o.json) {
    if (o.format !== null && o.format !== 'json') throw new Error(`--json and --format ${o.format} ask for two formats; give one`);
    o.format = 'json';
  }
  if (o.format === null) o.format = 'text';
  if (!Object.hasOwn(FORMATS, o.format)) throw new Error(`unknown format ${o.format} (text, markdown, json or sarif)`);
  for (const [flag, v] of [['--min-severity', o.minSeverity], ['--fail-on', o.failOn]]) if (v !== null && !LEVELS.includes(v)) throw new Error(`${flag}: unknown level ${v} (${LEVELS.join(', ')})`);
  if (o.cliffShare !== null) {
    const d = parseDecimal(o.cliffShare);
    if (!d || d.negative || d.digits === 0n || d.scale > 6 || d.digits > 100n * 10n ** BigInt(d.scale)) throw new Error('--cliff-share takes a percent above 0 and up to 100, such as 25 or 12.5');
  }
  const minVesting = o.minVesting ?? DEFAULTS.minVesting;
  const maxVesting = o.maxVesting ?? DEFAULTS.maxVesting;
  if (minVesting > maxVesting) throw new Error(`--min-vesting (${minVesting}) is past --max-vesting (${maxVesting})`);
  if (o.listChecks && o.format === 'sarif') throw new Error('--list-checks has no SARIF form; use text, markdown or json');
  if (!o.help && !o.version && !o.listChecks) {
    if (o.paths.length !== 1) throw new Error('give the plan file, such as tokenomics-check plan.json');
    if (o.paths.some(isUrl)) throw new Error('give a local path; the tool never fetches a URL');
    if (o.explain && o.format === 'sarif') throw new Error('--explain adds the documentation points to the text, markdown and JSON reports; the sarif format has no place for them');
  }
  o.options = {
    cliffShare: o.cliffShare ?? DEFAULTS.cliffShare,
    minCliff: o.minCliff ?? DEFAULTS.minCliff,
    minVesting,
    maxVesting
  };
  return o;
}

const clean = (text) => safeText(text, 1500);

// Exit code: 0 no finding at or above the fail-on level, 1 a finding at or above it, 2 usage or input error.
export async function main(argv, io = { out: (t) => process.stdout.write(t), err: (t) => process.stderr.write(t) }, limits = undefined, base = process.cwd()) {
  let o;
  try {
    o = parseArgs(argv);
  } catch (error) {
    io.err(`tokenomics-check: ${clean(error.message)}\n\n${USAGE}`);
    return 2;
  }
  if (o.help) {
    io.out(USAGE);
    return 0;
  }
  if (o.version) {
    io.out(`${VERSION}\n`);
    return 0;
  }
  if (o.listChecks) {
    io.out(LISTS[o.format]());
    return 0;
  }
  let report;
  try {
    report = await checkFile({ path: o.paths[0], minSeverity: o.minSeverity ?? 'info', failOn: o.failOn ?? 'error', options: o.options, months: o.months, version: VERSION, limits: { ...LIMITS, ...(limits ?? {}) }, base });
  } catch (error) {
    if (error instanceof InputError) io.err(`tokenomics-check: no result, the input has ${error.problems.length === 1 ? 'a problem' : 'problems'}:\n${error.problems.map((p) => `  ${clean(p)}`).join('\n')}\n`);
    else io.err(`tokenomics-check: ${clean(error.message)}\n`);
    return 2;
  }
  io.out(FORMATS[o.format](report, { explain: o.explain }));
  return report.result.pass ? 0 : 1;
}
