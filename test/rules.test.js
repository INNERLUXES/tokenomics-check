import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS, RULES, analyzePlan, checkText, readJson, readPlan } from '../src/index.js';
import { BUCKETS, bucket, idsOf, lineOf, ofCheck, plan, planText } from './helpers.js';

const [TEAM, LIQUIDITY, TREASURY] = BUCKETS;
// The plan with the treasury bucket replaced, so that the buckets still add up.
const withTreasury = (vesting, over = {}) => plan(over, [TEAM, LIQUIDITY, bucket('Treasury', 'treasury', { percent: 70 }, vesting)]);
// The plan with the team bucket replaced.
const withTeam = (vesting, kind = 'team', over = {}) => plan(over, [bucket('Team', kind, { percent: 20 }, vesting), LIQUIDITY, TREASURY]);

test('every check has an id, a level, a kind, a summary and a fix, and the ids are unique', () => {
  assert.equal(RULES.length, 22);
  assert.equal(new Set(RULES.map((r) => r.id)).size, RULES.length);
  for (const r of RULES) {
    assert.ok(['error', 'warning', 'info'].includes(r.severity), r.id);
    assert.ok(['documented', 'best practice', 'input'].includes(r.kind), r.id);
    assert.ok(r.summary.length > 20 && r.fix.length > 20, r.id);
  }
});

test('the plan of the helpers gives no finding', () => {
  assert.deepEqual(idsOf(plan()), []);
});

test('allocation-sum: buckets short of the supply or over it, at the line of the allocations; not when amounts and percents add up exactly', () => {
  const short = plan({}, [TEAM, LIQUIDITY, bucket('Treasury', 'treasury', { percent: 69.5 }, { launchPercent: 100 })]);
  const f = ofCheck(short, 'allocation-sum');
  assert.equal(f.length, 1);
  assert.equal(f[0].line, lineOf(planText(short), '"allocations"'));
  assert.match(f[0].message, /The 3 buckets add up to 995,000 TST, 99\.5% of the maxSupply of 1,000,000 TST: 5,000 TST less than the supply\. This is a best practice of this tool/);
  const over = plan({}, [TEAM, LIQUIDITY, bucket('Treasury', 'treasury', { amount: '700001' }, { launchPercent: 100 })]);
  assert.match(ofCheck(over, 'allocation-sum')[0].message, /1 TST more than the supply/);
  const mixed = plan({}, [TEAM, LIQUIDITY, bucket('Treasury', 'treasury', { amount: '700000' }, { launchPercent: 10, linearMonths: 48 })]);
  assert.deepEqual(idsOf(mixed), []);
  const total = plan({ maxSupply: undefined, totalSupply: '1000000' });
  assert.deepEqual(idsOf(total), [], 'the total supply when there is no maximum');
});

test('allocation-sum: a third of a supply three times adds up exactly, though each third is rounded down', () => {
  const thirds = plan({ decimals: 0, maxSupply: '1000' }, [bucket('A', 'treasury', { percent: '33.3333333333' }, { launchPercent: 100 }), bucket('B', 'liquidity', { percent: '33.3333333333' }, { launchPercent: 100 }), bucket('C', 'community', { percent: '33.3333333334' }, { launchPercent: 100 })]);
  assert.deepEqual([...new Set(idsOf(thirds))], ['percent-rounding']);
  const off = plan({ decimals: 0, maxSupply: '1000' }, [bucket('A', 'treasury', { percent: '33.3333333333' }, { launchPercent: 100 }), bucket('B', 'liquidity', { percent: '66.6666666666' }, { launchPercent: 100 })]);
  assert.match(ofCheck(off, 'allocation-sum')[0].message, /add up to 999 TST, 99\.9% of the maxSupply of 1,000 TST: 1 TST less than the supply/);
  const dust = plan({ decimals: 0, maxSupply: '1000' }, [bucket('A', 'treasury', { amount: '999' }, { launchPercent: 100 }), bucket('B', 'liquidity', { percent: '0.1000000001' }, { launchPercent: 100 })]);
  assert.match(ofCheck(dust, 'allocation-sum')[0].message, /add up to 1,000 TST, 100% of the maxSupply of 1,000 TST: less than one base unit more than the supply/);
});

