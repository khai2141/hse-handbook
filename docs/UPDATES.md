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
