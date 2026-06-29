"""
Smart Recycle v2 — MobileNetV3-Small training script (9-class)
Run in Google Colab (GPU runtime).

Usage:
  1. Upload data_classified_v2/ to your Google Drive as a zip, then unzip.
  2. Copy this script to Colab or paste it cell by cell.
  3. Set DATA_DIR to where you unzipped data_classified_v2/.
  4. Run all cells. Training takes ~15-20 min on a T4 GPU.
  5. Download smart_recycle_v2.onnx and replace public/advanced_waste_model.onnx.
"""

# ── [Cell 1] Install / imports ────────────────────────────────────────────────
# !pip install -q torch torchvision onnx

import os, random, shutil, time
from pathlib import Path

import torch
import torch.nn as nn
import torchvision.transforms as T
from torchvision import datasets, models
from torch.utils.data import DataLoader, Subset

# ── [Cell 2] Config ───────────────────────────────────────────────────────────

DATA_DIR   = Path("/content/drive/MyDrive/data_classified_v2")   # ← change if needed
OUT_ONNX   = Path("/content/smart_recycle_v2.onnx")

CLASS_NAMES = [
    "Paper_Cardboard",
    "Plastic",
    "Glass",
    "Metal",
    "Fabric_Shoes",
    "Bulky_Furniture",
    "E_Waste",
    "Organic_Waste",
    "General_Trash",
]
NUM_CLASSES = len(CLASS_NAMES)   # 9

BATCH_SIZE  = 64
EPOCHS      = 20
LR          = 1e-3
LR_PATIENCE = 3    # ReduceLROnPlateau patience
EWASTE_CAP  = 8000 # downsample E_Waste train split to this many images

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Device: {DEVICE}  |  Classes: {NUM_CLASSES}")

# ── [Cell 3] Transforms ───────────────────────────────────────────────────────

IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD  = [0.229, 0.224, 0.225]

train_tf = T.Compose([
    T.RandomResizedCrop(224, scale=(0.7, 1.0)),
    T.RandomHorizontalFlip(),
    T.RandomVerticalFlip(p=0.1),
    T.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.2, hue=0.05),
    T.RandomRotation(15),
    T.ToTensor(),
    T.Normalize(IMAGENET_MEAN, IMAGENET_STD),
])

val_tf = T.Compose([
    T.Resize(256),
    T.CenterCrop(224),
    T.ToTensor(),
    T.Normalize(IMAGENET_MEAN, IMAGENET_STD),
])

# ── [Cell 4] Datasets with E_Waste cap ───────────────────────────────────────

def make_dataset(split, transform, ewaste_cap=None):
    ds = datasets.ImageFolder(DATA_DIR / split, transform=transform)

    # Verify class order matches CLASS_NAMES
    assert ds.classes == sorted(CLASS_NAMES), (
        f"Class mismatch!\n  Found:    {ds.classes}\n  Expected: {sorted(CLASS_NAMES)}"
    )

    if ewaste_cap is None or split != "train":
        return ds

    # Cap E_Waste class
    ewaste_idx = ds.class_to_idx["E_Waste"]
    ewaste_indices = [i for i, (_, c) in enumerate(ds.samples) if c == ewaste_idx]
    other_indices  = [i for i, (_, c) in enumerate(ds.samples) if c != ewaste_idx]

    if len(ewaste_indices) > ewaste_cap:
        random.seed(42)
        ewaste_indices = random.sample(ewaste_indices, ewaste_cap)
        print(f"  E_Waste capped: {len(ewaste_indices)} train images (was {sum(1 for _,c in ds.samples if c==ewaste_idx)})")

    return Subset(ds, other_indices + ewaste_indices)

train_ds = make_dataset("train", train_tf, ewaste_cap=EWASTE_CAP)
valid_ds  = make_dataset("valid", val_tf)
test_ds   = make_dataset("test",  val_tf)

train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True,  num_workers=2, pin_memory=True)
valid_loader = DataLoader(valid_ds, batch_size=BATCH_SIZE, shuffle=False, num_workers=2, pin_memory=True)
test_loader  = DataLoader(test_ds,  batch_size=BATCH_SIZE, shuffle=False, num_workers=2, pin_memory=True)

print(f"Train: {len(train_ds)}  Valid: {len(valid_ds)}  Test: {len(test_ds)}")

# ── [Cell 5] Model ────────────────────────────────────────────────────────────

model = models.mobilenet_v3_small(weights=models.MobileNet_V3_Small_Weights.IMAGENET1K_V1)

# Replace classifier head for NUM_CLASSES
in_features = model.classifier[3].in_features
model.classifier[3] = nn.Linear(in_features, NUM_CLASSES)

model = model.to(DEVICE)
print(model.classifier)