test('allocation-sum: not checked, with a note, when a bucket has no amount the tool could read', () => {
  const r = checkText(planText(plan({}, [TEAM, LIQUIDITY, bucket('Treasury', 'treasury', { percent: 'seventy' }, { launchPercent: 100 })])));
  assert.ok(!r.findings.some((f) => f.id === 'allocation-sum'));
  assert.ok(r.notes.some((n) => /the sum of the buckets was not checked, because Treasury has no amount or percent/.test(n)));
});

test('percent-rounding: a percent that is not a whole number of base units; not at more decimals', () => {
  const at = (decimals) => plan({ decimals, maxSupply: '21212121' }, [bucket('Treasury', 'treasury', { percent: 7.5 }, { launchPercent: 100 }), bucket('Rest', 'liquidity', { percent: 92.5 }, { launchPercent: 100 })]);
  const f = ofCheck(at(2), 'percent-rounding');
  assert.equal(f.length, 2);
  assert.match(f[0].message, /^7\.5% of the supply of 21,212,121 TST is not a whole number of base units at 2 decimals, so the bucket Treasury holds 1,590,909\.07/);
  assert.deepEqual(ofCheck(at(3), 'percent-rounding'), []);
});

test('amount-precision: an amount or a supply with more places than the decimals; not with as many', () => {
  const a = plan({ decimals: 2 }, [TEAM, LIQUIDITY, bucket('Treasury', 'treasury', { amount: '700000.001' }, { launchPercent: 100 })]);
  const f = ofCheck(a, 'amount-precision');
  assert.equal(f.length, 1);
  assert.match(f[0].message, /The amount of bucket Treasury is 700000\.001, with 3 places after the point, but the token has 2 decimals.*cut to 700,000\./);
  assert.equal(f[0].line, lineOf(planText(a), '"amount"'));
  assert.deepEqual(ofCheck(plan({ decimals: 3 }, a.allocations), 'amount-precision'), []);
  assert.equal(ofCheck(plan({ decimals: 0, maxSupply: '1000000.5' }), 'amount-precision').length, 1);
  assert.equal(ofCheck(plan({ decimals: 1, maxSupply: '1000000.5' }), 'amount-precision').length, 0);
});

test('amount-precision: not reported when the decimals cannot be used, and a note says what was used', () => {
  const r = checkText(planText(plan({ decimals: 300 }, [TEAM, LIQUIDITY, bucket('Treasury', 'treasury', { amount: '700000.001' }, { launchPercent: 100 })])));
  assert.ok(!r.findings.some((f) => f.id === 'amount-precision'));
  assert.ok(r.notes.some((n) => /counted with 18 decimals/.test(n)));
});

test('decimals-out-of-range: past 255, negative or not whole; not at 0 or 255', () => {
  for (const d of [256, -1, 18.5, 1e3]) assert.equal(ofCheck(plan({ decimals: d }), 'decimals-out-of-range').length, 1, String(d));
  assert.match(ofCheck(plan({ decimals: 256 }), 'decimals-out-of-range')[0].message, /ERC-20 returns them as a uint8 and a Solana mint keeps them as a u8/);
  assert.deepEqual(ofCheck(plan({ decimals: 0 }), 'decimals-out-of-range'), []);
  assert.deepEqual(ofCheck(plan({ decimals: 255, chain: 'solana', maxSupply: '1' }, [bucket('All', 'liquidity', { percent: 100 }, { launchPercent: 100 })]), 'decimals-out-of-range'), []);
  assert.deepEqual(idsOf(plan({ decimals: '18' })), ['field-invalid']);
});

test('decimals-unusual: more than 18 on an EVM chain; not 18, and not on Solana', () => {
  assert.equal(ofCheck(plan({ decimals: 19 }), 'decimals-unusual').length, 1);
  assert.match(ofCheck(plan({ decimals: 24 }), 'decimals-unusual')[0].message, /24 decimals, more than the 18 the OpenZeppelin guide advises/);
  assert.deepEqual(ofCheck(plan({ decimals: 18 }), 'decimals-unusual'), []);
  assert.deepEqual(ofCheck(plan({ decimals: 19, chain: 'solana', maxSupply: '1' }), 'decimals-unusual'), []);
});

