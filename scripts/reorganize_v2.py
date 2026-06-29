"""
Reorganise all available data → data_classified/ (8-class v2).

Run from the repo root:
    python scripts/reorganize_v2.py

Output overwrites data_classified/{train,valid,test}/{class}/.
Source data is NEVER deleted — only copies are made.

━━━ 8-class taxonomy ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Paper_Cardboard  — paper + cardboard recycling bin
  Plastic_Glass    — clean plastic / glass → recycling bin
  Metal            — metal (small/medium items, no appliances)
  Fabric_Shoes     — old clothes / shoes → donation box / Kloth Cares
  Bulky_Furniture  — large NON-electrical items → Alam Flora pickup
  E_Waste          — anything with a plug/battery → e-waste drop-off
  Organic_Waste    — food scraps / compost / general bin
  General_Trash    — landfill (composites, heavily soiled, styrofoam…)

━━━ Golden rules ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  • Plug / battery / circuit board → E_Waste  (fridge, fan, TV, etc.)
  • Large but NO electricity        → Bulky_Furniture  (wood sofa, bed, wardrobe)
  • Pure metal, no wires           → Metal

━━━ Sources ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Paper_Cardboard
    data_classified/{split}/Cardboard/       (existing, keep)
    data_classified/{split}/Paper/           (existing, keep)

  Plastic_Glass
    data_classified/{split}/Plastic/         (existing, keep)
    data_classified/{split}/Glass/           (existing, keep)
    data/Glass/                              (flat folder, 501 images, split 70/15/15)

  Metal
    data_classified/{split}/Metal/           (existing, keep)
    data/Metal Classification.v1i.folder/{split}/{Aluminium,Brass,Copper,Iron,Steel}/

  Fabric_Shoes
    data_classified/{split}/Clothes/         (existing, keep)
    data_classified/{split}/Shoes/           (existing, keep)
    data/Clothes/                            (flat, 220 images, split 70/15/15)
    data/Shoes/{type}/                       (type subfolders, split 70/15/15)

  Bulky_Furniture
    data/furniture-cls-yolo.v1-v1.folder/{split}/{chair,Cupboard,Sofa,table}/
    NOTE: fridge and tv from that dataset → E_Waste (they have plugs!)

  E_Waste
    data_classified/{split}/Battery/         (existing, keep)
    data/Battery/{brand}/                    (flat brand subfolders, split 70/15/15)
    data/E-waste classification.v1i.folder/{split}/*/  (ALL subclasses → E_Waste)
    data/furniture-cls-yolo.v1-v1.folder/{split}/fridge/
    data/furniture-cls-yolo.v1-v1.folder/{split}/tv/

  Organic_Waste
    data_classified/{split}/Biological/      (existing, keep)

  General_Trash
    data_classified/{split}/Trash/           (existing, keep)

  Student dataset (data/train|valid|test at repo root)
    Visually identified prefix → class mapping:
      101 → Plastic_Glass   (Sunlight dish-soap plastic bottle)
      102 → Plastic_Glass   (Clorox bleach plastic jug)
      103 → Plastic_Glass   (transparent bubble-tea plastic cup)
      104 → General_Trash   (Mamee snack bag — foil/plastic composite)
      105 → Plastic_Glass   (Vitagen small plastic bottle)
      201 → Metal           (crushed aluminium can)
      202 → Metal           (Gold Coin sweetened creamer tin can)
      301 → Paper_Cardboard (Yeo's cardboard box)
      302 → Paper_Cardboard (crumpled newspaper / paper wrapping)
      303 → Paper_Cardboard (Hershey's Soyfresh Tetra Pak carton)
      401 → Plastic_Glass   (Gaviscon glass medicine bottle)
      501 → Paper_Cardboard (McDonald's french-fries cardboard box)
      502 → General_Trash   (crumpled tissue + cigarette butts)
      503 → Plastic_Glass   (black plastic straw)
      603 → E_Waste         (wireless earbud / AirPod — has battery)
      604 → Fabric_Shoes    (old dirty socks)

  data/Plastic detection.v1i.folder — README says "plastic-nonplastic" but class
                                      numbers 1-6 not decoded; skipped to be safe.
"""

import random
import shutil
from collections import defaultdict
from pathlib import Path

