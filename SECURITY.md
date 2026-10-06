# Security

## Reporting a problem

Write to info@innerluxes.dev with the subject line "tokenomics-check security", or use private vulnerability reporting
on this repository. Please do not open a public issue for a vulnerability.

Include a small made-up plan file that shows the problem, the command you ran, what you expected and what happened. Use
made-up tokens and names, never the plan of a token that is not public yet, and never a real key, address or token, even
an old one.

## Scope

In scope:

- an input that makes the tool read a file other than the one it was given, or follow a symbolic link
- an input that makes the tool open a network connection, fetch a URL, call a chain or a node, run any other program, or
  evaluate anything it reads
- an input that makes the tool write a file
- an input that makes the tool hang, take very long, exhaust the stack or use unbounded memory, such as very large files,
  arrays and objects nested deep, very long strings, numbers with very many digits, thousands of buckets or steps, or
  months far in the future
- binary or invalid input that the tool reads as if it were JSON
- a field the tool did not read that a check reports as fine, a key written twice whose second value is taken without a
  finding, or a misspelt key that is not reported
- an amount, a supply or a percent that is counted with a rounding the plan did not make, so that a check passes or
  fails because of it
- a run that passes at a `--fail-on` level although the input holds a finding at that level that docs/method.md says is
  reported
- text from a file or a file name that rewrites the terminal through control or direction characters, is shown unescaped
  in the output, or puts markup into the markdown report
- a name such as `__proto__` that changes how objects behave inside the tool

Out of scope: the forms docs/limits.md says the tool does not see, whether the token is well designed (a clean result is
not financial, legal or investment advice and not a guarantee that the plan is sound), whether the contracts carry out
the plan, who may change the plan in your repository, and where your pipeline keeps the output.

Read [docs/threat-model.md](docs/threat-model.md) for the rest.
