const fs = require('fs');
const path = require('path');

const target = path.join(
  process.cwd(),
  'node_modules',
  'next',
  'dist',
  'compiled',
  'browserslist',
  'index.js'
);

if (!fs.existsSync(target)) {
  process.exit(0);
}

const source = fs.readFileSync(target, 'utf8');
const warningNeedle = '[baseline-browser-mapping] The data in this module is over two months old.';

if (!source.includes(warningNeedle)) {
  process.exit(0);
}

if (source.includes('NEXT_SUPPRESS_BASELINE_WARNING_PATCH')) {
  process.exit(0);
}

const patched = source.replace(
  /\d+<\(new Date\)\.setMonth\(\(new Date\)\.getMonth\(\)-2\)&&console\.warn\("\[baseline-browser-mapping\] The data in this module is over two months old\.  To ensure accurate Baseline data, please update: `npm i baseline-browser-mapping@latest -D`"\);/,
  '/* NEXT_SUPPRESS_BASELINE_WARNING_PATCH */ false&&console.warn("[baseline-browser-mapping] The data in this module is over two months old.  To ensure accurate Baseline data, please update: `npm i baseline-browser-mapping@latest -D`");'
);

if (patched === source) {
  console.warn('[suppress-baseline-warning] Warning pattern not found; no patch applied.');
  process.exit(0);
}

fs.writeFileSync(target, patched);
