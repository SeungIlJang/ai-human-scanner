export async function openCamera(facingMode = 'user') {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('카메라를 사용할 수 없습니다. HTTPS 환경이나 브라우저 권한을 확인해 주세요.')
  try { return await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 1280 } } }) }
  catch (error) { if (error.name === 'NotAllowedError') throw new Error('카메라 권한이 거부되었습니다. 브라우저 설정에서 허용하거나 사진을 선택해 주세요.'); throw new Error('카메라를 시작하지 못했습니다. 다른 앱이 사용 중인지 확인해 주세요.') }
}
export function stopCamera(stream) { stream?.getTracks().forEach(track => track.stop()) }
export function captureCanvas(video, mirrored = false) {
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const context = canvas.getContext('2d')
  if (mirrored) context.setTransform(-1, 0, 0, 1, canvas.width, 0)
  context.drawImage(video, 0, 0)
  return canvas
}
