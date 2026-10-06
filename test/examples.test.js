import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RULES } from '../src/index.js';
import { BAD, EXPECTED, GOOD, GOOD_EXPECTED, UNWANTED, run } from '../tools/example.mjs';

const root = resolve(fileURLToPath(import.meta.url), '..', '..');
const saved = (name) => readFile(resolve(root, 'examples/output', name), 'utf8');
const BAD_FILE = 'examples/bad/plan.json';
const GOOD_FILE = 'examples/good/plan.json';

test('examples: the bad plan fails with the report that is saved in examples/output', async () => {
  const r = await run(BAD);
  assert.equal(r.code, 1);
  assert.equal(r.err, '');
  assert.equal(r.out, await saved('bad.txt'));
  for (const e of EXPECTED) assert.ok(r.out.includes(e), e);
  for (const u of UNWANTED) assert.ok(!r.out.includes(u), u);
});

test('examples: the good plan passes at error and warning level with the report that is saved', async () => {
  const r = await run(GOOD);
  assert.equal(r.code, 0);
  assert.equal(r.out, await saved('good.txt'));
  for (const e of GOOD_EXPECTED) assert.ok(r.out.includes(e), e);
  assert.equal((await run([...GOOD, '--fail-on', 'warning'])).code, 0);
  assert.equal((await run([...GOOD, '--fail-on', 'info'])).code, 1);
  assert.doesNotMatch(r.out, /ERROR {4}|WARNING {2}/);
});

test('examples: every output saved in examples/output is the real output, in all four formats for both plans', async () => {
  const outputs = {
    'bad-explain.txt': [...BAD, '--explain'],
    'bad.md': [...BAD, '--format', 'markdown'],
    'bad-explain.md': [...BAD, '--format', 'markdown', '--explain'],
    'bad.json': [...BAD, '--json', '--explain'],
    'bad.sarif': [...BAD, '--format', 'sarif'],
    'good.md': [...GOOD, '--format', 'markdown'],
    'good.json': [...GOOD, '--json'],
    'good.sarif': [...GOOD, '--format', 'sarif'],
    'checks.txt': ['--list-checks'],
    'checks.json': ['--list-checks', '--format', 'json']
  };
  for (const [name, args] of Object.entries(outputs)) assert.equal((await run(args)).out, await saved(name), name);
});

test('examples: every check but four fires on the bad plan, each on the line built for it', async () => {
  const report = JSON.parse((await run([...BAD, '--json'])).out);
  const lines = (await readFile(resolve(root, BAD_FILE), 'utf8')).split('\n');
  const at = (needle, n = 1) => {
    let seen = 0;
    for (let i = 0; i < lines.length; i += 1) if (lines[i].includes(needle) && (seen += 1) === n) return i + 1;
    throw new Error(`${needle} x${n}`);
  };
  const of = (id) => report.findings.filter((f) => f.id === id).map((f) => f.line);
  assert.deepEqual(of('supply-over-cap'), [at('"totalSupply"')]);
  assert.deepEqual(of('mint-cap-missing'), [at('"mintable"')]);
  assert.deepEqual(of('trading-without-float'), [at('"tradingAtLaunch"')]);
  assert.deepEqual(of('allocation-sum'), [at('"allocations"')]);
  assert.deepEqual(of('cliff-over-duration'), [at('"cliffMonths": 9')]);
  assert.deepEqual(of('amount-precision'), [at('"amount": "2000000.125"')]);
  assert.deepEqual(of('percent-out-of-range'), [at('"launchPercent": 150')]);
  assert.deepEqual(of('percent-rounding'), [at('"percent": 7.5')]);
  assert.deepEqual(of('field-invalid'), [at('"kind": "marketing"')]);
  assert.deepEqual(of('bucket-duplicate'), [at('"name": "TEAM"')]);
  assert.deepEqual(of('field-unknown'), [at('"cliff": 3')]);
  assert.deepEqual(of('field-missing'), [at('"name": "Partners"') - 1]);
  assert.deepEqual(of('schedule-mismatch'), [at('"schedule"'), at('"vesting"', 8)]);
  assert.deepEqual(of('insider-launch-release'), [at('"launchPercent": 10')]);
  assert.deepEqual(of('vesting-too-short'), [at('"vesting"', 1), at('"vesting"', 2)]);
  assert.deepEqual(of('vesting-too-long'), [at('"vesting"', 4)]);
  assert.deepEqual(report.findings.filter((f) => f.id === 'supply-cliff').map((f) => f.message.split(' releases')[0]), ['Month 12', 'Month 1', 'Month 2']);
  assert.deepEqual(report.rules.filter((r) => r.findings === 0).map((r) => r.id), ['plan-unreadable', 'decimals-out-of-range', 'decimals-unusual', 'supply-overflow']);
  assert.equal(report.rules.length, RULES.length);
});

test('examples: the good plan holds one note, adds up to its supply and puts the float in circulation at launch', async () => {
  const report = JSON.parse((await run([...GOOD, '--json'])).out);
  assert.deepEqual(report.findings.map((f) => f.id), ['vesting-too-long']);
  assert.equal(report.summary.ofSupply, '100%');
  assert.equal(report.table.rows[0].circulating, '138,000,000');
  assert.equal(report.table.rows.at(-1).circulating, '1,000,000,000');
  assert.equal(report.table.rows.at(-1).ofSupply, '100%');
});

test('examples: the same files written with CRLF line ends and as UTF-16 give the same findings', async () => {
  const dir = await mkdtemp(resolve(tmpdir(), 'tokenomics-check-crlf-'));
  try {
    await cp(resolve(root, 'examples'), resolve(dir, 'examples'), { recursive: true });
    const ids = async () => JSON.parse((await run([...BAD, '--json'], dir)).out).findings.map((f) => `${f.id}:${f.line}:${f.column}`);
    const base = await ids();
    const text = await readFile(resolve(root, BAD_FILE), 'utf8');
    await writeFile(resolve(dir, BAD_FILE), text.split('\n').join('\r\n'));
    assert.deepEqual(await ids(), base);
    await writeFile(resolve(dir, BAD_FILE), Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, 'utf16le')]));
    assert.deepEqual(await ids(), base);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('examples: the files are plain ASCII with LF line ends, made up, and hold no year-like number', async () => {
  for (const f of [BAD_FILE, GOOD_FILE]) {
    const text = await readFile(resolve(root, f), 'utf8');
    assert.ok([...text].every((c) => c.charCodeAt(0) < 128), f);
    assert.ok(!text.includes('\r'), f);
    assert.doesNotMatch(text, /\b(?:19|20)\d{2}\b/, f);
    assert.doesNotThrow(() => JSON.parse(text), f);
    assert.match(text, /"notes": "A made-up plan for the examples of tokenomics-check/, f);
  }
});

test('examples: the sample output of the bad plan is the one the README shows', async () => {
  const readme = (await readFile(resolve(root, 'README.md'), 'utf8')).split('\r\n').join('\n');
  const bad = await saved('bad.txt');
  assert.ok(readme.includes(bad.split('\n').slice(0, 31).join('\n')));
  assert.ok(readme.includes(bad.split('\n').slice(-7).join('\n')));
});
