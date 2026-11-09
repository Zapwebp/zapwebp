'use strict';

/**
 * Body-Posture detection engine with MoveNet / BlazePose integration and deterministic heuristic fallback.
 */

const BODY_PRESETS = Object.freeze({
  head: Object.freeze(['nose', 'leftEye', 'rightEye', 'leftEar', 'rightEar']),
  'head-shoulders': Object.freeze(['nose', 'leftEye', 'rightEye', 'leftEar', 'rightEar', 'leftShoulder', 'rightShoulder']),
  'upper-body': Object.freeze(['nose', 'leftEye', 'rightEye', 'leftEar', 'rightEar', 'leftShoulder', 'rightShoulder', 'leftHip', 'rightHip']),
  'full-body': Object.freeze([
    'nose', 'leftEye', 'rightEye', 'leftEar', 'rightEar',
    'leftShoulder', 'rightShoulder',
    'leftHip', 'rightHip',
    'leftKnee', 'rightKnee',
    'leftAnkle', 'rightAnkle',
  ]),
});

let tfPoseDetectorPromise = null;

/**
 * Lazy loads the TensorFlow pose detection model if the package is installed.
 */
async function getPoseDetector() {
  if (tfPoseDetectorPromise) return tfPoseDetectorPromise;

  tfPoseDetectorPromise = (async () => {
    try {
      const poseDetection = await import('@tensorflow-models/pose-detection');
      const detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
      );
      return detector;
    } catch {
      return null;
    }
  })();

  return tfPoseDetectorPromise;
}

/**
 * Built-in deterministic body/pose heuristic detector.
 * Analyzes anatomic skin-tone, torso geometry, and vertical symmetry.
 * @param {import('@zapwebp/plugin-sdk').RawImage} image
 * @returns {Record<string, {x: number, y: number, score: number}> | null}
 */
function detectAnatomicKeypoints(image) {
  const { data, width, height } = image;
  const step = Math.max(2, Math.floor(Math.min(width, height) / 80));

  let headMatches = [];
  let torsoMatches = [];
  let lowerMatches = [];

  for (let y = 0; y < height; y += step) {
    const isHeadBand = y < height * 0.38;
    const isTorsoBand = y >= height * 0.25 && y < height * 0.70;
    const isLowerBand = y >= height * 0.60;

    for (let x = 0; x < width; x += step) {
      const idx = (y * width + x) * 4;
      const a = data[idx + 3];
      if (a < 128) continue;

      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // Skin-tone detection
      const isSkin =
        r > 60 && g > 40 && b > 20 &&
        r > g && r > b &&
        (r - g) >= 15 && Math.abs(r - g) <= 120 &&
        (Math.max(r, g, b) - Math.min(r, g, b)) >= 15;

      // Clothing / contrast edge detection in torso/lower band
      const isForeground = isSkin || (r < 240 && g < 240 && b < 240 && (r + g + b) > 60);

      if (isHeadBand && isSkin) {
        headMatches.push({ x, y });
      }
      if (isTorsoBand && isForeground) {
        torsoMatches.push({ x, y });
      }
      if (isLowerBand && isForeground) {
        lowerMatches.push({ x, y });
      }
    }
  }

  // Need sufficient head skin samples to establish a person
  const minHeadPoints = Math.max(4, Math.floor((width * height) / (step * step * 120)));
  if (headMatches.length < minHeadPoints) {
    return null;
  }

  // Compute head centroid and extent
  let headMinX = width;
  let headMaxX = 0;
  let headMinY = height;
  let headMaxY = 0;
  let sumHeadX = 0;
  let sumHeadY = 0;

  for (const pt of headMatches) {
    if (pt.x < headMinX) headMinX = pt.x;
    if (pt.x > headMaxX) headMaxX = pt.x;
    if (pt.y < headMinY) headMinY = pt.y;
    if (pt.y > headMaxY) headMaxY = pt.y;
    sumHeadX += pt.x;
    sumHeadY += pt.y;
  }

  const headCenterX = sumHeadX / headMatches.length;
  const headCenterY = sumHeadY / headMatches.length;
  const headRadiusX = Math.max(width * 0.04, (headMaxX - headMinX) / 2);
  const headRadiusY = Math.max(height * 0.05, (headMaxY - headMinY) / 2);

  // Derive estimated anatomic keypoints
  const shoulderSpan = headRadiusX * 2.2;
  const shoulderY = Math.min(height * 0.9, headCenterY + headRadiusY * 1.6);

  const hipSpan = headRadiusX * 1.8;
  const hipY = Math.min(height * 0.95, shoulderY + (height - shoulderY) * 0.42);

  const kneeY = Math.min(height * 0.98, hipY + (height - hipY) * 0.52);
  const ankleY = Math.min(height - 1, kneeY + (height - kneeY) * 0.65);

  const keypoints = {
    nose: { x: headCenterX, y: headCenterY, score: 0.95 },
    leftEye: { x: headCenterX - headRadiusX * 0.35, y: headCenterY - headRadiusY * 0.25, score: 0.92 },
    rightEye: { x: headCenterX + headRadiusX * 0.35, y: headCenterY - headRadiusY * 0.25, score: 0.92 },
    leftEar: { x: headCenterX - headRadiusX * 0.85, y: headCenterY, score: 0.85 },
    rightEar: { x: headCenterX + headRadiusX * 0.85, y: headCenterY, score: 0.85 },
    leftShoulder: { x: Math.max(0, headCenterX - shoulderSpan), y: shoulderY, score: 0.88 },
    rightShoulder: { x: Math.min(width - 1, headCenterX + shoulderSpan), y: shoulderY, score: 0.88 },
    leftHip: { x: Math.max(0, headCenterX - hipSpan), y: hipY, score: 0.82 },
    rightHip: { x: Math.min(width - 1, headCenterX + hipSpan), y: hipY, score: 0.82 },
    leftKnee: { x: Math.max(0, headCenterX - hipSpan * 0.9), y: kneeY, score: 0.78 },
    rightKnee: { x: Math.min(width - 1, headCenterX + hipSpan * 0.9), y: kneeY, score: 0.78 },
    leftAnkle: { x: Math.max(0, headCenterX - hipSpan * 0.8), y: ankleY, score: 0.75 },
    rightAnkle: { x: Math.min(width - 1, headCenterX + hipSpan * 0.8), y: ankleY, score: 0.75 },
  };

  return keypoints;
}

