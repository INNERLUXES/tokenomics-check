# 2. Read JSON with a reader of its own, and count amounts in base units

## Status

Accepted

## Context

The facts the checks need sit in the plan: the decimals, the supply, and the amount or percent and the vesting of every
bucket. `JSON.parse` would read them, but it keeps no line and column, so a finding could not point at the line of a
bucket; it takes the last of two values written under one key without a word; it builds objects whose keys come from the
file; and it turns every number into a floating point number. A supply of 10^27 base units does not fit in one, and
0.1 + 0.2 is not 0.3 in one, so a sum of buckets read that way could pass or fail by a rounding the plan never made.

A plan that is not complete (a bucket with no vesting, a misspelt cliff) would also be read as if it were, and a check
could take a value it never saw for one that is fine.

A YAML form was weighed and left out: the plan is small, JSON is what most tools write, and one strict format keeps the
reader and its limits small.

## Decision

1. The file is read by src/json.js, a reader of the tool's own for strict JSON, with the line and column of every value,
   a key written twice as an error, and limits of nesting, values and string length. It does not recurse, and a number
   keeps the characters it was written with.
2. Amounts, supplies and percents are read from those characters as decimal numbers (src/amounts.js) and counted in
   base units with integers of any size. No floating point number decides a result. A sum of percents is compared with
   the supply as a fraction, so percents that add up to 100 pass even when each is rounded down.
3. Every field the checks need and the file does not give, every key the tool does not read and every value of the wrong
   type is returned with its line and shown as a finding. A check never takes a value it did not read for one that is
   fine, and a bucket that could not be read is named in a note.
4. A file that is not JSON, or not an object, stops with one `plan-unreadable` finding and a line; the tool does not guess
   at the rest of the file.
5. The checks are a heuristic over the plan as written, and every report says so; docs/method.md says what each check
   reads and docs/limits.md what it cannot see. The result is an input to a review before the token is deployed: not
   financial, legal or investment advice and not a guarantee that the plan is sound.

## Consequences

- The tool needs no install and no network, and the same file gives the same report on Linux, Windows and macOS.
- A finding points at the line of the field or the bucket.
- A sum is exact at 18 decimals and past them, and a rounding the tool makes is a finding of its own
  (`percent-rounding`) or goes to the last month of a schedule, never lost.
- Numbers with grouping commas, underscores or hexadecimal, and plans in YAML, are not read (docs/limits.md).
