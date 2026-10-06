// The reports: text for a terminal, markdown for a job summary or a pull request, JSON for other tools and SARIF for code
// scanning. Every text that comes from the input (a file name, a token name, a symbol, a bucket) was cleaned by safeText
// before it reached the report object. The markdown format also escapes what markdown gives a meaning to, and the SARIF
// format is built as an object and written by JSON.stringify.

import { SOURCES } from './data.js';
import { RULES } from './rules.js';
import { grouped, listText, plural } from './size.js';

const URI = 'https://github.com/INNERLUXES/tokenomics-check';

function findingsLine(r) {
  const b = r.totals.byLevel;
  const parts = ['error', 'warning', 'info'].filter((l) => b[l]).map((l) => `${grouped(b[l])} ${l}`);
  return `${grouped(r.totals.findings)}${parts.length ? ` (${parts.join(', ')})` : ''}${r.totals.hidden ? `; ${grouped(r.totals.hidden)} below ${r.config.minSeverity} not shown` : ''}`;
}

const sym = (t) => (t.symbol ? ` ${t.symbol}` : '');

// What the plan says of the token, in one line.
function tokenLine(t) {
  if (!t) return 'no plan was read';
  const name = t.name ?? 'a token with no name';
  const parts = [`${name}${t.symbol ? ` (${t.symbol})` : ''}`, t.decimals === null ? 'no usable decimals' : plural(t.decimals, 'decimal'), t.chain];
  const supply = [t.maxSupply ? `max supply ${t.maxSupply}` : null, t.totalSupply ? `total supply ${t.totalSupply}` : null].filter(Boolean);
  const flags = [t.mintable === true ? `mintable${t.capMechanism ? ` (cap: ${t.capMechanism})` : ''}` : t.mintable === false ? 'not mintable' : null, t.burnable === true ? 'burnable' : null, t.tradingAtLaunch === true ? 'trading at launch' : null].filter(Boolean);
  return `${parts.join(', ')}${supply.length ? `; ${supply.join(', ')}` : ''}${flags.length ? `; ${flags.join(', ')}` : ''}`;
}

// The buckets and the release, in one line.
function bucketsLine(r) {
  const s = r.summary;
  if (!r.token) return 'none';
  const t = r.token;
  const of = s.ofSupply === null ? '' : ` (${s.ofSupply} of the ${t.supplyKey})`;
  const launch = s.atLaunch === null ? '' : `; ${s.atLaunch}${sym(t)}${s.atLaunchOfSupply === null ? '' : ` (${s.atLaunchOfSupply})`} in circulation at launch; last release at month ${s.lastRelease}`;
  return `${plural(s.buckets, 'bucket')} holding ${s.allocated}${sym(t)}${of}${launch}`;
}

function table(head, rows, indent = '  ') {
  const widths = head.map((h, i) => Math.max(h.length, ...rows.map((row) => row[i].length)));
  const line = (cells) => `${indent}${cells.map((c, i) => (i === cells.length - 1 ? c : c.padEnd(widths[i]))).join('  ')}`.trimEnd();
  return [line(head), ...rows.map(line)];
}

const tableTitle = (r) => `Release table (months 0 to ${r.table.months}${r.table.supply === null ? '' : `; supply ${r.table.supply}${sym(r.token)}`})`;
const tableRows = (r) => r.table.rows.map((x) => [String(x.month), x.released, x.circulating, x.ofSupply ?? '-', listText(x.from, 3)]);
const TABLE_HEAD = ['month', 'released', 'circulating', 'of supply', 'from'];

const PAD = ' '.repeat(11);

export function toText(r, { explain = false } = {}) {
  const out = [];
  out.push(`tokenomics-check: ${r.input.file}`);
  out.push(`file: ${plural(r.input.lines, 'line')}, ${plural(r.input.bytes, 'byte')}`);
  out.push(`token: ${tokenLine(r.token)}`);
  out.push(`buckets: ${bucketsLine(r)}`);
  out.push(`findings: ${findingsLine(r)}`);
  out.push('', `Checks (${grouped(r.rules.length)})`, '');
  out.push(...table(['check', 'level', 'kind', 'findings'], r.rules.map((x) => [x.id, x.level, x.kind, grouped(x.findings)])), '');
  out.push(`Findings (${grouped(r.findings.length)})`, '');
  if (!r.findings.length) out.push('  none', '');
  const width = Math.max(...RULES.map((x) => x.id.length));
  for (const f of r.findings) {
    out.push(`  ${f.severity.toUpperCase().padEnd(8)} ${f.id.padEnd(width)}  ${f.at}`);
    out.push(`${PAD}${f.message}`);
    out.push(`${PAD}fix: ${f.fix}`);
    if (explain) {
      for (const b of f.basis) out.push(`${PAD}basis: ${b.text} (${b.source}, ${b.url})`);
      if (f.own) out.push(`${PAD}the tool's own choice: ${f.own}`);
    }
    out.push('');
  }
  if (r.table) out.push(tableTitle(r), '', ...table(TABLE_HEAD, tableRows(r)), '');
  for (const n of r.notes) out.push(`note: ${n}`);
  if (r.notes.length) out.push('');
  out.push(r.notice, '');
  out.push(`RESULT: ${r.result.text}`);
  return `${out.join('\n')}\n`;
}

