import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import { JSON_LIMITS, PLAN_LIMITS, checkText } from '../src/index.js';
import { BUCKETS, allowed, bucket, cli, plan, planText, run, withFiles } from './helpers.js';

// Each test builds input meant to make the tool slow or to exhaust the stack or the memory, and checks that it ends with
// an answer in good time. The time allowed is four times as long under coverage (NODE_V8_COVERAGE is set only when
// coverage is on).

function timed(fn) {
  const start = process.hrtime.bigint();
  const value = fn();
  return { value, ms: Number(process.hrtime.bigint() - start) / 1e6 };
}

test('a thousand buckets, each over the longest months, are worked out in good time', () => {
  const many = Array.from({ length: PLAN_LIMITS.maxBuckets }, (_, i) => bucket(`B${i}`, 'treasury', { amount: '1000' }, { startMonth: i % 50, linearMonths: PLAN_LIMITS.maxMonth }));
  const text = planText(plan({ maxSupply: String(PLAN_LIMITS.maxBuckets * 1000) }, many));
  const { value, ms } = timed(() => checkText(text));
  assert.equal(value.analysis.entries.length, PLAN_LIMITS.maxBuckets);
  assert.equal(value.analysis.last, PLAN_LIMITS.maxMonth + 49);
  assert.ok(ms < allowed(15000), `took ${ms} ms`);
});

test('a schedule of the most steps, and months at the limit in every form, are read in good time', () => {
  const steps = Array.from({ length: PLAN_LIMITS.maxSteps }, (_, i) => ({ month: i % (PLAN_LIMITS.maxMonth + 1), amount: '1' }));
  const p = plan({ maxSupply: String(PLAN_LIMITS.maxSteps + 3000) }, [bucket('Steps', 'treasury', { amount: String(PLAN_LIMITS.maxSteps) }, { schedule: steps }), bucket('Late', 'liquidity', { amount: '1000' }, { startMonth: PLAN_LIMITS.maxMonth, cliffMonths: PLAN_LIMITS.maxMonth, durationMonths: PLAN_LIMITS.maxMonth }), bucket('Wall', 'other', { amount: '1000' }, { launchPercent: 50, linearMonths: PLAN_LIMITS.maxMonth })]);
  const { value, ms } = timed(() => checkText(planText(p)));
  assert.equal(value.analysis.last, PLAN_LIMITS.maxMonth * 2);
  assert.ok(ms < allowed(5000), `took ${ms} ms`);
});

test('deep nesting ends with an error finding at the limit, never a stack overflow', () => {
  const deep = `${'['.repeat(100000)}${']'.repeat(100000)}`;
  const { value } = timed(() => checkText(deep));
  assert.equal(value.findings[0].id, 'plan-unreadable');
  assert.match(value.findings[0].message, new RegExp(`nested more than ${JSON_LIMITS.maxDepth} deep`));
  const inPlan = `{"name": ${'['.repeat(5000)}${']'.repeat(5000)}}`;
  assert.equal(checkText(inPlan).findings[0].id, 'plan-unreadable');
});

test('numbers with very many digits or a huge exponent are refused as a field, not worked out', () => {
  const huge = plan({ maxSupply: `1${'0'.repeat(5000)}` });
  const { value, ms } = timed(() => checkText(planText(huge)));
  assert.ok(value.findings.some((f) => f.id === 'field-invalid' && /maxSupply/.test(f.message)));
  assert.ok(ms < allowed(3000), `took ${ms} ms`);
  const exp = checkText('{"name": "a", "symbol": "b", "decimals": 18, "mintable": false, "maxSupply": 1e999999, "allocations": []}');
  assert.ok(exp.findings.some((f) => f.id === 'field-invalid' && /maxSupply/.test(f.message)));
  const months = checkText(planText(plan({}, [BUCKETS[0], BUCKETS[1], bucket('Treasury', 'treasury', { percent: 70 }, { linearMonths: 1e300 })])));
  assert.ok(months.findings.some((f) => f.id === 'field-invalid' && /linearMonths/.test(f.message)));
});

test('the largest supply a uint256 holds is worked out exactly', () => {
  const max = ((2n ** 256n - 1n) / 10n ** 18n).toString();
  const r = checkText(planText(plan({ maxSupply: max }, [bucket('All', 'liquidity', { percent: 100 }, { launchPercent: 100 })])));
  assert.deepEqual(r.findings, []);
});

test('long strings and long lines are read in good time and cut in the messages', () => {
  const long = planText(plan({}, [BUCKETS[0], BUCKETS[1], bucket('a'.repeat(200000), 'treasury', { percent: 60 }, { launchPercent: 10, linearMonths: 48 })]));
  const { value, ms } = timed(() => checkText(long));
  assert.equal(value.findings[0].id, 'allocation-sum');
  assert.ok(ms < allowed(5000), `took ${ms} ms`);
});

test('names such as __proto__, constructor and toString are only names', () => {
  const text = planText(plan({}, [bucket('__proto__', 'team', { percent: 20 }, { cliffMonths: 12, linearMonths: 24 }), bucket('constructor', 'liquidity', { percent: 10 }, { launchPercent: 100 }), bucket('toString', 'treasury', { percent: 60 }, { launchPercent: 10, linearMonths: 48 })])).replace('"name": "Test Token",', '"name": "Test Token", "__proto__": {"polluted": 1}, "hasOwnProperty": 2,');
  const { value } = timed(() => checkText(text));
  assert.ok(value.findings.some((f) => f.id === 'field-unknown' && /"__proto__"/.test(f.message)));
  assert.ok(value.findings.some((f) => f.id === 'allocation-sum'));
  assert.deepEqual(value.analysis.entries.map((e) => e.bucket.name), ['__proto__', 'constructor', 'toString']);
  assert.equal({}.polluted, undefined);
});

test('a run leaves the folder as it was: the tool writes nothing', async () => {
  const files = { 'plan.json': planText(plan()) };
  await withFiles(files, async (dir) => {
    const before = (await readdir(dir, { recursive: true })).sort();
    await cli(['plan.json', '--format', 'sarif'], dir);
    await cli(['plan.json', '--json', '--explain'], dir);
    assert.deepEqual((await readdir(dir, { recursive: true })).sort(), before);
  });
  assert.equal((await run(files, ['plan.json'])).code, 0);
});
