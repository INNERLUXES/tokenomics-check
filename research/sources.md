# Sources

The public pages the documented checks of this tool are based on, each with a short note in this project's own words on
what the page says and which checks lean on it. Nothing here is a copy of a page: read the page itself for its exact
wording. A plain text copy of each page, taken when it was read, is kept in [research/sources](sources) so that a point
can be checked against the page it came from, and the copies are the pages' own words, not this project's. The copies
leave out the buttons and links around a page, the date line and the citation block of the ERC page, the links to the
previous and the next page, and the number in the name of the Token Extension Program of Solana, which reads like a
year; curly quotes and dashes are written as plain ASCII. src/data.js holds the pages and the points the reports show,
and test/data.test.js checks that every page in src/data.js is listed here and has its copy.

The tool reads a token plan and runs nothing; its result is an input to a review before the token is deployed: not
financial, legal or investment advice and not a guarantee that the plan is sound. These notes say what the pages say so
a reader can follow a finding back to its source; they are not advice on any one token. The pages were chosen with web
addresses that hold no number that reads like a year: the ERC page, the OpenZeppelin Contracts documentation of the 5.x
line, and the Solana documentation.

Where a check rests on a statement the pages do not make, it is a best practice of this tool, its message says so, and
the note for the check in [docs/rules-and-sources.md](../docs/rules-and-sources.md) names the choice. No page sets how a
supply should be divided, how long insiders should wait or how much may come to market in one month; those checks are
all best practices of this tool.

## Ethereum

### ERC-20: Token Standard

https://eips.ethereum.org/EIPS/eip-20

Copy: research/sources/eip-20-token-standard.txt

The standard interface of a fungible token. `decimals` returns a uint8 and is optional: a wallet divides the stored
amount by ten to the power of the decimals to show it. `totalSupply`, `balanceOf` and the transfer values are uint256.
`decimals-out-of-range`, `supply-overflow`, `amount-precision`, `percent-rounding` and `allocation-sum` lean on it.

## OpenZeppelin Contracts

### ERC-20

https://docs.openzeppelin.com/contracts/5.x/erc20

Copy: research/sources/oz-erc20.txt

The guide to building an ERC-20 token with OpenZeppelin Contracts. Its note on decimals says that the EVM works with
whole numbers only, that a contract keeps amounts in the smallest unit and that decimals is only for display; it advises
18 decimals unless there is a special reason for another value, and its ERC20 contract returns 18 by default.
`amount-precision`, `percent-rounding` and `decimals-unusual` lean on it.

### ERC-20 API reference

https://docs.openzeppelin.com/contracts/5.x/api/token/erc20

Copy: research/sources/oz-api-erc20.txt

The reference of the ERC-20 contracts. ERC20Capped adds a cap to the supply, set once in the constructor; a mint past it
fails with ERC20ExceededCap. `mint-cap-missing`, `supply-over-cap` and `allocation-sum` lean on it.

### Finance API reference: VestingWallet and VestingWalletCliff

https://docs.openzeppelin.com/contracts/5.x/api/finance

Copy: research/sources/oz-api-finance-vesting-wallet.txt

VestingWallet releases tokens to a beneficiary from a start time over a duration along a linear curve by default; a
duration of zero makes it a timelock. VestingWalletCliff adds a cliff that begins with the schedule: before the cliff
the vested amount is zero, and after it the inherited schedule applies, so the part accrued over the cliff becomes
releasable at once. A cliff longer than the duration is refused with InvalidCliffDuration. The `durationMonths` form of
the tool follows this curve month by month. `cliff-over-duration`, `insider-no-cliff`, `supply-cliff`,
`insider-launch-release`, `vesting-too-short`, `vesting-too-long` and `schedule-mismatch` lean on it.

## Solana

### Assets on Solana

https://solana.com/docs/tokens

Copy: research/sources/solana-tokens.txt

How tokens are kept on Solana. A mint account holds the supply as a u64, the decimals as a u8, and an optional mint
authority; a mint with no mint authority has a fixed supply. `decimals-out-of-range`, `supply-overflow` and
`mint-cap-missing` lean on it, and the tool takes `"chain": "solana"` to check the supply against a u64.

### Token program

https://www.solana-program.com/docs/token

Copy: research/sources/spl-token-program.txt

The reference of the Token program and the spl-token command line. While a mint has a mint authority, that authority can
mint more at any time; SetAuthority can set it to None, which fixes the supply for good. `mint-cap-missing` leans on it.
