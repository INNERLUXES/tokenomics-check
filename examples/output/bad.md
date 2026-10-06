# tokenomics-check: examples/bad/plan.json

- File: 78 lines, 1,765 bytes
- Token: Quickfire Example \(QFX\), 2 decimals, evm; max supply 21,212,121, total supply 25,000,000; mintable, trading at launch
- Buckets: 10 buckets holding 16,318,181.79 QFX \(76.92% of the maxSupply\); 1,272,727.26 QFX \(6%\) in circulation at launch; last release at month 72
- Findings: 22 \(11 error, 9 warning, 2 info\)
- Result: **FAIL - 11 findings at or above error \(11 error, 9 warning, 2 info\)**

## Findings

| Level | Check | Where | Message |
| --- | --- | --- | --- |
| error | supply-over-cap | examples/bad/plan.json:7 | The total supply of 25,000,000 QFX is larger than the maximum supply of 21,212,121 QFX; a cap such as ERC20Capped at the maximum refuses a mint past it with ERC20ExceededCap. Fix: Lower the total supply to the maximum, or raise the maximum. |
| error | mint-cap-missing | examples/bad/plan.json:8 | The token is mintable and states a maximum supply of 21,212,121 QFX, but capMechanism names nothing that enforces it, such as ERC20Capped or a cap check in the mint function; while a mint can go on, the maximum is only a promise. Fix: Name the mechanism in capMechanism \(ERC20Capped, a cap check in the mint function, a mint authority set to None after the last mint\), or make the token not mintable. |
| error | allocation-sum | examples/bad/plan.json:12 | The 10 buckets add up to 16,318,181.79 QFX, 76.92% of the maxSupply of 21,212,121 QFX: 4,893,939.21 QFX less than the supply. This is a best practice of this tool, not a rule in EIP-20, the OpenZeppelin Contracts documentation or the Solana documentation. Fix: Change the buckets until they add up to the supply exactly, or change the supply. |
| error | cliff-over-duration | examples/bad/plan.json:23 | The bucket Advisors has a cliff of 9 months and a duration of 6 months; VestingWalletCliff refuses a cliff longer than its duration with InvalidCliffDuration. The table releases the rest at the end of the cliff. Fix: Make the cliff no longer than the duration, or give the months after the cliff with linearMonths. |
| error | amount-precision | examples/bad/plan.json:40 | The amount of bucket Ecosystem is 2000000.125, with 3 places after the point, but the token has 2 decimals: an amount is held as a whole number of base units, so it would be cut to 2,000,000.12. Fix: Round the amount to the decimals of the token, or raise the decimals. |
| error | percent-out-of-range | examples/bad/plan.json:41 | The launchPercent of the vesting of bucket Ecosystem is 150, outside 0 to 100. Fix: Give each percent as a number from 0 to 100. |
| error | schedule-mismatch | examples/bad/plan.json:54 | The schedule of bucket Public sale releases 2,333,333.31 QFX, more than the 2,121,212.1 QFX the bucket holds. This is a best practice of this tool, not a rule in EIP-20, the OpenZeppelin Contracts documentation or the Solana documentation. Fix: Make the steps of the schedule add up to the bucket exactly, or add linearMonths or durationMonths for the part after launch. |
| error | field-invalid | examples/bad/plan.json:62 | The kind of bucket Marketing is "marketing"; it must be one of team, insiders, advisors, investors, treasury, reserve, community, ecosystem, rewards, airdrop, liquidity, public-sale, other. The insider checks did not look at this bucket. Fix: Write the value as docs/inputs.md shows: amounts and supplies as decimal numbers of whole tokens, months as whole numbers, flags as true or false. |
| error | schedule-mismatch | examples/bad/plan.json:64 | The bucket Marketing holds 1,060,606.05 QFX, but it gives launchPercent 20% and no linearMonths, durationMonths or schedule for the rest, so 848,484.84 QFX is never released. This is a best practice of this tool, not a rule in EIP-20, the OpenZeppelin Contracts documentation or the Solana documentation. Fix: Make the steps of the schedule add up to the bucket exactly, or add linearMonths or durationMonths for the part after launch. |
| error | bucket-duplicate | examples/bad/plan.json:67 | Bucket 9 is named TEAM, as is bucket 1 at line 13; a total cannot be traced to one of them. Fix: Give each bucket a name of its own, or merge the two. |
| error | field-missing | examples/bad/plan.json:72 | The bucket Partners has no vesting; give one, such as \{"launchPercent": 100\} for a bucket released whole at launch. Fix: Add the field named; docs/inputs.md lists what each part of the plan needs. |
| warning | trading-without-float | examples/bad/plan.json:10 | Trading starts at launch, but Liquidity and Public sale release nothing at launch, so there is nothing to trade or to pool. This is a best practice of this tool, not a rule in EIP-20, the OpenZeppelin Contracts documentation or the Solana documentation. Fix: Add a liquidity or public sale bucket with a part released at launch, or set tradingAtLaunch to false. |
| warning | insider-no-cliff | examples/bad/plan.json:17 | The bucket Team \(team\) releases 636,363.63 QFX at month 1, before month 6 \(--min-cliff\); its cliff ends at month 0. This is a best practice of this tool, not a rule in EIP-20, the OpenZeppelin Contracts documentation or the Solana documentation. Fix: Give the bucket a cliff of at least the months of --min-cliff, or set --min-cliff to the policy of the project. |
| warning | vesting-too-short | examples/bad/plan.json:17 | The bucket Team \(team\) is fully released by month 6, before month 12 \(--min-vesting\). This is a best practice of this tool, not a rule in EIP-20, the OpenZeppelin Contracts documentation or the Solana documentation. Fix: Spread the bucket over at least the months of --min-vesting, or set --min-vesting to the policy of the project. |
| warning | insider-launch-release | examples/bad/plan.json:17 | The bucket Team \(team\) releases 424,242.42 QFX, 10% of the bucket, at launch; insiders who can sell on the first day weigh on the price before the market has formed. This is a best practice of this tool, not a rule in EIP-20, the OpenZeppelin Contracts documentation or the Solana documentation. Fix: Release nothing to insiders at launch; start their schedule after a cliff. |
| warning | vesting-too-short | examples/bad/plan.json:23 | The bucket Advisors \(advisors\) is fully released by month 9, before month 12 \(--min-vesting\). This is a best practice of this tool, not a rule in EIP-20, the OpenZeppelin Contracts documentation or the Solana documentation. Fix: Spread the bucket over at least the months of --min-vesting, or set --min-vesting to the policy of the project. |
| warning | supply-cliff | examples/bad/plan.json:29 | Month 12 releases 3,203,914.11 QFX, 36.7% of the 8,727,903.95 QFX in circulation before it, more than the 25% of --cliff-share: Seed investors 3,181,818.15 QFX and Treasury 22,095.96 QFX. This is a best practice of this tool, not a rule in EIP-20, the OpenZeppelin Contracts documentation or the Solana documentation. Fix: Spread the release over more months, stagger the cliffs of the buckets, or confirm that the market can take the release. |
| warning | supply-cliff | examples/bad/plan.json:53 | Month 1 releases 1,719,065.63 QFX, 135.06% of the 1,272,727.26 QFX in circulation before it, more than the 25% of --cliff-share: Public sale 1,060,606.05 QFX, Team 636,363.63 QFX and Treasury 22,095.95 QFX. This is a best practice of this tool, not a rule in EIP-20, the OpenZeppelin Contracts documentation or the Solana documentation. Fix: Spread the release over more months, stagger the cliffs of the buckets, or confirm that the market can take the release. |
| warning | supply-cliff | examples/bad/plan.json:53 | Month 2 releases 1,931,186.85 QFX, 64.54% of the 2,991,792.89 QFX in circulation before it, more than the 25% of --cliff-share: Public sale 1,272,727.26 QFX, Team 636,363.63 QFX and Treasury 22,095.96 QFX. This is a best practice of this tool, not a rule in EIP-20, the OpenZeppelin Contracts documentation or the Solana documentation. Fix: Spread the release over more months, stagger the cliffs of the buckets, or confirm that the market can take the release. |
| warning | field-unknown | examples/bad/plan.json:70 | The key "cliff" of the vesting of bucket TEAM is not one the tool reads, so its value was left out of every check. Did you mean "cliffMonths"? The keys of the vesting of bucket TEAM are startMonth, cliffMonths, launchPercent, linearMonths, durationMonths, schedule. Fix: Correct the spelling to a key of docs/inputs.md, or remove the key. |
| info | percent-rounding | examples/bad/plan.json:34 | 7.5% of the supply of 21,212,121 QFX is not a whole number of base units at 2 decimals, so the bucket Treasury holds 1,590,909.07 and less than one base unit is in no bucket. Fix: Give the bucket as an amount, or choose a percent that gives whole base units. |
| info | vesting-too-long | examples/bad/plan.json:35 | The bucket Treasury still releases at month 72, after month 60 \(--max-vesting\). This is a best practice of this tool, not a rule in EIP-20, the OpenZeppelin Contracts documentation or the Solana documentation. Fix: Confirm that the bucket is meant to release for that long, or set --max-vesting to the policy of the project. |

