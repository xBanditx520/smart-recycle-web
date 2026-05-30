import * as ort from 'onnxruntime-web';
import { IMAGE_MEAN, IMAGE_SIZE, IMAGE_STD } from '../constants/recycle';
import type { ModelInfo } from '../types/recycle';

function getImageElement(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Invalid image file.'));
    };
    image.src = objectUrl;
  });
}

function buildTensorData(imageData: ImageData, layout: ModelInfo['layout']) {
  const { data } = imageData;
  const channelSize = IMAGE_SIZE * IMAGE_SIZE;
  const output = new Float32Array(layout === 'nchw' ? 3 * channelSize : 3 * channelSize);

  for (let i = 0; i < channelSize; i += 1) {
    const pixelIndex = i * 4;
    const red = data[pixelIndex] / 255;
    const green = data[pixelIndex + 1] / 255;
    const blue = data[pixelIndex + 2] / 255;

    const normalizedRed = (red - IMAGE_MEAN[0]) / IMAGE_STD[0];
    const normalizedGreen = (green - IMAGE_MEAN[1]) / IMAGE_STD[1];
    const normalizedBlue = (blue - IMAGE_MEAN[2]) / IMAGE_STD[2];

    if (layout === 'nchw') {
      output[i] = normalizedRed;
      output[channelSize + i] = normalizedGreen;
      output[channelSize * 2 + i] = normalizedBlue;
    } else {
      const baseIndex = i * 3;
      output[baseIndex] = normalizedRed;
      output[baseIndex + 1] = normalizedGreen;
      output[baseIndex + 2] = normalizedBlue;
    }
  }

  return output;
}

export async function preprocessImageFile(file: File, modelInfo: ModelInfo) {
  const image = await getImageElement(file);
  const canvas = document.createElement('canvas');
  canvas.width = IMAGE_SIZE;
  canvas.height = IMAGE_SIZE;
  const context = canvas.getContext('2d', { willReadFrequently: true });

  if (!context) {
    throw new Error('Canvas is not supported in this browser.');
  }

  context.drawImage(image, 0, 0, IMAGE_SIZE, IMAGE_SIZE);
  const imageData = context.getImageData(0, 0, IMAGE_SIZE, IMAGE_SIZE);
  const tensorData = buildTensorData(imageData, modelInfo.layout);

  return new ort.Tensor(
    'float32',
    tensorData,
    modelInfo.layout === 'nchw' ? [1, 3, IMAGE_SIZE, IMAGE_SIZE] : [1, IMAGE_SIZE, IMAGE_SIZE, 3]
  );
}
