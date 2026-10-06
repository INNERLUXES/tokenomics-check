// Reading a token plan from the nodes of the JSON reader. Every field is read with the line and column of its key, so a
// finding can point at it. A field that is missing, of the wrong type, out of range or unknown is a finding of its own,
// and the value is left out of the checks that need it; nothing that was not read is taken for a value that is fine.
// Keys of the file are only compared with the names below; no object is built with a key from the file.

import { isArray, isNumber, isObject, isString } from './json.js';
import { formatDecimal, formatUnits, parseDecimal, percentOf, toUnits } from './amounts.js';

export const PLAN_LIMITS = { maxBuckets: 1000, maxSteps: 2400, maxMonth: 1200 };

export const KINDS = ['team', 'insiders', 'advisors', 'investors', 'treasury', 'reserve', 'community', 'ecosystem', 'rewards', 'airdrop', 'liquidity', 'public-sale', 'other'];
export const INSIDER_KINDS = ['team', 'insiders', 'advisors', 'investors'];
export const FLOAT_KINDS = ['liquidity', 'public-sale'];
export const CHAINS = ['evm', 'solana'];

export const TOP_KEYS = ['name', 'symbol', 'decimals', 'chain', 'maxSupply', 'totalSupply', 'mintable', 'burnable', 'capMechanism', 'tradingAtLaunch', 'allocations', 'notes'];
export const BUCKET_KEYS = ['name', 'kind', 'amount', 'percent', 'vesting', 'notes'];
export const VESTING_KEYS = ['startMonth', 'cliffMonths', 'launchPercent', 'linearMonths', 'durationMonths', 'schedule'];
export const STEP_KEYS = ['month', 'percent', 'amount'];

// The decimals the amounts are counted in when the plan gives none that can be used.
export const FALLBACK_DECIMALS = 18;

const where = (e) => ({ line: e.line, column: e.column });

// A known key that an unknown one is probably meant to be: the same letters in another case, or one that starts with the
// other.
export function suggestKey(key, known) {
  const k = key.toLowerCase();
  if (k.length < 3) return null;
  return known.find((n) => n.toLowerCase() === k) ?? known.find((n) => n.toLowerCase().startsWith(k) || k.startsWith(n.toLowerCase())) ?? null;
}

const describe = (node) => (node.kind === 'object' ? 'an object' : node.kind === 'array' ? 'a list' : node.kind === 'null' ? 'null' : node.kind === 'boolean' ? `${node.value}` : node.kind === 'number' ? `the number ${node.raw}` : 'text');

