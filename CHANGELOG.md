# Changes

## 1.0.0

First release.

- Reads the token plan of a new cryptocurrency or token as JSON and lists the problems to fix before the token is
  deployed, with file and line, as an input to a review: not financial, legal or investment advice and not a guarantee
  that the plan is sound. It reads the file, fetches nothing, runs nothing, calls no chain, follows no symbolic link and
  reads no clock.
- Reads the name, symbol, decimals, maximum and total supply, mint and burn flags, cap mechanism, chain (`evm` or
  `solana`) and trading at launch of a token, and its buckets of thirteen kinds, each with an amount or a percent and a
  vesting: a part at launch, `linearMonths` after a start and a cliff, the VestingWallet curve of `durationMonths`, or
  explicit steps.
- A strict JSON reader with no dependency and no recursion, with the line and column of every value, a key written
  twice as an error, and limits of size, nesting, values and string length. Amounts, supplies and percents are read from
  the characters of the file and counted in base units with integers of any size.
- Twenty-two checks in three levels, each documented or a best practice of the tool and saying which: buckets that do
  not add up to the supply (`allocation-sum`), a percent that rounds (`percent-rounding`), an amount with more places
  than the decimals (`amount-precision`), decimals outside a uint8 (`decimals-out-of-range`) or above 18
  (`decimals-unusual`), a supply past a uint256 or a u64 (`supply-overflow`), a total over the maximum
  (`supply-over-cap`), a maximum on a mintable token that nothing enforces (`mint-cap-missing`), a cliff past its
  VestingWallet duration (`cliff-over-duration`), insider buckets released at launch (`insider-launch-release`), before
  the minimum cliff (`insider-no-cliff`) or too soon (`vesting-too-short`), a bucket that releases for too long
  (`vesting-too-long`), a schedule that releases more or less than its bucket (`schedule-mismatch`), a month that
  releases a large share of the circulating supply (`supply-cliff`) and trading at launch with nothing to trade
  (`trading-without-float`); and six checks about the input (`plan-unreadable`, `field-missing`, `field-unknown`,
  `field-invalid`, `bucket-duplicate`, `percent-out-of-range`).
- A table of the release and the circulating supply month by month from launch, in every format but SARIF, with
  `--months` for its length.
- Reports as text, markdown, JSON and SARIF 2.1.0; every finding has its id, severity, message, file, line and column;
  `--min-severity`, `--fail-on`, `--explain` with the points of the documentation behind each finding, `--list-checks`,
  and the thresholds `--cliff-share`, `--min-cliff`, `--min-vesting` and `--max-vesting`. Exit code `0` when no finding
  is at or above the fail-on level, `1` when one is, `2` for a usage or input error, with no result.
- Plain text copies of the public pages the documented checks rest on, under research/sources, with a note on each page.
- Release packages come with a CycloneDX SBOM, SHA-256 checksums and a build provenance attestation, after the SSDF gate
  of the repository.
