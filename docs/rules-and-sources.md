# Rules and sources

Every check of the tool, with what it looks at, the points of the public pages it rests on, what it cannot see, and what to change. The points are in this project's own words and are the ones the reports show with `--explain`; each page was fetched and read before it was listed, and a copy of its text is kept under [research/sources](../research/sources) so that a point can be checked against the page it came from. [../research/sources.md](../research/sources.md) has a note on each page.

The tool is an input to a review before the token is deployed: not financial, legal or investment advice and not a guarantee that the plan is sound. A check that is a best practice of this tool says so in its message; it is not a rule in EIP-20, the OpenZeppelin Contracts documentation or the Solana documentation.

## The pages

- ERC-20: Token Standard: https://eips.ethereum.org/EIPS/eip-20 (copy: `research/sources/eip-20-token-standard.txt`)
- ERC-20 (OpenZeppelin Contracts documentation): https://docs.openzeppelin.com/contracts/5.x/erc20 (copy: `research/sources/oz-erc20.txt`)
- ERC-20 API reference (OpenZeppelin Contracts documentation): https://docs.openzeppelin.com/contracts/5.x/api/token/erc20 (copy: `research/sources/oz-api-erc20.txt`)
- Finance API reference, VestingWallet and VestingWalletCliff (OpenZeppelin Contracts documentation): https://docs.openzeppelin.com/contracts/5.x/api/finance (copy: `research/sources/oz-api-finance-vesting-wallet.txt`)
- Assets on Solana: mint accounts and token accounts (Solana documentation): https://solana.com/docs/tokens (copy: `research/sources/solana-tokens.txt`)
- Token program (Solana Program Library documentation): https://www.solana-program.com/docs/token (copy: `research/sources/spl-token-program.txt`)

## plan-unreadable

- Level: error
- Kind: a problem with the plan file itself; it has no setting to lower
- Looks at: the file is not JSON the reader can follow, or its top level is not an object, so no plan was read.
- Cannot see: It stops at the first place that is not JSON, or at a top level that is not an object, so nothing in that file is checked.
- What to change: Write the plan as one JSON object (docs/inputs.md), and fix the line named.
- Points of the pages: none; this check is about the plan file itself.

## field-missing

- Level: error
- Kind: a problem with the plan file itself; it has no setting to lower
- Looks at: a field the checks need is not in the plan: the name, symbol, decimals, mintable flag, a supply or the allocations of the token, or the name, kind, amount or percent, or vesting of a bucket, or the month and part of a step of a schedule.
- Cannot see: It names the field and the object that lacks it; it does not guess the value, and the checks that need the field do not run for that part.
- What to change: Add the field named; docs/inputs.md lists what each part of the plan needs.
- Points of the pages: none; this check is about the plan file itself.

## field-unknown

- Level: warning
- Kind: a problem with the plan file itself; it has no setting to lower
- Looks at: a key the tool does not read, often a misspelt one; its value was left out of every check.
- Cannot see: It cannot tell what a misspelt key was meant to say; it names a known key when one is close, and the value is left out of every check.
- What to change: Correct the spelling to a key of docs/inputs.md, or remove the key.
- Points of the pages: none; this check is about the plan file itself.

## field-invalid

- Level: error
- Kind: a problem with the plan file itself; it has no setting to lower
- Looks at: a value of the wrong type or form: text where a number or a flag belongs, a month that is not a whole number, a negative amount, a kind the tool does not know, or two forms of vesting in one bucket.
- Cannot see: It names the value and the form it needs; the value is left out of the checks that need it.
- What to change: Write the value as docs/inputs.md shows: amounts and supplies as decimal numbers of whole tokens, months as whole numbers, flags as true or false.
- Points of the pages: none; this check is about the plan file itself.

## bucket-duplicate

- Level: error
- Kind: a problem with the plan file itself; it has no setting to lower
- Looks at: two buckets share a name (compared without case and outer spaces), so a reader cannot tell which line a total comes from.
- Cannot see: It compares names without case and outer spaces; two names that differ in other ways, such as Team and Team A, are two buckets.
- What to change: Give each bucket a name of its own, or merge the two.
- Points of the pages: none; this check is about the plan file itself.

