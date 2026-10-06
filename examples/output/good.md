# tokenomics-check: examples/good/plan.json

- File: 62 lines, 1,490 bytes
- Token: Orbit Example \(ORBX\), 18 decimals, evm; max supply 1,000,000,000, total supply 1,000,000,000; not mintable, burnable, trading at launch
- Buckets: 8 buckets holding 1,000,000,000 ORBX \(100% of the maxSupply\); 138,000,000 ORBX \(13.8%\) in circulation at launch; last release at month 72
- Findings: 1 \(1 info\)
- Result: **PASS - no finding at or above error \(1 info\)**

## Findings

| Level | Check | Where | Message |
| --- | --- | --- | --- |
| info | vesting-too-long | examples/good/plan.json:47 | The bucket Ecosystem fund still releases at month 72, after month 60 \(--max-vesting\). This is a best practice of this tool, not a rule in EIP-20, the OpenZeppelin Contracts documentation or the Solana documentation. Fix: Confirm that the bucket is meant to release for that long, or set --max-vesting to the policy of the project. |

## Release table \(months 0 to 72; supply 1,000,000,000 ORBX\)

| Month | Released | Circulating | Of supply | From |
| ---: | ---: | ---: | ---: | --- |
| 0 | 138,000,000 | 138,000,000 | 13.8% | Liquidity, Public sale, Community rewards and 1 more |
| 1 | 23,458,333.33 | 161,458,333.33 | 16.14% | Public sale, Community rewards and Treasury |
| 2 | 23,458,333.33 | 184,916,666.66 | 18.49% | Public sale, Community rewards and Treasury |
| 3 | 23,458,333.33 | 208,375,000 | 20.83% | Public sale, Community rewards and Treasury |
| 4 | 23,458,333.33 | 231,833,333.33 | 23.18% | Public sale, Community rewards and Treasury |
| 5 | 23,458,333.33 | 255,291,666.66 | 25.52% | Public sale, Community rewards and Treasury |
| 6 | 23,458,333.33 | 278,750,000 | 27.87% | Public sale, Community rewards and Treasury |
| 7 | 16,943,181.81 | 295,693,181.81 | 29.56% | Seed and private investors, Community rewards, Treasury and 1 more |
| 8 | 16,943,181.81 | 312,636,363.63 | 31.26% | Seed and private investors, Community rewards, Treasury and 1 more |
| 9 | 16,943,181.81 | 329,579,545.45 | 32.95% | Seed and private investors, Community rewards, Treasury and 1 more |
| 10 | 16,943,181.81 | 346,522,727.27 | 34.65% | Seed and private investors, Community rewards, Treasury and 1 more |
| 11 | 16,943,181.81 | 363,465,909.09 | 36.34% | Seed and private investors, Community rewards, Treasury and 1 more |
| 12 | 31,943,181.81 | 395,409,090.9 | 39.54% | Advisors, Seed and private investors, Community rewards and 2 more |
| 13 | 22,359,848.48 | 417,768,939.39 | 41.77% | Seed and private investors, Community rewards, Team and 3 more |
| 14 | 22,359,848.48 | 440,128,787.87 | 44.01% | Seed and private investors, Community rewards, Team and 3 more |
| 15 | 22,359,848.48 | 462,488,636.36 | 46.24% | Seed and private investors, Community rewards, Team and 3 more |
| 16 | 22,359,848.48 | 484,848,484.84 | 48.48% | Seed and private investors, Community rewards, Team and 3 more |
| 17 | 22,359,848.48 | 507,208,333.33 | 50.72% | Seed and private investors, Community rewards, Team and 3 more |
| 18 | 22,359,848.48 | 529,568,181.81 | 52.95% | Seed and private investors, Community rewards, Team and 3 more |
| 19 | 22,359,848.48 | 551,928,030.3 | 55.19% | Seed and private investors, Community rewards, Team and 3 more |
| 20 | 22,359,848.48 | 574,287,878.78 | 57.42% | Seed and private investors, Community rewards, Team and 3 more |
| 21 | 22,359,848.48 | 596,647,727.27 | 59.66% | Seed and private investors, Community rewards, Team and 3 more |
| 22 | 22,359,848.48 | 619,007,575.75 | 61.9% | Seed and private investors, Community rewards, Team and 3 more |
| 23 | 22,359,848.48 | 641,367,424.24 | 64.13% | Seed and private investors, Community rewards, Team and 3 more |
| 24 | 22,359,848.48 | 663,727,272.72 | 66.37% | Seed and private investors, Community rewards, Team and 3 more |
| 25 | 14,443,181.81 | 678,170,454.54 | 67.81% | Community rewards, Team, Treasury and 1 more |
| 26 | 14,443,181.81 | 692,613,636.36 | 69.26% | Community rewards, Team, Treasury and 1 more |
| 27 | 14,443,181.81 | 707,056,818.18 | 70.7% | Community rewards, Team, Treasury and 1 more |
| 28 | 14,443,181.81 | 721,499,999.99 | 72.14% | Community rewards, Team, Treasury and 1 more |
| 29 | 14,443,181.81 | 735,943,181.81 | 73.59% | Community rewards, Team, Treasury and 1 more |
| 30 | 14,443,181.81 | 750,386,363.63 | 75.03% | Community rewards, Team, Treasury and 1 more |
| 31 | 14,443,181.81 | 764,829,545.45 | 76.48% | Community rewards, Team, Treasury and 1 more |
| 32 | 14,443,181.81 | 779,272,727.27 | 77.92% | Community rewards, Team, Treasury and 1 more |
| 33 | 14,443,181.81 | 793,715,909.09 | 79.37% | Community rewards, Team, Treasury and 1 more |
| 34 | 14,443,181.81 | 808,159,090.9 | 80.81% | Community rewards, Team, Treasury and 1 more |
| 35 | 14,443,181.81 | 822,602,272.72 | 82.26% | Community rewards, Team, Treasury and 1 more |
| 36 | 14,443,181.81 | 837,045,454.54 | 83.7% | Community rewards, Team, Treasury and 1 more |
| 37 | 9,943,181.81 | 846,988,636.36 | 84.69% | Team, Treasury and Ecosystem fund |
| 38 | 9,943,181.81 | 856,931,818.18 | 85.69% | Team, Treasury and Ecosystem fund |
| 39 | 9,943,181.81 | 866,875,000 | 86.68% | Team, Treasury and Ecosystem fund |
| 40 | 9,943,181.81 | 876,818,181.81 | 87.68% | Team, Treasury and Ecosystem fund |
| 41 | 9,943,181.81 | 886,761,363.63 | 88.67% | Team, Treasury and Ecosystem fund |
| 42 | 9,943,181.81 | 896,704,545.45 | 89.67% | Team, Treasury and Ecosystem fund |
| 43 | 9,943,181.81 | 906,647,727.27 | 90.66% | Team, Treasury and Ecosystem fund |
| 44 | 9,943,181.81 | 916,590,909.09 | 91.65% | Team, Treasury and Ecosystem fund |
| 45 | 9,943,181.81 | 926,534,090.9 | 92.65% | Team, Treasury and Ecosystem fund |
| 46 | 9,943,181.81 | 936,477,272.72 | 93.64% | Team, Treasury and Ecosystem fund |
| 47 | 9,943,181.81 | 946,420,454.54 | 94.64% | Team, Treasury and Ecosystem fund |
| 48 | 9,943,181.81 | 956,363,636.36 | 95.63% | Team, Treasury and Ecosystem fund |
| 49 | 1,818,181.81 | 958,181,818.18 | 95.81% | Ecosystem fund |
| 50 | 1,818,181.81 | 960,000,000 | 96% | Ecosystem fund |
| 51 | 1,818,181.81 | 961,818,181.81 | 96.18% | Ecosystem fund |
| 52 | 1,818,181.81 | 963,636,363.63 | 96.36% | Ecosystem fund |
| 53 | 1,818,181.81 | 965,454,545.45 | 96.54% | Ecosystem fund |
| 54 | 1,818,181.81 | 967,272,727.27 | 96.72% | Ecosystem fund |
| 55 | 1,818,181.81 | 969,090,909.09 | 96.9% | Ecosystem fund |
| 56 | 1,818,181.81 | 970,909,090.9 | 97.09% | Ecosystem fund |
| 57 | 1,818,181.81 | 972,727,272.72 | 97.27% | Ecosystem fund |
| 58 | 1,818,181.81 | 974,545,454.54 | 97.45% | Ecosystem fund |
| 59 | 1,818,181.81 | 976,363,636.36 | 97.63% | Ecosystem fund |
| 60 | 1,818,181.81 | 978,181,818.18 | 97.81% | Ecosystem fund |
| 61 | 1,818,181.81 | 980,000,000 | 98% | Ecosystem fund |
| 62 | 1,818,181.81 | 981,818,181.81 | 98.18% | Ecosystem fund |
| 63 | 1,818,181.81 | 983,636,363.63 | 98.36% | Ecosystem fund |
| 64 | 1,818,181.81 | 985,454,545.45 | 98.54% | Ecosystem fund |
| 65 | 1,818,181.81 | 987,272,727.27 | 98.72% | Ecosystem fund |
| 66 | 1,818,181.81 | 989,090,909.09 | 98.9% | Ecosystem fund |
| 67 | 1,818,181.81 | 990,909,090.9 | 99.09% | Ecosystem fund |
| 68 | 1,818,181.81 | 992,727,272.72 | 99.27% | Ecosystem fund |
| 69 | 1,818,181.81 | 994,545,454.54 | 99.45% | Ecosystem fund |
| 70 | 1,818,181.81 | 996,363,636.36 | 99.63% | Ecosystem fund |
| 71 | 1,818,181.81 | 998,181,818.18 | 99.81% | Ecosystem fund |
| 72 | 1,818,181.81 | 1,000,000,000 | 100% | Ecosystem fund |

This report is an input to a review before the token is deployed: not financial, legal or investment advice and not a guarantee that the plan is sound.
