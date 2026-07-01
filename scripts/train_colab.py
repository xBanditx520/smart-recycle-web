"""
Smart Recycle v2 — MobileNetV3-Small training script (9-class)
Run in Google Colab or Kaggle Notebooks (GPU runtime).

Colab usage:
  1. Mount Google Drive: from google.colab import drive; drive.mount('/content/drive')
  2. Unzip dataset: !unzip /content/drive/MyDrive/data_classified_v2.zip -d /content/
  3. Paste this script cell-by-cell.
  4. If Colab disconnects, just re-run from [Cell 1] — it auto-resumes from the last checkpoint.

Kaggle usage (recommended — 12 hrs uninterrupted GPU):
  1. Create a new Notebook, add your dataset as input.
  2. Set DATA_DIR to /kaggle/input/your-dataset/data_classified_v2
  3. Set CHECKPOINT_DIR to /kaggle/working/
  4. Run all. Download the .onnx from the output panel when done.
"""

# ── [Cell 1] Imports ──────────────────────────────────────────────────────────
import os, random, time
from pathlib import Path

import torch
import torch.nn as nn
import torchvision.transforms as T
from torchvision import datasets, models
from torch.utils.data import DataLoader, Subset
import numpy as np

# ── [Cell 2] Config ───────────────────────────────────────────────────────────

# ↓ Set paths based on your environment:
#
#   Colab:
#     DATA_DIR       = Path("/content/data_classified_v2")
#     CHECKPOINT_DIR = Path("/content/drive/MyDrive/smart_recycle_checkpoints")
#
#   Kaggle (dataset name becomes hyphenated, e.g. data-classified-v2):
#     DATA_DIR       = Path("/kaggle/input/data-classified-v2/data_classified_v2")
#     CHECKPOINT_DIR = Path("/kaggle/working/checkpoints")
#
#   To find your exact Kaggle path, run in a separate cell:
#     import os
#     for r,d,_ in os.walk('/kaggle/input'):
#         if r.count(os.sep) < 6: print(r)

DATA_DIR       = Path("/kaggle/input/data-classified-v2/data_classified_v2")
CHECKPOINT_DIR = Path("/kaggle/working/checkpoints")

OUT_ONNX = CHECKPOINT_DIR / "smart_recycle_v2.onnx"

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
NUM_CLASSES = len(CLASS_NAMES)  # 9

BATCH_SIZE      = 64
EPOCHS          = 20
LR              = 1e-3
LR_PATIENCE     = 3
EWASTE_CAP      = 8000   # cap E_Waste train images to reduce imbalance
CHECKPOINT_FREQ = 5      # save checkpoint every N epochs

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
CHECKPOINT_DIR.mkdir(parents=True, exist_ok=True)
print(f"Device: {DEVICE}  |  Classes: {NUM_CLASSES}")
print(f"Checkpoints → {CHECKPOINT_DIR}")

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

# ── [Cell 4] Datasets ─────────────────────────────────────────────────────────

def make_dataset(split, transform, ewaste_cap=None):
    ds = datasets.ImageFolder(DATA_DIR / split, transform=transform)

    # ImageFolder sorts classes alphabetically — verify order
    expected = sorted(CLASS_NAMES)
    assert ds.classes == expected, (
        f"Class order mismatch!\n  Found:    {ds.classes}\n  Expected: {expected}\n"
        "Make sure all 9 class folders exist in the dataset."
    )

    if ewaste_cap is None or split != "train":
        return ds

    ewaste_idx     = ds.class_to_idx["E_Waste"]
    ewaste_indices = [i for i, (_, c) in enumerate(ds.samples) if c == ewaste_idx]
    other_indices  = [i for i, (_, c) in enumerate(ds.samples) if c != ewaste_idx]

    if len(ewaste_indices) > ewaste_cap:
        random.seed(42)
        ewaste_indices = random.sample(ewaste_indices, ewaste_cap)
        print(f"  E_Waste capped to {ewaste_cap} (was {sum(1 for _,c in ds.samples if c==ewaste_idx)})")

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
in_features = model.classifier[3].in_features
model.classifier[3] = nn.Linear(in_features, NUM_CLASSES)
model = model.to(DEVICE)

