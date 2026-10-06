import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BUCKET_KEYS, CHAINS, FALLBACK_DECIMALS, FLOAT_KINDS, INSIDER_KINDS, KINDS, PLAN_LIMITS, STEP_KEYS, TOP_KEYS, VESTING_KEYS, checkText, readJson, readPlan, suggestKey } from '../src/index.js';
import { BUCKETS, bucket, idsOf, lineOf, ofCheck, plan, planText } from './helpers.js';

const [TEAM, LIQUIDITY, TREASURY] = BUCKETS;
const withTreasury = (vesting) => plan({}, [TEAM, LIQUIDITY, bucket('Treasury', 'treasury', { percent: 70 }, vesting)]);

test('readPlan: the fields of the plan and of its buckets, with the supply in base units and the vesting forms', () => {
  const { plan: p, findings } = readPlan(readJson(planText(plan({ totalSupply: '500000', burnable: true, capMechanism: 'ERC20Capped', chain: 'evm' }))));
  assert.deepEqual(findings, []);
  assert.equal(p.name, 'Test Token');
  assert.equal(p.symbol, 'TST');
  assert.equal(p.decimals, 18);
  assert.equal(p.supplyKey, 'maxSupply');
  assert.equal(p.supply, 1000000n * 10n ** 18n);
  assert.equal(p.totalSupply.units, 500000n * 10n ** 18n);
  assert.equal(p.burnable.value, true);
  assert.equal(p.capMechanism, 'ERC20Capped');
  assert.deepEqual(p.buckets.map((b) => `${b.name}:${b.kind}:${b.vesting.form}`), ['Team:team:linear', 'Liquidity:liquidity:none', 'Treasury:treasury:linear']);
  assert.equal(p.buckets[0].units, 200000n * 10n ** 18n);
  assert.equal(p.buckets[0].vesting.cliff, 12);
});

test('the lists of keys, kinds and chains', () => {
  assert.ok(TOP_KEYS.includes('allocations') && BUCKET_KEYS.includes('vesting') && VESTING_KEYS.includes('durationMonths') && STEP_KEYS.includes('month'));
  for (const k of [...INSIDER_KINDS, ...FLOAT_KINDS]) assert.ok(KINDS.includes(k), k);
  assert.deepEqual(CHAINS, ['evm', 'solana']);
  assert.equal(FALLBACK_DECIMALS, 18);
  assert.equal(PLAN_LIMITS.maxMonth, 1200);
});

test('plan-unreadable: text that is not JSON and JSON that is not an object; not an object with fields missing', () => {
  for (const text of ['{"name": "a",}', '[1, 2]', '"plan"', '{"a": 1, "a": 2}']) {
    const r = checkText(text);
    assert.deepEqual(r.findings.map((f) => f.id), ['plan-unreadable'], text);
    assert.equal(r.plan, null);
  }
  assert.match(checkText('[]').findings[0].message, /The file holds a list, not a token plan/);
  assert.ok(!checkText('{}').findings.some((f) => f.id === 'plan-unreadable'));
});

test('field-missing: every field the checks need, at the line of the object that lacks it', () => {
  const ids = (over) => ofCheck(plan(over), 'field-missing').map((f) => f.message);
  for (const key of ['name', 'symbol', 'decimals', 'mintable', 'allocations']) assert.equal(ids({ [key]: undefined }).length, 1, key);
  assert.match(ids({ maxSupply: undefined })[0], /The plan has no supply; give maxSupply, totalSupply or both/);
  assert.deepEqual(ids({ maxSupply: undefined, totalSupply: '1000000' }), []);
  assert.match(ofCheck(plan({}, []), 'field-missing')[0].message, /an empty list; give at least one bucket/);
  const bare = plan({}, [{ name: 'X' }]);
  const msgs = ofCheck(bare, 'field-missing').map((f) => f.message);
  assert.ok(msgs.some((m) => /The bucket X has no kind/.test(m)));
  assert.ok(msgs.some((m) => /The bucket X has no amount or percent/.test(m)));
  assert.ok(msgs.some((m) => /The bucket X has no vesting/.test(m)));
  assert.ok(ofCheck(bare, 'field-missing').every((f) => f.line === lineOf(planText(bare), '"name": "X"') - 1));
  const steps = withTreasury({ schedule: [{ percent: 100 }, { month: 2 }] });
  const s = ofCheck(steps, 'field-missing').map((f) => f.message);
  assert.ok(s.some((m) => /The step 1 of the schedule of bucket Treasury has no month/.test(m)));
  assert.ok(s.some((m) => /The step 2 of the schedule of bucket Treasury has no percent or amount/.test(m)));
  assert.match(ofCheck(withTreasury({ schedule: [] }), 'field-missing')[0].message, /The schedule of bucket Treasury is an empty list/);
  assert.match(ofCheck(plan({}, [{ kind: 'team', percent: 100, vesting: { launchPercent: 100 } }]), 'field-missing')[0].message, /Bucket 1 has no name/);
});

