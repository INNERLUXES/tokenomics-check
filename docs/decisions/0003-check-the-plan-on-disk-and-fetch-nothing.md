# 3. Check the plan on disk, and fetch nothing

## Status

Accepted

## Context

Some facts about a token live elsewhere: the contract once it is deployed, the balances of the vesting contracts, the
price and the depth of the market, the pages of the documentation. A check could call a node for the total supply, read
the vesting contracts on a chain, ask an exchange for the market, or download the documentation. Each would need the
network and often a key, would make the result depend on the state of a chain or a server, and would let a file in a pull
request make the pipeline reach an address it names.

What a team needs first, before the token is deployed, is a list of what is wrong in the plan and where: the buckets,
the supply, the decimals and the months, as the plan writes them.

## Decision

1. The tool reads the one file it is given, and nothing else. It fetches nothing, calls no node or chain, needs no key,
   runs no program and calls no service.
2. The rules the checks apply (the sum of the buckets, the release forms, the thresholds) are the tool's own and are
   listed in docs/method.md, and the public pages each documented check rests on are named in src/data.js and
   research/sources.md, each fetched and read before it was listed, with a copy of its text under research/sources; the
   tool never looks them up while it runs.
3. The tool lists what to look at and what to change; it changes nothing.

## Consequences

- The result depends only on the file, and a run needs no network access, no secret and no node.
- Whether the contracts carry out the plan is for the team to make sure; docs/secure-defaults.md says to keep one plan
  file as the source of the numbers.
- When the documentation changes a rule the documented checks apply, the checks are updated in a release, with a test.
