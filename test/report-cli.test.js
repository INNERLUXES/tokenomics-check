import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RULES, USAGE, VERSION, buildReport, checkText, decide, parseArgs, toSarif } from '../src/index.js';
import { BAD, BUCKETS, GOOD, bucket, cli, plan, planText, run } from './helpers.js';

const FILES = { 'good.json': GOOD, 'bad.json': BAD };
const ch = (...codes) => String.fromCharCode(...codes);

test('exit codes: 0 for a pass, 1 for a finding at or above the fail-on level, 2 for a usage or input error', async () => {
  assert.equal((await run(FILES, ['good.json'])).code, 0);
  assert.equal((await run(FILES, ['bad.json'])).code, 1);
  assert.equal((await run(FILES, ['nothing.json'])).code, 2);
  assert.equal((await run(FILES, [])).code, 2);
  assert.equal((await run(FILES, ['good.json', 'bad.json'])).code, 2);
  assert.equal((await run(FILES, ['bad.json', '--bogus'])).code, 2);
});

test('--fail-on: a note fails the run at info and passes at warning and error', async () => {
  const long = { 'p.json': planText(plan({}, [BUCKETS[0], BUCKETS[1], bucket('Treasury', 'treasury', { percent: 70 }, { launchPercent: 10, linearMonths: 61 })])) };
  assert.equal((await run(long, ['p.json'])).code, 0);
  assert.equal((await run(long, ['p.json', '--fail-on', 'warning'])).code, 0);
  assert.equal((await run(long, ['p.json', '--fail-on', 'info'])).code, 1);
  assert.equal((await run(FILES, ['good.json', '--fail-on', 'info'])).code, 0, 'the good plan has no finding at any level');
});

test('--min-severity hides findings below it and says how many, and a hidden finding still counts for the result', async () => {
  const r = await run(FILES, ['bad.json', '--min-severity', 'error']);
  assert.match(r.out, /findings: 1 \(1 error\)\n/);
  const long = { 'p.json': planText(plan({}, [BUCKETS[0], BUCKETS[1], bucket('Treasury', 'treasury', { percent: 70 }, { launchPercent: 10, linearMonths: 61 })])) };
  const info = await run(long, ['p.json', '--min-severity', 'warning', '--fail-on', 'info']);
  assert.match(info.out, /findings: 0; 1 below warning not shown/);
  assert.equal(info.code, 1);
});

test('the text report names the file, the token, the buckets, the checks table, each finding with its line and fix, the table, and ends with the notice and the result', async () => {
  const r = await run(FILES, ['bad.json']);
  assert.match(r.out, /^tokenomics-check: bad\.json\n/);
  assert.match(r.out, /\nfile: \d+ lines, [\d,]+ bytes\n/);
  assert.match(r.out, /\ntoken: Test Token \(TST\), 18 decimals, evm; max supply 1,000,000; not mintable, trading at launch\n/);
  assert.match(r.out, /\nbuckets: 3 buckets holding 900,000 TST \(90% of the maxSupply\); 160,000 TST \(16%\) in circulation at launch; last release at month 48\n/);
  assert.match(r.out, /ERROR {4}allocation-sum {10}bad\.json:\d+\n/);
  assert.match(r.out, /fix: Change the buckets until they add up to the supply exactly/);
  assert.match(r.out, /\nChecks \(22\)\n/);
  assert.match(r.out, /\nRelease table \(months 0 to 48; supply 1,000,000 TST\)\n\n {2}month {2}released {3}circulating {2}of supply {2}from\n {2}0 {6}160,000 {4}160,000 {6}16% {8}Liquidity and Treasury\n/);
  assert.match(r.out, /not a guarantee that the plan is sound\.\n\nRESULT: FAIL - 1 finding at or above error/);
  assert.ok(r.out.endsWith('\n'));
  assert.match((await run(FILES, ['good.json'])).out, /Findings \(0\)\n\n {2}none\n/);
});