test('field-unknown: a key the tool does not read at every level, with the key it is probably meant to be', () => {
  const p = plan({ maxSuply: '1' }, [TEAM, LIQUIDITY, { ...TREASURY, Percent: 1, vesting: { launchPercent: 10, linearMonths: 48, cliff: 3 } }]);
  const f = ofCheck(p, 'field-unknown').map((x) => x.message);
  assert.equal(f.length, 3);
  assert.ok(f.some((m) => /The key "maxSuply" of the plan is not one the tool reads.*\. Did you mean "maxSupply"\?/.test(m)) === false, 'maxSuply is not a start of maxSupply');
  assert.ok(f.some((m) => /The key "Percent" of bucket Treasury .* Did you mean "percent"\?/.test(m)));
  assert.ok(f.some((m) => /The key "cliff" of the vesting of bucket Treasury .* Did you mean "cliffMonths"\?/.test(m)));
  assert.equal(ofCheck(withTreasury({ launchPercent: 10, linearMonths: 48, schedule: undefined }), 'field-unknown').length, 0);
  assert.equal(ofCheck(withTreasury({ schedule: [{ month: 1, percent: 100, note: 'x' }] }), 'field-unknown').length, 1);
  assert.deepEqual(ofCheck(plan({ notes: 'a plan' }), 'field-unknown'), []);
});

test('suggestKey: the same key in another case, a key that starts with the other, and nothing for a short or far key', () => {
  assert.equal(suggestKey('Percent', BUCKET_KEYS), 'percent');
  assert.equal(suggestKey('cliff', VESTING_KEYS), 'cliffMonths');
  assert.equal(suggestKey('linearMonthsTotal', VESTING_KEYS), 'linearMonths');
  assert.equal(suggestKey('ab', VESTING_KEYS), null);
  assert.equal(suggestKey('website', TOP_KEYS), null);
});

test('field-invalid: values of the wrong type or form; the near misses are read', () => {
  const one = (over, buckets) => ofCheck(plan(over, buckets), 'field-invalid').map((f) => f.message);
  assert.match(one({ name: 7 })[0], /The name of The plan is the number 7; it must be text/);
  assert.match(one({ name: ' ' })[0], /is empty/);
  assert.match(one({ mintable: 'no' })[0], /The mintable of The plan is text; it must be true or false/);
  assert.match(one({ chain: 'bitcoin' })[0], /it must be evm or solana/);
  assert.match(one({ decimals: '18' })[0], /they must be a whole number such as 18/);
  assert.match(one({ maxSupply: '-5' })[0], /an amount cannot be negative/);
  assert.match(one({ maxSupply: 'lots' })[0], /it must be a decimal number/);
  assert.match(one({ maxSupply: '0' })[0], /The maxSupply of the plan is zero/);
  assert.match(one({ allocations: {} })[0], /they must be a list of buckets/);
  assert.match(one({ notes: 1 })[0], /The notes of the plan are the number 1/);
  assert.match(one({}, [TEAM, LIQUIDITY, TREASURY, 'x'])[0], /Bucket 4 of the allocations is text/);
  assert.match(one({}, [TEAM, LIQUIDITY, { ...TREASURY, kind: 'marketing' }])[0], /The kind of bucket Treasury is "marketing"; it must be one of team/);
  assert.match(one({}, [TEAM, LIQUIDITY, { ...TREASURY, amount: '700000' }])[0], /gives both an amount and a percent/);
  assert.match(one({}, [TEAM, LIQUIDITY, { ...TREASURY, vesting: 5 }])[0], /The vesting of bucket Treasury is the number 5; it must be an object/);
  assert.match(one({}, [TEAM, LIQUIDITY, { ...TREASURY, notes: [] }])[0], /The notes of bucket Treasury are a list/);
  const v = (vesting) => ofCheck(withTreasury(vesting), 'field-invalid').map((f) => f.message);
  for (const m of [1.5, -1, PLAN_LIMITS.maxMonth + 1, '12', null, true]) assert.match(v({ cliffMonths: m, linearMonths: 12 })[0], /must be a whole number of months from 0 to 1200/, String(m));
  assert.deepEqual(v({ cliffMonths: PLAN_LIMITS.maxMonth, linearMonths: 0 }), []);
  assert.match(v({ linearMonths: 12, durationMonths: 12 })[0], /both linearMonths and durationMonths/);
  assert.match(v({ launchPercent: 10, schedule: [{ month: 0, percent: 100 }] })[0], /has a schedule and also launchPercent/);
  assert.match(v({ schedule: [{ month: 0, percent: 50 }, { month: 1, amount: '350000' }] })[0], /mixes percents and amounts/);
  assert.match(v({ schedule: [{ month: 0, percent: 50, amount: '1' }] })[0], /gives both a percent and an amount/);
  assert.match(v({ schedule: 'monthly' })[0], /it must be a list of steps/);
  assert.match(v({ schedule: [7] })[0], /The step 1 of the schedule of bucket Treasury is the number 7/);
});