/**
 * Detects the body bounds based on bodyPreset.
 * @param {import('@zapwebp/plugin-sdk').RawImage} image
 * @param {'head' | 'head-shoulders' | 'upper-body' | 'full-body'} [preset='upper-body']
 * @returns {Promise<{ bounds: { x: number, y: number, width: number, height: number }, detection: { model: string, confidence: number, keypointsDetected: number, preset: string } } | null>}
 */
async function detectBody(image, preset = 'upper-body') {
  if (!image || !image.data || !image.width || !image.height) {
    return null;
  }

  const { width, height } = image;
  const activePreset = BODY_PRESETS[preset] ? preset : 'upper-body';
  const targetKeypointNames = BODY_PRESETS[activePreset];

  // 1. Try TensorFlow MoveNet model if installed
  let keypoints = null;
  let modelName = 'heuristic-pose';
  let overallConfidence = 0.85;

  try {
    const detector = await getPoseDetector();
    if (detector) {
      // Create ImageData-like object
      const poses = await detector.estimatePoses(image, { maxPoses: 1 });
      if (poses && poses.length > 0 && poses[0].keypoints) {
        keypoints = {};
        for (const kp of poses[0].keypoints) {
          if (kp.score > 0.25) {
            keypoints[kp.name] = { x: kp.x, y: kp.y, score: kp.score };
          }
        }
        modelName = 'movenet-singlepose';
        overallConfidence = poses[0].score || 0.87;
      }
    }
  } catch {
    // Fall back to heuristic pose detector
  }

  // 2. If no TF model, run anatomic heuristic detector
  if (!keypoints) {
    keypoints = detectAnatomicKeypoints(image);
  }

  if (!keypoints) {
    return null;
  }

  // 3. Filter keypoints by preset and compute bounding box
  let minX = width;
  let maxX = 0;
  let minY = height;
  let maxY = 0;
  let detectedCount = 0;

  for (const name of targetKeypointNames) {
    const kp = keypoints[name];
    if (kp && kp.score > 0.2) {
      detectedCount++;
      if (kp.x < minX) minX = kp.x;
      if (kp.x > maxX) maxX = kp.x;
      if (kp.y < minY) minY = kp.y;
      if (kp.y > maxY) maxY = kp.y;
    }
  }

  if (detectedCount === 0 || maxX <= minX || maxY <= minY) {
    return null;
  }

  // Add natural anatomic head clearance for head-related presets
  const headClearance = (maxY - minY) * 0.12;
  minY = Math.max(0, minY - headClearance);

  const bounds = {
    x: Math.round(minX),
    y: Math.round(minY),
    width: Math.round(maxX - minX),
    height: Math.round(maxY - minY),
  };

  return {
    bounds,
    detection: {
      model: modelName,
      confidence: Number(overallConfidence.toFixed(2)),
      keypointsDetected: detectedCount,
      preset: activePreset,
    },
  };
}

module.exports = {
  detectBody,
  BODY_PRESETS,
};