criterion = nn.CrossEntropyLoss(label_smoothing=0.1)
optimizer = torch.optim.AdamW(model.parameters(), lr=LR, weight_decay=1e-4)
scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
    optimizer, mode="max", patience=LR_PATIENCE, factor=0.3
)

# ── [Cell 6] Resume from checkpoint if available ──────────────────────────────

start_epoch  = 1
best_val_acc = 0.0
best_state   = None

latest_ckpt = CHECKPOINT_DIR / "latest_checkpoint.pt"
if latest_ckpt.exists():
    print(f"Resuming from {latest_ckpt} …")
    ckpt = torch.load(latest_ckpt, map_location=DEVICE)
    model.load_state_dict(ckpt["model"])
    optimizer.load_state_dict(ckpt["optimizer"])
    scheduler.load_state_dict(ckpt["scheduler"])
    start_epoch  = ckpt["epoch"] + 1
    best_val_acc = ckpt["best_val_acc"]
    best_state   = ckpt["best_state"]
    print(f"  Resumed at epoch {start_epoch}, best val acc so far: {best_val_acc:.4f}")
else:
    print("No checkpoint found — starting from scratch.")

# ── [Cell 7] Training loop ────────────────────────────────────────────────────

for epoch in range(start_epoch, EPOCHS + 1):
    # Train
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

    # Validate
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

    # Save best weights
    if val_acc > best_val_acc:
        best_val_acc = val_acc
        best_state   = {k: v.cpu().clone() for k, v in model.state_dict().items()}
        torch.save(best_state, CHECKPOINT_DIR / "best_weights.pt")
        print(f"  ✓ New best val acc: {best_val_acc:.4f}  (saved best_weights.pt)")

    # Save resumable checkpoint every CHECKPOINT_FREQ epochs
    if epoch % CHECKPOINT_FREQ == 0:
        torch.save({
            "epoch":        epoch,
            "model":        model.state_dict(),
            "optimizer":    optimizer.state_dict(),
            "scheduler":    scheduler.state_dict(),
            "best_val_acc": best_val_acc,
            "best_state":   best_state,
        }, latest_ckpt)
        print(f"  💾 Checkpoint saved at epoch {epoch} → {latest_ckpt}")

print(f"\nBest validation accuracy: {best_val_acc:.4f}")

# ── [Cell 8] Test set evaluation ──────────────────────────────────────────────

model.load_state_dict(best_state)
model.eval()

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
print(f"\n{'Class':<22}  {'Precision':>9}  {'Recall':>6}  {'F1':>6}  {'N':>5}")
print("-" * 55)
for cls_idx, cls_name in enumerate(CLASS_NAMES):
    tp = int(((all_preds == cls_idx) & (all_labels == cls_idx)).sum())
    fp = int(((all_preds == cls_idx) & (all_labels != cls_idx)).sum())
    fn = int(((all_preds != cls_idx) & (all_labels == cls_idx)).sum())
    n  = int((all_labels == cls_idx).sum())
    prec = tp / (tp + fp + 1e-9)
    rec  = tp / (tp + fn + 1e-9)
    f1   = 2 * prec * rec / (prec + rec + 1e-9)
    print(f"  {cls_name:<22}  {prec:>9.3f}  {rec:>6.3f}  {f1:>6.3f}  {n:>5}")

# ── [Cell 9] Export ONNX ──────────────────────────────────────────────────────

model.cpu()
dummy = torch.zeros(1, 3, 224, 224)

torch.onnx.export(
    model, dummy, str(OUT_ONNX),
    dynamo=False,   # legacy TorchScript path — no onnxscript dependency
    input_names=["input"],
    output_names=["output"],
    dynamic_axes={"input": {0: "batch"}, "output": {0: "batch"}},
    opset_version=17,
)

size_mb = OUT_ONNX.stat().st_size / 1_000_000
print(f"\nExported: {OUT_ONNX}  ({size_mb:.1f} MB)")
assert not Path(str(OUT_ONNX) + ".data").exists(), "External .data file — re-export!"
print("✓ Single-file ONNX confirmed")

# ── [Cell 10] Download (Colab only) ───────────────────────────────────────────

try:
    from google.colab import files
    files.download(str(OUT_ONNX))
except ImportError:
    print(f"Kaggle: download {OUT_ONNX} from the Output panel on the right.")
