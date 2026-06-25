// Copies Battery / Clothes / Glass / Shoes images from data/ into data_classified/
// with a 70% train / 15% valid / 15% test split.
// Run: node scripts/add_supplemental.mjs

import { readdirSync, mkdirSync, copyFileSync, existsSync } from 'fs';
import { join, extname, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '../data');
const OUT_DIR  = resolve(__dirname, '../data_classified');

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.bmp']);

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getAllImages(dir) {
  const files = [];
  function walk(d) {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (IMAGE_EXTS.has(extname(entry.name).toLowerCase())) files.push(p);
    }
  }
  if (existsSync(dir)) walk(dir);
  return files;
}

function addClassImages(className, sourceDir) {
  const images = shuffle(getAllImages(sourceDir));
  if (images.length === 0) {
    console.log(`  ⚠  No images found for ${className} in ${sourceDir}`);
    return;
  }
  const n = images.length;
  const nTrain = Math.round(n * 0.70);
  const nValid = Math.round(n * 0.15);

  const parts = {
    train: images.slice(0, nTrain),
    valid: images.slice(nTrain, nTrain + nValid),
    test:  images.slice(nTrain + nValid),
  };

  for (const [split, files] of Object.entries(parts)) {
    const outDir = join(OUT_DIR, split, className);
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
    files.forEach((src, i) => {
      const name = `${className}_supp_${String(i).padStart(4, '0')}${extname(src)}`;
      copyFileSync(src, join(outDir, name));
    });
    process.stdout.write(`  [${split}] ${className.padEnd(10)} +${files.length}\n`);
  }
  console.log(`  └─ total: ${n}\n`);
}

console.log('Adding supplemental images to data_classified/\n');
addClassImages('Battery', join(DATA_DIR, 'Battery'));
addClassImages('Clothes', join(DATA_DIR, 'Clothes'));
addClassImages('Glass',   join(DATA_DIR, 'Glass'));
addClassImages('Shoes',   join(DATA_DIR, 'Shoes'));
console.log('Done. Re-run your Colab training notebook to fine-tune the model.');
