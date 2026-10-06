// A run: read the file, read the plan from it, run the checks, work out the table and build the report object that the
// formats write.

import { formatAmount, formatUnits, percentText } from './amounts.js';
import { analyzePlan, DEFAULTS } from './analyze.js';
import { LEVELS, NOTICE, POINTS, pointPage } from './data.js';
import { FILE_LIMITS, InputError, displayPath, locatePlan, readPlanText } from './files.js';
import { JsonError, readJson } from './json.js';
import { readPlan } from './plan.js';
import { RULES, decide, ruleById } from './rules.js';
import { safeText } from './text.js';

export const LIMITS = { ...FILE_LIMITS };

export { InputError };

const clean = (t, max = 900) => safeText(t, max);

const ORDER = { error: 0, warning: 1, info: 2 };

// The basis of a rule: the points with their pages.
function basisOf(rule) {
  return rule.basis.map((id) => {
    const page = pointPage(id);
    return { text: POINTS[id].text, source: page.title, url: page.url };
  });
}

// The findings of a text, with no file system: { plan, analysis, findings, notes }. plan is null when the text is not a
// JSON object, and findings then holds one plan-unreadable finding with its line.
export function checkText(text, options = {}) {
  let root;
  try {
    root = readJson(text);
  } catch (error) {
    if (!(error instanceof JsonError)) throw error;
    return { plan: null, analysis: null, findings: [{ id: 'plan-unreadable', line: error.line, column: error.column, message: `The file is not JSON the reader can follow: ${error.message}. Nothing in the file was checked.` }], notes: ['the plan was not checked, because the file is not JSON the reader can follow'] };
  }
  const read = readPlan(root);
  if (!read.plan) return { plan: null, analysis: null, findings: read.findings, notes: ['the plan was not checked, because the file holds no plan object'] };
  const analysis = analyzePlan(read.plan, options);
  return { plan: read.plan, analysis, findings: [...read.findings, ...analysis.findings], notes: [...read.notes, ...analysis.notes] };
}

const lineCount = (text) => {
  const parts = text === '' ? [] : text.split(/\r\n|\r|\n/);
  return parts.length > 0 && parts.at(-1) === '' ? parts.length - 1 : parts.length;
};

// The token as the report shows it.
function tokenOf(plan) {
  if (!plan) return null;
  const dec = plan.units;
  const supply = (a) => (a ? formatUnits(a.units, dec) : null);
  return {
    name: plan.name === null ? null : clean(plan.name, 200),
    symbol: plan.symbol === null ? null : clean(plan.symbol, 50),
    decimals: plan.decimals,
    chain: plan.chain,
    maxSupply: supply(plan.maxSupply),
    totalSupply: supply(plan.totalSupply),
    supplyKey: plan.supplyKey,
    mintable: plan.mintable.value,
    burnable: plan.burnable.value,
    capMechanism: plan.capMechanism === null ? null : clean(plan.capMechanism, 200),
    tradingAtLaunch: plan.tradingAtLaunch.value
  };
}

// The table of months, up to months (the last month of the plan when null).
function tableOf(plan, analysis, months) {
  if (!plan || !analysis) return null;
  const dec = plan.units;
  const last = months ?? Math.max(analysis.last, 12);
  const rows = analysis.rows.slice(0, last + 1);
  const circulating = rows.length ? rows.at(-1).circulating : 0n;
  for (let m = rows.length; m <= last; m += 1) rows.push({ month: m, released: 0n, circulating, from: [] });
  const whole = plan.supply;
  return {
    months: last,
    lastRelease: analysis.last,
    supply: whole === null ? null : formatUnits(whole, dec),
    rows: rows.map((r) => ({
      month: r.month,
      released: formatAmount(r.released, dec),
      circulating: formatAmount(r.circulating, dec),
      releasedUnits: r.released.toString(),
      circulatingUnits: r.circulating.toString(),
      ofSupply: whole === null ? null : percentText(r.circulating, whole),
      from: r.from.map((f) => clean(f.bucket.title, 120))
    }))
  };
}

// The counts of a plan for the report.
function summaryOf(plan, analysis) {
  if (!plan) return { buckets: 0, allocated: null, ofSupply: null, atLaunch: null, lastRelease: null };
  const dec = plan.units;
  const allocated = plan.buckets.reduce((n, b) => n + (b.units ?? 0n), 0n);
  const launch = analysis.rows.length ? analysis.rows[0].circulating : 0n;
  return {
    buckets: plan.buckets.length,
    allocated: formatAmount(allocated, dec),
    ofSupply: plan.supply === null ? null : percentText(allocated, plan.supply),
    atLaunch: formatAmount(launch, dec),
    atLaunchOfSupply: plan.supply === null ? null : percentText(launch, plan.supply),
    lastRelease: analysis.last
  };
}

// The report object for the findings of a file.
export function buildReport({ file, checked, version, minSeverity = 'info', failOn = 'error', options = {}, months = null }) {
  const all = checked.findings.map((f) => {
    const rule = ruleById(f.id);
    return {
      id: f.id,
      severity: rule.severity,
      message: clean(f.message),
      file: file.file,
      line: f.line,
      column: f.column,
      at: `${file.file}:${f.line}`,
      bucket: f.bucket == null ? null : clean(f.bucket, 120),
      fix: rule.fix,
      kind: rule.kind,
      basis: basisOf(rule),
      own: rule.own ?? null
    };
  });
  all.sort((a, b) => ORDER[a.severity] - ORDER[b.severity] || a.line - b.line || a.column - b.column || a.id.localeCompare(b.id, 'en'));
  const shown = all.filter((f) => LEVELS.indexOf(f.severity) >= LEVELS.indexOf(minSeverity));
  const byLevel = { error: 0, warning: 0, info: 0 };
  for (const f of shown) byLevel[f.severity] += 1;
  const allByLevel = { error: 0, warning: 0, info: 0 };
  for (const f of all) allByLevel[f.severity] += 1;
  const o = { ...DEFAULTS, ...options };
  const table = tableOf(checked.plan, checked.analysis, months);
  const notes = [...checked.notes];
  if (table && months !== null && checked.analysis.last > months) notes.push(`the table stops at month ${months} (--months); the buckets release until month ${checked.analysis.last}, and the checks looked at every month`);
  return {
    tool: 'tokenomics-check',
    version,
    input: { file: file.file, bytes: file.bytes, lines: file.lines },
    token: tokenOf(checked.plan),
    summary: summaryOf(checked.plan, checked.analysis),
    totals: { findings: shown.length, byLevel, hidden: all.length - shown.length },
    rules: RULES.map((r) => ({ id: r.id, level: r.severity, kind: r.kind, findings: shown.filter((f) => f.id === r.id).length })),
    config: { minSeverity, failOn, months, cliffShare: String(o.cliffShare), minCliff: o.minCliff, minVesting: o.minVesting, maxVesting: o.maxVesting },
    findings: shown,
    table,
    notes: notes.map((n) => clean(n)),
    notice: NOTICE,
    result: decide(allByLevel, failOn)
  };
}

export async function checkFile({ path, minSeverity = 'info', failOn = 'error', options = {}, months = null, version, limits = LIMITS, base = process.cwd() }) {
  const absolute = await locatePlan(path, base);
  const { text, bytes } = await readPlanText(absolute, base, limits);
  const checked = checkText(text, options);
  const file = { file: displayPath(absolute, base), bytes, lines: lineCount(text) };
  return buildReport({ file, checked, version, minSeverity, failOn, options, months });
}
