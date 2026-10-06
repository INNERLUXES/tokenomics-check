# Secure defaults

The default run is the safe run. Nothing in the first section needs a flag, and none of it can be switched off. The rest
of the document is about what the tool cannot do for you: which file you give it, where the output goes, and who may
change the plan it reads. A clean result is not financial, legal or investment advice and not a guarantee that the plan
is sound; it is a file with none of the problems the checks look for, not a finding that the token is well designed.

## How the tool behaves by default

- **Reads, never runs.** The tool reads the one plan file it is given. It follows no symbolic link, fetches no URL,
  refuses an argument that looks like an address, calls no chain or node, evaluates nothing and writes nothing to disk.
- **Every check on from the first run.** Buckets that miss the supply, an amount the decimals cannot hold, a supply past
  what the chain keeps, a total over the cap, a maximum that nothing enforces, a cliff past its VestingWallet duration and
  a schedule that releases more or less than its bucket are errors; insider buckets released at launch, before the
  minimum cliff or too soon, a month that releases a large share of the circulating supply and trading with nothing to
  trade are warnings; a percent that rounds and a release past the maximum months are notes. There is no configuration
  file that could set a check off.
- **Fail closed on what it cannot read.** A file that is not JSON, or not an object, is an error finding that fails the
  run at the default `--fail-on` of `error`. A missing field, a value of the wrong type and a percent out of range are
  findings of their own, so a part of the plan that was not read is never taken for one that is fine; a bucket left out
  of the table is named in a note. A misspelt key is a warning that names the key it is probably meant to be. A file that
  is not text, is too large or is a link stops the run with exit code `2` and no report.
- **Exact numbers.** Amounts, supplies and percents are read from the characters of the file and counted in base units
  with integers of any size; no floating point number decides a result.
- **Unknown arguments are errors.** An option the tool does not know, a value that looks like an option, an option given
  twice and a threshold out of range stop the run, so a typo such as `--fail-no` or `--min-vestng` cannot leave a default
  in place.
- **No pattern from the input.** No regular expression is built from a file or from an argument.
- **Bounded work.** The reader has limits of size, nesting, values and string length, and works with a stack of its own;
  a plan has at most 1,000 buckets, a schedule 2,400 steps, a month 1,200 and a number 100 digits (docs/limits.md), so
  a large or deep file cannot exhaust the stack, the memory or the time.
- **No prototype tricks.** Keys from a file are kept in lists and compared with the names the tool reads, never set as
  properties of an object, so `__proto__` is only a name.
- **Clean output.** Text from the input, file names, token names, symbols and bucket names included, has control
  characters, line separators and direction controls replaced and its length capped before it reaches a report or an
  error message; the markdown report also escapes what markdown gives a meaning to.
- **The same input gives the same output.** No clock, no zone, no locale and no random number
  ([decision 1](decisions/0001-read-no-clock-and-keep-dates-out-of-the-repository.md)).
- **No dependencies.** Node 22 or newer and nothing else.

## Settings that make the check stricter

- **`--fail-on warning`.** Insider buckets at launch or without a cliff, short vesting, large monthly releases, trading
  with nothing to trade and misspelt keys fail the run too. Use it once the plan is meant to be final.
- **`--fail-on info`.** Percents that round and long releases fail the run too; use it where every such choice must be
  looked at by a person, and record the decision in the pull request.
- **`--min-cliff`, `--min-vesting`, `--cliff-share`.** Set them to the policy of the project, such as a cliff of 12 months
  for the team (`--min-cliff 13` makes any release before month 13 a finding), insiders released over 36 months
  (`--min-vesting 36`) and no month above 10 percent of the circulating supply (`--cliff-share 10`). The JSON report
  shows the values used, so the policy can be read from the output.
- **`--max-vesting`.** Lower it when every bucket should be released within a set time.

## Running it in a pipeline

```yaml
permissions:
  contents: read
steps:
  - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
  - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
    with:
      node-version: 22
  - name: Tokenomics check
    run: npx --yes github:INNERLUXES/tokenomics-check token/plan.json --format markdown >> "$GITHUB_STEP_SUMMARY"
```

- Give the job read access to the contents and nothing more. The tool needs no secret, no node address and no key;
  never give it one.
- Pin every action to a full commit, as above, and pin the tool to a release commit or a tag you have read, because
  `npx` runs what it downloads.
- Keep one plan file as the source of the numbers that the contracts, the documents and the announcements use, and check
  it on every change. A plan copied by hand into another document can drift from the one that was checked.
- Do not hide the exit code with a trailing `|| true`. To keep the report without failing, keep `--fail-on` at `error`
  and keep the SARIF or JSON report as an artifact of the job, or upload the SARIF to code scanning.
- Treat a report built from a file you do not trust as untrusted data.
- Run the other checks of your stack as well. This check is a first list for the review, and the review of the plan and
  of the contracts by people comes after it.

## Protecting the plan

The plan decides who holds what and when it can be sold. Keep it in the repository next to the contracts that carry it
out, put its path in `CODEOWNERS` with the people who approve the token economics, and require their review in branch
protection. Review a change to the plan like a change to the contracts: a bucket moved between two lines, or a cliff
shortened by a month, changes what people were promised.

## SSDF

The repository is checked against NIST SP 800-218 (SSDF) in its own pipeline and before every release, with
`ssdf-repo-check` pinned to its release commit. The evidence it looks for is in these files:

| Practice | Evidence in this repository |
| --- | --- |
| PO.1 Define security requirements | CONTRIBUTING.md, docs/secure-defaults.md |
| PO.2 Roles and responsibilities | .github/CODEOWNERS |
| PO.3 Toolchain | .github/workflows/ci.yml, codeql.yml, release.yml |
| PO.4 Criteria for security checks | CodeQL with the security-extended queries, the SSDF gate in ci.yml and release.yml |
| PO.5 Secure environments | a `permissions:` block in every workflow, actions pinned to commits |
| PS.1 Protect the code | .gitignore for keys and `.env`, `npm run check` for committed secrets |
| PS.2 Integrity of releases | SHA-256 checksums and a build provenance attestation in release.yml |
| PS.3 Archive and provenance | a CycloneDX SBOM and the CHANGELOG with every release |
| PW.1 Design for security | docs/threat-model.md |
| PW.2 Review the design | docs/decisions |
| PW.4 Reuse secure components | no runtime dependencies, a lock file, Dependabot |
| PW.5 Secure coding | CONTRIBUTING.md, `npm run check` |
| PW.6 Build settings | `npm ci` from the lock file |
| PW.7 Code review | the pull request template and CODEOWNERS |
| PW.8 Testing | `npm test` on Linux, Windows and macOS with Node 22 and 24, `npm run test:coverage`, hostile input tests |
| PW.9 Secure defaults | this document |
| RV.1 Find vulnerabilities | SECURITY.md, Dependabot |
| RV.2 Respond to vulnerabilities | SECURITY.md |