test('field-invalid: a plan with more buckets than the limit, and a schedule with more steps', () => {
  const many = Array.from({ length: PLAN_LIMITS.maxBuckets + 1 }, (_, i) => bucket(`B${i}`, 'other', { amount: '1' }, { launchPercent: 100 }));
  const r = checkText(planText(plan({ maxSupply: String(PLAN_LIMITS.maxBuckets + 1) }, many)));
  assert.ok(r.findings.some((f) => f.id === 'field-invalid' && /more than the limit of 1000; only the first 1000 were read/.test(f.message)));
  assert.equal(r.plan.buckets.length, PLAN_LIMITS.maxBuckets);
  const steps = Array.from({ length: PLAN_LIMITS.maxSteps + 1 }, (_, i) => ({ month: i % 1000, amount: '1' }));
  assert.match(ofCheck(withTreasury({ schedule: steps }), 'field-invalid')[0].message, /more than the limit of 2400/);
});

test('bucket-duplicate: a second bucket of one name, without case and outer spaces; not two names that differ', () => {
  const p = plan({}, [TEAM, LIQUIDITY, { ...TREASURY, percent: 60 }, bucket(' team ', 'airdrop', { percent: 10 }, { launchPercent: 100 })]);
  const f = ofCheck(p, 'bucket-duplicate');
  assert.equal(f.length, 1);
  assert.match(f[0].message, /Bucket 4 is named {2}team , as is bucket 1 at line \d+/);
  assert.equal(f[0].line, lineOf(planText(p), '"name": " team "'));
  assert.deepEqual(ofCheck(plan({}, [TEAM, LIQUIDITY, { ...TREASURY, percent: 60 }, bucket('Team B', 'airdrop', { percent: 10 }, { launchPercent: 100 })]), 'bucket-duplicate'), []);
});

test('percent-out-of-range: a share, a launch part or a step below 0 or above 100; not at 0 or 100', () => {
  assert.match(ofCheck(plan({}, [TEAM, LIQUIDITY, { ...TREASURY, percent: 101 }]), 'percent-out-of-range')[0].message, /The percent of bucket Treasury is 101, outside 0 to 100/);
  assert.equal(ofCheck(plan({}, [TEAM, LIQUIDITY, { ...TREASURY, percent: -1 }]), 'percent-out-of-range').length, 1);
  assert.equal(ofCheck(withTreasury({ launchPercent: 150, linearMonths: 12 }), 'percent-out-of-range').length, 1);
  assert.equal(ofCheck(withTreasury({ schedule: [{ month: 1, percent: 100.5 }] }), 'percent-out-of-range').length, 1);
  assert.deepEqual(ofCheck(withTreasury({ launchPercent: 100 }), 'percent-out-of-range'), []);
  assert.deepEqual(ofCheck(withTreasury({ launchPercent: 0, linearMonths: 12 }), 'percent-out-of-range'), []);
});

test('a bucket whose vesting could not be read is left out of the table, and a note says so', () => {
  const r = checkText(planText(withTreasury({ launchPercent: 150, linearMonths: 12 })));
  assert.ok(r.notes.some((n) => /Treasury is not in the table, because its amount or vesting could not be read/.test(n)));
  assert.equal(r.analysis.entries.length, 2);
});

test('a plan with no supply: the percents have no amount, and a note says so', () => {
  const r = checkText(planText(plan({ maxSupply: undefined })));
  assert.deepEqual(r.findings.map((f) => f.id), ['field-missing']);
  assert.ok(r.notes.some((n) => /gives no supply the tool can use/.test(n)));
  assert.equal(idsOf(plan({ maxSupply: undefined })).length, 1);
});