test('--months sets the last month of the table, and a note says when the releases go on past it', async () => {
  const short = await run(FILES, ['good.json', '--months', '3']);
  assert.match(short.out, /Release table \(months 0 to 3;/);
  assert.match(short.out, /note: the table stops at month 3 \(--months\); the buckets release until month 48, and the checks looked at every month/);
  const long = await run(FILES, ['good.json', '--months', '50']);
  assert.match(long.out, /\n {2}50 {5}0 {10}1,000,000/);
  assert.doesNotMatch(long.out, /note: the table stops/);
  const json = JSON.parse((await run(FILES, ['good.json', '--json', '--months', '2'])).out);
  assert.equal(json.table.rows.length, 3);
  assert.equal(json.config.months, 2);
});

test('the table runs to month 12 at least, and to the last release when that is later', () => {
  const at = (p) => buildReport({ file: { file: 'p.json', bytes: 1, lines: 1 }, checked: checkText(planText(p)), version: '0' }).table;
  const launch = at(plan({}, [bucket('All', 'liquidity', { percent: 100 }, { launchPercent: 100 })]));
  assert.equal(launch.months, 12);
  assert.equal(launch.rows.at(-1).circulating, '1,000,000');
  assert.equal(at(plan()).months, 48);
});

test('--explain adds the points of the documentation with their pages to the text report, and the own choice of a best practice', async () => {
  const r = await run(FILES, ['bad.json', '--explain']);
  assert.match(r.out, /basis: .*\(ERC-20: Token Standard, https:\/\/eips\.ethereum\.org\/EIPS\/eip-20\)/);
  assert.match(r.out, /the tool's own choice: requiring the buckets to add up to the supply exactly/);
  assert.doesNotMatch((await run(FILES, ['bad.json'])).out, /basis:/);
});

test('the JSON report has the id, severity, message, file, line, column and bucket of every finding, and the table in tokens and base units', async () => {
  const report = JSON.parse((await run(FILES, ['bad.json', '--json'])).out);
  assert.equal(report.tool, 'tokenomics-check');
  assert.equal(report.version, VERSION);
  assert.equal(report.input.file, 'bad.json');
  assert.equal(report.token.symbol, 'TST');
  assert.equal(report.token.maxSupply, '1,000,000');
  const f = report.findings.find((x) => x.id === 'allocation-sum');
  assert.equal(f.severity, 'error');
  assert.equal(f.file, 'bad.json');
  assert.equal(f.at, `bad.json:${f.line}`);
  assert.equal(typeof f.column, 'number');
  assert.equal(f.bucket, null);
  assert.equal(f.basis, undefined, 'the basis only with --explain');
  assert.ok(JSON.parse((await run(FILES, ['bad.json', '--json', '--explain'])).out).findings[0].basis.length > 0);
  assert.equal(report.result.pass, false);
  assert.equal(report.rules.length, RULES.length);
  assert.deepEqual(report.table.rows[0], { month: 0, released: '160,000', circulating: '160,000', releasedUnits: '160000000000000000000000', circulatingUnits: '160000000000000000000000', ofSupply: '16%', from: ['Liquidity', 'Treasury'] });
  assert.deepEqual(report.config, { minSeverity: 'info', failOn: 'error', months: null, cliffShare: '25', minCliff: 6, minVesting: 12, maxVesting: 60 });
});

test('--json and --format json are the same, and --json with another format is a usage error', async () => {
  assert.equal((await run(FILES, ['good.json', '--json'])).out, (await run(FILES, ['good.json', '--format', 'json'])).out);
  const r = await run(FILES, ['good.json', '--json', '--format', 'text']);
  assert.equal(r.code, 2);
  assert.match(r.err, /two formats/);
});

test('the markdown report has a findings table and the release table, and escapes what markdown gives a meaning to', async () => {
  const r = await run(FILES, ['bad.json', '--format', 'markdown']);
  assert.match(r.out, /^# tokenomics-check: bad\.json\n/);
  assert.match(r.out, /\| Level \| Check \| Where \| Message \|/);
  assert.match(r.out, /\| error \| allocation-sum \| bad\.json:\d+ \|/);
  assert.match(r.out, /- Result: \*\*FAIL - 1 finding at or above error/);
  assert.match(r.out, /\| Month \| Released \| Circulating \| Of supply \| From \|\n\| ---: \| ---: \| ---: \| ---: \| --- \|\n\| 0 \| 160,000 \| 160,000 \| 16% \| Liquidity and Treasury \|/);
  assert.match((await run(FILES, ['good.json', '--format', 'markdown'])).out, /## Findings\n\nNone\./);
  const hostile = { 'p.json': planText(plan({}, [BUCKETS[0], BUCKETS[1], bucket('[x](http://a.test)|<b>', 'treasury', { percent: 60 }, { launchPercent: 10, linearMonths: 48 })])) };
  const out = (await run(hostile, ['p.json', '--format', 'markdown', '--explain'])).out;
  assert.ok(!out.includes('[x](http'), 'a link written in a bucket name is escaped');
  assert.ok(out.includes('\\[x\\]\\(http'));
  assert.match(out, /## Basis\n\n### allocation-sum\n/);
});

test('the SARIF report is SARIF 2.1.0 with the checks as rules, the plan as the artifact, and a result for every finding', async () => {
  const sarif = JSON.parse((await run(FILES, ['bad.json', '--format', 'sarif'])).out);
  assert.equal(sarif.version, '2.1.0');
  assert.match(sarif.$schema, /sarif-2\.1\.0/);
  const run0 = sarif.runs[0];
  assert.equal(run0.tool.driver.name, 'tokenomics-check');
  assert.equal(run0.tool.driver.rules.length, RULES.length);
  assert.deepEqual(run0.artifacts.map((a) => a.location.uri), ['bad.json']);
  const sum = run0.results.find((x) => x.ruleId === 'allocation-sum');
  assert.equal(sum.level, 'error');
  assert.equal(run0.tool.driver.rules[sum.ruleIndex].id, 'allocation-sum');
  const loc = sum.locations[0].physicalLocation;
  assert.equal(loc.artifactLocation.uri, 'bad.json');
  assert.equal(loc.artifactLocation.index, 0);
  assert.ok(loc.region.startLine >= 1 && loc.region.startColumn >= 1);
  assert.equal(run0.properties.sources.length, 6);
});

test('SARIF levels: error, warning and info are error, warning and note', async () => {
  const p = plan({ decimals: 24 }, [BUCKETS[0], BUCKETS[1], bucket('Treasury', 'treasury', { percent: 60 }, { launchPercent: 10, linearMonths: 61 })]);
  const sarif = JSON.parse((await run({ 'p.json': planText(p) }, ['p.json', '--format', 'sarif'])).out);
  const levels = Object.fromEntries(sarif.runs[0].results.map((x) => [x.ruleId, x.level]));
  assert.equal(levels['allocation-sum'], 'error');
  assert.equal(levels['decimals-unusual'], 'warning');
  assert.equal(levels['vesting-too-long'], 'note');
});

test('--explain has no place in the SARIF report and is a usage error there', async () => {
  const r = await run(FILES, ['good.json', '--format', 'sarif', '--explain']);
  assert.equal(r.code, 2);
  assert.match(r.err, /sarif format has no place/);
});

test('--list-checks lists every check with its level and kind, in text, markdown and JSON, and needs no file', async () => {
  const text = await cli(['--list-checks'], process.cwd());
  assert.equal(text.code, 0);
  for (const r of RULES) assert.ok(text.out.includes(r.id), r.id);
  assert.match(text.out, /allocation-sum +error +best practice/);
  assert.match(text.out, /amount-precision +error +documented/);
  const md = await cli(['--list-checks', '--format', 'markdown'], process.cwd());
  assert.match(md.out, /\| supply-over-cap \| error \| documented \|/);
  const json = JSON.parse((await cli(['--list-checks', '--json'], process.cwd())).out);
  assert.equal(json.length, RULES.length);
  assert.equal((await cli(['--list-checks', '--format', 'sarif'], process.cwd())).code, 2);
});

test('the thresholds: --cliff-share, --min-cliff, --min-vesting and --max-vesting change the checks and are shown in the JSON', async () => {
  const p = { 'p.json': planText(plan({}, [bucket('Team', 'team', { percent: 20 }, { cliffMonths: 3, linearMonths: 6 }), BUCKETS[1], BUCKETS[2]])) };
  const base = JSON.parse((await run(p, ['p.json', '--json'])).out);
  assert.deepEqual(base.findings.map((f) => f.id).sort(), ['insider-no-cliff', 'vesting-too-short']);
  const loose = JSON.parse((await run(p, ['p.json', '--json', '--min-cliff', '3', '--min-vesting', '9'])).out);
  assert.deepEqual(loose.findings, []);
  assert.equal(loose.config.minCliff, 3);
  const strict = JSON.parse((await run(p, ['p.json', '--json', '--cliff-share', '1', '--max-vesting', '12'])).out);
  assert.ok(strict.findings.some((f) => f.id === 'supply-cliff'));
  assert.ok(strict.findings.some((f) => f.id === 'vesting-too-long'));
  assert.equal(strict.config.cliffShare, '1');
});

test('--help, --version and usage errors', async () => {
  const help = await cli(['--help'], process.cwd());
  assert.equal(help.code, 0);
  assert.equal(help.out, USAGE);
  for (const option of ['--format', '--json', '--min-severity', '--fail-on', '--months', '--cliff-share', '--min-cliff', '--min-vesting', '--max-vesting', '--explain', '--list-checks', '--help', '--version']) assert.ok(USAGE.includes(option), option);
  assert.equal((await cli(['--version'], process.cwd())).out, `${VERSION}\n`);
  const bad = [['a', 'b'], ['--format'], ['--format', 'xml', 'a'], ['--fail-on', 'high', 'a'], ['a', '--months', '1.5'], ['a', '--months', '2401'], ['a', '--months', '-1'], ['a', '--cliff-share', '0'], ['a', '--cliff-share', '101'], ['a', '--cliff-share', 'x'], ['a', '--min-vesting', '70'], ['a', '--max-vesting', '6'], ['a', '--months', '3', '--months', '4'], ['https://example.test/plan.json'], ['-'], ['a', '--min-cliff']];
  for (const b of bad) {
    const r = await cli(b, process.cwd());
    assert.equal(r.code, 2, b.join(' '));
    assert.match(r.err, /^tokenomics-check: /);
  }
});

test('parseArgs: values may not look like flags, a flag given twice is an error, and the options carry their defaults', () => {
  assert.throws(() => parseArgs(['a', '--format', '--json']), /needs a value/);
  assert.throws(() => parseArgs(['a', '--format', 'json', '--format', 'text']), /given twice/);
  assert.throws(() => parseArgs(['a', '--format', '-']), /standard input/);
  assert.throws(() => parseArgs(['a', '--min-vesting', '61']), /--min-vesting \(61\) is past --max-vesting \(60\)/);
  assert.deepEqual(parseArgs(['a']).options, { cliffShare: '25', minCliff: 6, minVesting: 12, maxVesting: 60 });
  assert.deepEqual(parseArgs(['a', '--cliff-share', '12.5', '--min-cliff', '0']).options, { cliffShare: '12.5', minCliff: 0, minVesting: 12, maxVesting: 60 });
  assert.equal(parseArgs(['a', '--months', '0']).months, 0);
});

test('decide: pass and fail texts, with the counts', () => {
  assert.equal(decide({ error: 0, warning: 0, info: 0 }, 'error').text, 'PASS - no finding at or above error');
  assert.equal(decide({ error: 0, warning: 2, info: 1 }, 'error').text, 'PASS - no finding at or above error (2 warning, 1 info)');
  assert.equal(decide({ error: 1, warning: 2, info: 1 }, 'error').text, 'FAIL - 1 finding at or above error (1 error, 2 warning, 1 info)');
  assert.equal(decide({ error: 1, warning: 2, info: 1 }, 'warning').text, 'FAIL - 3 findings at or above warning (1 error, 2 warning, 1 info)');
});

test('text from the file is cleaned: control characters, escapes and direction controls in a name, a symbol and a bucket', async () => {
  const dirty = (s) => `${s}${ch(0x1b)}[31m${ch(0x202e)}${ch(0x2028)}x${ch(0x07)}`;
  const p = plan({ name: dirty('n'), symbol: dirty('s'), capMechanism: dirty('c'), mintable: true }, [BUCKETS[0], BUCKETS[1], bucket(dirty('b'), 'treasury', { percent: 60 }, { launchPercent: 10, linearMonths: 48 })]);
  for (const format of ['text', 'markdown', 'json', 'sarif']) {
    const r = await run({ 'p.json': planText(p) }, ['p.json', '--format', format]);
    assert.ok(![...r.out].some((c) => [0x1b, 0x07, 0x202e, 0x2028].includes(c.charCodeAt(0))), format);
  }
});

test('the same findings are written for LF, CRLF and CR line ends, and for UTF-16', async () => {
  const at = async (text) => JSON.parse((await run({ 'p.json': text }, ['p.json', '--json'])).out).findings.map((f) => `${f.id}:${f.line}:${f.column}`);
  const base = await at(BAD);
  assert.ok(base.length > 0);
  for (const sep of ['\r\n', '\r']) assert.deepEqual(await at(BAD.split('\n').join(sep)), base);
  assert.deepEqual(await at(Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(BAD, 'utf16le')])), base);
});

test('toSarif is deterministic and the report object is the same for the same input', async () => {
  const a = (await run(FILES, ['bad.json', '--format', 'sarif'])).out;
  const b = (await run(FILES, ['bad.json', '--format', 'sarif'])).out;
  assert.equal(a, b);
  assert.equal(typeof toSarif, 'function');
});

test('a file that is JSON but no plan gives a report with no token and no table', async () => {
  const r = await run({ 'p.json': '[]\n' }, ['p.json']);
  assert.equal(r.code, 1);
  assert.match(r.out, /\ntoken: no plan was read\nbuckets: none\n/);
  assert.doesNotMatch(r.out, /Release table/);
  assert.match(r.out, /note: the plan was not checked, because the file holds no plan object/);
  const json = JSON.parse((await run({ 'p.json': '[]\n' }, ['p.json', '--json'])).out);
  assert.equal(json.token, null);
  assert.equal(json.table, null);
});
