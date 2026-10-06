# Method

This document says how the tool reads a token plan and what each check looks at. The tool is an input to a review before
the token is deployed: not financial, legal or investment advice and not a guarantee that the plan is sound. A clean run
means only that none of the problems below were found in the file.

## Why the plan

A token is deployed once, and its supply, its decimals and the contracts that hold back each bucket are hard to change
afterwards. The plan comes first, in a document or a spreadsheet, and the contracts are written from it. A mistake in the
plan, such as buckets that do not add up, a team that is free on the first day, or a cap that no contract enforces,
travels into the contracts and the announcements unless someone reads the numbers. The tool reads the plan as a file, so
the same check runs on every change, and every finding points at a line.

## Reading the file

1. The path is resolved against the folder the command runs in. A link, a folder, a device or a pipe is refused; a file
   over 4 MB is refused before it is read; a file with a null byte, or bytes that are not UTF-8 (or UTF-16 with a byte
   order mark), is refused with exit code `2` and no report.
2. The text goes to a JSON reader of the tool's own (`src/json.js`), which keeps the line and column of every value and
   reads strict JSON: a comment, a trailing comma, a key written twice in one object or text after the value is a
   `plan-unreadable` finding with the line.
3. The fields are read (`src/plan.js`) as docs/inputs.md lists them. A missing field is `field-missing`, a key the tool
   does not read is `field-unknown`, a value of the wrong type or form is `field-invalid`, two buckets of one name are
   `bucket-duplicate`, and a percent outside 0 to 100 is `percent-out-of-range`. The value is then left out of every
   check that needs it; a bucket without an amount or a vesting the tool could read is not in the table, and a note says
   so.

## Counting the amounts

Amounts, supplies and percents are read from the characters of the file as decimal numbers (`src/amounts.js`), and every
sum is made in base units with integers of any size. The base units of an amount are the amount times ten to the power
of the decimals; an amount with more places than the decimals is `amount-precision`, and its extra places are cut off.
A percent bucket is the share of the supply, rounded down to a base unit; when it is not a whole number of base units,
`percent-rounding` says so.

The buckets are compared with the supply exactly: amounts in base units and percents as fractions with one common
denominator, so three buckets of 33.3333333333, 33.3333333333 and 33.3333333334 percent add up to the supply even
though each is rounded down.

## The release of each bucket

Each bucket gets a list of months and the base units it releases in each (`src/schedule.js`), in one of the forms of
docs/inputs.md:

- the launch part (`launchPercent`) at month 0;
- the rest in `linearMonths` equal parts after `startMonth` and `cliffMonths`, or at once when `linearMonths` is 0;
- the rest along the VestingWallet curve (`durationMonths`): nothing before the cliff, then the share of the duration
  that has passed since the start, all of it at the end of the duration;
- the steps of a `schedule`, in order of month, each a percent of the bucket or an amount.

Every part is rounded down to a base unit, and a cumulative sum is used so that what a rounding leaves over goes to the
months that need it: a bucket released in full releases its amount exactly. The table adds the buckets up month by
month from launch, with the supply in circulation after each month and the buckets each month comes from, largest first.
The circulating supply of the table is everything released so far; the tool does not know whether the holders sell it,
stake it or keep it.

## The checks

Each check says whether it is documented or a best practice. A documented check rests on EIP-20, the OpenZeppelin
Contracts documentation or the Solana documentation. A best practice check is the tool's own choice; its message says so,
and so does `--list-checks`. [rules-and-sources.md](rules-and-sources.md) lists the pages and the points of each page
behind each check.

| Check | Looks at | Level |
| --- | --- | --- |
| `allocation-sum` | the sum of all buckets, amounts and percents together, against the supply of the plan; not checked when a bucket has no amount | error |
| `percent-rounding` | each percent bucket: the supply times the percent, divided by 100, is not a whole number of base units | info |
| `amount-precision` | each amount and supply: more places after the point than the decimals | error |
| `decimals-out-of-range` | the decimals: not a whole number from 0 to 255 | error |
| `decimals-unusual` | the decimals on an EVM chain: more than 18 | warning |
| `supply-overflow` | the larger of the two supplies in base units: more than a uint256 on an EVM chain, or a u64 on Solana | error |
| `supply-over-cap` | `totalSupply` larger than `maxSupply` | error |
| `mint-cap-missing` | `mintable` true, `maxSupply` given and no `capMechanism` | error |
| `cliff-over-duration` | a bucket in the VestingWallet form whose `cliffMonths` is larger than its `durationMonths` | error |
| `insider-launch-release` | a bucket of an insider kind that releases anything at month 0 | warning |
| `insider-no-cliff` | a bucket of an insider kind that releases in a month from 1 to `--min-cliff` minus 1 | warning |
| `vesting-too-short` | a bucket of an insider kind whose last release is before month `--min-vesting` | warning |
| `vesting-too-long` | any bucket whose last release is after month `--max-vesting` | info |
| `schedule-mismatch` | the sum of the releases of a bucket against the bucket: more, or less | error |
| `supply-cliff` | each month from 1 on: the release of the month against `--cliff-share` percent of the supply in circulation at the end of the month before, when that is above zero | warning |
| `trading-without-float` | `tradingAtLaunch` true, and nothing of a liquidity or public sale bucket released at month 0; not checked when such a bucket could not be read | warning |
| `percent-out-of-range` | each percent: below 0 or above 100 | error |
| `bucket-duplicate` | the names of the buckets, without case and outer spaces | error |
| `field-invalid` | each value: its type and form | error |
| `field-unknown` | each key: not one the tool reads | warning |
| `field-missing` | each object: the fields it needs | error |
| `plan-unreadable` | the file: not JSON, or not an object | error |

### Why some levels are what they are

- `allocation-sum` is an error and a best practice. No page says how a plan should divide its supply, but a plan whose
  buckets miss the supply either leaves tokens that nobody planned for or promises tokens that do not exist; both have to
  be settled before the contracts are written.
- `schedule-mismatch` is an error and a best practice for the same reason: a vesting contract can release only what it
  holds, so a schedule that promises more is wrong, and one that promises less leaves tokens nobody can reach.
- `mint-cap-missing` is an error. The OpenZeppelin page shows a cap as a contract that refuses a mint past it, and the
  Solana page shows a fixed supply as a mint with no mint authority; a plan that states a maximum on a mintable token and
  names neither states a limit that nothing holds.
- `insider-launch-release`, `insider-no-cliff`, `vesting-too-short` and `supply-cliff` are warnings and best practices.
  The pages describe how a cliff and a linear release work, not how long insiders should wait or how much may come to
  market at once. The thresholds (6 months, 12 months, 25 percent) are the tool's own defaults; a project sets its own
  with the options, and the JSON report shows the values used.
- `vesting-too-long` is a note: a treasury or an ecosystem fund may be meant to release for many years.
- `percent-rounding` is a note: less than one base unit is in no bucket.
- `decimals-unusual` is a warning: up to 255 decimals are allowed by the standard, and the guide advises 18.

## Findings

Every finding has `id`, `severity`, `message`, `file`, `line` and `column`, `at` (`file:line`), the `bucket` it is about
when there is one, `fix`, and with `--explain` the points of the documentation behind it. They are sorted errors first,
then by line. `--min-severity` hides the findings below a level and says how many; a hidden finding still counts for the
result. The result is `FAIL` when a finding is at or above `--fail-on` (default `error`) and `PASS` otherwise.