test('supply-overflow: past a uint256 on an EVM chain and past a u64 on Solana; not at the limit', () => {
  assert.equal(ofCheck(plan({ decimals: 18, maxSupply: `1${'0'.repeat(60)}` }), 'supply-overflow').length, 1);
  assert.deepEqual(ofCheck(plan({ decimals: 18, maxSupply: `1${'0'.repeat(58)}` }), 'supply-overflow'), []);
  const sol = (supply) => plan({ chain: 'solana', decimals: 9, maxSupply: supply });
  assert.match(ofCheck(sol('18446744074'), 'supply-overflow')[0].message, /a u64, the number a Solana mint keeps its supply in/);
  assert.deepEqual(ofCheck(sol('18446744073'), 'supply-overflow'), []);
  assert.equal(ofCheck(plan({ chain: 'solana', decimals: 0, maxSupply: '18446744073709551615' }), 'supply-overflow').length, 0);
  assert.equal(ofCheck(plan({ chain: 'solana', decimals: 0, maxSupply: '1', totalSupply: '18446744073709551616' }), 'supply-overflow').length, 1, 'the larger of the two supplies');
});

test('supply-over-cap: a total supply over the maximum, at the line of the total; not when equal or below', () => {
  const p = plan({ totalSupply: '1000001' });
  const f = ofCheck(p, 'supply-over-cap');
  assert.equal(f.length, 1);
  assert.equal(f[0].line, lineOf(planText(p), '"totalSupply"'));
  assert.deepEqual(ofCheck(plan({ totalSupply: '1000000' }), 'supply-over-cap'), []);
  assert.deepEqual(ofCheck(plan({ totalSupply: '400000' }), 'supply-over-cap'), []);
});

test('mint-cap-missing: a mintable token with a maximum supply and no capMechanism; not with one, not without a maximum, not when not mintable', () => {
  const f = ofCheck(plan({ mintable: true }), 'mint-cap-missing');
  assert.equal(f.length, 1);
  assert.match(f[0].message, /such as ERC20Capped or a cap check in the mint function/);
  assert.equal(f[0].line, lineOf(planText(plan({ mintable: true })), '"mintable"'));
  assert.match(ofCheck(plan({ mintable: true, chain: 'solana', decimals: 9 }), 'mint-cap-missing')[0].message, /a mint authority set to None after the last mint/);
  assert.deepEqual(ofCheck(plan({ mintable: true, capMechanism: 'ERC20Capped' }), 'mint-cap-missing'), []);
  assert.deepEqual(ofCheck(plan({ mintable: true, maxSupply: undefined, totalSupply: '1000000' }), 'mint-cap-missing'), []);
  assert.deepEqual(ofCheck(plan({ mintable: false }), 'mint-cap-missing'), []);
});

test('cliff-over-duration: a cliff longer than durationMonths, at the line of the cliff; not equal, and not with linearMonths', () => {
  const p = withTreasury({ cliffMonths: 9, durationMonths: 6 });
  const f = ofCheck(p, 'cliff-over-duration');
  assert.equal(f.length, 1);
  assert.equal(f[0].line, lineOf(planText(p), '"cliffMonths": 9'));
  assert.deepEqual(ofCheck(withTreasury({ cliffMonths: 6, durationMonths: 6 }), 'cliff-over-duration'), []);
  assert.deepEqual(ofCheck(withTreasury({ cliffMonths: 9, linearMonths: 6 }), 'cliff-over-duration'), []);
});

test('insider-launch-release: an insider bucket with a part at launch, by launchPercent or by a step at month 0; not for a treasury', () => {
  for (const kind of ['team', 'insiders', 'advisors', 'investors']) assert.equal(ofCheck(withTeam({ launchPercent: 5, cliffMonths: 12, linearMonths: 24 }, kind), 'insider-launch-release').length, 1, kind);
  const step = withTeam({ schedule: [{ month: 0, percent: 1 }, { month: 24, percent: 99 }] });
  const f = ofCheck(step, 'insider-launch-release');
  assert.equal(f.length, 1);
  assert.equal(f[0].line, lineOf(planText(step), '"month": 0') - 1, 'the line of the step');
  assert.match(f[0].message, /The bucket Team \(team\) releases 2,000 TST, 1% of the bucket, at launch/);
  assert.deepEqual(ofCheck(withTeam({ launchPercent: 0, cliffMonths: 12, linearMonths: 24 }), 'insider-launch-release'), []);
  assert.deepEqual(ofCheck(withTeam({ launchPercent: 5, cliffMonths: 12, linearMonths: 24 }, 'treasury'), 'insider-launch-release'), []);
});

