# Justfile — Provenance
# `just` lists all tasks. `just bootstrap` from a cold checkout must succeed.

set shell := ["bash", "-eu", "-o", "pipefail", "-c"]
set dotenv-load := true

# default target: list tasks
default:
    @just --list

# ---------- Phase 0: bootstrap ----------

# Install everything needed to develop locally. Idempotent.
bootstrap:
    @echo "→ checking mise toolchain"
    mise install
    @echo "→ installing pnpm workspace deps"
    pnpm install --frozen-lockfile || pnpm install
    @echo "→ installing husky hooks"
    pnpm exec husky install
    @echo "→ verifying aptos CLI"
    aptos --version
    @echo "→ compiling Move package (no tests yet)"
    cd contracts && aptos move compile --skip-fetch-latest-git-deps || true
    @echo "✓ bootstrap complete. run \`just dev\` to start."

# Run web + indexer locally. Web on :3000, indexer on :42069.
dev:
    pnpm -r --parallel --filter './apps/*' dev

# ---------- testing ----------

# Run every test in the monorepo. CI's source of truth.
test: test-move test-web test-indexer test-e2e
    @echo "✓ all tests green"

test-move:
    cd contracts && aptos move test --coverage

test-web:
    pnpm --filter web test:coverage

test-indexer:
    pnpm --filter indexer test:coverage

test-e2e:
    pnpm --filter web exec playwright test

# Coverage gates — these are what CI enforces.
coverage-gate-move:
    cd contracts && aptos move coverage summary | tee /tmp/move-cov.txt
    @grep -E "^Move Coverage: 100\.00%" /tmp/move-cov.txt || (echo "Move coverage < 100%" && exit 1)

coverage-gate-web:
    pnpm --filter web coverage-gate

coverage-gate-indexer:
    pnpm --filter indexer coverage-gate

# ---------- linting / formatting ----------

lint:
    pnpm -r lint

format:
    pnpm -r format

typecheck:
    pnpm -r typecheck

# ---------- Move ----------

move-build:
    cd contracts && aptos move compile

move-publish profile="testnet":
    cd contracts && aptos move publish --profile {{profile}} --included-artifacts none --assume-yes

# ---------- infra ----------

infra-plan:
    cd infra/hetzner && terraform init && terraform plan

infra-apply:
    cd infra/hetzner && terraform apply

# ---------- submission ----------

# Phase 8: cut the submission tag and run a fresh-clone smoke test.
submission-tag version:
    git tag -a {{version}} -m "Provenance hackathon submission {{version}}"
    @echo "next: git push origin {{version}}"

submission-smoke-test:
    #!/usr/bin/env bash
    set -euo pipefail
    TMPDIR=$(mktemp -d)
    echo "→ cloning into $TMPDIR"
    git clone . "$TMPDIR/fresh"
    cd "$TMPDIR/fresh"
    just bootstrap
    just test
    echo "✓ fresh-clone smoke test green"

# ---------- maintenance ----------

clean:
    rm -rf node_modules .next dist coverage contracts/build apps/*/node_modules apps/*/.next apps/*/dist apps/*/coverage
    @echo "✓ cleaned"
