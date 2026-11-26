import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const [owner, repo] = (process.env.GITHUB_REPOSITORY || '').split('/')
const base = repo ? `/${repo}/` : '/'
// The public address of the web app. Link previews need it, and shared links must point to it even when
// the app runs from somewhere else, such as inside a store app (https://localhost).
// Set SITE_URL when the site moves, for example to a custom domain.
const { homepage, playStore, appStore, liveUpdate } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
const siteUrl = (process.env.SITE_URL || (repo ? `https://${owner.toLowerCase()}.github.io/${repo}/` : homepage)).replace(/\/?$/, '/')

// Shared links lead to a store only once that listing is public. Until then the store page does not exist,
// so `playStore.live` and `appStore.live` in package.json stay false and shared links open the web app.
const live = (name, setting) => process.env[name] ? process.env[name] === '1' : setting.live
const stores = {
  android: live('PLAY_STORE_LIVE', playStore)
    ? { label: 'Google Play에서 앱 받기', url: `https://play.google.com/store/apps/details?id=${playStore.package}&referrer=${encodeURIComponent('utm_source=share&utm_medium=result')}` }
    : null,
  ios: live('APP_STORE_LIVE', appStore) && appStore.id
    ? { label: 'App Store에서 앱 받기', url: `https://apps.apple.com/app/id${appStore.id}` }
    : null
}
const anyStore = Boolean(stores.android || stores.ios)

// Before any store listing is public: go straight to the web app.
const webRedirect = `  <meta http-equiv="refresh" content="0;url=../"/>
</head>
<body>
  <p><a href="../">모두의 인성측정 열기</a></p>
  <script>location.replace('../')</script>
</body>`

// After one is public: visitors on a phone whose store has the app see an install page.
// Everyone else (the other phone platform, desktop) has no app to install, so they get the web app.
const storeLanding = (score, grade) => `  <meta name="theme-color" content="#0a0f1c"/>
  <style>
    html{background:#0a0f1c}
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0a0f1c;color:#f4f8ff;font-family:'Segoe UI','Apple SD Gothic Neo','Malgun Gothic',sans-serif;text-align:center;word-break:keep-all}
    main{width:min(100%,460px);padding:24px 20px 32px}
    img{display:block;width:100%;height:auto;border-radius:16px;border:1px solid #284852}
    h1{margin:22px 0 6px;font-size:26px;line-height:1.3}
    h1 b{color:${grade.color}}
    p{margin:0 0 20px;color:#c9dde4;font-size:15px;line-height:1.6}
    a{display:block;margin-top:10px;padding:15px 12px;border-radius:12px;font-size:16px;font-weight:800;text-decoration:none}
    .store{background:#00ffaa;color:#06231b}
    .web{border:1px solid #426570;color:#c9dde4;font-weight:600}
    small{display:block;margin-top:18px;color:#7e9aa8;font-size:12px}
  </style>
  <script>
    var stores = ${JSON.stringify(stores)}
    var agent = navigator.userAgent
    var store = /Android/i.test(agent) ? stores.android : /iPhone|iPad|iPod/.test(agent) ? stores.ios : null
    if (!store) location.replace('../')
  </script>
</head>
<body>
  <main>
    <img src="../share/${score}.png" width="1200" height="630" alt="인성 ${score}점, ${grade.name}을 가리키는 게이지"/>
    <h1>친구의 인성은 <b>${score}점</b><br/>너는 몇 점일까?</h1>
    <p>얼굴만 찍으면 인성 점수와 관상 풀이가 나와요.</p>
    <a class="store" id="store" href="../">앱 받기</a>
    <a class="web" href="../">설치 없이 웹에서 해보기</a>
    <small>오락용 가상 결과입니다. 사진은 기기 밖으로 나가지 않습니다.</small>
  </main>
  <script>
    if (store) {
      var link = document.getElementById('store')
      link.href = store.url
      link.textContent = store.label
    }
  </script>
</body>`

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
      // One static page per kindness score gives a shared link its own preview card, then opens the app.
      const { grades } = JSON.parse(readFileSync(resolve('src/data/physiognomy-rules.json'), 'utf8'))
      mkdirSync(join(outDir, 's'), { recursive: true })
      for (let score = 0; score <= 100; score++) {
        const grade = grades.find(item => score >= item.min)
        writeFileSync(join(outDir, 's', `${score}.html`), `<!doctype html>
<html lang="ko">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>내 인성 ${score}점! 너는? · 모두의 인성측정</title>
  <meta property="og:type" content="website"/>
  <meta property="og:site_name" content="모두의 인성측정"/>
  <meta property="og:title" content="내 인성 ${score}점 ${grade.emoji} ${grade.name}! 너는 몇 점?"/>
  <meta property="og:description" content="얼굴만 찍으면 인성 점수가 나와요. 얼굴에 다 써 있대요."/>
  <meta property="og:url" content="${siteUrl}s/${score}.html"/>
  <meta property="og:image" content="${siteUrl}share/${score}.png"/>
  <meta property="og:image:width" content="1200"/>
  <meta property="og:image:height" content="630"/>
  <meta name="twitter:card" content="summary_large_image"/>
  <link rel="canonical" href="${siteUrl}"/>
${anyStore ? storeLanding(score, grade) : webRedirect}
</html>
`)
      }
      // The bundle's own identity for over-the-air updates: a digest of everything the store app ships.
      // The same source gives the same version, so a freshly installed app does not re-download itself.
      const shipped = readdirSync(outDir, { recursive: true, withFileTypes: true })
        .filter(entry => entry.isFile())
        .map(entry => relative(outDir, join(entry.parentPath, entry.name)).replaceAll('\\', '/'))
        .filter(path => !/^(share|s|ota)\//.test(path) && path !== 'ota-version.json' && path !== 'sw.js')
        .sort()
      const bundleHash = createHash('sha256')
      for (const path of shipped) bundleHash.update(path).update(readFileSync(join(outDir, path)))
      writeFileSync(join(outDir, 'ota-version.json'), JSON.stringify({ version: bundleHash.digest('hex').slice(0, 16), nativeApi: liveUpdate.nativeApi }) + '\n')

      const assets = readdirSync(join(outDir, 'assets')).sort().map(name => join(outDir, 'assets', name))
      const buildId = digest([join(outDir, 'index.html'), join(outDir, 'manifest.webmanifest'), ...assets])
      const runtimeId = digest(['models', 'wasm'].flatMap(dir => readdirSync(join(outDir, dir)).sort().map(name => join(outDir, dir, name))))
      const path = join(outDir, 'sw.js')
      writeFileSync(path, readFileSync(path, 'utf8').replace('__BUILD_ID__', buildId).replace('__RUNTIME_ID__', runtimeId))
    }
  }
}

export default defineConfig({ base, define: { __SITE_URL__: JSON.stringify(siteUrl) }, plugins: [vue(), sitePlugin()] })