## percent-out-of-range

- Level: error
- Kind: a problem with the plan file itself; it has no setting to lower
- Looks at: a percent below 0 or above 100: the share of a bucket, the part released at launch or a step of a schedule.
- Cannot see: It checks each percent on its own; a set of percents that add up to more than 100 is allocation-sum or schedule-mismatch.
- What to change: Give each percent as a number from 0 to 100.
- Points of the pages: none; this check is about the plan file itself.

## allocation-sum

- Level: error
- Kind: a best practice of this tool, not a rule in EIP-20, the OpenZeppelin Contracts documentation or the Solana documentation
- Looks at: the buckets do not add up to the supply of the plan (the maximum supply when one is given, else the total supply), counted in base units with amounts and percents together.
- Cannot see: It compares the buckets with the supply of the plan; it does not know whether the supply itself is right, and it is not checked when a bucket has no amount it could read.
- What to change: Change the buckets until they add up to the supply exactly, or change the supply.
- The tool's own choice: requiring the buckets to add up to the supply exactly is a best practice of this tool, not a rule in EIP-20, the OpenZeppelin Contracts documentation or the Solana documentation; the pages define the total supply and the cap, not how a plan divides them.
- Points of the pages:
  - ERC-20 reports the total supply, every balance and every transfer value as a uint256, an unsigned whole number in the smallest unit of the token. (ERC-20: Token Standard, https://eips.ethereum.org/EIPS/eip-20)
  - ERC20Capped fixes a cap on the total supply once, in its constructor, and a mint that would take the supply over the cap fails with the error ERC20ExceededCap. (ERC-20 API reference (OpenZeppelin Contracts documentation), https://docs.openzeppelin.com/contracts/5.x/api/token/erc20)

## percent-rounding

- Level: info
- Kind: documented
- Looks at: a bucket given as a percent of the supply is not a whole number of base units at the decimals of the token, so it is rounded down and the rest is in no bucket.
- Cannot see: It reports the rounding of each percent bucket; the rounding inside a schedule, which goes to the last month of the schedule, is not reported.
- What to change: Give the bucket as an amount, or choose a percent that gives whole base units.
- Points of the pages:
  - The EVM works with whole numbers only, so a contract keeps every amount as a count of the smallest unit, and decimals changes nothing but how a wallet shows it. (ERC-20 (OpenZeppelin Contracts documentation), https://docs.openzeppelin.com/contracts/5.x/erc20)
  - ERC-20 lets a token report its decimals as a uint8, and a wallet divides the stored whole-number amount by ten to that power to show it; the function is optional. (ERC-20: Token Standard, https://eips.ethereum.org/EIPS/eip-20)

## amount-precision

- Level: error
- Kind: documented
- Looks at: an amount or a supply has more places after the point than the token has decimals, so it cannot be held in base units.
- Cannot see: It reads the places as written; it is not checked when the decimals cannot be used.
- What to change: Round the amount to the decimals of the token, or raise the decimals.
- Points of the pages:
  - The EVM works with whole numbers only, so a contract keeps every amount as a count of the smallest unit, and decimals changes nothing but how a wallet shows it. (ERC-20 (OpenZeppelin Contracts documentation), https://docs.openzeppelin.com/contracts/5.x/erc20)
  - ERC-20 lets a token report its decimals as a uint8, and a wallet divides the stored whole-number amount by ten to that power to show it; the function is optional. (ERC-20: Token Standard, https://eips.ethereum.org/EIPS/eip-20)

## decimals-out-of-range

- Level: error
- Kind: documented
- Looks at: the decimals are not a whole number from 0 to 255, which is what a uint8 on Ethereum and a u8 on Solana hold.
- Cannot see: It checks the range a uint8 or a u8 holds; it does not know what the wallets and exchanges the token will be listed on show.
- What to change: Choose decimals from 0 to 255; 18 on an EVM chain unless there is a reason for another value.
- Points of the pages:
  - ERC-20 lets a token report its decimals as a uint8, and a wallet divides the stored whole-number amount by ten to that power to show it; the function is optional. (ERC-20: Token Standard, https://eips.ethereum.org/EIPS/eip-20)
  - A Solana mint account keeps the supply as a u64 and the decimals as a u8, with an optional mint authority; a mint without one has a fixed supply. (Assets on Solana: mint accounts and token accounts (Solana documentation), https://solana.com/docs/tokens)

## decimals-unusual

- Level: warning
- Kind: a best practice of this tool, not a rule in EIP-20, the OpenZeppelin Contracts documentation or the Solana documentation
- Looks at: an EVM token with more than 18 decimals, past what the OpenZeppelin guide advises and what Ether uses.
- Cannot see: It warns above 18 on an EVM chain only; on Solana it does not judge the decimals, beyond the range of a u8.
- What to change: Use 18 decimals unless the token has a special reason for more, and check that the wallets and exchanges it will be listed on show more than 18 places.
- The tool's own choice: warning above 18 decimals is a best practice of this tool, not a rule in EIP-20, the OpenZeppelin Contracts documentation or the Solana documentation; the guide advises 18 and the standard allows up to 255.
- Points of the pages:
  - The OpenZeppelin guide advises 18 decimals, the value of Ether and of most ERC-20 tokens, unless there is a special reason for another, and its ERC20 contract returns 18 by default. (ERC-20 (OpenZeppelin Contracts documentation), https://docs.openzeppelin.com/contracts/5.x/erc20)

## supply-overflow

- Level: error
- Kind: documented
- Looks at: the supply in base units does not fit the number the chain keeps it in: a uint256 for ERC-20, a u64 for a Solana mint.
- Cannot see: It checks the larger of the two supplies in base units against a uint256 or a u64; it does not check the sums a contract works out, such as a balance times a price.
- What to change: Lower the supply or the decimals until the supply in base units fits.
- Points of the pages:
  - ERC-20 reports the total supply, every balance and every transfer value as a uint256, an unsigned whole number in the smallest unit of the token. (ERC-20: Token Standard, https://eips.ethereum.org/EIPS/eip-20)
  - A Solana mint account keeps the supply as a u64 and the decimals as a u8, with an optional mint authority; a mint without one has a fixed supply. (Assets on Solana: mint accounts and token accounts (Solana documentation), https://solana.com/docs/tokens)

## supply-over-cap

- Level: error
- Kind: documented
- Looks at: the total supply of the plan is larger than its maximum supply, so a cap at the maximum would refuse to mint it.
- Cannot see: It compares the two supplies of the plan; it does not see the cap in the contract.
- What to change: Lower the total supply to the maximum, or raise the maximum.
- Points of the pages:
  - ERC20Capped fixes a cap on the total supply once, in its constructor, and a mint that would take the supply over the cap fails with the error ERC20ExceededCap. (ERC-20 API reference (OpenZeppelin Contracts documentation), https://docs.openzeppelin.com/contracts/5.x/api/token/erc20)

## mint-cap-missing

- Level: error
- Kind: documented
- Looks at: a mintable token states a maximum supply but names nothing that enforces it, such as ERC20Capped or a mint authority set to None.
- Cannot see: It reads the capMechanism the plan names; it does not check that the contract has it, or who holds the right to mint.
- What to change: Name the mechanism in capMechanism (ERC20Capped, a cap check in the mint function, a mint authority set to None after the last mint), or make the token not mintable.
- Points of the pages:
  - ERC20Capped fixes a cap on the total supply once, in its constructor, and a mint that would take the supply over the cap fails with the error ERC20ExceededCap. (ERC-20 API reference (OpenZeppelin Contracts documentation), https://docs.openzeppelin.com/contracts/5.x/api/token/erc20)
  - As long as a mint holds a mint authority, that authority may mint more at any time; SetAuthority can set it to None, and from then on the supply can never grow. (Token program (Solana Program Library documentation), https://www.solana-program.com/docs/token)
  - A Solana mint account keeps the supply as a u64 and the decimals as a u8, with an optional mint authority; a mint without one has a fixed supply. (Assets on Solana: mint accounts and token accounts (Solana documentation), https://solana.com/docs/tokens)

## cliff-over-duration

- Level: error
- Kind: documented
- Looks at: a bucket in the VestingWallet form (durationMonths) has a cliff longer than its duration, which VestingWalletCliff refuses.
- Cannot see: It checks the durationMonths form only; in the linearMonths form the cliff and the linear months follow one another, and a long cliff there is allowed.
- What to change: Make the cliff no longer than the duration, or give the months after the cliff with linearMonths.
- Points of the pages:
  - VestingWalletCliff refuses a cliff longer than the duration of the schedule with the error InvalidCliffDuration. (Finance API reference, VestingWallet and VestingWalletCliff (OpenZeppelin Contracts documentation), https://docs.openzeppelin.com/contracts/5.x/api/finance)
  - VestingWalletCliff adds a cliff that begins with the schedule: until the cliff has passed nothing is vested, and after it the amount is what the inherited linear schedule gives. (Finance API reference, VestingWallet and VestingWalletCliff (OpenZeppelin Contracts documentation), https://docs.openzeppelin.com/contracts/5.x/api/finance)

## insider-launch-release

- Level: warning
- Kind: a best practice of this tool, not a rule in EIP-20, the OpenZeppelin Contracts documentation or the Solana documentation
- Looks at: a team, insider, advisor or investor bucket releases a part at launch (month 0).
- Cannot see: It knows insiders by the kind of the bucket: team, insiders, advisors and investors. A bucket of insiders given another kind is not seen.
- What to change: Release nothing to insiders at launch; start their schedule after a cliff.
- The tool's own choice: holding back every insider bucket at launch is a best practice of this tool, not a rule in EIP-20, the OpenZeppelin Contracts documentation or the Solana documentation; a vesting wallet can release from its start.
- Points of the pages:
  - VestingWallet hands tokens to a beneficiary on a schedule set by a start time and a duration, along a linear curve by default; a duration of zero turns it into a timelock that opens at the start. (Finance API reference, VestingWallet and VestingWalletCliff (OpenZeppelin Contracts documentation), https://docs.openzeppelin.com/contracts/5.x/api/finance)

## insider-no-cliff

- Level: warning
- Kind: a best practice of this tool, not a rule in EIP-20, the OpenZeppelin Contracts documentation or the Solana documentation
- Looks at: a team, insider, advisor or investor bucket releases a part after launch but before the month of --min-cliff (default 6).
- Cannot see: It reads the months of the plan, not the vesting contract, and it knows insiders by the kind of the bucket.
- What to change: Give the bucket a cliff of at least the months of --min-cliff, or set --min-cliff to the policy of the project.
- The tool's own choice: a cliff of at least --min-cliff months for insiders is a best practice of this tool, not a rule in EIP-20, the OpenZeppelin Contracts documentation or the Solana documentation; the default of 6 months is the tool's own choice.
- Points of the pages:
  - VestingWalletCliff adds a cliff that begins with the schedule: until the cliff has passed nothing is vested, and after it the amount is what the inherited linear schedule gives. (Finance API reference, VestingWallet and VestingWalletCliff (OpenZeppelin Contracts documentation), https://docs.openzeppelin.com/contracts/5.x/api/finance)

## vesting-too-short

- Level: warning
- Kind: a best practice of this tool, not a rule in EIP-20, the OpenZeppelin Contracts documentation or the Solana documentation
- Looks at: a team, insider, advisor or investor bucket is fully released before the month of --min-vesting (default 12).
- Cannot see: It reads the last month in which the bucket releases; it does not know what the holders may do with what is released.
- What to change: Spread the bucket over at least the months of --min-vesting, or set --min-vesting to the policy of the project.
- The tool's own choice: a release of at least --min-vesting months for insiders is a best practice of this tool, not a rule in EIP-20, the OpenZeppelin Contracts documentation or the Solana documentation; the default of 12 months is the tool's own choice.
- Points of the pages:
  - VestingWallet hands tokens to a beneficiary on a schedule set by a start time and a duration, along a linear curve by default; a duration of zero turns it into a timelock that opens at the start. (Finance API reference, VestingWallet and VestingWalletCliff (OpenZeppelin Contracts documentation), https://docs.openzeppelin.com/contracts/5.x/api/finance)

## vesting-too-long

- Level: info
- Kind: a best practice of this tool, not a rule in EIP-20, the OpenZeppelin Contracts documentation or the Solana documentation
- Looks at: a bucket still releases after the month of --max-vesting (default 60).
- Cannot see: It reads the last month in which the bucket releases; a long release can be what the project wants, which is why it is a note.
- What to change: Confirm that the bucket is meant to release for that long, or set --max-vesting to the policy of the project.
- The tool's own choice: a note past --max-vesting months is a best practice of this tool, not a rule in EIP-20, the OpenZeppelin Contracts documentation or the Solana documentation; the default of 60 months is the tool's own choice.
- Points of the pages:
  - VestingWallet hands tokens to a beneficiary on a schedule set by a start time and a duration, along a linear curve by default; a duration of zero turns it into a timelock that opens at the start. (Finance API reference, VestingWallet and VestingWalletCliff (OpenZeppelin Contracts documentation), https://docs.openzeppelin.com/contracts/5.x/api/finance)

## schedule-mismatch

- Level: error
- Kind: a best practice of this tool, not a rule in EIP-20, the OpenZeppelin Contracts documentation or the Solana documentation
- Looks at: the schedule of a bucket releases more than the bucket holds, or never releases all of it (a schedule that falls short, or a launch part below 100 with no months after it).
- Cannot see: It compares what the schedule releases with the bucket; a schedule that the contracts will carry out in another way is not seen.
- What to change: Make the steps of the schedule add up to the bucket exactly, or add linearMonths or durationMonths for the part after launch.
- The tool's own choice: requiring every schedule to release its bucket exactly is a best practice of this tool, not a rule in EIP-20, the OpenZeppelin Contracts documentation or the Solana documentation; a vesting wallet releases only what it holds, so a plan that promises more, or less, is the plan's own error.
- Points of the pages:
  - VestingWallet hands tokens to a beneficiary on a schedule set by a start time and a duration, along a linear curve by default; a duration of zero turns it into a timelock that opens at the start. (Finance API reference, VestingWallet and VestingWalletCliff (OpenZeppelin Contracts documentation), https://docs.openzeppelin.com/contracts/5.x/api/finance)

## supply-cliff

- Level: warning
- Kind: a best practice of this tool, not a rule in EIP-20, the OpenZeppelin Contracts documentation or the Solana documentation
- Looks at: in one month after launch the buckets release more than --cliff-share (default 25) percent of the supply in circulation before that month.
- Cannot see: It counts what the schedules release as circulating, whether or not the holders sell it, and it does not see tokens locked in pools or staking. The first month after a launch with nothing in circulation is not compared.
- What to change: Spread the release over more months, stagger the cliffs of the buckets, or confirm that the market can take the release.
- The tool's own choice: a share of --cliff-share percent of the circulating supply in one month is a best practice of this tool, not a rule in EIP-20, the OpenZeppelin Contracts documentation or the Solana documentation; the default of 25 percent is the tool's own choice.
- Points of the pages:
  - VestingWalletCliff adds a cliff that begins with the schedule: until the cliff has passed nothing is vested, and after it the amount is what the inherited linear schedule gives. (Finance API reference, VestingWallet and VestingWalletCliff (OpenZeppelin Contracts documentation), https://docs.openzeppelin.com/contracts/5.x/api/finance)

## trading-without-float

- Level: warning
- Kind: a best practice of this tool, not a rule in EIP-20, the OpenZeppelin Contracts documentation or the Solana documentation
- Looks at: the plan says trading starts at launch, but no liquidity or public sale bucket releases anything at launch.
- Cannot see: It reads tradingAtLaunch and the kinds of the buckets; a float that comes from another source, such as a market maker loan, is not seen.
- What to change: Add a liquidity or public sale bucket with a part released at launch, or set tradingAtLaunch to false.
- The tool's own choice: asking for a liquidity or public sale part at launch when trading starts then is a best practice of this tool, not a rule in EIP-20, the OpenZeppelin Contracts documentation or the Solana documentation; the pages do not cover markets.
- Points of the pages: none; the pages do not cover it, and the check is the tool's own choice.
