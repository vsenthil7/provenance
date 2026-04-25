# SETUP-WINDOWS.md

Provenance is built on a Linux/macOS toolchain. On Windows, use **WSL2 with
Ubuntu 24.04** — the Justfile, mise, and aptos CLI assume a POSIX shell. Don't
try to run any of this in PowerShell or cmd.

---

## One-time setup

1. Install WSL2:

   ```powershell
   wsl --install -d Ubuntu-24.04
   ```

2. Reboot when prompted, then open the Ubuntu terminal that appears in your
   Start menu.

3. Inside Ubuntu, install build essentials:

   ```sh
   sudo apt update
   sudo apt install -y build-essential curl git unzip pkg-config libssl-dev
   ```

4. Install mise (toolchain manager):

   ```sh
   curl https://mise.run | sh
   echo 'eval "$(~/.local/bin/mise activate bash)"' >> ~/.bashrc
   exec bash
   ```

5. Clone and bootstrap:

   ```sh
   cd ~
   git clone https://github.com/REPLACE/provenance
   cd provenance
   mise install        # provisions Node 20, pnpm 9, just, aptos CLI
   just bootstrap
   ```

6. Open the project in VS Code via the WSL extension (recommended). From a
   Windows VS Code, press `Ctrl+Shift+P` → "WSL: Open Folder in WSL…" and
   point at `\\wsl$\Ubuntu-24.04\home\<you>\provenance`.

---

## Things that bite Windows users specifically

### Line endings

This repo uses LF (configured in `.gitattributes`-equivalent prettier
settings). If you see weird "no changes detected" diffs after editing in a
Windows tool, set git to enforce LF:

```sh
git config --global core.autocrlf input
```

### File watcher limits

Next.js + Vitest open a lot of file watchers. If you hit ENOSPC errors:

```sh
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### Docker (for local Postgres)

If you want to run the indexer's Postgres locally instead of pointing at
Neon, install Docker Desktop on Windows, enable the WSL2 backend, and verify:

```sh
docker run hello-world
```

You only need this if you want to run the indexer fully locally; the default
dev path uses a hosted Neon branch.

### Performance

Keep the project on the WSL filesystem (`~/provenance`), not on
`/mnt/c/...`. The Windows-WSL filesystem boundary is slow enough that
`pnpm install` takes 4× longer if the project is on `C:`. This is well-
documented; do not work around it.

---

## What if I really, really don't want WSL?

The Move toolchain (`aptos` CLI) does ship a Windows binary, and Node is
fine on Windows, but the Justfile uses bash-isms (`set -euo pipefail`, etc.)
that won't run in PowerShell. You'd need to translate the Justfile into a
PowerShell script and maintain that translation as the build evolves. We
don't support that mode. Use WSL.

---

## Smoke test

After bootstrap, the success criterion is:

```sh
just bootstrap   # second run — must be a no-op idempotent pass
just test        # all gates green
```

If either fails, that is a bug in the build, not in your environment.
File an issue.
