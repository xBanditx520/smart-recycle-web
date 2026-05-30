import * as ort from 'onnxruntime-web';
import { DEFAULT_MODEL_URL } from '../constants/recycle';
import type { ModelInfo, PredictionResult } from '../types/recycle';
import { preprocessImageFile } from './preprocess';

let modelPromise: Promise<ort.InferenceSession> | null = null;
let modelInfo: ModelInfo | null = null;

ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/';

function getLayoutFromShape(shape: readonly number[]) {
  if (shape.length === 4) {
    if (shape[1] === 3) return 'nchw' as const;
    if (shape[3] === 3) return 'nhwc' as const;
  }
  return 'nchw' as const;
}

function getShapeList(value: ort.TensorTypeAndShapeInfo | undefined) {
  return (value?.dimensions ?? []).map((dimension) => (typeof dimension === 'number' ? dimension : -1));
}

export async function loadModel(modelUrl: string = DEFAULT_MODEL_URL) {
  if (!modelPromise) {
    modelPromise = ort.InferenceSession.create(modelUrl, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all'
    });
  }

  const session = await modelPromise;
  const input = session.inputNames[0];
  const output = session.outputNames[0];
  const inputShape = getShapeList(session.inputMetadata[input]);
  modelInfo = {
    inputName: input,
    inputShape,
    outputName: output,
    layout: getLayoutFromShape(inputShape)
  };

  return { session, modelInfo };
}

export function getLoadedModelInfo() {
  return modelInfo;
}

export function isModelLoaded() {
  return Boolean(modelInfo);
}

function softmax(values: number[]) {
  const max = Math.max(...values);
  const exponentials = values.map((value) => Math.exp(value - max));
  const total = exponentials.reduce((sum, value) => sum + value, 0);
  return exponentials.map((value) => value / total);
}

function extractScores(output: ort.Tensor) {
  const values = Array.from(output.data as Float32Array | Float64Array | Int32Array | Uint8Array | Uint16Array | BigInt64Array | BigUint64Array);
  if (values.length >= 2) {
    return values.slice(0, 2).map(Number);
  }
  if (values.length === 1) {
    const score = Number(values[0]);
    return [1 - score, score];
  }
  return [0, 0];
}

export async function runPrediction(file: File, modelUrl: string = DEFAULT_MODEL_URL): Promise<PredictionResult> {
  const { session, modelInfo: loadedModelInfo } = await loadModel(modelUrl);
  const startedAt = performance.now();
  const inputTensor = await preprocessImageFile(file, loadedModelInfo);
  const feeds = { [loadedModelInfo.inputName]: inputTensor } as Record<string, ort.Tensor>;
  const outputs = await session.run(feeds);
  const outputTensor = outputs[loadedModelInfo.outputName] ?? outputs[session.outputNames[0]];

  if (!outputTensor) {
    throw new Error('Model output is empty.');
  }

  const scores = softmax(extractScores(outputTensor));
  const recyclableProbability = scores[1] ?? 0;
  const nonRecyclableProbability = scores[0] ?? 0;
  const label = recyclableProbability >= nonRecyclableProbability ? 'recyclable' : 'non-recyclable';

  return {
    label,
    confidence: Math.max(recyclableProbability, nonRecyclableProbability),
    probabilities: [nonRecyclableProbability, recyclableProbability],
    rawScores: extractScores(outputTensor),
    inferenceMs: performance.now() - startedAt
  };
}
