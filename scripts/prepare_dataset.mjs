/**
 * Converts Malaysian Trash Annotation (COCO detection) to classification folders.
 *
 * Usage (from project root):
 *   node scripts/prepare_dataset.mjs
 *
 * Output:
 *   data_classified/{train|valid|test}/{ClassName}/{crop}.jpg
 */

import { Jimp } from 'jimp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '..');
const DATA_DIR  = path.join(ROOT, 'data');
const OUT_DIR   = path.join(ROOT, 'data_classified');
const SPLITS    = ['train', 'valid', 'test'];
const MIN_CROP  = 64;   // discard crops smaller than 64×64 px

// Malaysian category name → 10-class model label
// "trash" (supercategory id=0) and "s-other" (id=13) are skipped (no mapping)
const CATEGORY_MAP = {
  'm-composite':    'Trash',
  'm-glass':        'Glass',
  'm-metal':        'Metal',
  'm-paper':        'Paper',
  'm-plastic-film': 'Plastic',
  'm-plastic-rigid':'Plastic',
  's-cigarette-butt':'Trash',
  's-e-waste':      'Battery',
  's-hazardous':    'Trash',
  's-ikat-tepi':    'Plastic',
  's-litter':       'Trash',
  's-organic':      'Biological',
  's-textile':      'Clothes',
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function processSplit(split) {
  const splitDir = path.join(DATA_DIR, split);
  const annoFile = path.join(splitDir, '_annotations.coco.json');
  if (!fs.existsSync(annoFile)) {
    console.log(`  [skip] ${split}: no _annotations.coco.json`);
    return {};
  }

  const coco       = JSON.parse(fs.readFileSync(annoFile, 'utf8'));
  const idToFile   = Object.fromEntries(coco.images.map(img => [img.id, img.file_name]));
  const idToCat    = Object.fromEntries(coco.categories.map(c => [c.id, c.name]));

  const counts  = {};
  let skipped   = 0;
  let processed = 0;

  for (const ann of coco.annotations) {
    const catName = idToCat[ann.category_id];
    const label   = CATEGORY_MAP[catName];
    if (!label) { skipped++; continue; }

    const fileName = idToFile[ann.image_id];
    if (!fileName) { skipped++; continue; }

    const srcPath = path.join(splitDir, fileName);
    if (!fs.existsSync(srcPath)) { skipped++; continue; }

    const [bx, by, bw, bh] = ann.bbox.map(Math.floor);
    if (bw < MIN_CROP || bh < MIN_CROP) { skipped++; continue; }

    try {
      const img     = await Jimp.read(srcPath);
      const iw      = img.bitmap.width;
      const ih      = img.bitmap.height;
      const x1      = Math.max(0, bx);
      const y1      = Math.max(0, by);
      const cropW   = Math.min(bw, iw - x1);
      const cropH   = Math.min(bh, ih - y1);
      if (cropW < MIN_CROP || cropH < MIN_CROP) { skipped++; continue; }

      const crop    = img.clone().crop({ x: x1, y: y1, w: cropW, h: cropH });
      const destDir = path.join(OUT_DIR, split, label);
      ensureDir(destDir);
      const baseName = path.parse(fileName).name;
      const outPath  = path.join(destDir, `${baseName}_${ann.id}.jpg`);
      await crop.write(outPath);

      counts[label] = (counts[label] ?? 0) + 1;
      processed++;
      if (processed % 100 === 0) process.stdout.write(`\r  ${processed} crops saved...`);
    } catch {
      skipped++;
    }
  }

  process.stdout.write('\r');
  console.log(`  Skipped (too small / unmapped / error): ${skipped}`);
  return counts;
}

async function main() {
  if (fs.existsSync(OUT_DIR)) fs.rmSync(OUT_DIR, { recursive: true });
  ensureDir(OUT_DIR);

  let grandTotal = 0;
  for (const split of SPLITS) {
    console.log(`\n[${split}]`);
    const counts = await processSplit(split);
    for (const [label, n] of Object.entries(counts).sort()) {
      console.log(`  ${label.padEnd(15)} ${String(n).padStart(5)} crops`);
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    grandTotal += total;
    console.log(`  Total: ${total}`);
  }

  console.log(`\nAll splits: ${grandTotal} crops`);
  console.log(`Output folder: ${OUT_DIR}`);
  console.log('\nAdd Shoes images to:');
  for (const split of SPLITS) {
    console.log(`  ${path.join(OUT_DIR, split, 'Shoes')}  (create the folder yourself)`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