# ── [Cell 6] Training loop ────────────────────────────────────────────────────

criterion = nn.CrossEntropyLoss(label_smoothing=0.1)
optimizer = torch.optim.AdamW(model.parameters(), lr=LR, weight_decay=1e-4)
scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
    optimizer, mode="max", patience=LR_PATIENCE, factor=0.3, verbose=True
)

best_val_acc = 0.0
best_state   = None

for epoch in range(1, EPOCHS + 1):
    # ── train ──
    model.train()
    train_loss, train_correct, train_total = 0.0, 0, 0
    t0 = time.time()
    for imgs, labels in train_loader:
        imgs, labels = imgs.to(DEVICE), labels.to(DEVICE)
        optimizer.zero_grad()
        out  = model(imgs)
        loss = criterion(out, labels)
        loss.backward()
        optimizer.step()
        train_loss    += loss.item() * imgs.size(0)
        train_correct += (out.argmax(1) == labels).sum().item()
        train_total   += imgs.size(0)

    # ── validate ──
    model.eval()
    val_correct, val_total = 0, 0
    with torch.no_grad():
        for imgs, labels in valid_loader:
            imgs, labels = imgs.to(DEVICE), labels.to(DEVICE)
            out = model(imgs)
            val_correct += (out.argmax(1) == labels).sum().item()
            val_total   += imgs.size(0)

    train_acc = train_correct / train_total
    val_acc   = val_correct   / val_total
    elapsed   = time.time() - t0

    print(f"Epoch {epoch:02d}/{EPOCHS}  "
          f"loss={train_loss/train_total:.4f}  "
          f"train={train_acc:.4f}  val={val_acc:.4f}  "
          f"lr={optimizer.param_groups[0]['lr']:.2e}  {elapsed:.0f}s")

    scheduler.step(val_acc)

    if val_acc > best_val_acc:
        best_val_acc = val_acc
        best_state   = {k: v.cpu().clone() for k, v in model.state_dict().items()}
        print(f"  ✓ New best val acc: {best_val_acc:.4f}")

print(f"\nBest validation accuracy: {best_val_acc:.4f}")

# ── [Cell 7] Test set evaluation ──────────────────────────────────────────────

model.load_state_dict(best_state)
model.eval()

from collections import defaultdict
import numpy as np

all_preds, all_labels = [], []
with torch.no_grad():
    for imgs, labels in test_loader:
        imgs = imgs.to(DEVICE)
        preds = model(imgs).argmax(1).cpu()
        all_preds.extend(preds.tolist())
        all_labels.extend(labels.tolist())

all_preds  = np.array(all_preds)
all_labels = np.array(all_labels)

overall_acc = (all_preds == all_labels).mean()
print(f"\nTest accuracy: {overall_acc:.4f}")
print("\nPer-class F1:")

# Manual per-class precision / recall / F1
for cls_idx, cls_name in enumerate(CLASS_NAMES):
    tp = ((all_preds == cls_idx) & (all_labels == cls_idx)).sum()
    fp = ((all_preds == cls_idx) & (all_labels != cls_idx)).sum()
    fn = ((all_preds != cls_idx) & (all_labels == cls_idx)).sum()
    prec = tp / (tp + fp + 1e-9)
    rec  = tp / (tp + fn + 1e-9)
    f1   = 2 * prec * rec / (prec + rec + 1e-9)
    print(f"  {cls_name:<22}  P={prec:.3f}  R={rec:.3f}  F1={f1:.3f}")

# ── [Cell 8] Export to ONNX (single file, no external data) ──────────────────

import torch.onnx

model.load_state_dict(best_state)
model.eval()
model.cpu()

dummy = torch.zeros(1, 3, 224, 224)

torch.onnx.export(
    model,
    dummy,
    str(OUT_ONNX),
    input_names=["input"],
    output_names=["output"],
    dynamic_axes={"input": {0: "batch"}, "output": {0: "batch"}},
    opset_version=17,
)

size_mb = OUT_ONNX.stat().st_size / 1_000_000
print(f"\nExported: {OUT_ONNX}  ({size_mb:.1f} MB)")

# Verify no external data file was created
assert not Path(str(OUT_ONNX) + ".data").exists(), "External .data file found — re-export with save_as_external_data=False"
print("✓ Single-file ONNX confirmed (no .data sidecar)")

# ── [Cell 9] Download the model ───────────────────────────────────────────────

from google.colab import files
files.download(str(OUT_ONNX))

print("""
Done! Next steps:
  1. Replace public/advanced_waste_model.onnx with smart_recycle_v2.onnx
  2. Update CLASS_LABELS in src/constants/recycle.ts to the 9 new class names
  3. Update disposal tips in src/constants/disposal.ts
  4. Update ModelPage metrics in src/pages/ModelPage.tsx
""")
