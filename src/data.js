// The public pages the checks rest on, and the points of each page that the reports show, written in this project's own
// words. A page is named by its address; a copy of its text, read before it was listed, is kept under research/sources.
// research/sources.md lists every page with a note, docs/rules-and-sources.md lists every rule with its points, and
// test/data.test.js checks the three against each other.

export const LEVELS = ['info', 'warning', 'error'];

export const NOTICE = 'This report is an input to a review before the token is deployed: not financial, legal or investment advice and not a guarantee that the plan is sound.';

const OZ = 'https://docs.openzeppelin.com/contracts/5.x';

export const SOURCES = [
  { id: 'eip-20', title: 'ERC-20: Token Standard', url: 'https://eips.ethereum.org/EIPS/eip-20', file: 'research/sources/eip-20-token-standard.txt' },
  { id: 'oz-erc20', title: 'ERC-20 (OpenZeppelin Contracts documentation)', url: `${OZ}/erc20`, file: 'research/sources/oz-erc20.txt' },
  { id: 'oz-erc20-api', title: 'ERC-20 API reference (OpenZeppelin Contracts documentation)', url: `${OZ}/api/token/erc20`, file: 'research/sources/oz-api-erc20.txt' },
  { id: 'oz-finance', title: 'Finance API reference, VestingWallet and VestingWalletCliff (OpenZeppelin Contracts documentation)', url: `${OZ}/api/finance`, file: 'research/sources/oz-api-finance-vesting-wallet.txt' },
  { id: 'solana-tokens', title: 'Assets on Solana: mint accounts and token accounts (Solana documentation)', url: 'https://solana.com/docs/tokens', file: 'research/sources/solana-tokens.txt' },
  { id: 'spl-token', title: 'Token program (Solana Program Library documentation)', url: 'https://www.solana-program.com/docs/token', file: 'research/sources/spl-token-program.txt' }
];

// Points: id -> { source, text }.
export const POINTS = {
  'eip20-decimals': { source: 'eip-20', text: 'ERC-20 lets a token report its decimals as a uint8, and a wallet divides the stored whole-number amount by ten to that power to show it; the function is optional.' },
  'eip20-total-supply': { source: 'eip-20', text: 'ERC-20 reports the total supply, every balance and every transfer value as a uint256, an unsigned whole number in the smallest unit of the token.' },
  'oz-integers': { source: 'oz-erc20', text: 'The EVM works with whole numbers only, so a contract keeps every amount as a count of the smallest unit, and decimals changes nothing but how a wallet shows it.' },
  'oz-eighteen': { source: 'oz-erc20', text: 'The OpenZeppelin guide advises 18 decimals, the value of Ether and of most ERC-20 tokens, unless there is a special reason for another, and its ERC20 contract returns 18 by default.' },
  'oz-capped': { source: 'oz-erc20-api', text: 'ERC20Capped fixes a cap on the total supply once, in its constructor, and a mint that would take the supply over the cap fails with the error ERC20ExceededCap.' },
  'oz-vesting-linear': { source: 'oz-finance', text: 'VestingWallet hands tokens to a beneficiary on a schedule set by a start time and a duration, along a linear curve by default; a duration of zero turns it into a timelock that opens at the start.' },
  'oz-vesting-cliff': { source: 'oz-finance', text: 'VestingWalletCliff adds a cliff that begins with the schedule: until the cliff has passed nothing is vested, and after it the amount is what the inherited linear schedule gives.' },
  'oz-cliff-limit': { source: 'oz-finance', text: 'VestingWalletCliff refuses a cliff longer than the duration of the schedule with the error InvalidCliffDuration.' },
  'sol-mint-fields': { source: 'solana-tokens', text: 'A Solana mint account keeps the supply as a u64 and the decimals as a u8, with an optional mint authority; a mint without one has a fixed supply.' },
  'spl-authority-none': { source: 'spl-token', text: 'As long as a mint holds a mint authority, that authority may mint more at any time; SetAuthority can set it to None, and from then on the supply can never grow.' }
};

export const source = (id) => SOURCES.find((s) => s.id === id);
export const pointPage = (id) => source(POINTS[id].source);
