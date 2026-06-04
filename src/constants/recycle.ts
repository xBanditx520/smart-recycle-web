export const IMAGE_SIZE = 224;
export const IMAGE_MEAN = [0.485, 0.456, 0.406] as const;
export const IMAGE_STD = [0.229, 0.224, 0.225] as const;
export const DEFAULT_MODEL_URL = import.meta.env.VITE_MODEL_URL ?? '/waste_model.onnx';
export const ADVANCED_MODEL_URL = import.meta.env.VITE_ADVANCED_MODEL_URL ?? '/advanced_waste_model.onnx';
export const STORAGE_KEY = 'smart-recycle-history';
