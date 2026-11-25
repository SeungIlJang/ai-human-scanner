import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
let detector
export async function getDetector() {
  if (detector) return detector
  if (!await FilesetResolver.isSimdSupported()) throw new Error('이 브라우저는 고속 얼굴 분석(SIMD)을 지원하지 않습니다. 최신 브라우저로 업데이트해 주세요.')
  const wasm = await FilesetResolver.forVisionTasks(`${import.meta.env.BASE_URL}wasm`)
  detector = await FaceLandmarker.createFromOptions(wasm, { baseOptions: { modelAssetPath: `${import.meta.env.BASE_URL}models/face_landmarker.task`, delegate: 'CPU' }, runningMode: 'IMAGE', numFaces: 2, minFaceDetectionConfidence: .5, minFacePresenceConfidence: .5 })
  return detector
}
export async function detectFace(source) { return (await getDetector()).detect(source).faceLandmarks }
export async function loadImage(src) { return await new Promise((resolve,reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error('이미지를 읽을 수 없습니다.')); img.src = src }) }