// Text for a markdown table cell or line: the characters markdown gives a meaning to are escaped.
const md = (t) => String(t).replace(/[\\`*_{}[\]<>()#+!|~]/g, (c) => `\\${c}`).replace(/\r?\n/g, ' ');

export function toMarkdown(r, { explain = false } = {}) {
  const out = [];
  out.push(`# tokenomics-check: ${md(r.input.file)}`, '');
  out.push(`- File: ${md(`${plural(r.input.lines, 'line')}, ${plural(r.input.bytes, 'byte')}`)}`);
  out.push(`- Token: ${md(tokenLine(r.token))}`);
  out.push(`- Buckets: ${md(bucketsLine(r))}`);
  out.push(`- Findings: ${md(findingsLine(r))}`);
  out.push(`- Result: **${md(r.result.text)}**`, '');
  out.push('## Findings', '');
  if (!r.findings.length) out.push('None.', '');
  else {
    out.push('| Level | Check | Where | Message |', '| --- | --- | --- | --- |');
    for (const f of r.findings) out.push(`| ${f.severity} | ${f.id} | ${md(f.at)} | ${md(f.message)} Fix: ${md(f.fix)} |`);
    out.push('');
  }
  if (explain) {
    out.push('## Basis', '');
    const seen = new Set();
    for (const f of r.findings) {
      if (seen.has(f.id)) continue;
      seen.add(f.id);
      out.push(`### ${f.id}`, '');
      for (const b of f.basis) out.push(`- ${md(b.text)} (${md(b.source)}, <${b.url}>)`);
      if (f.own) out.push(`- The tool's own choice: ${md(f.own)}`);
      out.push('');
    }
  }
  if (r.table) {
    out.push(`## ${md(tableTitle(r))}`, '');
    out.push('| Month | Released | Circulating | Of supply | From |', '| ---: | ---: | ---: | ---: | --- |');
    for (const row of tableRows(r)) out.push(`| ${row.map(md).join(' | ')} |`);
    out.push('');
  }
  for (const n of r.notes) out.push(`Note: ${md(n)}`, '');
  out.push(`${md(r.notice)}`, '');
  return `${out.join('\n')}`;
}

export function toJson(r, { explain = false } = {}) {
  const out = { ...r, findings: r.findings.map((f) => (explain ? f : { ...f, basis: undefined, own: undefined })) };
  return `${JSON.stringify(out, null, 2)}\n`;
}

const SARIF_LEVEL = { error: 'error', warning: 'warning', info: 'note' };

// SARIF 2.1.0: the checks as rules of the driver, the plan as the artifact, and one result for each finding with its line
// and column. The table has no place in SARIF and is left out.
export function toSarif(r) {
  const sarif = {
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'tokenomics-check',
            version: r.version,
            informationUri: URI,
            rules: RULES.map((x) => ({
              id: x.id,
              name: x.id,
              shortDescription: { text: x.summary },
              help: { text: `${x.fix} (${x.kind})` },
              defaultConfiguration: { level: SARIF_LEVEL[x.severity] },
              properties: { kind: x.kind }
            }))
          }
        },
        artifacts: [{ location: { uri: r.input.file } }],
        results: r.findings.map((f) => ({
          ruleId: f.id,
          ruleIndex: RULES.findIndex((x) => x.id === f.id),
          level: SARIF_LEVEL[f.severity],
          message: { text: `${f.message} Fix: ${f.fix}` },
          locations: [{ physicalLocation: { artifactLocation: { uri: f.file, index: 0 }, region: { startLine: f.line, startColumn: f.column } } }],
          properties: { kind: f.kind, bucket: f.bucket }
        })),
        properties: { notice: r.notice, result: r.result.text, sources: SOURCES.map((s) => s.url) }
      }
    ]
  };
  return `${JSON.stringify(sarif, null, 2)}\n`;
}

// The list of checks, for --list-checks.
export function listChecksText() {
  const width = Math.max(...RULES.map((x) => x.id.length));
  const out = ['tokenomics-check checks', ''];
  for (const x of RULES) out.push(`  ${x.id.padEnd(width)}  ${x.severity.padEnd(7)}  ${x.kind.padEnd(13)}  ${x.summary}`);
  out.push('', 'A documented check rests on EIP-20, the OpenZeppelin Contracts documentation or the Solana documentation; a best practice check is this tool\'s own choice and says so in its message. An input check is about the plan file itself.', '');
  return out.join('\n');
}

export function listChecksMarkdown() {
  const out = ['# tokenomics-check checks', '', '| Check | Level | Kind | What it looks at |', '| --- | --- | --- | --- |'];
  for (const x of RULES) out.push(`| ${x.id} | ${x.severity} | ${x.kind} | ${md(x.summary)} |`);
  out.push('');
  return out.join('\n');
}

export function listChecksJson() {
  return `${JSON.stringify(RULES.map((x) => ({ id: x.id, severity: x.severity, kind: x.kind, summary: x.summary, fix: x.fix, basis: x.basis, own: x.own ?? null })), null, 2)}\n`;
}
