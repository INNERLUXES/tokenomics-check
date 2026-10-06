import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AMOUNT_LIMITS, SHOWN_PLACES, U64_MAX, UINT256_MAX, formatAmount, formatDecimal, formatUnits, groupDigits, isWhole, overShare, parseDecimal, percentOf, percentText, pow10, toUnits } from '../src/index.js';

test('parseDecimal: whole numbers, fractions, signs and exponents, with the zeros at the end of the fraction dropped', () => {
  assert.deepEqual(parseDecimal('1000000'), { negative: false, digits: 1000000n, scale: 0 });
  assert.deepEqual(parseDecimal('2500.50'), { negative: false, digits: 25005n, scale: 1 });
  assert.deepEqual(parseDecimal('-0.125'), { negative: true, digits: 125n, scale: 3 });
  assert.deepEqual(parseDecimal('-0'), { negative: false, digits: 0n, scale: 0 });
  assert.deepEqual(parseDecimal('1e9'), { negative: false, digits: 1000000000n, scale: 0 });
  assert.deepEqual(parseDecimal('1.5E-3'), { negative: false, digits: 15n, scale: 4 });
  assert.deepEqual(parseDecimal('+7'), { negative: false, digits: 7n, scale: 0 });
  assert.ok(isWhole(parseDecimal('12.000')));
});

test('parseDecimal: text that is not a decimal number, and numbers past the limits, are refused', () => {
  for (const bad of ['', ' 1', '1,000', '1_000', '0x10', '1.', '.5', 'NaN', 'Infinity', '1e', '1e1000', '12abc', `${'9'.repeat(AMOUNT_LIMITS.maxDigits + 1)}`, 7]) assert.equal(parseDecimal(bad), null, String(bad));
  assert.ok(parseDecimal('9'.repeat(AMOUNT_LIMITS.maxDigits)));
});

test('toUnits: an amount in base units, exact when it has no more places than the decimals', () => {
  assert.deepEqual(toUnits(parseDecimal('1.5'), 18), { units: 1500000000000000000n, exact: true });
  assert.deepEqual(toUnits(parseDecimal('2000000.125'), 2), { units: 200000012n, exact: false });
  assert.deepEqual(toUnits(parseDecimal('2000000.12'), 2), { units: 200000012n, exact: true });
  assert.deepEqual(toUnits(parseDecimal('7'), 0), { units: 7n, exact: true });
});

test('percentOf: a share rounded down to a base unit, exact or not', () => {
  assert.deepEqual(percentOf(1000n, parseDecimal('12.5')), { units: 125n, exact: true });
  assert.deepEqual(percentOf(2121212100n, parseDecimal('7.5')), { units: 159090907n, exact: false });
  assert.deepEqual(percentOf(1000n, parseDecimal('100')), { units: 1000n, exact: true });
  assert.deepEqual(percentOf(0n, parseDecimal('33.3')), { units: 0n, exact: true });
});

test('0.1 and 0.2 add up to 0.3 in base units, as floating point does not', () => {
  const a = toUnits(parseDecimal('0.1'), 18).units;
  const b = toUnits(parseDecimal('0.2'), 18).units;
  assert.equal(a + b, toUnits(parseDecimal('0.3'), 18).units);
});

test('formatUnits, formatAmount and groupDigits: groups of three, the fraction without its zeros, and at most two places shown', () => {
  assert.equal(groupDigits('1234567'), '1,234,567');
  assert.equal(groupDigits('123'), '123');
  assert.equal(formatUnits(123456789n, 2), '1,234,567.89');
  assert.equal(formatUnits(123456700n, 2), '1,234,567');
  assert.equal(formatUnits(123456789n, 2, { plain: true }), '1234567.89');
  assert.equal(formatUnits(-150n, 2), '-1.5');
  assert.equal(formatUnits(5n, 0), '5');
  assert.equal(SHOWN_PLACES, 2);
  assert.equal(formatAmount(1666666666666666666n, 18), '1.66');
  assert.equal(formatAmount(1000000000000000000n, 18), '1');
  assert.equal(formatAmount(1n, 18), '0');
});

test('formatDecimal and percentText: a decimal as it was read, and a share with at most two places', () => {
  assert.equal(formatDecimal(parseDecimal('2000000.125')), '2000000.125');
  assert.equal(formatDecimal(parseDecimal('-0.05')), '-0.05');
  assert.equal(formatDecimal(parseDecimal('150')), '150');
  assert.equal(percentText(1n, 8n), '12.5%');
  assert.equal(percentText(1n, 3n), '33.33%');
  assert.equal(percentText(10n, 10n), '100%');
  assert.equal(percentText(0n, 10n), '0%');
  assert.equal(percentText(1n, 0n), '-');
  assert.equal(percentText(27n, 10n), '270%');
});

test('overShare: a part over a share of a whole, exactly at the edge', () => {
  const share = parseDecimal('25');
  assert.equal(overShare(25n, 100n, share), false);
  assert.equal(overShare(26n, 100n, share), true);
  assert.equal(overShare(1250n, 5000n, parseDecimal('25.01')), false);
  assert.equal(overShare(1251n, 5000n, parseDecimal('25.02')), false);
  assert.equal(overShare(1251n, 5000n, parseDecimal('25.01')), true);
});

test('the limits of the chains: a uint256 and a u64', () => {
  assert.equal(UINT256_MAX, 2n ** 256n - 1n);
  assert.equal(U64_MAX, 18446744073709551615n);
  assert.equal(pow10(3), 1000n);
});
