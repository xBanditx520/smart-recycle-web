import * as ort from 'onnxruntime-web';
import { COMPOSITE_THRESHOLD, DEFAULT_MODEL_URL } from '../constants/recycle';
import type { ModelInfo, PredictionClassScore, PredictionResult } from '../types/recycle';
import { preprocessImageFile } from './preprocess';

export type ExecutionProvider = 'wasm' | 'webgpu';

let modelPromise: Promise<ort.InferenceSession> | null = null;
let modelInfo: ModelInfo | null = null;
let currentProvider: ExecutionProvider | null = null;
let currentModelUrl: string | null = null;

ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/';

function getLayoutFromShape(shape: readonly number[]) {
  if (shape.length === 4) {
    if (shape[1] === 3) return 'nchw' as const;
    if (shape[3] === 3) return 'nhwc' as const;
  }
  return 'nchw' as const;
}

function getShapeList(value: unknown) {
  const meta = value as { dimensions?: ReadonlyArray<number | bigint> } | undefined;
  return (meta?.dimensions ?? []).map((d): number => (typeof d === 'bigint' ? -1 : d));
}

export async function loadModel(
  modelUrl: string = DEFAULT_MODEL_URL,
  executionProvider: ExecutionProvider = 'wasm'
) {
  if (!modelPromise || currentProvider !== executionProvider || currentModelUrl !== modelUrl) {
    modelPromise = ort.InferenceSession.create(modelUrl, {
      executionProviders: [executionProvider],
      graphOptimizationLevel: 'all'
    });
    currentProvider = executionProvider;
    currentModelUrl = modelUrl;
  }

  const session = await modelPromise;
  const input = session.inputNames[0];
  const output = session.outputNames[0];
  // inputMetadata is not in the public ort type definitions but exists at runtime
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inputShape = getShapeList((session as any).inputMetadata?.[input]);
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

export function resetModel() {
  modelPromise = null;
  modelInfo = null;
  currentProvider = null;
  currentModelUrl = null;
}

export function getExecutionProvider() {
  return currentProvider;
}

function softmax(values: number[]) {
  const max = Math.max(...values);
  const exponentials = values.map((value) => Math.exp(value - max));
  const total = exponentials.reduce((sum, value) => sum + value, 0);
  return exponentials.map((value) => value / total);
}

function extractScores(output: ort.Tensor) {
  const { data } = output;
  let values: number[];
  if (data instanceof BigInt64Array || data instanceof BigUint64Array) {
    values = Array.from(data, (v) => Number(v));
  } else {
    values = Array.from(data as ArrayLike<number>);
  }
  if (values.length === 1) {
    const score = values[0] ?? 0;
    return [1 - score, score];
  }
  if (values.length >= 2) return values;
  return [0, 0];
}

function buildRankedScores(scores: number[], classLabels?: string[]): PredictionClassScore[] {
  return scores
    .map((confidence, index) => ({
      label: classLabels?.[index] ?? `Class ${index + 1}`,
      confidence
    }))
    .sort((left, right) => right.confidence - left.confidence);
}

export async function runPrediction(
  file: File,
  modelUrl: string = DEFAULT_MODEL_URL,
  executionProvider: ExecutionProvider = 'wasm',
  classLabels?: string[]
): Promise<PredictionResult> {
  const { session, modelInfo: loadedModelInfo } = await loadModel(modelUrl, executionProvider);
  const startedAt = performance.now();
  const inputTensor = await preprocessImageFile(file, loadedModelInfo);
  const feeds = { [loadedModelInfo.inputName]: inputTensor } as Record<string, ort.Tensor>;
  const outputs = await session.run(feeds);
  const outputTensor = outputs[loadedModelInfo.outputName] ?? outputs[session.outputNames[0]];

  if (!outputTensor) {
    throw new Error('Model output is empty.');
  }

  const rawScores = extractScores(outputTensor);
  const scores = softmax(rawScores);
  const rankedScores = buildRankedScores(scores, classLabels);
  const bestScore = rankedScores[0];
  const secondScore = rankedScores[1];
  const isAdvancedClassification = Boolean(classLabels?.length && classLabels.length > 2);
  const isComposite = Boolean(isAdvancedClassification && secondScore && secondScore.confidence > COMPOSITE_THRESHOLD);

  const label = isAdvancedClassification
    ? isComposite
      ? 'Composite Item'
      : bestScore?.label ?? 'Unknown'
    : (scores[1] ?? 0) >= (scores[0] ?? 0)
      ? 'recyclable'
      : 'non-recyclable';

  const topClasses = isAdvancedClassification ? rankedScores.slice(0, 2) : rankedScores.slice(0, 2);

  return {
    label,
    confidence: bestScore?.confidence ?? 0,
    probabilities: scores,
    rawScores,
    inferenceMs: performance.now() - startedAt,
    topClasses,
    isComposite
  };
}
