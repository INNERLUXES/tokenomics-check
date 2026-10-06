// The release schedule of each bucket, month by month from launch (month 0), in base units, and the table of the plan:
// what all buckets release in each month and the supply in circulation after it. Every part is worked out with BigInt and
// rounded down to a base unit; a part that a rounding leaves over goes to the last month of its form, so a bucket that
// releases 100 percent releases its amount exactly.
//
// The forms (docs/method.md):
//   launchPercent      released at month 0
//   linearMonths n     the rest in n equal monthly parts, at months start + cliff + 1 to start + cliff + n; n = 0 is
//                      the rest at once, at month start + cliff
//   durationMonths d   the rest along the VestingWallet curve from the start: at month m from start + cliff on, the
//                      vested part is rest * (m - start) / d, all of it from month start + d; nothing before the cliff
//   schedule           explicit steps, each at a month, as a percent of the bucket or an amount of tokens

import { percentOf, pow10 } from './amounts.js';

// The months and parts a bucket releases: { months: [[month, units]], total, first, last } with months in order, or null
// when the bucket has no amount or no vesting the tool could read.
export function releasesOf(bucket) {
  const total = bucket.units;
  const v = bucket.vesting;
  if (total === null || v === null) return null;
  const out = new Map();
  const add = (m, u) => {
    if (u > 0n) out.set(m, (out.get(m) ?? 0n) + u);
  };
  if (v.form === 'schedule') {
    const steps = [...v.steps].sort((a, b) => a.month - b.month);
    if (v.stepsForm === 'amount') for (const s of steps) add(s.month, s.part.units);
    else {
      // Cumulative percents, so that steps adding up to 100 release the bucket exactly.
      const scale = Math.max(...steps.map((s) => s.part.d.scale));
      const den = 100n * pow10(scale);
      let sum = 0n;
      let before = 0n;
      for (const s of steps) {
        sum += s.part.d.digits * pow10(scale - s.part.d.scale);
        const now = (total * sum) / den;
        add(s.month, now - before);
        before = now;
      }
    }
  } else {
    const launch = v.launch ? percentOf(total, v.launch).units : 0n;
    add(0, launch);
    const rest = total - launch;
    const from = v.start + v.cliff;
    if (v.form === 'linear') {
      const n = v.linear;
      if (n === 0) add(from, rest);
      else {
        let before = 0n;
        for (let k = 1; k <= n; k += 1) {
          const now = (rest * BigInt(k)) / BigInt(n);
          add(from + k, now - before);
          before = now;
        }
      }
    } else if (v.form === 'duration') {
      const d = v.duration;
      const vested = (m) => {
        if (m < from || m < v.start) return 0n;
        if (d === 0 || m - v.start >= d) return rest;
        return (rest * BigInt(m - v.start)) / BigInt(d);
      };
      const end = Math.max(from, v.start + d);
      let before = 0n;
      for (let m = from; m <= end; m += 1) {
        const now = vested(m);
        add(m, now - before);
        before = now;
      }
    }
  }
  const months = [...out.entries()].sort((a, b) => a[0] - b[0]);
  const released = months.reduce((n, [, u]) => n + u, 0n);
  return { months, total: released, first: months.length ? months[0][0] : null, last: months.length ? months.at(-1)[0] : null };
}

// What all buckets release in each month and the supply in circulation after it, for months 0 to last:
// [{ month, released, circulating, from: [{ bucket, units }] }]. from is sorted by size, the largest first.
export function monthlyTotals(entries, last) {
  const byMonth = new Map();
  for (const { bucket, releases } of entries) {
    for (const [m, u] of releases.months) {
      if (m > last) continue;
      if (!byMonth.has(m)) byMonth.set(m, []);
      byMonth.get(m).push({ bucket, units: u });
    }
  }
  const rows = [];
  let circulating = 0n;
  for (let m = 0; m <= last; m += 1) {
    const from = (byMonth.get(m) ?? []).sort((a, b) => (a.units === b.units ? a.bucket.index - b.bucket.index : a.units > b.units ? -1 : 1));
    const released = from.reduce((n, f) => n + f.units, 0n);
    circulating += released;
    rows.push({ month: m, released, circulating, from });
  }
  return rows;
}
