import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
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
      // One static page per animal type gives a shared link its own preview card, then opens the app.
      const { animals } = JSON.parse(readFileSync(resolve('src/data/physiognomy-rules.json'), 'utf8'))
      mkdirSync(join(outDir, 's'), { recursive: true })
      for (const { name, slug, emoji } of animals) {
        writeFileSync(join(outDir, 's', `${slug}.html`), `<!doctype html>
<html lang="ko">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>나는 ${name}! 너는? · 모두의 인성측정</title>
  <meta property="og:type" content="website"/>
  <meta property="og:site_name" content="모두의 인성측정"/>
  <meta property="og:title" content="나는 ${emoji} ${name}! 너는 무슨 형일까?"/>
  <meta property="og:description" content="얼굴만 찍으면 인성 점수와 동물 유형이 나와요. 설치 없이 바로 해 보세요."/>
  <meta property="og:url" content="${siteUrl}s/${slug}.html"/>
  <meta property="og:image" content="${siteUrl}share/${slug}.png"/>
  <meta property="og:image:width" content="1200"/>
  <meta property="og:image:height" content="630"/>
  <meta name="twitter:card" content="summary_large_image"/>
  <link rel="canonical" href="${siteUrl}"/>
  <meta http-equiv="refresh" content="0;url=../"/>
</head>
<body>
  <p><a href="../">모두의 인성측정 열기</a></p>
  <script>location.replace('../')</script>
</body>
</html>
`)
      }
      const assets = readdirSync(join(outDir, 'assets')).sort().map(name => join(outDir, 'assets', name))
      const buildId = digest([join(outDir, 'index.html'), join(outDir, 'manifest.webmanifest'), ...assets])
      const runtimeId = digest(['models', 'wasm'].flatMap(dir => readdirSync(join(outDir, dir)).sort().map(name => join(outDir, dir, name))))
      const path = join(outDir, 'sw.js')
      writeFileSync(path, readFileSync(path, 'utf8').replace('__BUILD_ID__', buildId).replace('__RUNTIME_ID__', runtimeId))
    }
  }
}

export default defineConfig({ base, plugins: [vue(), sitePlugin()] })
