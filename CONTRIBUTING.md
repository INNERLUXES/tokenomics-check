# Contributing

Every change goes through a pull request and is reviewed before it is merged. The pipeline runs the tests on Linux,
Windows and macOS with Node 22 and 24, the tests with coverage, the repository checks, CodeQL, and a secure
development check of the repository itself.

Commit messages in this repository follow Conventional Commits: `feat:`, `fix:`, `docs:`, `test:`, `ci:`, `chore:`,
with `!` for a breaking change.

This tool reads a token plan and runs nothing; its result is an input to a review before the token is deployed: not
financial, legal or investment advice and not a guarantee that the plan is sound. A change must keep it that way: a
check reports what the file holds, and the tool never fetches, runs, deploys or evaluates what it reads.

## Changing a check

1. Describe the change in docs/method.md first: what the check looks at and what it can and cannot see, and add what it
   cannot see to docs/limits.md. Where the tool makes its own choice, say so in `own` in src/rules.js and in the
   message, and say why; a check is `documented` only when EIP-20, a page of the OpenZeppelin Contracts documentation or
   a page of the Solana documentation says the rule.
2. Keep the checks to what is written. A finding must point at something a reader can check in the file: a line and a
   column. Never add a check that needs the network, a chain, the contracts or the clock.
3. A check says what to change, in `fix` in src/rules.js, and names the points of the public pages it rests on in
   `basis`; a new page goes into src/data.js and research/sources.md, is saved as text under research/sources, and
   docs/rules-and-sources.md lists it. Fetch and read a page before it is listed, and never write a rule you could not
   read in the documentation as if it were one.
4. A run must never pass because something could not be read: a file that is not JSON is an error finding, and a field
   that is missing, unknown or of the wrong type is a finding that names it.
5. Add a test with the plan written inline (`plan()`, `bucket()`, `BUCKETS`, `planText()`, `findingsOf()`, `idsOf()`,
   `ofCheck()`, `run()` and `cli()` in test/helpers.js), small enough to work out by hand, with a near miss on each side:
   the plan that is reported and the plan next to it that is not.
6. A check id, once released, keeps its meaning: pipelines and other tools read it from the JSON, SARIF and markdown
   output.

## Changing the reader or the amounts

1. The JSON reader (src/json.js) keeps its limits (`JSON_LIMITS`) and works with a stack of its own; it has no
   recursion. The plan reader (src/plan.js) keeps its limits (`PLAN_LIMITS`) and src/amounts.js keeps `AMOUNT_LIMITS`.
2. Amounts, supplies and percents are counted with BigInt from the characters of the file. Never read one through
   `Number` or `parseFloat`; only months and decimals, which are small whole numbers checked first, are turned into
   numbers.
3. A field that is read is listed in docs/inputs.md; a part the plan does not give is a finding, so that it never goes
   by unnoticed.
4. No pattern is built from a file or an argument. A test fails when `new RegExp` appears in src outside src/text.js.
5. A time check in a test widens under coverage: read `process.env.NODE_V8_COVERAGE`, which the test runner sets only
   when coverage is on, and allow four times the time (`allowed()` in test/helpers.js). Run `npm run test:coverage`
   before you open the pull request.
6. A file written with LF, CRLF or CR line ends, as UTF-8 with or without a byte order mark or as UTF-16 with one, must
   give the same findings.

## Changing a source

1. Every point the reports show is in src/data.js, written in this project's own words, with the page it comes from. A
   short phrase of a page may be named; a long quotation may not.
2. research/sources.md lists every page with a note on what it says, research/sources holds a text copy of each page, and
   docs/rules-and-sources.md lists every check with its points and what to change. A test checks them against each
   other. Leave out a web address that holds a number that reads like a year, and never write a publication date or the
   year of an edition.

## The examples

The plans under `examples/` are made-up input for the tool: a plan that holds a finding of nearly every check and a plan
that passes at error and warning level, with made-up tokens, buckets and names. A change to them goes with the real
output that `npm run example` writes to `examples/output`.

## Tests that depend on the system

A test that depends on the operating system (a symbolic link, a device) is guarded with `process.platform` and says why
in its `skip`. A test never asserts a line number written by hand: a line is worked out with `lineOf()` of
test/helpers.js or from the text itself. Every other test builds its paths with `resolve()` from names with forward
slashes, and a test never writes a backslash into a file name.

A test never reads the clock, the time zone of the machine or the locale.

## Rules for the code

- No runtime dependencies and no development dependencies. Node 22 or newer and nothing else; the tests use `node:test`.
- The tool reads the file it is given and writes only to standard output and standard error. It opens no network
  connection, runs no program and evaluates nothing it reads.
- Text from the input, file names, token names, symbols and bucket names included, goes through `safeText` before it
  reaches the output or an error message.
- Source files stay ASCII; write any other character as a Unicode escape, or build it from its code point.
- No file carries a date, and no file holds a number that reads like a year. Version numbers (Node 22, 1.0.0), amounts
  and the number of a standard after EIP or ERC (ERC-20) are fine (decision 1).
- Examples and tests use made-up tokens, people and names.
- Plain words in the documents: `npm run check` fails on a short list of words that say little.

## Before you open the pull request

```
npm test
npm run test:coverage
npm run check
npm run example
```
