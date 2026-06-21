"""
Converts the Malaysian Trash Annotation COCO-format detection dataset
into an image-classification folder structure compatible with PyTorch ImageFolder.

Input layout (already in data/):
  data/{split}/_annotations.coco.json
  data/{split}/<image files>

Output layout (written to data_classified/):
  data_classified/{split}/{class_name}/<crop_id>.jpg

Mapping of 15 Malaysian categories → 10-class model labels
(supercategory "trash" id=0 and "s-other" id=13 are skipped).
"""

import json
import os
import shutil
from pathlib import Path
from PIL import Image  # pip install Pillow

# ── Config ──────────────────────────────────────────────────────────────────

DATA_DIR = Path(__file__).parent.parent / "data"
OUT_DIR  = Path(__file__).parent.parent / "data_classified"
SPLITS   = ["train", "valid", "test"]
MIN_CROP = 64          # discard crops smaller than 64×64 px
JPEG_Q   = 92          # JPEG quality for saved crops

# ── Malaysian category → 10-class model label ────────────────────────────────
# id=0  "trash"          → skip (supercategory, not annotated directly)
# id=13 "s-other"        → skip (too ambiguous)
CATEGORY_MAP: dict[str, str] = {
    "m-composite":    "Trash",       # composite material → general trash
    "m-glass":        "Glass",
    "m-metal":        "Metal",
    "m-paper":        "Paper",       # covers both paper and cardboard
    "m-plastic-film": "Plastic",     # soft plastic (cling wrap, bags)
    "m-plastic-rigid":"Plastic",     # hard plastic (bottles, containers)
    "s-cigarette-butt":"Trash",
    "s-e-waste":      "Battery",     # electronics closest to Battery class
    "s-hazardous":    "Trash",       # chemicals, paint, etc.
    "s-ikat-tepi":    "Plastic",     # Malaysian cable-tie clips (plastic)
    "s-litter":       "Trash",
    "s-organic":      "Biological",
    "s-textile":      "Clothes",
}


def crop_and_save(image: Image.Image, bbox: list, dest: Path, crop_id: str) -> bool:
    """Crop bbox [x, y, w, h] from image and save to dest. Returns False if too small."""
    x, y, w, h = (int(v) for v in bbox)
    # COCO bbox may have small float rounding; clamp to image bounds
    iw, ih = image.size
    x1, y1 = max(0, x), max(0, y)
    x2, y2 = min(iw, x + w), min(ih, y + h)
    if (x2 - x1) < MIN_CROP or (y2 - y1) < MIN_CROP:
        return False
    crop = image.crop((x1, y1, x2, y2))
    crop = crop.convert("RGB")
    dest.mkdir(parents=True, exist_ok=True)
    crop.save(dest / f"{crop_id}.jpg", "JPEG", quality=JPEG_Q)
    return True


def process_split(split: str) -> dict[str, int]:
    split_dir = DATA_DIR / split
    anno_file = split_dir / "_annotations.coco.json"
    if not anno_file.exists():
        print(f"  [skip] {split}: no _annotations.coco.json found")
        return {}

    with open(anno_file, encoding="utf-8") as f:
        coco = json.load(f)

    # Build lookup maps
    id_to_file: dict[int, str] = {img["id"]: img["file_name"] for img in coco["images"]}
    id_to_cat: dict[int, str] = {cat["id"]: cat["name"] for cat in coco["categories"]}

    counts: dict[str, int] = {}
    skipped = 0

    for ann in coco["annotations"]:
        cat_name  = id_to_cat.get(ann["category_id"], "")
        label     = CATEGORY_MAP.get(cat_name)
        if label is None:
            skipped += 1
            continue

        file_name = id_to_file.get(ann["image_id"])
        if file_name is None:
            skipped += 1
            continue

        src_path = split_dir / file_name
        if not src_path.exists():
            skipped += 1
            continue

        try:
            img = Image.open(src_path)
        except Exception:
            skipped += 1
            continue

        dest_dir  = OUT_DIR / split / label
        crop_id   = f"{Path(file_name).stem}_{ann['id']}"
        saved     = crop_and_save(img, ann["bbox"], dest_dir, crop_id)
        if saved:
            counts[label] = counts.get(label, 0) + 1
        else:
            skipped += 1

    print(f"  Skipped (too small / no mapping): {skipped}")
    return counts


def main():
    if OUT_DIR.exists():
        shutil.rmtree(OUT_DIR)
    OUT_DIR.mkdir(parents=True)

    grand_total = 0
    for split in SPLITS:
        print(f"\n[{split}]")
        counts = process_split(split)
        for label, n in sorted(counts.items()):
            print(f"  {label:<15} {n:>5} crops")
        total = sum(counts.values())
        grand_total += total
        print(f"  Total: {total}")

    print(f"\nAll splits total: {grand_total} crops → {OUT_DIR}")
    print("\nNext step: upload data_classified/ to Google Colab and run fine-tuning.")


if __name__ == "__main__":
    main()
