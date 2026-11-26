// Publishes the in-app bundle for over-the-air updates.
// Usage: node scripts/ota-publish.mjs <app build dir> <site build dir>
// Writes <site>/ota/bundle-<version>.zip and <site>/ota/latest.json, which the store app reads on launch.
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const [appDir, siteDir] = process.argv.slice(2).map(dir => resolve(dir))
const { homepage } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const siteUrl = (process.env.SITE_URL || homepage).replace(/\/?$/, '/')
const { version, nativeApi } = JSON.parse(readFileSync(join(appDir, 'ota-version.json'), 'utf8'))

// Link-preview pages and images are for the website only. The store app does not ship them.
for (const dir of ['share', 's', 'ota']) rmSync(join(appDir, dir), { recursive: true, force: true })

mkdirSync(join(siteDir, 'ota'), { recursive: true })
const name = `bundle-${version}.zip`
const zipPath = join(siteDir, 'ota', name)
rmSync(zipPath, { force: true })
// index.html must sit at the root of the zip.
if (process.platform === 'win32') execFileSync('C:/Windows/System32/tar.exe', ['-a', '-c', '-f', zipPath, '-C', appDir, '.'])
else execFileSync('zip', ['-r', '-q', '-X', zipPath, '.'], { cwd: appDir })

const latest = { version, nativeApi, url: `${siteUrl}ota/${name}`, size: statSync(zipPath).size }
writeFileSync(join(siteDir, 'ota', 'latest.json'), JSON.stringify(latest, null, 2) + '\n')
console.log(latest)
