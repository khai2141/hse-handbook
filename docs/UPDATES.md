# Daily law check

`py tools/check_updates.py` re-fetches the 36 watched articles from law.go.kr, hashes the article text
(version header + article body only) and compares with `data/watchlist.json`.
`py tools/check_updates.py --init` rewrites the baseline (run only after reviewing a change).

Report: `reports/YYYY-MM-DD.md` (git-ignored): table of id, changed (yes/no/ERROR), old header, new header.

Exit codes: 0 = nothing changed; 2 = at least one article changed (check the report, update the handbook,
then run `--init`); 3 = nothing changed but some articles could not be fetched.

Schedule on your own PC (not created automatically):

    schtasks /Create /SC DAILY /TN "HSE-law-check" /TR "py E:\agent skill\handbook\tools\check_updates.py" /ST 07:00

Note: the path contains a space, so if the task fails to start, quote it: `/TR "py \"E:\agent skill\handbook\tools\check_updates.py\""`.

## Upcoming amendments (시행 예정)

`py tools/compare_versions.py` fetches, for each watched article, the version in force today (`efYd` = today)
and the latest version, and writes `data/versions.json`. Run it after a law amendment is announced and
before each release (it makes about 72 requests, one per second).

Each entry: `in_force_header`, `latest_header`, `latest_effective` (시행 date of the latest version),
`differs` (true when the article text differs) and `diff_lines` (up to 6 paragraphs, prefixed `현행:` or `예정:`).
A different header with the same text means `differs: false` (only the version number changed).
An entry with `error` could not be fetched and says nothing about changes; the tool exits 3 in that case.
Cells whose `law` references an article with `differs: true` show a "시행 예정" section in their details.