// Reads the plan from the root node: { plan, findings, notes }.
export function readPlan(root, limits = PLAN_LIMITS) {
  const findings = [];
  const notes = [];
  const add = (id, at, message, extra = {}) => findings.push({ id, line: at.line, column: at.column, message, ...extra });

  // The entries of an object, with a field-unknown finding for each key that is not in known, and the first entry of each
  // known key in a map.
  function entries(obj, known, label) {
    const map = new Map();
    for (const e of obj.entries) {
      if (known.includes(e.key)) map.set(e.key, e);
      else {
        const near = suggestKey(e.key, known);
        add('field-unknown', where(e), `The key "${e.key}" of ${label} is not one the tool reads, so its value was left out of every check.${near ? ` Did you mean "${near}"?` : ''} The keys of ${label} are ${known.join(', ')}.`);
      }
    }
    return map;
  }

  function text(map, key, at, label, required) {
    const e = map.get(key);
    if (!e) {
      if (required) add('field-missing', at, `${label} has no ${key}.`);
      return null;
    }
    if (!isString(e.value)) {
      add('field-invalid', where(e), `The ${key} of ${label} is ${describe(e.value)}; it must be text.`);
      return null;
    }
    if (e.value.value.trim() === '') {
      add('field-invalid', where(e), `The ${key} of ${label} is empty.`);
      return null;
    }
    return e.value.value;
  }

  function flag(map, key, at, label, required) {
    const e = map.get(key);
    if (!e) {
      if (required) add('field-missing', at, `${label} has no ${key} flag; write true or false.`);
      return { value: null, entry: null };
    }
    if (e.value.kind !== 'boolean') {
      add('field-invalid', where(e), `The ${key} of ${label} is ${describe(e.value)}; it must be true or false.`);
      return { value: null, entry: e };
    }
    return { value: e.value.value, entry: e };
  }

  // A whole number of months from 0 to the limit.
  function month(map, key, label, fallback) {
    const e = map.get(key);
    if (!e) return { value: fallback, entry: null };
    const v = e.value;
    const d = isNumber(v) ? parseDecimal(v.raw) : null;
    if (!d || d.negative || d.scale !== 0 || d.digits > BigInt(limits.maxMonth)) {
      add('field-invalid', where(e), `The ${key} of ${label} is ${describe(v)}; it must be a whole number of months from 0 to ${limits.maxMonth}.`);
      return { value: null, entry: e };
    }
    return { value: Number(d.digits), entry: e };
  }

  // A decimal number written as a number or as text.
  function decimal(e, key, label) {
    const v = e.value;
    const d = isNumber(v) ? parseDecimal(v.raw) : isString(v) ? parseDecimal(v.value.trim()) : null;
    if (!d) add('field-invalid', where(e), `The ${key} of ${label} is ${describe(v)}; it must be a decimal number, such as 1000000 or "1000000.5".`);
    return d;
  }

  function percent(e, key, label) {
    const d = decimal(e, key, label);
    if (!d) return null;
    if (d.negative || d.digits > 100n * 10n ** BigInt(d.scale)) {
      add('percent-out-of-range', where(e), `The ${key} of ${label} is ${formatDecimal(d)}, outside 0 to 100.`);
      return null;
    }
    return d;
  }

  if (!isObject(root)) {
    add('plan-unreadable', root, `The file holds ${describe(root)}, not a token plan; a plan is one JSON object (docs/inputs.md). Nothing in the file was checked.`);
    return { plan: null, findings, notes };
  }

  const top = entries(root, TOP_KEYS, 'the plan');
  const start = where(root);
  const plan = { name: text(top, 'name', start, 'The plan', true), symbol: text(top, 'symbol', start, 'The plan', true), entries: top, line: root.line, column: root.column };

  // Decimals: a uint8 on Ethereum and a u8 on Solana.
  plan.decimals = null;
  const de = top.get('decimals');
  if (!de) add('field-missing', start, 'The plan has no decimals; give the number of places after the point, such as 18.');
  else if (!isNumber(de.value)) add('field-invalid', where(de), `The decimals of the plan are ${describe(de.value)}; they must be a whole number such as 18.`);
  else {
    const d = parseDecimal(de.value.raw);
    if (!d || d.negative || d.scale !== 0 || d.digits > 255n) add('decimals-out-of-range', where(de), `The decimals are ${de.value.raw}, not a whole number from 0 to 255: ERC-20 returns them as a uint8 and a Solana mint keeps them as a u8.`);
    else plan.decimals = Number(d.digits);
  }
  plan.decimalsEntry = de ?? null;
  plan.units = plan.decimals ?? FALLBACK_DECIMALS;
  if (plan.decimals === null) notes.push(`the plan gives no decimals the tool can use, so amounts were counted with ${FALLBACK_DECIMALS} decimals and the places of amounts were not checked`);

  const ce = top.get('chain');
  plan.chain = 'evm';
  if (ce) {
    if (!isString(ce.value) || !CHAINS.includes(ce.value.value)) add('field-invalid', where(ce), `The chain of the plan is ${isString(ce.value) ? `"${ce.value.value}"` : describe(ce.value)}; it must be ${CHAINS.join(' or ')}. The checks use evm.`);
    else plan.chain = ce.value.value;
  }

  // An amount of whole tokens, in base units; amount-precision when it has more places than the decimals.
  function amount(e, key, label) {
    const d = decimal(e, key, label);
    if (!d) return null;
    if (d.negative) {
      add('field-invalid', where(e), `The ${key} of ${label} is ${formatDecimal(d)}; an amount cannot be negative.`);
      return null;
    }
    const { units, exact } = toUnits(d, plan.units);
    if (!exact && plan.decimals !== null) add('amount-precision', where(e), `The ${key} of ${label} is ${formatDecimal(d)}, with ${d.scale} places after the point, but the token has ${plan.decimals} decimals: an amount is held as a whole number of base units, so it would be cut to ${formatUnits(units, plan.decimals)}.`);
    return { d, units, entry: e };
  }

  for (const key of ['maxSupply', 'totalSupply']) {
    const e = top.get(key);
    plan[key] = null;
    if (!e) continue;
    const a = amount(e, key, 'the plan');
    if (a && a.units === 0n) add('field-invalid', where(e), `The ${key} of the plan is zero.`);
    else plan[key] = a;
  }
  if (!top.get('maxSupply') && !top.get('totalSupply')) add('field-missing', start, 'The plan has no supply; give maxSupply, totalSupply or both, in whole tokens.');
  plan.supplyKey = plan.maxSupply ? 'maxSupply' : plan.totalSupply ? 'totalSupply' : null;
  plan.supply = plan.supplyKey ? plan[plan.supplyKey].units : null;

  plan.mintable = flag(top, 'mintable', start, 'The plan', true);
  plan.burnable = flag(top, 'burnable', start, 'The plan', false);
  plan.tradingAtLaunch = flag(top, 'tradingAtLaunch', start, 'The plan', false);
  plan.capMechanism = text(top, 'capMechanism', start, 'the plan', false);
  plan.capEntry = top.get('capMechanism') ?? null;
  const notesEntry = top.get('notes');
  if (notesEntry && !isString(notesEntry.value)) add('field-invalid', where(notesEntry), `The notes of the plan are ${describe(notesEntry.value)}; they must be text.`);

  // The buckets.
  plan.buckets = [];
  const ae = top.get('allocations');
  plan.allocationsEntry = ae ?? null;
  if (!ae) add('field-missing', start, 'The plan has no allocations; give a list of buckets.');
  else if (!isArray(ae.value)) add('field-invalid', where(ae), `The allocations of the plan are ${describe(ae.value)}; they must be a list of buckets.`);
  else if (ae.value.items.length === 0) add('field-missing', where(ae), 'The allocations of the plan are an empty list; give at least one bucket.');
  else {
    const items = ae.value.items;
    if (items.length > limits.maxBuckets) add('field-invalid', where(ae), `The plan has ${items.length} buckets, more than the limit of ${limits.maxBuckets}; only the first ${limits.maxBuckets} were read.`);
    const seen = new Map();
    items.slice(0, limits.maxBuckets).forEach((node, index) => {
      if (!isObject(node)) {
        add('field-invalid', node, `Bucket ${index + 1} of the allocations is ${describe(node)}; a bucket is an object with a name, a kind, an amount or a percent, and a vesting.`);
        return;
      }
      const b = readBucket(node, index);
      if (b.name !== null) {
        const key = b.name.trim().toLowerCase();
        const first = seen.get(key);
        if (first) add('bucket-duplicate', where(b.nameEntry), `Bucket ${index + 1} is named ${b.name}, as is bucket ${first.index + 1} at line ${first.line}; a total cannot be traced to one of them.`, { bucket: b.name });
        else seen.set(key, b);
      }
      plan.buckets.push(b);
    });
  }

  function readBucket(node, index) {
    const fallback = `bucket ${index + 1}`;
    const named = node.entries.find((e) => e.key === 'name' && isString(e.value) && e.value.value.trim() !== '');
    const map = entries(node, BUCKET_KEYS, named ? `bucket ${named.value.value}` : fallback);
    const at = where(node);
    const name = text(map, 'name', at, `Bucket ${index + 1}`, true);
    const label = name === null ? fallback : `bucket ${name}`;
    const b = { index, name, label, title: name ?? `Bucket ${index + 1}`, nameEntry: map.get('name') ?? null, line: node.line, column: node.column, kind: null, units: null, share: null, vesting: null };
    const ke = map.get('kind');
    if (!ke) add('field-missing', at, `The ${label} has no kind; give one of ${KINDS.join(', ')}.`, { bucket: name });
    else if (!isString(ke.value) || !KINDS.includes(ke.value.value)) add('field-invalid', where(ke), `The kind of ${label} is ${isString(ke.value) ? `"${ke.value.value}"` : describe(ke.value)}; it must be one of ${KINDS.join(', ')}. The insider checks did not look at this bucket.`, { bucket: name });
    else b.kind = ke.value.value;

    const am = map.get('amount');
    const pe = map.get('percent');
    if (am && pe) add('field-invalid', where(pe), `The ${label} gives both an amount and a percent; give one of them. The amount was used.`, { bucket: name });
    if (am) {
      const a = amount(am, 'amount', label);
      if (a) {
        b.share = { form: 'amount', d: a.d, entry: am };
        b.units = a.units;
      }
    } else if (pe) {
      const p = percent(pe, 'percent', label);
      if (p) {
        b.share = { form: 'percent', d: p, entry: pe };
        if (plan.supply !== null) {
          const { units, exact } = percentOf(plan.supply, p);
          b.units = units;
          if (!exact && plan.decimals !== null) add('percent-rounding', where(pe), `${formatDecimal(p)}% of the supply of ${formatUnits(plan.supply, plan.decimals)}${plan.symbol ? ` ${plan.symbol}` : ''} is not a whole number of base units at ${plan.decimals} decimals, so the ${label} holds ${formatUnits(units, plan.decimals)} and less than one base unit is in no bucket.`, { bucket: name });
        }
      }
    } else add('field-missing', at, `The ${label} has no amount or percent; give the amount in whole tokens or the percent of the supply.`, { bucket: name });

    const ve = map.get('vesting');
    if (!ve) add('field-missing', at, `The ${label} has no vesting; give one, such as {"launchPercent": 100} for a bucket released whole at launch.`, { bucket: name });
    else if (!isObject(ve.value)) add('field-invalid', where(ve), `The vesting of ${label} is ${describe(ve.value)}; it must be an object.`, { bucket: name });
    else b.vesting = readVesting(ve, label, name);
    const ne = map.get('notes');
    if (ne && !isString(ne.value)) add('field-invalid', where(ne), `The notes of ${label} are ${describe(ne.value)}; they must be text.`, { bucket: name });
    return b;
  }

  function readVesting(ve, label, name) {
    const node = ve.value;
    const vlabel = `the vesting of ${label}`;
    const map = entries(node, VESTING_KEYS, vlabel);
    const v = { entry: ve, line: ve.line, column: ve.column, form: 'none', start: 0, cliff: 0, launch: null, launchEntry: null, linear: null, duration: null, steps: null, stepsForm: null, cliffEntry: map.get('cliffMonths') ?? null, durationEntry: map.get('durationMonths') ?? null, scheduleEntry: map.get('schedule') ?? null };
    const se = map.get('schedule');
    if (se) {
      const others = VESTING_KEYS.filter((k) => k !== 'schedule' && map.has(k));
      if (others.length) add('field-invalid', where(map.get(others[0])), `The ${vlabel} has a schedule and also ${others.join(', ')}; a schedule takes the place of startMonth, cliffMonths, launchPercent, linearMonths and durationMonths, so they were left out.`, { bucket: name });
      return readSchedule(se, v, label, name);
    }
    const s = month(map, 'startMonth', vlabel, 0);
    const c = month(map, 'cliffMonths', vlabel, 0);
    const le = map.get('launchPercent');
    let launchOk = true;
    if (le) {
      v.launch = percent(le, 'launchPercent', vlabel);
      v.launchEntry = le;
      launchOk = v.launch !== null;
    }
    const hasLinear = map.has('linearMonths');
    const hasDuration = map.has('durationMonths');
    if (hasLinear && hasDuration) {
      add('field-invalid', where(map.get('durationMonths')), `The ${vlabel} has both linearMonths and durationMonths; give one: linearMonths counts the months after the cliff, durationMonths the months from the start as VestingWallet does.`, { bucket: name });
      return null;
    }
    const l = hasLinear ? month(map, 'linearMonths', vlabel, null) : null;
    const d = hasDuration ? month(map, 'durationMonths', vlabel, null) : null;
    if (s.value === null || c.value === null || !launchOk || (l && l.value === null) || (d && d.value === null)) return null;
    v.start = s.value;
    v.cliff = c.value;
    if (l) {
      v.form = 'linear';
      v.linear = l.value;
    } else if (d) {
      v.form = 'duration';
      v.duration = d.value;
    }
    return v;
  }

  function readSchedule(se, v, label, name) {
    const list = se.value;
    if (!isArray(list)) {
      add('field-invalid', where(se), `The schedule of ${label} is ${describe(list)}; it must be a list of steps such as {"month": 12, "percent": 25}.`, { bucket: name });
      return null;
    }
    if (list.items.length === 0) {
      add('field-missing', where(se), `The schedule of ${label} is an empty list; give at least one step.`, { bucket: name });
      return null;
    }
    if (list.items.length > limits.maxSteps) {
      add('field-invalid', where(se), `The schedule of ${label} has ${list.items.length} steps, more than the limit of ${limits.maxSteps}.`, { bucket: name });
      return null;
    }
    const steps = [];
    let ok = true;
    const forms = new Set();
    list.items.forEach((node, i) => {
      const slabel = `step ${i + 1} of the schedule of ${label}`;
      if (!isObject(node)) {
        add('field-invalid', node, `The ${slabel} is ${describe(node)}; a step is an object with a month and a percent or an amount.`, { bucket: name });
        ok = false;
        return;
      }
      const map = entries(node, STEP_KEYS, `the ${slabel}`);
      const m = month(map, 'month', `the ${slabel}`, null);
      if (!map.has('month')) add('field-missing', where(node), `The ${slabel} has no month.`, { bucket: name });
      const pe = map.get('percent');
      const am = map.get('amount');
      let part = null;
      if (pe && am) add('field-invalid', where(am), `The ${slabel} gives both a percent and an amount; give one.`, { bucket: name });
      else if (pe) {
        const p = percent(pe, 'percent', `the ${slabel}`);
        if (p) part = { form: 'percent', d: p };
      } else if (am) {
        const a = amount(am, 'amount', `the ${slabel}`);
        if (a) part = { form: 'amount', d: a.d, units: a.units };
      } else add('field-missing', where(node), `The ${slabel} has no percent or amount.`, { bucket: name });
      if (m.value === null || part === null) {
        ok = false;
        return;
      }
      forms.add(part.form);
      steps.push({ month: m.value, part, line: node.line, column: node.column });
    });
    if (forms.size > 1) {
      add('field-invalid', where(se), `The schedule of ${label} mixes percents and amounts; give every step in one form.`, { bucket: name });
      return null;
    }
    if (!ok) return null;
    v.form = 'schedule';
    v.steps = steps;
    v.stepsForm = [...forms][0];
    return v;
  }

  if (plan.supply === null && plan.buckets.some((b) => b.share?.form === 'percent')) notes.push('the plan gives no supply the tool can use, so the buckets given as a percent have no amount and are not in the table');
  return { plan, findings, notes };
}
