#!/usr/bin/env node
import { SourceMapConsumer } from 'source-map-js';

const mapUrl = process.argv[2] || 'https://yourees.xyz/assets/index-QkmlY-4g.js.map';

const positions = [
  { line: 439, column: 10963 },
  { line: 439, column: 12886 },
  { line: 40, column: 22400 },
  { line: 40, column: 24105 },
  { line: 40, column: 41659 },
  { line: 40, column: 41207 },
  { line: 40, column: 40256 },
  { line: 40, column: 36866 },
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
