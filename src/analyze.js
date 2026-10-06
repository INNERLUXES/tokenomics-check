// The checks on a plan that was read: the supply and the cap, the sum of the buckets, the schedules of the buckets, the
// insider buckets, the months of large releases and the float at launch. Each finding names the line of the field it is
// about. The thresholds come from the options (src/cli.js), with the defaults below.

import { formatAmount, overShare, parseDecimal, percentText, pow10, U64_MAX, UINT256_MAX } from './amounts.js';
import { FLOAT_KINDS, INSIDER_KINDS } from './plan.js';
import { BEST } from './rules.js';
import { monthlyTotals, releasesOf } from './schedule.js';
import { listText } from './size.js';

export const DEFAULTS = { cliffShare: '25', minCliff: 6, minVesting: 12, maxVesting: 60 };

const BP = `This is ${BEST}.`;
const at = (e) => ({ line: e.line, column: e.column });

// The checks of a plan: { findings, entries, rows, last, notes }. entries holds each bucket with its releases.
export function analyzePlan(plan, options = {}) {
  const o = { ...DEFAULTS, ...options };
  const share = typeof o.cliffShare === 'string' ? parseDecimal(o.cliffShare) : o.cliffShare;
  const findings = [];
  const notes = [];
  const add = (id, where, message, extra = {}) => findings.push({ id, line: where.line, column: where.column, message, ...extra });
  const dec = plan.units;
  const sym = plan.symbol ? ` ${plan.symbol}` : '';
  const amt = (u) => `${formatAmount(u, dec)}${sym}`;

  // The supply and the cap.
  if (plan.maxSupply && plan.totalSupply && plan.totalSupply.units > plan.maxSupply.units) {
    add('supply-over-cap', at(plan.totalSupply.entry), `The total supply of ${amt(plan.totalSupply.units)} is larger than the maximum supply of ${amt(plan.maxSupply.units)}; a cap such as ERC20Capped at the maximum refuses a mint past it with ERC20ExceededCap.`);
  }
  const largest = [plan.maxSupply, plan.totalSupply].filter(Boolean).sort((a, b) => (a.units > b.units ? -1 : 1))[0];
  if (largest) {
    const [limit, name] = plan.chain === 'solana' ? [U64_MAX, 'a u64, the number a Solana mint keeps its supply in'] : [UINT256_MAX, 'a uint256, the number ERC-20 reports the total supply in'];
    if (largest.units > limit) add('supply-overflow', at(largest.entry), `The supply of ${amt(largest.units)} is ${largest.units.toString().length} digits in base units at ${dec} decimals, more than ${name} holds (${limit.toString().length} digits).`);
  }
  if (plan.chain === 'evm' && plan.decimals !== null && plan.decimals > 18) {
    add('decimals-unusual', at(plan.decimalsEntry), `The token has ${plan.decimals} decimals, more than the 18 the OpenZeppelin guide advises and Ether uses; wallets and exchanges that assume 18 may show or round amounts wrongly. ${BP}`);
  }
  if (plan.mintable.value === true && plan.maxSupply && plan.capMechanism === null) {
    const how = plan.chain === 'solana' ? 'a mint authority set to None after the last mint' : 'ERC20Capped or a cap check in the mint function';
    add('mint-cap-missing', at(plan.mintable.entry), `The token is mintable and states a maximum supply of ${amt(plan.maxSupply.units)}, but capMechanism names nothing that enforces it, such as ${how}; while a mint can go on, the maximum is only a promise.`);
  }

  // The sum of the buckets, exactly: amounts in base units and percents of the supply as fractions.
  const known = plan.buckets.filter((b) => b.share !== null);
  if (plan.supply !== null && plan.allocationsEntry && known.length > 0) {
    const missing = plan.buckets.filter((b) => b.share === null);
    if (missing.length) notes.push(`the sum of the buckets was not checked, because ${listText(missing.map((b) => b.title))} ${missing.length === 1 ? 'has' : 'have'} no amount or percent the tool could read`);
    else {
      const scale = Math.max(0, ...known.filter((b) => b.share.form === 'percent').map((b) => b.share.d.scale));
      const den = 100n * pow10(scale);
      let amounts = 0n;
      let percents = 0n;
      for (const b of known) {
        if (b.share.form === 'amount') amounts += b.units;
        else percents += b.share.d.digits * pow10(scale - b.share.d.scale);
      }
      const exact = amounts * den + plan.supply * percents;
      const want = plan.supply * den;
      if (exact !== want) {
        const sum = known.reduce((n, b) => n + b.units, 0n);
        const diff = sum > plan.supply ? sum - plan.supply : plan.supply - sum;
        const word = exact > want ? 'more' : 'less';
        const shown = diff === 0n ? 'less than one base unit' : amt(diff);
        add('allocation-sum', at(plan.allocationsEntry), `The ${plan.buckets.length} buckets add up to ${amt(sum)}, ${percentText(sum, plan.supply)} of the ${plan.supplyKey} of ${amt(plan.supply)}: ${shown} ${word} than the supply. ${BP}`);
      }
    }
  }

  // The schedules.
  const entries = [];
  for (const b of plan.buckets) {
    const releases = releasesOf(b);
    if (releases === null) continue;
    entries.push({ bucket: b, releases });
    const v = b.vesting;
    const vat = at(v.entry);
    const insider = INSIDER_KINDS.includes(b.kind);
    const extra = { bucket: b.name };
    if (v.form === 'duration' && v.cliff > v.duration) {
      add('cliff-over-duration', at(v.cliffEntry), `The ${b.label} has a cliff of ${v.cliff} months and a duration of ${v.duration} months; VestingWalletCliff refuses a cliff longer than its duration with InvalidCliffDuration. The table releases the rest at the end of the cliff.`, extra);
    }
    if (releases.total > b.units) {
      add('schedule-mismatch', at(v.scheduleEntry ?? v.entry), `The schedule of ${b.label} releases ${amt(releases.total)}, more than the ${amt(b.units)} the bucket holds. ${BP}`, extra);
    } else if (releases.total < b.units) {
      const rest = amt(b.units - releases.total);
      const why = v.form === 'schedule' ? `its steps add up to ${percentText(releases.total, b.units)} of the bucket` : `it gives ${v.launch ? `launchPercent ${percentText(releases.total, b.units)}` : 'no launchPercent'} and no linearMonths, durationMonths or schedule for the rest`;
      add('schedule-mismatch', at(v.scheduleEntry ?? v.entry), `The ${b.label} holds ${amt(b.units)}, but ${why}, so ${rest} is never released. ${BP}`, extra);
    }
    if (insider && releases.months.length) {
      const launch = releases.months[0][0] === 0 ? releases.months[0][1] : 0n;
      if (launch > 0n) {
        const where = v.launchEntry ?? (v.steps ? v.steps.find((s) => s.month === 0) : null) ?? v.entry;
        add('insider-launch-release', at(where), `The ${b.label} (${b.kind}) releases ${amt(launch)}, ${percentText(launch, b.units)} of the bucket, at launch; insiders who can sell on the first day weigh on the price before the market has formed. ${BP}`, extra);
      }
      const early = releases.months.find(([m]) => m >= 1 && m < o.minCliff);
      if (early) {
        add('insider-no-cliff', at(v.cliffEntry ?? v.entry), `The ${b.label} (${b.kind}) releases ${amt(early[1])} at month ${early[0]}, before month ${o.minCliff} (--min-cliff); its cliff ends ${v.form === 'schedule' ? 'with the first step after launch' : `at month ${v.start + v.cliff}`}. ${BP}`, extra);
      }
      if (releases.last !== null && releases.last < o.minVesting) {
        add('vesting-too-short', vat, `The ${b.label} (${b.kind}) is fully released by month ${releases.last}, before month ${o.minVesting} (--min-vesting). ${BP}`, extra);
      }
    }
    if (releases.last !== null && releases.last > o.maxVesting) {
      add('vesting-too-long', vat, `The ${b.label} still releases at month ${releases.last}, after month ${o.maxVesting} (--max-vesting). ${BP}`, extra);
    }
  }

  // The months of the whole plan, to the last release of any bucket.
  const last = entries.reduce((n, e) => Math.max(n, e.releases.last ?? 0), 0);
  const rows = monthlyTotals(entries, last);
  for (const r of rows) {
    if (r.month === 0 || r.released === 0n) continue;
    const before = r.circulating - r.released;
    if (before > 0n && overShare(r.released, before, share)) {
      const top = r.from[0].bucket;
      const parts = r.from.map((f) => `${f.bucket.title} ${amt(f.units)}`);
      add('supply-cliff', at(top.vesting.entry), `Month ${r.month} releases ${amt(r.released)}, ${percentText(r.released, before)} of the ${amt(before)} in circulation before it, more than the ${o.cliffShare}% of --cliff-share: ${listText(parts, 4)}. ${BP}`, { bucket: top.name });
    }
  }

  if (plan.tradingAtLaunch.value === true) {
    const floats = plan.buckets.filter((b) => FLOAT_KINDS.includes(b.kind));
    const atLaunch = entries.filter((e) => FLOAT_KINDS.includes(e.bucket.kind)).reduce((n, e) => n + (e.releases.months[0]?.[0] === 0 ? e.releases.months[0][1] : 0n), 0n);
    const unread = floats.some((b) => !entries.some((e) => e.bucket === b));
    if (atLaunch === 0n && !unread) {
      const why = floats.length === 0 ? 'there is no bucket of kind liquidity or public-sale' : `${listText(floats.map((b) => b.title))} ${floats.length === 1 ? 'releases' : 'release'} nothing at launch`;
      add('trading-without-float', at(plan.tradingAtLaunch.entry), `Trading starts at launch, but ${why}, so there is nothing to trade or to pool. ${BP}`);
    }
  }

  const skipped = plan.buckets.filter((b) => !entries.some((e) => e.bucket === b));
  if (skipped.length) notes.push(`${listText(skipped.map((b) => b.title))} ${skipped.length === 1 ? 'is' : 'are'} not in the table, because ${skipped.length === 1 ? 'its' : 'their'} amount or vesting could not be read`);
  return { findings, entries, rows, last, notes };
}
