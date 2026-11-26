import { reactive } from 'vue'

// Chrome fires beforeinstallprompt once, often before any view is mounted, so it is kept here.
export const install = reactive({ prompt: null, installed: false })

export function watchInstall() {
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault()
    install.prompt = event
  })
  window.addEventListener('appinstalled', () => {
    install.prompt = null
    install.installed = true
  })
}
