import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const [owner, repo] = (process.env.GITHUB_REPOSITORY || '').split('/')
const base = repo ? `/${repo}/` : '/'
// Share previews need an absolute URL. Set SITE_URL when the site uses a custom domain.
const siteUrl = (process.env.SITE_URL || (repo ? `https://${owner.toLowerCase()}.github.io/${repo}/` : '/')).replace(/\/?$/, '/')

function sitePlugin() {
  let outDir
  const digest = files => {
    const hash = createHash('sha256')
    for (const file of files) hash.update(readFileSync(file))
    return hash.digest('hex').slice(0, 12)
  }
  return {
    name: 'site-url-and-sw-version',
    configResolved(config) { outDir = resolve(config.root, config.build.outDir) },
    transformIndexHtml: html => html.replaceAll('__SITE_URL__', siteUrl),
    // The app cache changes with every build. The model/WASM cache changes only with those files.
    closeBundle() {
      const assets = readdirSync(join(outDir, 'assets')).sort().map(name => join(outDir, 'assets', name))
      const buildId = digest([join(outDir, 'index.html'), join(outDir, 'manifest.webmanifest'), ...assets])
      const runtimeId = digest(['models', 'wasm'].flatMap(dir => readdirSync(join(outDir, dir)).sort().map(name => join(outDir, dir, name))))
      const path = join(outDir, 'sw.js')
      writeFileSync(path, readFileSync(path, 'utf8').replace('__BUILD_ID__', buildId).replace('__RUNTIME_ID__', runtimeId))
    }
  }
}

export default defineConfig({ base, plugins: [vue(), sitePlugin()] })
