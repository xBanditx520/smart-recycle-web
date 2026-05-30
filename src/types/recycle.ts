export type RecycleLabel = 'recyclable' | 'non-recyclable';

export interface PredictionResult {
  label: RecycleLabel;
  confidence: number;
  probabilities: [number, number];
  rawScores: number[];
  inferenceMs: number;
}

export interface PredictionRecord extends PredictionResult {
  id: string;
  fileName: string;
  previewUrl: string;
  createdAt: string;
}

export interface ModelInfo {
  inputName: string;
  inputShape: number[];
  outputName: string;
  layout: 'nchw' | 'nhwc';
}
