import { reactive } from 'vue'

// Progress of the store app's over-the-air update, shown on the home screen.
// status: 'idle' | 'downloading' | 'applying' | 'ready'
export const update = reactive({ status: 'idle', percent: null })
