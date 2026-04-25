#!/usr/bin/env node
// Coverage gate — fails the build if any threshold is below 100%.
// vitest already enforces this via thresholds, but we re-check from the
// generated summary so the gate is explicit and grep-friendly in CI logs.

import fs from 'node:fs';
import path from 'node:path';

const summaryPath = path.resolve('./coverage/coverage-summary.json');

if (!fs.existsSync(summaryPath)) {
  console.error(`coverage-gate: ${summaryPath} not found. Did test:coverage run?`);
  process.exit(2);
}

const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
const total = summary.total;

const metrics = ['lines', 'branches', 'functions', 'statements'];
let red = false;
for (const m of metrics) {
  const pct = total[m]?.pct ?? 0;
  const status = pct >= 100 ? '✓' : '✗';
  console.log(`  ${status} ${m.padEnd(11)} ${pct.toFixed(2)}%`);
  if (pct < 100) red = true;
}

if (red) {
  console.error('\ncoverage-gate: ✗ FAIL — one or more thresholds below 100%');
  process.exit(1);
}
console.log('\ncoverage-gate: ✓ PASS — every metric at 100%');