test('insider-no-cliff: an insider release before --min-cliff; not at the month itself, and the option moves the edge', () => {
  const early = withTeam({ cliffMonths: 4, linearMonths: 24 });
  assert.match(ofCheck(early, 'insider-no-cliff')[0].message, /releases .* at month 5, before month 6 \(--min-cliff\); its cliff ends at month 4/);
  assert.deepEqual(ofCheck(withTeam({ cliffMonths: 5, linearMonths: 24 }), 'insider-no-cliff'), [], 'the first release at month 6');
  assert.deepEqual(ofCheck(withTeam({ cliffMonths: 6, durationMonths: 24 }), 'insider-no-cliff'), [], 'the VestingWallet lump at month 6');
  assert.equal(ofCheck(withTeam({ cliffMonths: 6, linearMonths: 24 }), 'insider-no-cliff', { minCliff: 12 }).length, 1);
  assert.deepEqual(ofCheck(withTeam({ cliffMonths: 4, linearMonths: 24 }), 'insider-no-cliff', { minCliff: 0 }), []);
  assert.deepEqual(ofCheck(withTeam({ launchPercent: 100 }), 'insider-no-cliff'), [], 'a release at launch only is the other check');
});

test('vesting-too-short: an insider bucket fully released before --min-vesting; not at the month itself, and not for a treasury', () => {
  assert.match(ofCheck(withTeam({ cliffMonths: 6, linearMonths: 5 }), 'vesting-too-short')[0].message, /fully released by month 11, before month 12 \(--min-vesting\)/);
  assert.deepEqual(ofCheck(withTeam({ cliffMonths: 6, linearMonths: 6 }), 'vesting-too-short'), []);
  assert.equal(ofCheck(withTeam({ cliffMonths: 6, linearMonths: 6 }), 'vesting-too-short', { minVesting: 13 }).length, 1);
  assert.deepEqual(ofCheck(withTeam({ launchPercent: 100 }, 'treasury'), 'vesting-too-short'), []);
  assert.equal(ofCheck(withTeam({ launchPercent: 100 }), 'vesting-too-short').length, 1);
});

test('vesting-too-long: any bucket that still releases after --max-vesting; not at the month itself', () => {
  assert.match(ofCheck(withTreasury({ linearMonths: 61 }), 'vesting-too-long')[0].message, /The bucket Treasury still releases at month 61, after month 60 \(--max-vesting\)/);
  assert.deepEqual(ofCheck(withTreasury({ linearMonths: 60 }), 'vesting-too-long'), []);
  assert.deepEqual(ofCheck(withTreasury({ linearMonths: 61 }), 'vesting-too-long', { maxVesting: 61 }), []);
});

test('schedule-mismatch: steps over the bucket, steps short of it and a launch part with nothing after; not when the steps add up', () => {
  const over = withTreasury({ schedule: [{ month: 1, percent: 50 }, { month: 2, percent: 60 }] });
  const f = ofCheck(over, 'schedule-mismatch');
  assert.equal(f.length, 1);
  assert.match(f[0].message, /The schedule of bucket Treasury releases 770,000 TST, more than the 700,000 TST the bucket holds/);
  assert.equal(f[0].line, lineOf(planText(over), '"schedule"'));
  assert.match(ofCheck(withTreasury({ schedule: [{ month: 1, percent: 50 }, { month: 2, percent: 40 }] }), 'schedule-mismatch')[0].message, /its steps add up to 90% of the bucket, so 70,000 TST is never released/);
  assert.match(ofCheck(withTreasury({ launchPercent: 20 }), 'schedule-mismatch')[0].message, /it gives launchPercent 20% and no linearMonths, durationMonths or schedule for the rest, so 560,000 TST is never released/);
  assert.match(ofCheck(withTreasury({}), 'schedule-mismatch')[0].message, /it gives no launchPercent/);
  assert.deepEqual(ofCheck(withTreasury({ schedule: [{ month: 1, percent: 50 }, { month: 2, percent: 50 }] }), 'schedule-mismatch'), []);
  assert.deepEqual(ofCheck(withTreasury({ schedule: [{ month: 1, amount: '700000' }] }), 'schedule-mismatch'), []);
});

