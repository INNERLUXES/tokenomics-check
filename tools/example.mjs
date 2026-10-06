// Runs the README examples, checks that they report what the README shows, and writes the reports of the two made-up
// plans to examples/output. CI runs it and then fails if those files changed, so the example output in the repository is
// always the real output.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { main } from '../src/index.js';

const root = resolve(fileURLToPath(import.meta.url), '..', '..');

// The arguments of the examples; every path is relative to the root of the repository.
export const BAD = ['examples/bad/plan.json'];
export const GOOD = ['examples/good/plan.json'];

// Runs the tool on files of the repository; the paths shown in the report are relative to the root of the repository.
export async function run(argv, base = root) {
  let out = '';
  let err = '';
  const code = await main(argv, { out: (t) => { out += t; }, err: (t) => { err += t; } }, undefined, base);
  return { code, out, err };
}

// What the README says of the bad plan: the counts, a finding of nearly every check, and the result.
export const EXPECTED = [
  'token: Quickfire Example (QFX), 2 decimals, evm; max supply 21,212,121, total supply 25,000,000; mintable, trading at launch',
  'buckets: 10 buckets holding 16,318,181.79 QFX (76.92% of the maxSupply); 1,272,727.26 QFX (6%) in circulation at launch; last release at month 72',
  'findings: 22 (11 error, 9 warning, 2 info)',
  'The total supply of 25,000,000 QFX is larger than the maximum supply of 21,212,121 QFX',
  'capMechanism names nothing that enforces it',
  'The 10 buckets add up to 16,318,181.79 QFX, 76.92% of the maxSupply of 21,212,121 QFX: 4,893,939.21 QFX less than the supply.',
  'VestingWalletCliff refuses a cliff longer than its duration with InvalidCliffDuration',
  'The amount of bucket Ecosystem is 2000000.125, with 3 places after the point, but the token has 2 decimals',
  'The launchPercent of the vesting of bucket Ecosystem is 150, outside 0 to 100.',
  'The schedule of bucket Public sale releases 2,333,333.31 QFX, more than the 2,121,212.1 QFX the bucket holds.',
  'The kind of bucket Marketing is "marketing"',
  'so 848,484.84 QFX is never released',
  'Bucket 9 is named TEAM, as is bucket 1 at line 13',
  'The bucket Partners has no vesting',
  'Trading starts at launch, but Liquidity and Public sale release nothing at launch',
  'The bucket Team (team) releases 636,363.63 QFX at month 1, before month 6 (--min-cliff)',
  'The bucket Team (team) is fully released by month 6, before month 12 (--min-vesting).',
  'The bucket Team (team) releases 424,242.42 QFX, 10% of the bucket, at launch',
  'Month 12 releases 3,203,914.11 QFX, 36.7% of the 8,727,903.95 QFX in circulation before it',
  'The key "cliff" of the vesting of bucket TEAM is not one the tool reads',
  'Did you mean "cliffMonths"?',
  '7.5% of the supply of 21,212,121 QFX is not a whole number of base units at 2 decimals',
  'The bucket Treasury still releases at month 72, after month 60 (--max-vesting).',
  'Release table (months 0 to 72; supply 21,212,121 QFX)',
  'note: Ecosystem and Partners are not in the table, because their amount or vesting could not be read',
  'not financial, legal or investment advice and not a guarantee that the plan is sound',
  'RESULT: FAIL - 11 findings at or above error (11 error, 9 warning, 2 info)'
];
// What must not be reported: the checks the bad plan does not hold, and a pass.
export const UNWANTED = ['ERROR    plan-unreadable', 'ERROR    decimals-out-of-range', 'WARNING  decimals-unusual', 'ERROR    supply-overflow', 'RESULT: PASS'];

// What the README says of the good plan: one note.
export const GOOD_EXPECTED = [
  'buckets: 8 buckets holding 1,000,000,000 ORBX (100% of the maxSupply); 138,000,000 ORBX (13.8%) in circulation at launch; last release at month 72',
  'findings: 1 (1 info)',
  'The bucket Ecosystem fund still releases at month 72, after month 60 (--max-vesting).',
  'RESULT: PASS - no finding at or above error (1 info)'
];

