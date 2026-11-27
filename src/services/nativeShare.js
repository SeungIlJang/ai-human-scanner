import { Share } from '@capacitor/share'
import { Directory, Filesystem } from '@capacitor/filesystem'

// Loaded only inside the store app, where these plugins have a native side.
const dialogTitle = '인성측정 결과 공유'

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1])
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export async function shareNative({ text, url, file }) {
  if (!file) return Share.share({ text, url, dialogTitle })
  // The share sheet takes files by path, so the image is written to the app's cache first.
  // The cache is the app's own and the system may clear it; the same name is overwritten each time.
  const { uri } = await Filesystem.writeFile({ path: file.name, data: await toBase64(file), directory: Directory.Cache })
  // Apps that receive an image often drop a separate url field, so the link travels in the text.
  return Share.share({ text: `${text}\n${url}`, files: [uri], dialogTitle })
}