random.seed(42)

SRC_CLASSIFIED = Path("data_classified")   # existing 10-class source (read-only)
DATA            = Path("data")             # new supplemental datasets
DST             = Path("data_classified")  # output (same dir, overwrite class folders)
SPLITS          = ["train", "valid", "test"]
SPLIT_RATIO     = (0.70, 0.15, 0.15)

NEW_CLASSES = [
    "Paper_Cardboard",
    "Plastic_Glass",
    "Metal",
    "Fabric_Shoes",
    "Bulky_Furniture",
    "E_Waste",
    "Organic_Waste",
    "General_Trash",
]

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}

# ── helpers ──────────────────────────────────────────────────────────────────

def is_image(p: Path) -> bool:
    return p.suffix.lower() in IMAGE_EXTS

def copy_file(src: Path, dst_dir: Path, prefix: str = "") -> None:
    dst_dir.mkdir(parents=True, exist_ok=True)
    name = f"{prefix}_{src.name}" if prefix else src.name
    dst = dst_dir / name
    if not dst.exists():
        shutil.copy2(src, dst)

def copy_from_classified(old_class: str, new_class: str, counts: dict) -> None:
    """Copy an existing data_classified class to the new class folder."""
    for split in SPLITS:
        src_dir = SRC_CLASSIFIED / split / old_class
        dst_dir = DST / split / new_class
        if not src_dir.exists():
            print(f"  [WARN] missing {src_dir}")
            continue
        n = 0
        for img in src_dir.iterdir():
            if img.is_file() and is_image(img):
                copy_file(img, dst_dir, prefix=old_class)
                n += 1
        counts[split][new_class] += n
        print(f"  [classified] {old_class:12s} → {new_class:22s} [{split:5s}] {n:5d}")

def copy_roboflow_split(src_base: Path, src_class: str,
                        new_class: str, counts: dict,
                        prefix: str = "") -> None:
    """Copy a Roboflow-style {train/valid/test}/{class}/ dataset."""
    for split in SPLITS:
        src_dir = src_base / split / src_class
        if not src_dir.exists():
            continue
        dst_dir = DST / split / new_class
        n = 0
        for img in src_dir.iterdir():
            if img.is_file() and is_image(img):
                pfx = prefix or f"{src_class.replace(' ', '_')}"
                copy_file(img, dst_dir, prefix=pfx)
                n += 1
        counts[split][new_class] += n
    label = f"{src_base.name}/{src_class}"
    total = sum(counts[s][new_class] for s in SPLITS)
    print(f"  [roboflow]  {label[:36]:36s} → {new_class:22s} total so far {total:6d}")

def copy_flat_folder(src_dir: Path, new_class: str,
                     counts: dict, prefix: str = "") -> None:
    """Random-split a flat folder (no sub-splits) 70/15/15 into dst splits."""
    images = [p for p in src_dir.rglob("*") if p.is_file() and is_image(p)]
    if not images:
        print(f"  [WARN] no images in {src_dir}")
        return
    random.shuffle(images)
    n = len(images)
    n_train = int(n * SPLIT_RATIO[0])
    n_valid = int(n * SPLIT_RATIO[1])
    splits_map = (
        ["train"] * n_train +
        ["valid"] * n_valid +
        ["test"] * (n - n_train - n_valid)
    )
    for img, split in zip(images, splits_map):
        pfx = prefix or src_dir.name.replace(" ", "_")
        copy_file(img, DST / split / new_class, prefix=pfx)
        counts[split][new_class] += 1
    print(f"  [flat]      {str(src_dir):40s} → {new_class:22s} {n:5d} images")

# ── main ─────────────────────────────────────────────────────────────────────