## Release table \(months 0 to 72; supply 21,212,121 QFX\)

| Month | Released | Circulating | Of supply | From |
| ---: | ---: | ---: | ---: | --- |
| 0 | 1,272,727.26 | 1,272,727.26 | 6% | TEAM, Team and Marketing |
| 1 | 1,719,065.63 | 2,991,792.89 | 14.1% | Public sale, Team and Treasury |
| 2 | 1,931,186.85 | 4,922,979.74 | 23.2% | Public sale, Team and Treasury |
| 3 | 658,459.59 | 5,581,439.33 | 26.31% | Team and Treasury |
| 4 | 658,459.59 | 6,239,898.92 | 29.41% | Team and Treasury |
| 5 | 658,459.59 | 6,898,358.51 | 32.52% | Team and Treasury |
| 6 | 658,459.59 | 7,556,818.1 | 35.62% | Team and Treasury |
| 7 | 22,095.96 | 7,578,914.06 | 35.72% | Treasury |
| 8 | 22,095.96 | 7,601,010.02 | 35.83% | Treasury |
| 9 | 1,082,702.01 | 8,683,712.03 | 40.93% | Advisors and Treasury |
| 10 | 22,095.96 | 8,705,807.99 | 41.04% | Treasury |
| 11 | 22,095.96 | 8,727,903.95 | 41.14% | Treasury |
| 12 | 3,203,914.11 | 11,931,818.06 | 56.24% | Seed investors and Treasury |
| 13 | 22,095.96 | 11,953,914.02 | 56.35% | Treasury |
| 14 | 22,095.96 | 11,976,009.98 | 56.45% | Treasury |
| 15 | 22,095.95 | 11,998,105.93 | 56.56% | Treasury |
| 16 | 22,095.96 | 12,020,201.89 | 56.66% | Treasury |
| 17 | 22,095.96 | 12,042,297.85 | 56.77% | Treasury |
| 18 | 22,095.96 | 12,064,393.81 | 56.87% | Treasury |
| 19 | 22,095.96 | 12,086,489.77 | 56.97% | Treasury |
| 20 | 22,095.96 | 12,108,585.73 | 57.08% | Treasury |
| 21 | 22,095.96 | 12,130,681.69 | 57.18% | Treasury |
| 22 | 22,095.96 | 12,152,777.65 | 57.29% | Treasury |
| 23 | 22,095.96 | 12,174,873.61 | 57.39% | Treasury |
| 24 | 22,095.96 | 12,196,969.57 | 57.49% | Treasury |
| 25 | 22,095.96 | 12,219,065.53 | 57.6% | Treasury |
| 26 | 22,095.96 | 12,241,161.49 | 57.7% | Treasury |
| 27 | 22,095.96 | 12,263,257.45 | 57.81% | Treasury |
| 28 | 22,095.96 | 12,285,353.41 | 57.91% | Treasury |
| 29 | 22,095.95 | 12,307,449.36 | 58.02% | Treasury |
| 30 | 22,095.96 | 12,329,545.32 | 58.12% | Treasury |
| 31 | 22,095.96 | 12,351,641.28 | 58.22% | Treasury |
| 32 | 22,095.96 | 12,373,737.24 | 58.33% | Treasury |
| 33 | 22,095.96 | 12,395,833.2 | 58.43% | Treasury |
| 34 | 22,095.96 | 12,417,929.16 | 58.54% | Treasury |
| 35 | 22,095.96 | 12,440,025.12 | 58.64% | Treasury |
| 36 | 22,095.96 | 12,462,121.08 | 58.74% | Treasury |
| 37 | 22,095.96 | 12,484,217.04 | 58.85% | Treasury |
| 38 | 22,095.96 | 12,506,313 | 58.95% | Treasury |
| 39 | 22,095.96 | 12,528,408.96 | 59.06% | Treasury |
| 40 | 22,095.96 | 12,550,504.92 | 59.16% | Treasury |
| 41 | 22,095.96 | 12,572,600.88 | 59.27% | Treasury |
| 42 | 22,095.96 | 12,594,696.84 | 59.37% | Treasury |
| 43 | 22,095.96 | 12,616,792.8 | 59.47% | Treasury |
| 44 | 22,095.95 | 12,638,888.75 | 59.58% | Treasury |
| 45 | 22,095.96 | 12,660,984.71 | 59.68% | Treasury |
| 46 | 22,095.96 | 12,683,080.67 | 59.79% | Treasury |
| 47 | 22,095.96 | 12,705,176.63 | 59.89% | Treasury |
| 48 | 22,095.96 | 12,727,272.59 | 59.99% | Treasury |
| 49 | 22,095.96 | 12,749,368.55 | 60.1% | Treasury |
| 50 | 22,095.96 | 12,771,464.51 | 60.2% | Treasury |
| 51 | 22,095.96 | 12,793,560.47 | 60.31% | Treasury |
| 52 | 22,095.96 | 12,815,656.43 | 60.41% | Treasury |
| 53 | 22,095.96 | 12,837,752.39 | 60.52% | Treasury |
| 54 | 22,095.96 | 12,859,848.35 | 60.62% | Treasury |
| 55 | 22,095.96 | 12,881,944.31 | 60.72% | Treasury |
| 56 | 22,095.96 | 12,904,040.27 | 60.83% | Treasury |
| 57 | 22,095.96 | 12,926,136.23 | 60.93% | Treasury |
| 58 | 22,095.95 | 12,948,232.18 | 61.04% | Treasury |
| 59 | 22,095.96 | 12,970,328.14 | 61.14% | Treasury |
| 60 | 22,095.96 | 12,992,424.1 | 61.24% | Treasury |
| 61 | 22,095.96 | 13,014,520.06 | 61.35% | Treasury |
| 62 | 22,095.96 | 13,036,616.02 | 61.45% | Treasury |
| 63 | 22,095.96 | 13,058,711.98 | 61.56% | Treasury |
| 64 | 22,095.96 | 13,080,807.94 | 61.66% | Treasury |
| 65 | 22,095.96 | 13,102,903.9 | 61.77% | Treasury |
| 66 | 22,095.96 | 13,124,999.86 | 61.87% | Treasury |
| 67 | 22,095.96 | 13,147,095.82 | 61.97% | Treasury |
| 68 | 22,095.96 | 13,169,191.78 | 62.08% | Treasury |
| 69 | 22,095.96 | 13,191,287.74 | 62.18% | Treasury |
| 70 | 22,095.96 | 13,213,383.7 | 62.29% | Treasury |
| 71 | 22,095.96 | 13,235,479.66 | 62.39% | Treasury |
| 72 | 22,095.96 | 13,257,575.62 | 62.49% | Treasury |

Note: Ecosystem and Partners are not in the table, because their amount or vesting could not be read

This report is an input to a review before the token is deployed: not financial, legal or investment advice and not a guarantee that the plan is sound.
