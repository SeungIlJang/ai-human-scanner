import { reactive } from 'vue'
export const session = reactive({ image: null, imageAspect: null, landmarks: null, captureMetrics: null, result: null })
export function resetSession() { session.image = null; session.imageAspect = null; session.landmarks = null; session.captureMetrics = null; session.result = null }
