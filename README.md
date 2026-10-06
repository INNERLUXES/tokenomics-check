# tokenomics-check

Tokenomics check. Give it the token plan of a new cryptocurrency or token as a JSON file: its name, symbol, decimals and
supply, whether it can be minted or burnt, and the buckets of the supply (team, investors, advisors, treasury, community,
liquidity, public sale, ecosystem and others), each with an amount or a percent and its vesting. It reads the file,
fetches nothing and runs nothing, and lists the problems to fix before the token is deployed: buckets that do not add up
to the supply, percents out of range, decimals and amounts the chain cannot hold, a maximum supply that nothing enforces,
insider buckets released at launch or with no cliff, vesting that is too short or too long, schedules that release more
than a bucket or never finish, months that release a large share of the circulating supply, and trading with nothing to
trade at launch. It prints the release and the circulating supply month by month. Every finding has its id, level,
message and file and line, and the run exits with a code a pipeline can act on.

**It is an input to a review before the token is deployed: not financial, legal or investment advice and not a guarantee
that the plan is sound.** It is not an adviser. It reads one file only: it fetches nothing, runs nothing, deploys
nothing, calls no chain and reads no clock, so it does not see the contract that will be deployed, the vesting contracts,
the market, the law of any country or what the people who hold the buckets will do; the checks are a heuristic. A clean
run means only that none of the problems of its checks were found in the file, and the team still has to review the
plan, and the contracts that carry it out, before the token is deployed.

