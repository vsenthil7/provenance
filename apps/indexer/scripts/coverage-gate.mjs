#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const summaryPath = path.resolve('./coverage/coverage-summary.json');
if (!fs.existsSync(summaryPath)) {
  console.error(`coverage-gate: ${summaryPath} not found.`);
  process.exit(2);
}
const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
const total = summary.total;
const metrics = ['lines', 'branches', 'functions', 'statements'];
let red = false;
for (const m of metrics) {
  const pct = total[m]?.pct ?? 0;
  console.log(`  ${pct >= 100 ? '✓' : '✗'} ${m.padEnd(11)} ${pct.toFixed(2)}%`);
  if (pct < 100) red = true;
}
if (red) {
  console.error('\ncoverage-gate: ✗ FAIL');
  process.exit(1);
}
console.log('\ncoverage-gate: ✓ PASS');
