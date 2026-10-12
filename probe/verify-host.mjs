/**
 * 装载自检：确认 dsh-cindy-skin 在 DSH 里「能被找到」的三件事都成立。
 *
 *   [1] host 侧入口 lib/index.js 能被 ESM 装载，且导出契约完整；
 *   [2] client.js 是**已构建**的产物（不是还没跑 build 的骨架）；
 *   [3] profile 清单里两处登记齐全，且 profile 的 node_modules 实体存在。
 *
 * 用法：
 *   node probe/verify-host.mjs [PROFILE_DIR]
 *
 * PROFILE_DIR 缺省取 %APPDATA%\dsh-desktop\harness\profiles\web（DSH Desktop 实际读取的 profile）。
 * 插件尚未登记时第 [3] 项会如实报告缺失 —— 那不是脚本错误，只是「还没装」。
 */
import { readFile, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const PLUGIN_ROOT = resolve(HERE, '..')
const PLUGIN_NAME = 'dsh-cindy-skin'

const profile =
  process.argv[2] ??
  join(process.env.APPDATA ?? '', 'dsh-desktop', 'harness', 'profiles', 'web')

let failed = 0
const ok = (label, value) => console.log(`  ok    ${label}: ${value}`)
const bad = (label, value) => {
  failed += 1
  console.log(`  FAIL  ${label}: ${value}`)
}

console.log(`plugin root : ${PLUGIN_ROOT}`)
console.log(`profile     : ${profile}`)

/* ── [1] host 侧入口契约 ────────────────────────────────────────────── */
console.log('\n[1] host 入口 (lib/index.js)')
try {
  const mod = await import(pathToFileURL(join(PLUGIN_ROOT, 'lib', 'index.js')).href)
  const def = mod.default ?? mod
  ok('name', def.name)
  ok('inject', JSON.stringify(def.inject))
  ok('apply', typeof def.apply)

  const contractOk =
    def.name === PLUGIN_NAME && Array.isArray(def.inject) && typeof def.apply === 'function'
  contractOk ? ok('契约', '完整') : bad('契约', 'name / inject / apply 不符合 DSH 插件约定')
} catch (e) {
  bad('装载', e.message)
}

/* ── [2] client.js 构建产物自检 ─────────────────────────────────────── */
// src/build.py 把 src/skin.js 里**带引号的** "「__INTER_FONT_FACE__」" 替换成内联 @font-face 块，
// 所以：产物必须已不含该字面量；banner 注释里出现不带引号的同名文字属正常。
console.log('\n[2] 客户端产物 (client.js)')
try {
  const text = await readFile(join(PLUGIN_ROOT, 'client.js'), 'utf8')
  ok('字节数', `${(await stat(join(PLUGIN_ROOT, 'client.js'))).size.toLocaleString()} B`)

  const faceCount = (text.match(/@font-face/g) ?? []).length
  const inlined = (text.match(/data:font\/woff2;base64,/g) ?? []).length
  const pending = text.includes('"__INTER_FONT_FACE__"')

  const checks = [
    ['含 ModuleLoader.load', text.includes('window.__ModuleLoader__.load(')],
    [`@font-face 数量 (${faceCount})`, faceCount >= 4],
    [`内联 woff2 数量 (${inlined})`, inlined === faceCount && inlined >= 4],
    ['调用 overrideTokens', text.includes('overrideTokens')],
    ['覆盖 --dsw-font-family', text.includes('--dsw-font-family')],
    ['覆盖 --dsw-elevation-panel', text.includes('--dsw-elevation-panel')],
    ['占位符已替换', !pending],
  ]
  for (const [label, pass] of checks) pass ? ok(label, 'yes') : bad(label, 'no')
  if (pending) console.log('  hint  还没构建：先跑 `python src/build.py`')
} catch (e) {
  bad('读取', e.message)
}

/* ── [3] profile 登记 ───────────────────────────────────────────────── */
// 这里刻意不走 require.resolve —— 在插件包自己目录里解析 `dsh-cindy-skin/client` 会命中
// Node 的「包自引用」（package.json 的 name + exports），测到的是本仓库而不是 profile。
console.log('\n[3] profile 登记')
try {
  const manifest = JSON.parse(await readFile(join(profile, 'package.json'), 'utf8'))
  const dep = manifest.dependencies?.[PLUGIN_NAME]
  const bundled = (manifest.dsh?.profile?.bundles ?? []).includes(PLUGIN_NAME)

  dep ? ok('dependencies', dep) : bad('dependencies', '未登记')
  bundled ? ok('bundles', '已列入') : bad('bundles', '未列入')

  const installed = join(profile, 'node_modules', PLUGIN_NAME)
  if (existsSync(installed)) {
    const entry = await readFile(join(installed, 'client.js'), 'utf8').catch(() => null)
    const local = await readFile(join(PLUGIN_ROOT, 'client.js'), 'utf8')
    entry === null
      ? bad('node_modules 实体', '存在但没有 client.js')
      : entry === local
        ? ok('node_modules 实体', 'client.js 与本仓库一致')
        : bad('node_modules 实体', 'client.js 与本仓库不同 —— 运行中的不是这份代码')
  } else {
    console.log(`  skip  ${installed} 不存在（插件尚未安装到该 profile）`)
  }
} catch (e) {
  bad('读取 profile', e.message)
}

console.log(failed === 0 ? '\n结论：通过' : `\n结论：${failed} 项失败`)
process.exit(failed === 0 ? 0 : 1)