A token plan is a promise in numbers: how much exists, who holds it, and when each part can be sold. ERC-20 keeps every
amount as a whole number of the smallest unit and reports the decimals as a uint8
(https://eips.ethereum.org/EIPS/eip-20); OpenZeppelin's ERC20Capped refuses a mint past its cap, its VestingWallet
releases tokens along a straight line, and VestingWalletCliff holds them all back until a cliff
(https://docs.openzeppelin.com/contracts/5.x/api/finance). A plan
written in a spreadsheet slips easily: buckets that add up to 97 percent, a team bucket that is free on the first day, a
maximum supply on a mintable token that no contract enforces, or one month in which the seed round and the team come off
their cliffs together and double the supply in circulation. Before the contracts are written, the team needs the list:
which bucket, which month, which line. This tool writes that list from the plan, on every change.

- **One check per problem.** Twenty-two checks, each with what it looks at, what it cannot see, the public pages it
  rests on and what to change. Each check is either documented (in EIP-20, the OpenZeppelin Contracts documentation or
  the Solana documentation) or a best practice of this tool, and its message says which.
- **Exact amounts.** Amounts, supplies and percents are read from the text of the file as decimal numbers and counted in
  base units with integers of any size, never with floating point, so the sum of the buckets is exact at 18 decimals
  and a percent that leaves less than one base unit over is a finding of its own.
- **The VestingWallet curve.** A bucket can be given in the form of OpenZeppelin's VestingWallet (`durationMonths`,
  counted from the start, with the cliff inside it), in the form most plans are written in (`linearMonths` after the
  cliff), or as explicit steps.
- **A JSON reader of its own.** It keeps the line and column of every value, so a finding points at the line of the
  bucket or the field; what the plan does not say is listed as a finding, never taken for a value that is fine.
- Reports as text, markdown, JSON and SARIF, with an exit code for a pipeline: `0` no finding at or above the
  `--fail-on` level, `1` a finding at or above it, `2` usage or input error.
- Plain JavaScript, no dependencies, no clock and no network.

```
npm test
```

```
tests 141
pass 139
fail 0
skipped 2
```

These are the summary lines that `npm test` prints at the end on Windows. The skipped tests are the ones that need a
symbolic link or a device (a link to a plan file, and `/dev/null` named as a file); they are guarded with
`process.platform`, run on Linux and macOS, and none of them asserts a line. `npm run test:coverage` runs the same tests
with coverage; their time limits are four times wider when coverage is on.

## Quick start

Requires Node 22 or newer. There is nothing to install.

```
git clone https://github.com/INNERLUXES/tokenomics-check.git
cd tokenomics-check
node bin/tokenomics-check.js examples/bad/plan.json
```

Or without a clone, in your own project:

```
npx --yes github:INNERLUXES/tokenomics-check token/plan.json
```

`examples/` holds two made-up plans. `examples/bad/plan.json` holds a finding of nearly every check: a total supply
over the maximum on a mintable token with no cap, buckets that add up to 77 percent, a team bucket released in part at
launch and fully within six months, an advisor bucket whose cliff is longer than its VestingWallet duration, a seed round
released whole at month 12, an amount with more places than the decimals, a percent of 150, a public sale whose steps add
up to 110 percent, a bucket released only in part, a kind the tool does not know, two buckets of one name, a misspelt
key, a bucket with no vesting and trading at launch with an empty liquidity bucket. `examples/good/plan.json` passes at
error and warning level: its buckets add up to the supply, the team and the investors wait behind cliffs, the liquidity
and part of the public sale are there at launch, and the one note it still shows is an ecosystem fund that releases
until month 72.

## Usage

```
tokenomics-check <plan.json> [options]
```

```
--format <name>           text, markdown, json or sarif (default: text)
--json                    the same as --format json
--min-severity <level>    the lowest level of a finding that is shown: info, warning, error (default: info)
--fail-on <level>         the lowest level of a finding that fails the run: info, warning, error (default: error)
--months <n>              the last month of the table, 0 to 2400 (default: the last release, at least 12)
--cliff-share <percent>   supply-cliff: the share of the circulating supply one month may release (default: 25)
--min-cliff <months>      insider-no-cliff: the first month an insider bucket may release in after launch (default: 6)
--min-vesting <months>    vesting-too-short: the month before which an insider bucket may not be fully released (default: 12)
--max-vesting <months>    vesting-too-long: the last month a bucket may release in without a note (default: 60)
--explain                 show the points of the documentation behind each finding (text, markdown and JSON)
--list-checks             list the checks with their level and kind, and exit
--help                    show the usage
--version                 show the version
```

Name one file: the plan. [docs/inputs.md](docs/inputs.md) lists every field. The path in the report is relative to the
folder you run the command in, with forward slashes on every system, followed by the line.

A short plan looks like this:

```json
{
  "name": "Orbit Example",
  "symbol": "ORBX",
  "decimals": 18,
  "maxSupply": "1000000000",
  "mintable": false,
  "tradingAtLaunch": true,
  "allocations": [
    { "name": "Team", "kind": "team", "percent": 15, "vesting": { "cliffMonths": 12, "linearMonths": 36 } },
    { "name": "Liquidity", "kind": "liquidity", "percent": 10, "vesting": { "launchPercent": 100 } },
    { "name": "Treasury", "kind": "treasury", "percent": 75, "vesting": { "launchPercent": 5, "linearMonths": 48 } }
  ]
}
```

The report of the bad example starts with what was read, the findings in one line, and the checks with the number of
findings of each; then the findings, errors first, each with what to change:

```
tokenomics-check: examples/bad/plan.json
file: 78 lines, 1,765 bytes
token: Quickfire Example (QFX), 2 decimals, evm; max supply 21,212,121, total supply 25,000,000; mintable, trading at launch
buckets: 10 buckets holding 16,318,181.79 QFX (76.92% of the maxSupply); 1,272,727.26 QFX (6%) in circulation at launch; last release at month 72
findings: 22 (11 error, 9 warning, 2 info)

Checks (22)

  check                   level    kind           findings
  plan-unreadable         error    input          0
  field-missing           error    input          1
  field-unknown           warning  input          1
  field-invalid           error    input          1
  bucket-duplicate        error    input          1
  percent-out-of-range    error    input          1
  allocation-sum          error    best practice  1
  percent-rounding        info     documented     1
  amount-precision        error    documented     1
  decimals-out-of-range   error    documented     0
  decimals-unusual        warning  best practice  0
  supply-overflow         error    documented     0
  supply-over-cap         error    documented     1
  mint-cap-missing        error    documented     1
  cliff-over-duration     error    documented     1
  insider-launch-release  warning  best practice  1
  insider-no-cliff        warning  best practice  1
  vesting-too-short       warning  best practice  2
  vesting-too-long        info     best practice  1
  schedule-mismatch       error    best practice  2
  supply-cliff            warning  best practice  3
  trading-without-float   warning  best practice  1
```

A finding names its check, its level, the file and the line of the field and what to change. With `--explain` it also
gives the points of the documentation behind it and, for a best practice check, the tool's own choice:

```
  WARNING  supply-cliff            examples/bad/plan.json:29
           Month 12 releases 3,203,914.11 QFX, 36.7% of the 8,727,903.95 QFX in circulation before it, more than the 25% of --cliff-share: Seed investors 3,181,818.15 QFX and Treasury 22,095.96 QFX. This is a best practice of this tool, not a rule in EIP-20, the OpenZeppelin Contracts documentation or the Solana documentation.
           fix: Spread the release over more months, stagger the cliffs of the buckets, or confirm that the market can take the release.
```

After the findings comes the table: what the buckets release in each month, the supply in circulation after it, its
share of the supply and the buckets it comes from, largest first:

```
Release table (months 0 to 72; supply 21,212,121 QFX)

  month  released      circulating    of supply  from
  0      1,272,727.26  1,272,727.26   6%         TEAM, Team and Marketing
  1      1,719,065.63  2,991,792.89   14.1%      Public sale, Team and Treasury
  2      1,931,186.85  4,922,979.74   23.2%      Public sale, Team and Treasury
  3      658,459.59    5,581,439.33   26.31%     Team and Treasury
  4      658,459.59    6,239,898.92   29.41%     Team and Treasury
  5      658,459.59    6,898,358.51   32.52%     Team and Treasury
  6      658,459.59    7,556,818.1    35.62%     Team and Treasury
  7      22,095.96     7,578,914.06   35.72%     Treasury
  8      22,095.96     7,601,010.02   35.83%     Treasury
  9      1,082,702.01  8,683,712.03   40.93%     Advisors and Treasury
  10     22,095.96     8,705,807.99   41.04%     Treasury
  11     22,095.96     8,727,903.95   41.14%     Treasury
  12     3,203,914.11  11,931,818.06  56.24%     Seed investors and Treasury
  13     22,095.96     11,953,914.02  56.35%     Treasury
```

The end of the report holds the notes, the notice and the result:

```
  72     22,095.96     13,257,575.62  62.49%     Treasury

note: Ecosystem and Partners are not in the table, because their amount or vesting could not be read

This report is an input to a review before the token is deployed: not financial, legal or investment advice and not a guarantee that the plan is sound.

RESULT: FAIL - 11 findings at or above error (11 error, 9 warning, 2 info)
```

The good example passes:

```
  72     1,818,181.81   1,000,000,000   100%       Ecosystem fund

This report is an input to a review before the token is deployed: not financial, legal or investment advice and not a guarantee that the plan is sound.

RESULT: PASS - no finding at or above error (1 info)
```

## How the plan is read

1. The path is resolved against the folder you run the command in. A link, a folder, a device or a file over 4 MB is
   refused, and so is a file that is not UTF-8 (or UTF-16 with a byte order mark) or holds a null byte, with exit code
   `2` and no report.
2. The JSON reader of the tool reads the file with the line and column of every value. It reads strict JSON and refuses
   a key written twice in one object.
3. The fields of the plan, of each bucket, of each vesting and of each step of a schedule are read with their lines. A
   key the tool does not read is a `field-unknown` finding; a missing field, a value of the wrong type and a percent out
   of range are findings of their own, and that value is left out of the checks that need it.
4. Amounts and supplies are whole tokens, written as a number or as text (`"1000000000"`, `"2500.5"`), and are counted
   in base units at the decimals of the token. A bucket given as a percent is that share of the maximum supply, or of
   the total supply when there is no maximum, rounded down to a base unit.
5. Each bucket gets its release month by month from launch (month 0): the part at launch, then `linearMonths` after the
   cliff, the VestingWallet curve of `durationMonths`, or the steps of a `schedule`. The table adds the buckets up, and
   the checks read every month of it, past the end of the table too.

[docs/method.md](docs/method.md) says what each check reads, and [docs/inputs.md](docs/inputs.md) lists the fields and
the forms of vesting.

## What it checks

| Check | Level | Kind | What it reports |
| --- | --- | --- | --- |
| `allocation-sum` | error | best practice | buckets that do not add up to the supply, counted exactly in base units |
| `percent-rounding` | info | documented | a percent bucket that is not a whole number of base units, so it is rounded down |
| `amount-precision` | error | documented | an amount or a supply with more places after the point than the decimals |
| `decimals-out-of-range` | error | documented | decimals that are not a whole number from 0 to 255 (a uint8 on Ethereum, a u8 on Solana) |
| `decimals-unusual` | warning | best practice | an EVM token with more than 18 decimals |
| `supply-overflow` | error | documented | a supply in base units past a uint256 (ERC-20) or a u64 (a Solana mint) |
| `supply-over-cap` | error | documented | a total supply larger than the maximum supply |
| `mint-cap-missing` | error | documented | a mintable token with a maximum supply and nothing named that enforces it |
| `cliff-over-duration` | error | documented | a VestingWallet form whose cliff is longer than its duration |
| `insider-launch-release` | warning | best practice | a team, insider, advisor or investor bucket that releases a part at launch |
| `insider-no-cliff` | warning | best practice | an insider bucket that releases before the month of `--min-cliff` |
| `vesting-too-short` | warning | best practice | an insider bucket fully released before the month of `--min-vesting` |
| `vesting-too-long` | info | best practice | a bucket that still releases after the month of `--max-vesting` |
| `schedule-mismatch` | error | best practice | a schedule that releases more than its bucket, or never all of it |
| `supply-cliff` | warning | best practice | a month that releases more than `--cliff-share` percent of the supply in circulation before it |
| `trading-without-float` | warning | best practice | trading at launch with no liquidity or public sale part released then |
| `percent-out-of-range` | error | input | a percent below 0 or above 100 |
| `bucket-duplicate` | error | input | two buckets of one name |
| `field-invalid` | error | input | a value of the wrong type or form, or a kind the tool does not know |
| `field-unknown` | warning | input | a key the tool does not read, often a misspelt one |
| `field-missing` | error | input | a field the checks need |
| `plan-unreadable` | error | input | a file that is not JSON, or holds no plan object |

A documented check rests on EIP-20, a page of the OpenZeppelin Contracts documentation or a page of the Solana
documentation. A best practice check is this tool's own choice, and its message says "a best practice of this tool, not
a rule in EIP-20, the OpenZeppelin Contracts documentation or the Solana documentation". `--list-checks` shows the kind
of each check. Some of the levels are worth a word:

- `allocation-sum` is an error and a best practice. No page says how a plan divides its supply, but a plan whose
  buckets miss the supply leaves tokens that no one planned for, or promises tokens that do not exist.
- `supply-cliff`, `insider-no-cliff`, `vesting-too-short` and `vesting-too-long` rest on thresholds that are the tool's
  own: 25 percent, 6 months, 12 months and 60 months. Set them to the policy of the project with the options; the
  report shows the values it used.
- `percent-rounding` is a note. Less than one base unit is in no bucket, which rarely matters, but it is the reason a
  plan given in percents does not reach the supply to the last unit.

## What is not checked

[docs/limits.md](docs/limits.md) lists what the tool cannot see. Among them: whether the contracts carry out the plan,
who holds the keys of the treasury and of the mint, the price, the market and the law of any country, buckets that are
locked in pools or staking instead of a vesting schedule, burns, emissions that depend on use, and the dates of the
calendar: the table counts months from launch, never days.

## Formats

`--format text` (the default) is for a terminal. `--format markdown` is a report for a job summary or a pull request, with
a table of findings and the release table. `--format json` writes every finding with its `id`, `severity`, `message`,
`file`, `line`, `column`, `bucket` and `fix`, the table with each month in tokens and in base units, and with `--explain`
the points of the documentation. `--format sarif` writes SARIF 2.1.0, with the checks as rules, the plan as the artifact
and a result for each finding with its line and column, for code scanning; the table has no place in it. The saved
output of the examples is in [examples/output](examples/output).

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | no finding at or above the `--fail-on` level (default `error`) |
| `1` | a finding at or above it |
| `2` | a usage error, or an input error such as a path that does not exist, a link or a folder, or a file that is not text or is too large; there is no report |

Findings below `--min-severity` are not shown, and still count for the result.

## Limits

The tool reads one file; it fetches nothing and connects to nothing. A run reports the problems of docs/method.md that
the file holds. [docs/limits.md](docs/limits.md) lists what it cannot see, with the size limits: 4 MB for a file,
objects and arrays nested up to 1,000 deep, 1,000 buckets, 2,400 steps in a schedule and months up to 1,200.
[docs/threat-model.md](docs/threat-model.md) lists the risks of reading a file from a pull request and their controls,
and [docs/secure-defaults.md](docs/secure-defaults.md) the defaults and how to run the tool in a pipeline.

## Architecture

Plain ES modules in `src/`, with no dependencies.

| File | Job |
| --- | --- |
| `src/cli.js` | the command line, the usage and the exit codes |
| `src/check.js` | reads the file, reads the plan, runs the checks and builds the report of the run |
| `src/files.js` | the bounded reading of a file by its byte order mark, with no link followed |
| `src/json.js` | the JSON reader: lines and columns, keys written twice, limits, a stack of its own |
| `src/plan.js` | the fields of the plan, the buckets, the vesting and the steps, and the input checks |
| `src/amounts.js` | exact decimal numbers, base units, percents and their display |
| `src/schedule.js` | the release of each bucket month by month, and the totals of each month |
| `src/analyze.js` | the checks on the supply, the buckets, the schedules and the months |
| `src/rules.js` | the checks, their levels and kinds, and the result |
| `src/report.js`, `src/text.js`, `src/size.js` | the text, markdown, JSON and SARIF output, the cleaning of text from the input and number formats |
| `src/data.js` | the public pages and the points the checks rest on, in this project's own words |
| `research/sources/` | text copies of the pages, as they were read |
| `tools/check.mjs`, `tools/example.mjs` | the repository checks, and the examples with their real output |

## Where the facts come from

The documented checks rest on EIP-20, the OpenZeppelin Contracts documentation of ERC-20, ERC20Capped, VestingWallet and
VestingWalletCliff, and the Solana documentation of mint accounts and of the Token program, nothing else. Each page was
read before it was listed, a text copy of it is kept in [research/sources](research/sources), and
[research/sources.md](research/sources.md) has a note on each. [docs/rules-and-sources.md](docs/rules-and-sources.md)
lists every check with the points of the pages it rests on, what it cannot see and what to change. Where a check is a
best practice and not a rule in the documentation, it says so.

- ERC-20, Token Standard: https://eips.ethereum.org/EIPS/eip-20
- ERC-20 guide of OpenZeppelin Contracts: https://docs.openzeppelin.com/contracts/5.x/erc20
- ERC-20 API of OpenZeppelin Contracts (ERC20Capped): https://docs.openzeppelin.com/contracts/5.x/api/token/erc20
- Finance API of OpenZeppelin Contracts (VestingWallet, VestingWalletCliff): https://docs.openzeppelin.com/contracts/5.x/api/finance
- Assets on Solana, mint accounts: https://solana.com/docs/tokens
- The Token program: https://www.solana-program.com/docs/token

## Background

The plan of a token is settled long before its contracts are deployed, and it is hard to change once buckets have been
promised to a team, to investors and to a community. The plan is read line by line when a team prepares a launch, or
brings in engineers to build the token, its vesting and its sale. How such work is staffed and carried out is described
on the page [Cryptocurrency Development Services](https://innerluxes.dev/blockchain/cryptocurrency).

## License

MIT
