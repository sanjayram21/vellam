# Next session — start here

Working directory: `/mnt/c/Users/sanja/super-repo/vellam`

Read `README.md`, then `RESEARCH.md` and `PLAN.md`. The decisions are locked; do not re-research them.

## Blocked on the user

1. `gh auth login` — gh 2.105.0 is installed at `~/.local/bin/gh`, **not authenticated**. Interactive; the user runs it.
2. Then: `git remote add origin https://github.com/sanjayram21/vellam.git && git push -u origin main` — push to `main` directly, repo is public.
3. Commit author is the placeholder `sanjay <sanjay@users.noreply.github.com>` — ask whether to amend before or after the push.

Verify first with `git log --oneline`. If the path acts empty, see below.

## Then: the build

`PLAN.md` Phase 0 → 0b → 0c are offline data prep and can start immediately. Phase 2's drainage sink capacities come from Phase 0c's calibration, so don't reorder.

## Hazards on this machine

- **Don't rename this directory.** Renaming it broke WSL's view of the path once. If it reads empty while Windows `cmd /c dir` shows files, the mount is stale: copy out via the `Vellam` alias, remove from Windows, copy back.
- Python is 3.8 with pinned wheels only. No Node, no CUDA, no Overpass. No CORS server: serve with `python3 -m http.server`.
