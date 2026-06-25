// Copies all images from augmented_waste_classification/ into data_classified/
// with a 70% train / 15% valid / 15% test split.
// Run: node scripts/add_augmented.mjs
// Note: ~38 000 files — expect 3-6 minutes to complete.

import { readdirSync, mkdirSync, copyFileSync, existsSync } from 'fs';
import { join, extname, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = resolve(__dirname, '../augmented_waste_classification');
const OUT_DIR  = resolve(__dirname, '../data_classified');

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
// augmented_waste_classification contains a "Labels" folder that is not a class
const SKIP = new Set(['Labels']);

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getImages(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .filter(e => e.isFile() && IMAGE_EXTS.has(extname(e.name).toLowerCase()))
    .map(e => join(dir, e.name));
}

const classes = readdirSync(SRC_DIR, { withFileTypes: true })
  .filter(e => e.isDirectory() && !SKIP.has(e.name))
  .map(e => e.name);

console.log(`Classes found: ${classes.join(', ')}\n`);

let grandTotal = 0;
for (const cls of classes) {
  const images = shuffle(getImages(join(SRC_DIR, cls)));
  const n = images.length;
  if (n === 0) { console.log(`  ⚠ ${cls}: empty, skipped\n`); continue; }

  const nTrain = Math.round(n * 0.70);
  const nValid = Math.round(n * 0.15);

  const parts = {
    train: images.slice(0, nTrain),
    valid: images.slice(nTrain, nTrain + nValid),
    test:  images.slice(nTrain + nValid),
  };

  for (const [split, files] of Object.entries(parts)) {
    const outDir = join(OUT_DIR, split, cls);
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
    files.forEach((src, i) => {
      copyFileSync(src, join(outDir, `${cls}_aug_${String(i).padStart(5, '0')}${extname(src)}`));
    });
    process.stdout.write(`  [${split}] ${cls.padEnd(12)} +${files.length}\n`);
  }
  grandTotal += n;
  console.log(`  └─ subtotal: ${n}\n`);
}

console.log(`Finished. ${grandTotal} images added to data_classified/.`);
console.log('Next step: upload data_classified/ to Colab and retrain the model.');
