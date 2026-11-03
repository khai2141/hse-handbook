# Task 3 report: pure core logic (choseong, hours, fine)

Status: DONE_WITH_CONCERNS

## Implemented
- `package.json` (per controller ruling R4): `{"name":"hse-handbook","private":true,"type":"module"}`, no dependencies.
- `js/core.js`: exact code from the brief. Exports choseong, hit, parseHours, clampCount, fineTotal, alloc, pathOf. Pure ESM, no DOM, no Node-only APIs.
- `tests/core.test.mjs`: exact test code from the brief (8 tests).

## TDD evidence
RED: `node --test tests/core.test.mjs` (before js/core.js existed)
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'E:\agent skill\handbook\js\core.js' imported from E:\agent skill\handbook\tests\core.test.mjs
✖ tests\core.test.mjs  pass 0 fail 1   EXIT=1
```
GREEN: `node --test tests/core.test.mjs`
```
✔ choseong extracts initial consonants
✔ hit matches substring and choseong, never throws on special characters
✔ hit treats empty or blank query as match-all
✔ parseHours reads the first N시간
✔ clampCount keeps a sane positive integer
✔ fineTotal multiplies a clamped count
✔ alloc splits total hours across items in 5-minute steps and skips short lists
✔ pathOf lists ancestors from the first branch down
ℹ tests 8  pass 8  fail 0   EXIT=0
```

## Full run
`node --test tests` fails on Node v24.19.0 with `Cannot find module '...\tests'`. Node 24 does not accept a bare directory argument. The equivalent glob works:
`node --test "tests/*.mjs"` gives tests 8, pass 8, fail 0.
`tests/test_data_shape.py` and `tests/test_validate.py` are Python tests and are not run by node.

## Commit
- 6571ac4 feat: pure core helpers with tests (package.json, js/core.js, tests/core.test.mjs)

## Self-review
- Code matches the brief verbatim; no extra behavior added.
- Only the three task files were staged. `.superpowers/` was left untracked.

## Concerns
- Brief's verification command `node --test tests` does not work on Node 24. Future tasks should use `node --test "tests/*.mjs"`.
- Git warned LF will be replaced by CRLF on the working copy. This is a line-ending config issue and does not affect the tests.

## Fix round 1
1. Mixed 초성 in `hit`: replaced the whole-string check with a sliding character match. A query char matches a haystack char when they are equal, or when the query char is a 초성 jamo equal to that haystack char's initial. Empty/blank query still returns true, no RegExp is used, and matching is case-insensitive. Added tests: `건ㄱㅈ`, `ㄱ강ㅈㄷ` (true), `건ㄴㅈ` (false), `(` (false).
2. `clampCount`: `Infinity` now caps to 9999 (`Math.min`), `-Infinity` and NaN give 1. Added tests: `"1e999"` and `"Infinity"` give 9999, `"-Infinity"` gives 1, numeric `5` gives 5.

Command: `node --test tests/*.test.mjs`
```
ℹ tests 9
ℹ pass 9
ℹ fail 0
EXIT=0
```
