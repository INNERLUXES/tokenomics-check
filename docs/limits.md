# Limits

The tool is not an adviser. It reads one token plan, and its result is an input to a review before the token is deployed:
not financial, legal or investment advice and not a guarantee that the plan is sound. A clean run means only that none
of the problems in [method.md](method.md) were found in the file.

## What it cannot see

- **The contracts.** It reads the plan, not the token contract, the vesting contracts or the sale contract. Whether the
  contracts mint the supply of the plan, enforce the cap it names in `capMechanism` and release each bucket as the plan
  says is for the team and the auditors of the contracts to make sure.
- **Who holds the keys.** It does not know who may mint, who holds the treasury, who can change a vesting contract or
  move a bucket that is not under one. A cap named in the plan says nothing about who can lift it in an upgradeable
  contract.
- **The market and the price.** The circulating supply of the table is everything released so far. Whether the holders
  sell, stake, provide liquidity or keep their tokens, what the price does and how deep the market is are out of reach.
  `supply-cliff` compares amounts, not the demand for them.
- **The law.** Whether a sale is allowed, who may buy, what must be disclosed and how a token is classed differ from
  country to country and are not read.
- **Tokens held in other ways.** Tokens locked in a liquidity pool, staked, lent to a market maker or held by an
  exchange are counted as released when their bucket releases them.
- **Emissions after launch.** Rewards that depend on use, inflation, burns and buybacks are not modelled; a plan can
  give them as a bucket with a schedule, and the tool reads that schedule as written.
- **The calendar.** The table counts months from launch (month 0). It does not know the date of the launch, the length
  of a month in days or a vesting contract that counts in seconds; a VestingWallet schedule of whole months is the same
  in both, but a schedule that starts mid-month is not.
- **Insiders by another name.** The insider checks know insiders by the kind of the bucket. A bucket of founders given
  the kind `ecosystem` is not an insider bucket to the tool.
- **What a misspelt key meant.** A key the tool does not read is reported and left out. A misspelt `cliffMonths` makes
  a bucket look as if it had no cliff; read the `field-unknown` findings first.

## What the reader does not read

[inputs.md](inputs.md) lists the fields. A file that is not strict JSON is one `plan-unreadable` finding, and nothing
else is checked. A value that is missing, of the wrong type or out of range is a finding, and the checks that need it
leave it out: a clean run says nothing about that part. Grouping commas and underscores in numbers, hexadecimal, YAML
and comments are not read.

## Size limits

| Limit | Value |
| --- | --- |
| file size | 4 MB |
| nesting of objects and arrays | 1,000 levels |
| values (nodes) in a file | 2,000,000 |
| a string | 1,000,000 characters |
| buckets | 1,000; the rest are not read |
| steps of one schedule | 2,400 |
| a month in a field | 1,200 |
| the digits of a number | 100, with an exponent up to 100 |
| the last month of the table (`--months`) | 2,400 |

Input past a limit is a `plan-unreadable` or `field-invalid` finding or, for the file size, an input error with exit
code `2`. The tool never passes a run because something could not be read.

## What a run does not do

It fetches nothing and connects to nothing, calls no chain, runs no program, evaluates nothing it reads, reads no clock
and no locale, follows no symbolic link and writes nothing to disk. [threat-model.md](threat-model.md) lists the risks of
reading a file from a pull request and their controls.
