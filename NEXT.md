# Next session — start here

Working directory: `/mnt/c/Users/sanja/super-repo/vellam`

Read `README.md`, then `RESEARCH.md` and `PLAN.md`. The decisions are locked; do not re-research them.

## Setup — done 2026-11-18

`gh` is authenticated as `sanjayram21`; commits are authored `sanjayram21 <sanjayram21@users.noreply.github.com>` (rewritten before first push); `origin` is set and `main` is pushed. Repo is public at `https://github.com/sanjayram21/vellam`.

Verify first with `git log --oneline`. If the path acts empty, see below.

## The build

`PLAN.md` Phase 0 → 0b → 0c are offline data prep and can start immediately. Phase 2's drainage sink capacities come from Phase 0c's calibration, so don't reorder.

## Hazards on this machine

- **Don't rename this directory.** Renaming it broke WSL's view of the path once. If it reads empty while Windows `cmd /c dir` shows files, the mount is stale: copy out via the `Vellam` alias, remove from Windows, copy back.
- Python is 3.8 with pinned wheels only. No CUDA, no Overpass.
- **Node is installed via nvm in WSL** (needed by Vite). Never use the stale `C:\Program Files\nodejs` v16 — its shims are CRLF-broken from WSL and it's too old for Vite.
- drvfs occasionally throws a spurious ENOENT or stale file view under concurrent edits — retry the single edit before concluding a file is gone.
