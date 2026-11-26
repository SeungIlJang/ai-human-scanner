import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
let detector
let loading
let currentMode = 'IMAGE'
// MediaPipe ships a SIMD-only binary. This is the smallest module that uses a SIMD instruction.
const simdSupported = typeof WebAssembly === 'object' && WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11]))
export async function getDetector(mode = 'IMAGE') {
  if (!simdSupported) throw new Error('이 브라우저는 고속 얼굴 분석(SIMD)을 지원하지 않습니다. 최신 브라우저로 업데이트해 주세요.')
  if (!detector) {
    if (!loading) loading = (async () => {
      const wasm = await FilesetResolver.forVisionTasks(`${import.meta.env.BASE_URL}wasm`)
      return FaceLandmarker.createFromOptions(wasm, {
        baseOptions: { modelAssetPath: `${import.meta.env.BASE_URL}models/face_landmarker.task`, delegate: 'CPU' },
        runningMode: 'IMAGE',
        numFaces: 2,
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true
      })
    })()
    try { detector = await loading }
    catch (error) { loading = null; throw error }
  }
  if (currentMode !== mode) {
    // MediaPipe smooths video landmarks only when numFaces is 1.
    await detector.setOptions({ runningMode: mode, numFaces: mode === 'VIDEO' ? 1 : 2 })
    currentMode = mode
  }
  return detector
}
export async function detectFace(source) { return (await getDetector('IMAGE')).detect(source).faceLandmarks }
export async function loadImage(src) { return await new Promise((resolve,reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error('이미지를 읽을 수 없습니다.')); img.src = src }) }