const problems = [];
function expect(name, result, code, expected, unwanted, stream = 'out') {
  const text = result[stream];
  const missing = expected.filter((e) => !text.includes(e));
  const wrong = unwanted.filter((e) => text.includes(e));
  if (result.code !== code || missing.length || wrong.length) {
    problems.push(`${name}: unexpected report (exit code ${result.code}, expected ${code}; missing: ${missing.join(' / ') || 'none'}; should not appear: ${wrong.join(' / ') || 'none'})${result.err ? `\n${result.err}` : ''}`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const bad = await run(BAD);
  process.stdout.write(bad.out);
  expect('bad plan', bad, 1, EXPECTED, UNWANTED);

  const good = await run(GOOD);
  expect('good plan', good, 0, GOOD_EXPECTED, ['ERROR    ', 'WARNING  ', 'RESULT: FAIL']);
  // The good plan also passes when warnings fail the run, and fails only when notes do.
  expect('good, fail on warning', await run([...GOOD, '--fail-on', 'warning']), 0, ['RESULT: PASS - no finding at or above warning (1 info)'], []);
  expect('good, fail on info', await run([...GOOD, '--fail-on', 'info']), 1, ['RESULT: FAIL - 1 finding at or above info (1 info)'], []);
  // With a longer --max-vesting the note goes away.
  expect('good, max vesting 72', await run([...GOOD, '--max-vesting', '72', '--fail-on', 'info']), 0, ['findings: 0', 'RESULT: PASS - no finding at or above info'], []);
  // The bad plan with only the errors shown still counts the rest.
  expect('bad, errors only', await run([...BAD, '--min-severity', 'error']), 1, ['findings: 11 (11 error); 11 below error not shown'], ['WARNING  ', 'INFO     ']);
  // A file that is not there stops the run with no report.
  expect('missing file', await run(['examples/none/plan.json']), 2, ['examples/none/plan.json: does not exist'], [], 'err');

  // The README shows the head of the report of the bad plan with its table of checks, one finding, the start of the
  // table and the end of the report, and the end of the report of the good plan.
  const readme = (await readFile(resolve(root, 'README.md'), 'utf8')).split('\r\n').join('\n');
  const lines = bad.out.split('\n');
  const head = lines.slice(0, 31).join('\n');
  if (!readme.includes(head)) problems.push('README: the head of the sample output of the bad plan differs from a real run');
  const at = lines.findIndex((l) => l.includes('supply-cliff') && l.includes('examples/bad/plan.json:29'));
  const sample = lines.slice(at, at + 3).join('\n');
  if (at < 0 || !readme.includes(sample)) problems.push('README: the sample finding of the supply cliff differs from a real run');
  const t = lines.findIndex((l) => l.startsWith('Release table'));
  const table = lines.slice(t, t + 17).join('\n');
  if (t < 0 || !readme.includes(table)) problems.push('README: the start of the release table of the bad plan differs from a real run');
  const tail = lines.slice(-7).join('\n');
  if (!readme.includes(tail)) problems.push('README: the tail of the sample output of the bad plan differs from a real run');
  const goodTail = good.out.split('\n').slice(-5).join('\n');
  if (!readme.includes(goodTail)) problems.push('README: the tail of the sample output of the good plan differs from a real run');

  await mkdir(resolve(root, 'examples/output'), { recursive: true });
  await writeFile(resolve(root, 'examples/output/bad.txt'), bad.out);
  await writeFile(resolve(root, 'examples/output/good.txt'), good.out);
  const outputs = [
    ['bad-explain.txt', [...BAD, '--explain'], 1],
    ['bad.md', [...BAD, '--format', 'markdown'], 1],
    ['bad-explain.md', [...BAD, '--format', 'markdown', '--explain'], 1],
    ['bad.json', [...BAD, '--json', '--explain'], 1],
    ['bad.sarif', [...BAD, '--format', 'sarif'], 1],
    ['good.md', [...GOOD, '--format', 'markdown'], 0],
    ['good.json', [...GOOD, '--json'], 0],
    ['good.sarif', [...GOOD, '--format', 'sarif'], 0],
    ['checks.txt', ['--list-checks'], 0],
    ['checks.json', ['--list-checks', '--format', 'json'], 0]
  ];
  for (const [name, args, code] of outputs) {
    const r = await run(args);
    if (r.code !== code) problems.push(`${name}: exit code ${r.code}, expected ${code}`);
    await writeFile(resolve(root, 'examples/output', name), r.out);
  }

  if (problems.length) {
    for (const p of problems) console.error(`example: ${p}`);
    process.exit(1);
  }
}
