#!/usr/bin/env node
import { SourceMapConsumer } from 'source-map-js';

const mapUrl = 'https://yourees.xyz/assets/index-BDKy7FV6.js.map';

const positions = [
  { line: 369, column: 22636 }, // original reported
  { line: 385, column: 1138 },
  { line: 38, column: 16999 },
  { line: 40, column: 44032 },
  { line: 40, column: 39768 },
  { line: 40, column: 39696 },
  { line: 40, column: 39549 },
  { line: 40, column: 35916 },
  { line: 40, column: 36719 },
  { line: 38, column: 3275 },
  { line: 40, column: 34248 }
];

async function run() {
  console.log('Fetching sourcemap:', mapUrl);
  const res = await fetch(mapUrl);
  if (!res.ok) {
    console.error('Failed to fetch sourcemap:', res.status, res.statusText);
    process.exit(2);
  }
  const map = await res.json();

  // SourceMapConsumer.with may not be available in the bundled version; use the constructor
  const consumer = await new SourceMapConsumer(map);
  try {
    console.log('\nMapping positions:');
    for (const p of positions) {
      const orig = consumer.originalPositionFor({ line: p.line, column: p.column });
      console.log(`${p.line}:${p.column} -> ${orig.source || '<null>'}:${orig.line || '-'}:${orig.column || '-'} name=${orig.name || '<none>'}`);
    }
  } finally {
    if (typeof consumer.destroy === 'function') consumer.destroy();
  }
}

run().catch(err => {
  console.error('Error mapping positions:', err);
  process.exit(1);
});
