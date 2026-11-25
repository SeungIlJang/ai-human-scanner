import { reactive } from 'vue'
export const session = reactive({ image: null, landmarks: null, seed: null, result: null })
export function resetSession() { session.image = null; session.landmarks = null; session.seed = null; session.result = null }
