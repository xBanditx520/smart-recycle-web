export type RecycleLabel = string;

export interface PredictionResult {
  label: RecycleLabel;
  confidence: number;
  probabilities: number[];
  rawScores: number[];
  inferenceMs: number;
  classLabels?: string[];
  topClasses?: Array<{ label: string; confidence: number }>;
}

export interface PredictionRecord extends PredictionResult {
  id: string;
  fileName: string;
  previewUrl: string;
  createdAt: string;
  source?: 'upload' | 'camera';
  modelVersion?: string;
}

export interface ModelInfo {
  inputName: string;
  inputShape: number[];
  outputName: string;
  layout: 'nchw' | 'nhwc';
}