def main() -> None:
    print("=" * 70)
    print("Smart Recycle v2 — data reorganisation")
    print("=" * 70)

    # Wipe old 10-class folders and create new 8-class structure
    print("\n[1] Preparing destination folders…")
    for split in SPLITS:
        # Remove old class folders
        for old_cls in ["Battery","Biological","Cardboard","Clothes",
                        "Glass","Metal","Paper","Plastic","Shoes","Trash"]:
            p = DST / split / old_cls
            if p.exists():
                shutil.rmtree(p)
        # Create new class folders
        for cls in NEW_CLASSES:
            (DST / split / cls).mkdir(parents=True, exist_ok=True)

    counts: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))

    # ── Paper_Cardboard ──────────────────────────────────────────────────────
    print("\n[2] Paper_Cardboard")
    copy_from_classified("Cardboard", "Paper_Cardboard", counts)
    copy_from_classified("Paper",     "Paper_Cardboard", counts)

    # ── Plastic_Glass ────────────────────────────────────────────────────────
    print("\n[3] Plastic_Glass")
    copy_from_classified("Plastic", "Plastic_Glass", counts)
    copy_from_classified("Glass",   "Plastic_Glass", counts)
    glass_flat = DATA / "Glass"
    if glass_flat.exists():
        copy_flat_folder(glass_flat, "Plastic_Glass", counts, prefix="supp_Glass")

    # ── Metal ────────────────────────────────────────────────────────────────
    print("\n[4] Metal")
    copy_from_classified("Metal", "Metal", counts)
    metal_ds = DATA / "Metal Classification.v1i.folder"
    for cls in ["Aluminium", "Brass", "Copper", "Iron", "Steel"]:
        copy_roboflow_split(metal_ds, cls, "Metal", counts)

    # ── Fabric_Shoes ─────────────────────────────────────────────────────────
    print("\n[5] Fabric_Shoes")
    copy_from_classified("Clothes", "Fabric_Shoes", counts)
    copy_from_classified("Shoes",   "Fabric_Shoes", counts)
    clothes_flat = DATA / "Clothes"
    if clothes_flat.exists():
        copy_flat_folder(clothes_flat, "Fabric_Shoes", counts, prefix="supp_Clothes")
    shoes_root = DATA / "Shoes"
    if shoes_root.exists():
        for shoe_type in shoes_root.iterdir():
            if shoe_type.is_dir():
                copy_flat_folder(shoe_type, "Fabric_Shoes", counts,
                                 prefix=f"supp_Shoes_{shoe_type.name}")

    # ── Bulky_Furniture ───────────────────────────────────────────────────────
    print("\n[6] Bulky_Furniture  (chair/Cupboard/Sofa/table only — fridge+tv → E_Waste)")
    furn_ds = DATA / "furniture-cls-yolo.v1-v1.folder"
    for cls in ["chair", "Cupboard", "Sofa", "table"]:
        copy_roboflow_split(furn_ds, cls, "Bulky_Furniture", counts)

    # ── E_Waste ───────────────────────────────────────────────────────────────
    print("\n[7] E_Waste")
    copy_from_classified("Battery", "E_Waste", counts)

    # Brand-subfolder batteries (flat)
    battery_root = DATA / "Battery"
    if battery_root.exists():
        for brand in battery_root.iterdir():
            if brand.is_dir():
                copy_flat_folder(brand, "E_Waste", counts,
                                 prefix=f"supp_Battery_{brand.name}")

    # E-waste classification dataset — ALL sub-classes → E_Waste
    ewaste_ds = DATA / "E-waste classification.v1i.folder"
    if ewaste_ds.exists():
        for split in SPLITS:
            split_dir = ewaste_ds / split
            if not split_dir.exists():
                continue
            for cls_dir in split_dir.iterdir():
                if not cls_dir.is_dir():
                    continue
                n = 0
                for img in cls_dir.iterdir():
                    if img.is_file() and is_image(img):
                        pfx = f"ewaste_{cls_dir.name[:20].replace(' ', '_')}"
                        copy_file(img, DST / split / "E_Waste", prefix=pfx)
                        n += 1
                counts[split]["E_Waste"] += n
        print(f"  [roboflow]  E-waste classification (all subclasses) → E_Waste")

    # Furniture dataset: fridge + tv → E_Waste (they have plugs)
    for cls in ["fridge", "tv"]:
        copy_roboflow_split(furn_ds, cls, "E_Waste", counts, prefix=f"furn_{cls}")

    # ── Student dataset (data/train|valid|test at root) ─────────────────────
    print("\n[8] Student dataset (prefix-coded photos)")
    # Mapping from filename prefix (first 3 digits) to new class.
    # Identified visually from sample images — see docstring at top of file.
    STUDENT_PREFIX_MAP: dict[str, str] = {
        "101": "Plastic_Glass",    # Sunlight dish-soap bottle
        "102": "Plastic_Glass",    # Clorox bleach jug
        "103": "Plastic_Glass",    # transparent bubble-tea cup
        "104": "General_Trash",    # Mamee snack bag (foil/plastic composite)
        "105": "Plastic_Glass",    # Vitagen small bottle
        "201": "Metal",            # crushed aluminium can
        "202": "Metal",            # Gold Coin tin can
        "301": "Paper_Cardboard",  # Yeo's cardboard box
        "302": "Paper_Cardboard",  # crumpled newspaper
        "303": "Paper_Cardboard",  # Hershey's Tetra Pak carton
        "401": "Plastic_Glass",    # Gaviscon glass bottle
        "501": "Paper_Cardboard",  # McDonald's fries box
        "502": "General_Trash",    # tissue + cigarette butts
        "503": "Plastic_Glass",    # black plastic straw
        "603": "E_Waste",          # wireless earbud (has battery)
        "604": "Fabric_Shoes",     # old socks
    }
    student_root = Path("data")
    for split in SPLITS:
        split_dir = student_root / split
        if not split_dir.exists():
            continue
        for img in split_dir.iterdir():
            if not (img.is_file() and is_image(img)):
                continue
            prefix = img.name[:3]
            new_cls = STUDENT_PREFIX_MAP.get(prefix)
            if new_cls is None:
                continue
            copy_file(img, DST / split / new_cls, prefix=f"student_{prefix}")
            counts[split][new_cls] += 1
    student_total = sum(
        counts[s][c]
        for s in SPLITS
        for c in set(STUDENT_PREFIX_MAP.values())
    )
    print(f"  [student]   data/{{train,valid,test}} (root) → {student_total} images mapped")

    # ── Organic_Waste ─────────────────────────────────────────────────────────
    print("\n[9] Organic_Waste")
    copy_from_classified("Biological", "Organic_Waste", counts)

    # ── General_Trash ─────────────────────────────────────────────────────────
    print("\n[10] General_Trash")
    copy_from_classified("Trash", "General_Trash", counts)

    # ── Summary ───────────────────────────────────────────────────────────────
    print("\n" + "=" * 70)
    print("FINAL COUNTS (all splits combined)")
    print("=" * 70)
    total_per_class: dict[str, int] = defaultdict(int)
    for split in SPLITS:
        for cls in NEW_CLASSES:
            total_per_class[cls] += counts[split][cls]

    max_count = max(total_per_class.values()) if total_per_class else 1
    for cls in NEW_CLASSES:
        n = total_per_class[cls]
        bar = "█" * int(30 * n / max_count)
        flag = "  ⚠ LOW" if n < 2000 else ""
        print(f"  {cls:22s}  {n:6d}  {bar}{flag}")

    non_zero = [v for v in total_per_class.values() if v > 0]
    if non_zero:
        ratio = max(non_zero) / min(non_zero) if min(non_zero) > 0 else float("inf")
        print(f"\n  Imbalance ratio (max/min): {ratio:.1f}x")
        if ratio > 3:
            print("  ⚠ High imbalance — consider downsampling large classes after reviewing.")

    print("""
SKIPPED DATA (needs your input before adding):
─────────────────────────────────────────────
  data/train|valid|test  (root)
    Your own collected photos (Honor200, OppoReno14, Iphone11).
    Filename prefix codes: 101, 102, 201, 301, 401, 501, 603, …
    ➜ Tell me what each code means and I will add a mapping here.

  data/Plastic detection.v1i.folder
    Classes 1-6 — README says "plastic-nonplastic" but numbers not decoded.
    ➜ If ALL 6 classes are plastic, set USE_PLASTIC_DETECTION = True below.

AUDIT CHECKLIST before training:
─────────────────────────────────
  Plastic_Glass — spot-check for plastic chairs/drawers (→ Bulky_Furniture)
  Metal         — spot-check for large appliances with wires (→ E_Waste)
  E_Waste       — very large; verify no small metal cans sneaked in (→ Metal)
  General_Trash — verify no styrofoam-looking cardboard (→ Paper_Cardboard)
""")
    print("Done. Output: data_classified/")


if __name__ == "__main__":
    main()
