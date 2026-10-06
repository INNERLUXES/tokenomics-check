# 1. Read no clock, and keep dates out of the repository

## Status

Accepted

## Context

A tokenomics check tempts a tool to look at the calendar: the date of the launch, how many days are left until a cliff
ends, which month of the year a large release falls in. Each of these would make the same plan give a different result
on a different day, so a pipeline that passed yesterday could fail today with no change to the repository, and two
people reading the same commit could see two reports. The output could never be saved and compared.

The checks do not need a date. Whether the buckets add up, whether a team bucket waits behind a cliff, whether one month
releases a quarter of the circulating supply can all be read from the plan in months from launch. The public pages the
checks rest on are named by addresses that hold no year: the ERC page, the OpenZeppelin Contracts documentation of the
5.x line and the Solana documentation.

## Decision

1. The tool reads no clock, no time zone and no locale. It never prints the current time, counts every schedule in
   months from launch (month 0) and never says when a page, a release or a version was published. The same file gives
   the same output on every machine and on every day.
2. No document, example or test of this repository holds a date or a number that reads like a year: not the licence, not
   the changelog, not the documents, not the comments of the code, not the examples. `npm run check` and a test fail on
   any word of four digits that starts with 19 or 20. The saved copies of the public pages under research/sources are
   the pages' own words and are the one place the check does not read for prose; the date line of the ERC page and the
   number in the name of a Solana program that reads like a year were left out of the copies, so the test that reads
   every file for a year passes over them too.
3. A version, an amount or the number of a standard is not a year and is not caught: 1.0.0, Node 22, an amount such as
   21,212,121 and ERC-20, where the number follows EIP or ERC, hold no year. A test of test/repo.test.js runs the pattern
   over such values and checks that none of them is caught, and that a year in the same place still is.
4. The sources are chosen with addresses that hold no year, and the notes on them name no publication date.

## Consequences

- The output of a run can be saved in the repository (`examples/output`) and compared on every change, because it does
  not move with the calendar.
- The report holds no date and no deadline; a team maps month 0 to its launch date in its own plan.
- The examples use supplies, amounts and months that do not read like a year, and a check catches one that does.
