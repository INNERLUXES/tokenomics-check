# Inputs

The tool takes one path: the token plan, a JSON file. There is no configuration file, no environment variable and no
standard input; the options are on the command line.

```
tokenomics-check <plan.json> [--format text|markdown|json|sarif] [--json] [--min-severity <level>] [--fail-on <level>]
                 [--months <n>] [--cliff-share <percent>] [--min-cliff <months>] [--min-vesting <months>]
                 [--max-vesting <months>] [--explain] [--list-checks]
```

| Option | Meaning |
| --- | --- |
| `--format <name>` | `text` (default), `markdown`, `json` or `sarif` |
| `--json` | the same as `--format json` |
| `--min-severity <level>` | the lowest level shown: `info` (default), `warning` or `error` |
| `--fail-on <level>` | the lowest level that fails the run: `info`, `warning` or `error` (default) |
| `--months <n>` | the last month of the table, from 0 to 2,400; by default the last month in which a bucket releases, and at least 12. The checks read every month, whatever the table shows |
| `--cliff-share <percent>` | `supply-cliff`: the share of the supply in circulation before a month that the month may release, above 0 and up to 100 (default 25) |
| `--min-cliff <months>` | `insider-no-cliff`: the first month after launch in which an insider bucket may release (default 6) |
| `--min-vesting <months>` | `vesting-too-short`: an insider bucket must still release in this month or later (default 12) |
| `--max-vesting <months>` | `vesting-too-long`: the last month in which a bucket may release without a note (default 60) |
| `--explain` | add the points of the documentation behind each finding to the text, markdown and JSON reports |
| `--list-checks` | list the checks with their level and kind, in text, markdown or JSON, and exit |
| `--help`, `--version` | the usage, the version |

Every option that takes a value takes it once. A value may not start with `--`. `-` (standard input) and an address
such as `https://...` are refused. A folder is refused: name the file. Two paths are a usage error. `--min-vesting` may
not be past `--max-vesting`.

## The plan

The plan is one JSON object. Every key is read with its line, and a key that is not in the lists below is a
`field-unknown` finding.

| Field | Needed | Read as |
| --- | --- | --- |
| `name` | yes | the name of the token, text |
| `symbol` | yes | the symbol, text; the reports write amounts with it |
| `decimals` | yes | a whole number from 0 to 255, written as a number |
| `maxSupply` | one of the two | the maximum supply in whole tokens: the cap |
| `totalSupply` | one of the two | the supply minted, in whole tokens |
| `mintable` | yes | `true` or `false`: whether more can be minted after launch |
| `burnable` | no | `true` or `false` |
| `capMechanism` | no | text that names what enforces `maxSupply` on a mintable token, such as `ERC20Capped` or `mint authority set to None` |
| `chain` | no | `evm` (default) or `solana`; it decides the limit of the supply (a uint256 or a u64) and whether `decimals-unusual` applies |
| `tradingAtLaunch` | no | `true` or `false` (default): whether the token can be traded from month 0 |
| `allocations` | yes | a list of buckets, at least one |
| `notes` | no | text, not read by any check |

The supply of the plan is `maxSupply` when it is given, else `totalSupply`. A bucket given as a percent is that share
of it, and the buckets must add up to it (`allocation-sum`).

## A bucket

| Field | Needed | Read as |
| --- | --- | --- |
| `name` | yes | text; two buckets may not share a name (compared without case and outer spaces) |
| `kind` | yes | one of `team`, `insiders`, `advisors`, `investors`, `treasury`, `reserve`, `community`, `ecosystem`, `rewards`, `airdrop`, `liquidity`, `public-sale`, `other` |
| `amount` | one of the two | whole tokens, such as `"150000000"` or `"2500.5"` |
| `percent` | one of the two | a percent of the supply of the plan, from 0 to 100, such as `15` or `"12.5"` |
| `vesting` | yes | an object; see below |
| `notes` | no | text, not read by any check |

The kinds `team`, `insiders`, `advisors` and `investors` are the insider kinds of `insider-launch-release`,
`insider-no-cliff` and `vesting-too-short`; `liquidity` and `public-sale` are the kinds of `trading-without-float`.

## The vesting of a bucket

Month 0 is the launch. The vesting takes one of four forms:

| Form | Fields | Released |
| --- | --- | --- |
| at launch | `launchPercent` | that percent of the bucket at month 0; with 100 the whole bucket |
| linear after the cliff | `launchPercent` (default 0), `startMonth` (default 0), `cliffMonths` (default 0), `linearMonths` | the launch part at month 0, then the rest in `linearMonths` equal monthly parts at months `startMonth + cliffMonths + 1` to `startMonth + cliffMonths + linearMonths`; with `linearMonths` 0, the rest at once at month `startMonth + cliffMonths` |
| VestingWallet | `launchPercent` (default 0), `startMonth` (default 0), `cliffMonths` (default 0), `durationMonths` | the launch part at month 0, then the rest along the curve of OpenZeppelin's VestingWallet and VestingWalletCliff: nothing before month `startMonth + cliffMonths`; at a month m from then on, the part vested is `rest * (m - startMonth) / durationMonths`, and all of it from month `startMonth + durationMonths` |
| explicit steps | `schedule` | a list of steps, each `{"month": m, "percent": p}` (a percent of the bucket) or `{"month": m, "amount": "a"}` (whole tokens), all in one form |

The two forms with a cliff count it differently. In the linear form the cliff comes first and the linear months follow:
`{"cliffMonths": 12, "linearMonths": 24}` releases nothing for 12 months and then one part in each of months 13 to 36.
In the VestingWallet form the cliff is inside the duration, as the OpenZeppelin page describes it:
`{"cliffMonths": 12, "durationMonths": 36}` releases nothing for 12 months, then a third of the bucket at month 12, and
one part in each of months 13 to 36. A cliff longer than the duration is a `cliff-over-duration` finding, because
VestingWalletCliff refuses it.

A whole number of months is from 0 to 1,200 and written as a number. A schedule takes the place of the other fields;
`linearMonths` and `durationMonths` may not both be given. A bucket that gives only a `launchPercent` below 100 never
releases the rest (`schedule-mismatch`).

Each part is worked out in base units and rounded down; what a rounding leaves over goes to the last month of the form,
so a bucket released in full releases its amount exactly.

## Numbers

Amounts, supplies and percents may be written as JSON numbers or as text. Both are read from the characters of the file,
never through a floating point number: `"1000000000.5"` and `1000000000.5` are the same, `0.1 + 0.2` is `0.3`, and a
supply of 10^27 base units keeps every digit. Grouping commas, underscores and hexadecimal are not read. A number may
have up to 100 digits and an exponent up to 100.

## What stops the reading

| Problem | Result |
| --- | --- |
| a file that is not strict JSON (a comment, a trailing comma, a single quote, a key written twice in one object, text after the value), or is nested past the limits | one `plan-unreadable` finding with the line and column, and nothing else is checked |
| JSON whose top level is not an object | one `plan-unreadable` finding |
| a field missing, of the wrong type, out of range or unknown | a finding with the line; that value is left out of the checks that need it, and a note says which buckets are not in the table |

Line ends may be LF, CRLF or CR, and the file may be UTF-8 with or without a byte order mark or UTF-16 with one; the same
findings are written for each.

## Output paths

The path shown in a report is relative to the folder the command runs in, with forward slashes on every system, and the
whole path when the file is outside that folder. A finding is `file:line`: the line of the field it is about, or of the
object that lacks a field. The JSON, markdown and SARIF reports also carry the column.
