import { reactive } from 'vue'
export const session = reactive({ image: null, imageAspect: null, landmarks: null, seed: null, result: null })
export function resetSession() { session.image = null; session.imageAspect = null; session.landmarks = null; session.seed = null; session.result = null }