test('supply-cliff: a month over --cliff-share of the circulating supply before it, at the line of the largest bucket; not at the share itself', () => {
  // 10 percent at launch; a lump of 2.5 percent is 25 percent of it, and 2.6 percent is more.
  const lump = (percent) => plan({}, [bucket('Liquidity', 'liquidity', { percent: 10 }, { launchPercent: 100 }), bucket('Team', 'team', { percent }, { cliffMonths: 12, linearMonths: 0 }), bucket('Treasury', 'treasury', { percent: 90 - percent }, { startMonth: 24, linearMonths: 12 })]);
  const f = ofCheck(lump(2.6), 'supply-cliff').filter((x) => /^Month 12 /.test(x.message));
  assert.equal(f.length, 1);
  assert.match(f[0].message, /^Month 12 releases 26,000 TST, 26% of the 100,000 TST in circulation before it, more than the 25% of --cliff-share: Team 26,000 TST\./);
  assert.equal(f[0].line, lineOf(planText(lump(2.6)), '"vesting"', 2));
  assert.deepEqual(ofCheck(lump(2.5), 'supply-cliff').filter((x) => /Month 12/.test(x.message)), []);
  assert.deepEqual(ofCheck(lump(2.6), 'supply-cliff', { cliffShare: '26' }).filter((x) => /Month 12/.test(x.message)), []);
  assert.equal(ofCheck(lump(2.6), 'supply-cliff', { cliffShare: '25.9' }).filter((x) => /Month 12/.test(x.message)).length, 1);
});

test('supply-cliff: the first release after a launch with nothing in circulation is not a cliff', () => {
  const p = plan({ tradingAtLaunch: false }, [bucket('All', 'treasury', { percent: 100 }, { cliffMonths: 1, linearMonths: 0 })]);
  assert.deepEqual(ofCheck(p, 'supply-cliff'), []);
});

test('trading-without-float: trading at launch with no float bucket, an empty one or one held back; not when one releases at launch', () => {
  const none = plan({}, [TEAM, bucket('Treasury', 'treasury', { percent: 80 }, { launchPercent: 10, linearMonths: 48 })]);
  assert.match(ofCheck(none, 'trading-without-float')[0].message, /there is no bucket of kind liquidity or public-sale/);
  assert.equal(ofCheck(none, 'trading-without-float')[0].line, lineOf(planText(none), '"tradingAtLaunch"'));
  const held = plan({}, [TEAM, bucket('Sale', 'public-sale', { percent: 10 }, { cliffMonths: 1, linearMonths: 1 }), TREASURY]);
  assert.match(ofCheck(held, 'trading-without-float')[0].message, /Sale releases nothing at launch/);
  assert.deepEqual(ofCheck(plan({ tradingAtLaunch: false }, none.allocations), 'trading-without-float'), []);
  assert.deepEqual(ofCheck(plan({ tradingAtLaunch: undefined }, none.allocations), 'trading-without-float'), []);
  const sale = plan({}, [TEAM, bucket('Sale', 'public-sale', { percent: 10 }, { launchPercent: 1, linearMonths: 1 }), TREASURY]);
  assert.deepEqual(ofCheck(sale, 'trading-without-float'), []);
});

test('the findings of a bucket name it, and every best practice message says so', () => {
  const f = findingsAll();
  assert.ok(f.filter((x) => x.id !== 'allocation-sum' && x.id !== 'supply-cliff').every((x) => x.bucket === 'Team'));
  const best = new Set(RULES.filter((r) => r.kind === 'best practice').map((r) => r.id));
  for (const x of f.filter((y) => best.has(y.id))) assert.match(x.message, /This is a best practice of this tool, not a rule in EIP-20/, x.id);
});

function findingsAll() {
  return checkText(planText(withTeam({ launchPercent: 50, linearMonths: 2 }))).findings;
}

test('analyzePlan: the default thresholds, and options that replace them one by one', () => {
  assert.deepEqual(DEFAULTS, { cliffShare: '25', minCliff: 6, minVesting: 12, maxVesting: 60 });
  const read = readPlan(readJson(planText(withTeam({ cliffMonths: 3, linearMonths: 6 })))).plan;
  assert.deepEqual(analyzePlan(read).findings.map((f) => f.id).sort(), ['insider-no-cliff', 'vesting-too-short']);
  assert.deepEqual(analyzePlan(read, { minCliff: 4 }).findings.map((f) => f.id), ['vesting-too-short']);
  const r = analyzePlan(read, { minCliff: 4, minVesting: 9 });
  assert.deepEqual(r.findings, []);
  assert.equal(r.last, 48);
  assert.equal(r.rows.length, 49);
  assert.equal(r.entries.length, 3);
});
