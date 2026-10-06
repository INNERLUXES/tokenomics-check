import { test } from 'node:test';
import assert from 'node:assert/strict';
import { monthlyTotals, readJson, readPlan, releasesOf } from '../src/index.js';
import { bucket, plan, planText } from './helpers.js';

// The releases of one bucket of 1,000 whole tokens at 0 decimals, given its vesting.
function releases(vesting, share = { amount: '1000' }) {
  const p = readPlan(readJson(planText(plan({ decimals: 0, maxSupply: '1000' }, [bucket('B', 'treasury', share, vesting)])))).plan;
  return releasesOf(p.buckets[0]);
}
const months = (r) => r.months.map(([m, u]) => `${m}:${u}`);

test('launchPercent 100: the whole bucket at month 0', () => {
  const r = releases({ launchPercent: 100 });
  assert.deepEqual(months(r), ['0:1000']);
  assert.equal(r.total, 1000n);
  assert.equal(r.first, 0);
  assert.equal(r.last, 0);
});

test('linearMonths: equal parts after the cliff, with the rounding left to the months that need it, and the launch part first', () => {
  assert.deepEqual(months(releases({ cliffMonths: 2, linearMonths: 4 })), ['3:250', '4:250', '5:250', '6:250']);
  assert.deepEqual(months(releases({ launchPercent: 10, linearMonths: 3 })), ['0:100', '1:300', '2:300', '3:300']);
  assert.deepEqual(months(releases({ startMonth: 6, cliffMonths: 6, linearMonths: 0 })), ['12:1000']);
  const odd = releases({ linearMonths: 3 }, { amount: '1000' });
  assert.equal(odd.total, 1000n);
  assert.deepEqual(odd.months.map(([, u]) => u), [333n, 333n, 334n]);
});

test('durationMonths: the VestingWallet curve from the start, nothing before the cliff and the accrued part at the cliff', () => {
  assert.deepEqual(months(releases({ durationMonths: 4 })), ['1:250', '2:250', '3:250', '4:250']);
  assert.deepEqual(months(releases({ cliffMonths: 2, durationMonths: 4 })), ['2:500', '3:250', '4:250']);
  assert.deepEqual(months(releases({ startMonth: 3, durationMonths: 0 })), ['3:1000']);
  assert.deepEqual(months(releases({ cliffMonths: 6, durationMonths: 4 })), ['6:1000'], 'a cliff past the duration releases the rest at the cliff');
});

test('schedule: steps in percent add up exactly, steps in amounts are taken as they are, and the steps are put in order', () => {
  assert.deepEqual(months(releases({ schedule: [{ month: 12, percent: 50 }, { month: 0, percent: 25 }, { month: 6, percent: 25 }] })), ['0:250', '6:250', '12:500']);
  assert.deepEqual(months(releases({ schedule: [{ month: 1, percent: 33.3 }, { month: 2, percent: 33.3 }, { month: 3, percent: 33.4 }] })), ['1:333', '2:333', '3:334']);
  assert.deepEqual(months(releases({ schedule: [{ month: 1, amount: '400' }, { month: 1, amount: '100' }] })), ['1:500']);
  assert.equal(releases({ schedule: [{ month: 1, percent: 60 }, { month: 2, percent: 60 }] }).total, 1200n);
});

test('no form after the launch part: only the launch part is released', () => {
  const r = releases({ launchPercent: 20 });
  assert.deepEqual(months(r), ['0:200']);
  assert.equal(r.total, 200n);
  const none = releases({});
  assert.deepEqual(none.months, []);
  assert.equal(none.first, null);
  assert.equal(none.last, null);
});

test('releasesOf: null for a bucket with no amount or no vesting', () => {
  const p = readPlan(readJson(planText(plan({}, [bucket('A', 'team', { percent: 'x' }, { launchPercent: 100 }), bucket('B', 'team', { percent: 10 })])))).plan;
  assert.equal(releasesOf(p.buckets[0]), null);
  assert.equal(releasesOf(p.buckets[1]), null);
});

test('monthlyTotals: the months of all buckets, the circulating supply after each, and the buckets of each month largest first', () => {
  const p = readPlan(readJson(planText(plan({ decimals: 0, maxSupply: '1000' }, [bucket('Small', 'treasury', { amount: '100' }, { launchPercent: 100 }), bucket('Large', 'liquidity', { amount: '900' }, { launchPercent: 50, linearMonths: 2 })])))).plan;
  const entries = p.buckets.map((b) => ({ bucket: b, releases: releasesOf(b) }));
  const rows = monthlyTotals(entries, 3);
  assert.deepEqual(rows.map((r) => `${r.month}:${r.released}:${r.circulating}`), ['0:550:550', '1:225:775', '2:225:1000', '3:0:1000']);
  assert.deepEqual(rows[0].from.map((f) => f.bucket.name), ['Large', 'Small']);
  assert.deepEqual(monthlyTotals(entries, 1).length, 2);
});
