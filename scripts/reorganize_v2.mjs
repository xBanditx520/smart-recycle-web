/**
 * Reorganise all available data → data_classified_v2/ (9-class v2).
 *
 * Run from the repo root:
 *   node scripts/reorganize_v2.mjs
 *
 * Output goes to data_classified_v2/ — source data_classified/ is NEVER modified.
 * After verifying counts, rename data_classified_v2 → data_classified for training.
 *
 * ━━━ 9-class taxonomy ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *   Paper_Cardboard  — paper + cardboard → blue recycling bin
 *   Plastic          — plastic bottles/containers → blue recycling bin
 *   Glass            — glass bottles/jars → blue recycling bin
 *   Metal            — cans, tins, small metal items → blue recycling bin
 *   Fabric_Shoes     — clothes/shoes → donation box / Kloth Cares
 *   Bulky_Furniture  — large NON-electrical → Alam Flora bulky pickup
 *   E_Waste          — anything with plug/battery → e-waste drop-off
 *   Organic_Waste    — food scraps/compost
 *   General_Trash    — landfill (composites, styrofoam, heavily soiled)
 *
 * ━━━ Golden rules ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *   • Plug / battery / circuit board → E_Waste  (fridge, fan, TV, etc.)
 *   • Large but NO electricity        → Bulky_Furniture
 *   • Pure metal, no wires            → Metal
 *   • Foil/plastic composite bags     → General_Trash
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'fs';
import { extname, join } from 'path';

const ROOT = process.cwd();
const SRC  = join(ROOT, 'data_classified');      // existing 10-class source (READ ONLY)
const DATA  = join(ROOT, 'data');                // supplemental datasets
const DST   = join(ROOT, 'data_classified_v2'); // output — never overwrites source
const SPLITS = ['train', 'valid', 'test'];
const SPLIT_RATIO = [0.70, 0.15, 0.15];

const NEW_CLASSES = [
  'Paper_Cardboard',
  'Plastic',
  'Glass',
  'Metal',
  'Fabric_Shoes',
  'Bulky_Furniture',
  'E_Waste',
  'Organic_Waste',
  'General_Trash',
];

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.bmp']);

const counts = {};
for (const s of SPLITS) {
  counts[s] = {};
  for (const c of NEW_CLASSES) counts[s][c] = 0;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function isImage(name) {
  return IMAGE_EXTS.has(extname(name).toLowerCase());
}

function ensureDir(d) {
  mkdirSync(d, { recursive: true });
}

function basename(p) {
  return p.split(/[\\/]/).pop();
}

function copyFileTo(src, dstDir, prefix = '') {
  ensureDir(dstDir);
  const b = basename(src);
  const name = prefix ? `${prefix}_${b}` : b;
  const dst = join(dstDir, name);
  if (!existsSync(dst)) copyFileSync(src, dst);
}

function listImages(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => {
    const full = join(dir, f);
    return statSync(full).isFile() && isImage(f);
  }).map(f => join(dir, f));
}

function listDirs(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => statSync(join(dir, f)).isDirectory());
}

function rglob(dir) {
  const results = [];
  if (!existsSync(dir)) return results;
  function walk(d) {
    for (const f of readdirSync(d)) {
      const full = join(d, f);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else if (st.isFile() && isImage(f)) results.push(full);
    }
  }
  walk(dir);
  return results;
}

function copyFromClassified(oldClass, newClass) {
  for (const split of SPLITS) {
    const srcDir = join(SRC, split, oldClass);
    const dstDir = join(DST, split, newClass);
    const imgs = listImages(srcDir);
    if (imgs.length === 0 && !existsSync(srcDir)) {
      console.log(`  [WARN] missing ${srcDir}`);
      continue;
    }
    for (const img of imgs) copyFileTo(img, dstDir, oldClass);
    counts[split][newClass] += imgs.length;
    console.log(`  [classified] ${oldClass.padEnd(12)} → ${newClass.padEnd(22)} [${split.padEnd(5)}] ${String(imgs.length).padStart(5)}`);
  }
}

function copyRoboflowSplit(srcBase, srcClass, newClass, prefix = '') {
  for (const split of SPLITS) {
    const srcDir = join(srcBase, split, srcClass);
    const dstDir = join(DST, split, newClass);
    const imgs = listImages(srcDir);
    for (const img of imgs) {
      const pfx = prefix || srcClass.replace(/\s+/g, '_');
      copyFileTo(img, dstDir, pfx);
    }
    counts[split][newClass] += imgs.length;
  }
  const total = SPLITS.reduce((s, sp) => s + counts[sp][newClass], 0);
  const label = `${basename(srcBase)}/${srcClass}`.slice(0, 36);
  console.log(`  [roboflow]  ${label.padEnd(36)} → ${newClass.padEnd(22)} total so far ${total}`);
}

function copyFlatFolder(srcDir, newClass, prefix = '') {
  const images = rglob(srcDir);
  if (images.length === 0) {
    console.log(`  [WARN] no images in ${srcDir}`);
    return;
  }
  // Deterministic shuffle (seed 42)
  let seed = 42;
  function rand() { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return (seed >>> 0) / 0x100000000; }
  for (let i = images.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [images[i], images[j]] = [images[j], images[i]];
  }
  const n = images.length;
  const nTrain = Math.floor(n * SPLIT_RATIO[0]);
  const nValid = Math.floor(n * SPLIT_RATIO[1]);
  const splitList = [
    ...Array(nTrain).fill('train'),
    ...Array(nValid).fill('valid'),
    ...Array(n - nTrain - nValid).fill('test'),
  ];
  const pfx = prefix || basename(srcDir).replace(/\s+/g, '_');
  for (let i = 0; i < images.length; i++) {
    const sp = splitList[i];
    copyFileTo(images[i], join(DST, sp, newClass), pfx);
    counts[sp][newClass]++;
  }
  console.log(`  [flat]      ${srcDir.slice(-50).padEnd(50)} → ${newClass.padEnd(22)} ${n} images`);
}

// ── main ─────────────────────────────────────────────────────────────────────

console.log('='.repeat(70));
console.log('Smart Recycle v2 — data reorganisation (9-class)');
console.log('='.repeat(70));

// Wipe previous partial run output if any
if (existsSync(DST)) rmSync(DST, { recursive: true, force: true });

console.log('\n[1] Creating destination folders in data_classified_v2/ …');
for (const split of SPLITS) {
  for (const cls of NEW_CLASSES) ensureDir(join(DST, split, cls));
}

// ── Paper_Cardboard ──────────────────────────────────────────────────────────
console.log('\n[2] Paper_Cardboard');
copyFromClassified('Cardboard', 'Paper_Cardboard');
copyFromClassified('Paper',     'Paper_Cardboard');

// ── Plastic ──────────────────────────────────────────────────────────────────
console.log('\n[3] Plastic');
copyFromClassified('Plastic', 'Plastic');

// Student prefix 101/102/103/105/503 are plastic items — added in step [8]

// ── Glass ────────────────────────────────────────────────────────────────────
console.log('\n[4] Glass');
copyFromClassified('Glass', 'Glass');
const glassFlat = join(DATA, 'Glass');
if (existsSync(glassFlat)) copyFlatFolder(glassFlat, 'Glass', 'supp_Glass');

// Student prefix 401 is a glass bottle — added in step [8]

// ── Metal ────────────────────────────────────────────────────────────────────
console.log('\n[5] Metal');
copyFromClassified('Metal', 'Metal');
const metalDs = join(DATA, 'Metal Classification.v1i.folder');
for (const cls of ['Aluminium', 'Brass', 'Copper', 'Iron', 'Steel']) {
  copyRoboflowSplit(metalDs, cls, 'Metal');
}

// ── Fabric_Shoes ─────────────────────────────────────────────────────────────
console.log('\n[6] Fabric_Shoes');
copyFromClassified('Clothes', 'Fabric_Shoes');
copyFromClassified('Shoes',   'Fabric_Shoes');
const clothesFlat = join(DATA, 'Clothes');
if (existsSync(clothesFlat)) copyFlatFolder(clothesFlat, 'Fabric_Shoes', 'supp_Clothes');
const shoesRoot = join(DATA, 'Shoes');
if (existsSync(shoesRoot)) {
  for (const shoeType of listDirs(shoesRoot)) {
    copyFlatFolder(join(shoesRoot, shoeType), 'Fabric_Shoes', `supp_Shoes_${shoeType}`);
  }
}

// ── Bulky_Furniture ───────────────────────────────────────────────────────────
console.log('\n[7] Bulky_Furniture  (chair/Cupboard/Sofa/table — fridge+tv → E_Waste)');
const furnDs = join(DATA, 'furniture-cls-yolo.v1-v1.folder');
for (const cls of ['chair', 'Cupboard', 'Sofa', 'table']) {
  copyRoboflowSplit(furnDs, cls, 'Bulky_Furniture');
}

// ── E_Waste ───────────────────────────────────────────────────────────────────
console.log('\n[8] E_Waste');
copyFromClassified('Battery', 'E_Waste');

const batteryRoot = join(DATA, 'Battery');
if (existsSync(batteryRoot)) {
  for (const brand of listDirs(batteryRoot)) {
    copyFlatFolder(join(batteryRoot, brand), 'E_Waste', `supp_Battery_${brand}`);
  }
}

const ewasteDs = join(DATA, 'E-waste classification.v1i.folder');
if (existsSync(ewasteDs)) {
  for (const split of SPLITS) {
    const splitDir = join(ewasteDs, split);
    if (!existsSync(splitDir)) continue;
    for (const clsDir of listDirs(splitDir)) {
      const imgs = listImages(join(splitDir, clsDir));
      const pfx = `ewaste_${clsDir.replace(/\s+/g, '_').slice(0, 20)}`;
      for (const img of imgs) copyFileTo(img, join(DST, split, 'E_Waste'), pfx);
      counts[split]['E_Waste'] += imgs.length;
    }
  }
  console.log('  [roboflow]  E-waste classification (all subclasses) → E_Waste');
}

for (const cls of ['fridge', 'tv']) {
  copyRoboflowSplit(furnDs, cls, 'E_Waste', `furn_${cls}`);
}

// ── Student dataset (data/train|valid|test at root) ───────────────────────────
console.log('\n[9] Student dataset (prefix-coded photos)');
const STUDENT_PREFIX_MAP = {
  '101': 'Plastic',         // Sunlight dish-soap bottle
  '102': 'Plastic',         // Clorox bleach jug
  '103': 'Plastic',         // transparent bubble-tea cup
  '104': 'General_Trash',   // Mamee snack bag (foil/plastic composite)
  '105': 'Plastic',         // Vitagen small bottle
  '201': 'Metal',           // crushed aluminium can
  '202': 'Metal',           // Gold Coin tin can
  '301': 'Paper_Cardboard', // Yeo's cardboard box
  '302': 'Paper_Cardboard', // crumpled newspaper
  '303': 'Paper_Cardboard', // Hershey's Tetra Pak carton
  '401': 'Glass',           // Gaviscon glass medicine bottle
  '501': 'Paper_Cardboard', // McDonald's fries box
  '502': 'General_Trash',   // tissue + cigarette butts
  '503': 'Plastic',         // black plastic straw
  '603': 'E_Waste',         // wireless earbud (has battery)
  '604': 'Fabric_Shoes',    // old socks
};
let studentTotal = 0;
for (const split of SPLITS) {
  const splitDir = join(DATA, split);
  if (!existsSync(splitDir)) continue;
  for (const f of readdirSync(splitDir)) {
    const full = join(splitDir, f);
    if (!statSync(full).isFile() || !isImage(f)) continue;
    const prefix = f.slice(0, 3);
    const newCls = STUDENT_PREFIX_MAP[prefix];
    if (!newCls) continue;
    copyFileTo(full, join(DST, split, newCls), `student_${prefix}`);
    counts[split][newCls]++;
    studentTotal++;
  }
}
console.log(`  [student]   data/{train,valid,test} (root) → ${studentTotal} images mapped`);

// ── Organic_Waste ─────────────────────────────────────────────────────────────
console.log('\n[10] Organic_Waste');
copyFromClassified('Biological', 'Organic_Waste');

// ── General_Trash ─────────────────────────────────────────────────────────────
console.log('\n[11] General_Trash');
copyFromClassified('Trash', 'General_Trash');

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n' + '='.repeat(70));
console.log('FINAL COUNTS (all splits combined)');
console.log('='.repeat(70));

const totalPerClass = {};
for (const cls of NEW_CLASSES) {
  totalPerClass[cls] = SPLITS.reduce((s, sp) => s + counts[sp][cls], 0);
}

const maxCount = Math.max(...Object.values(totalPerClass), 1);
for (const cls of NEW_CLASSES) {
  const n = totalPerClass[cls];
  const bar = '█'.repeat(Math.floor(30 * n / maxCount));
  const flag = n < 1500 ? '  ⚠ LOW' : '';
  console.log(`  ${cls.padEnd(22)}  ${String(n).padStart(6)}  ${bar}${flag}`);
}

const nonZero = Object.values(totalPerClass).filter(v => v > 0);
if (nonZero.length) {
  const ratio = Math.max(...nonZero) / Math.min(...nonZero);
  console.log(`\n  Imbalance ratio (max/min): ${ratio.toFixed(1)}x`);
  if (ratio > 3) console.log('  ⚠ High imbalance — consider downsampling large classes after reviewing.');
}

console.log(`
SKIPPED:
  data/Plastic detection.v1i.folder — class labels 1-6 not decoded, skipped to be safe.

Done. Output: data_classified_v2/
Rename to data_classified/ when ready for Colab training.
`);
