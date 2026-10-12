# DSH Desktop 皮肤化可行性分析

**目标**：把 Cindy（makecindy/cindy）的前端视觉体系套到本机 DSH Desktop 上。
**载体（用户已定）**：做成一个 **DSH 插件**使用。
**分析基线**：本机实测 —— DSH Desktop（`C:\Users\LHT\AppData\Local\Programs\DSH Desktop`，asar 21 223 个文件）、Cindy 桌面端 0.1.101、Cindy 源码快照 `_ref_cindy/`、Cindy 设计调研报告 `cindy-design-research.md`。
**本文只做可行性判断，不含落地改动。**

---

## 0. 结论摘要

| 判断项 | 结论 |
|---|---|
| 能否做成插件 | **能**，且是官方支持路径，无需改 `app.asar`、无需破解 |
| 有无官方主题扩展点 | **有**。`@deepseek-ai/dsh-client-ui-theme` 通过 `ctx.provide("theme", …)` 暴露 `register` / `overrideTokens` / `setTheme` / `setFontSize` 四个入口，官方文档明确写「第三方主题可通过 `ctx.theme` 注册别名 token 覆盖」 |
| 覆盖力度 | **颜色、字体族、字号、圆角数值、阴影、动效时长、焦点环**可全覆盖（token 层，约 60–120 个变量） |
| 硬边界 | **组件形状**（Cindy 是 pill-first，DSH 是 12px 圆角矩形）、**版块布局**（三栏宽度/面板结构）、**Electron 窗口 chrome**（标题栏按钮）——这三类**不是 token 驱动的**，只能靠 CSS 覆写哈希类名或替换插件实现，风险与维护成本明显更高 |
| 可否卸载 | 可。插件从 profile 的 bundle 列表移除即恢复原样；token 覆盖层带 disposer |
| 是否会影响现有功能 | 理论上不会（只改视觉变量）；但 CSS 覆写层需要逐项验证 |
| 建议做法 | **两段式**：先做 token 层（低风险、当天可见效果），验证后再决定是否做形状/布局层 |

> 一句话：**换色板 + 换字体 + 换圆角数值 + 去阴影，今天就能做到，风险极低；让 DSH 长得「完全像 Cindy」（按钮全 pill、侧栏 260px、CINDY 字标），需要第二段 CSS 覆写，属于可控但有维护成本的工作。**

---

## 1. 载体机制：DSH 插件是怎么工作的

### 1.1 架构

DSH 是 **Cordis 插件树**。整棵树由 patch 层逐个叠加而成，用户级配置在 profile 目录：

```
C:\Users\LHT\.dsh\profiles\desktop\
├── cordis.yml                 # 空数组 + 注释「Edit cordis.patch.yml, not this file.」
├── cordis.patch.yml           # ★ 用户级 patch 层（当前已有 6 条 id-targeted config 条目）
├── package.json               # ★ 依赖 + dsh.profile.bundles 列表
├── pnpm-lock.yaml / pnpm-workspace.yaml
└── node_modules/              # profile 本身是一个可装包的 pnpm 工程
```

`profile/package.json` 实测内容（节选）：

```json
{
  "name": "dsh-profile-desktop",
  "private": true,
  "dependencies": {
    "dsh-infinite-gen-4": "github:Minglink/dsh-infinite-gen-4",
    "dsh-plugin-marketplace": "github:bradeGithub/DSH-Plugins-Marketplace",
    "dsh-purge": "file:../../plugins/dsh-purge"
  },
  "dsh": {
    "profile": {
      "bundles": [
        "@deepseek-ai/dsh-base",
        "@deepseek-ai/dsh-web-app",
        "dsh-infinite-gen-4",
        "dsh-plugin-marketplace",
        "dsh-community-market",
        "@agents-anywhere/dsh-bridge-next",
        "dsh-purge"
      ]
    }
  }
}
```

→ **本机已经装了 3 个第三方插件**（两个来自 GitHub，一个来自本地目录），说明这条链路是成熟的、被实际使用的，不是我推测的。

### 1.2 插件包契约

一个 DSH 插件包在 `package.json` 里声明两块能力：

```json
{
  "name": "dsh-purge",
  "exports": { "./client": "./client.js" },
  "peerDependencies": { "@deepseek-ai/cordis": "^4.0.1" },
  "dshTarget": "0.2.0-rc.2",
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },      // ← host 侧：把自己插入插件树
    "client": {                                        // ← 客户端侧：浏览器里跑的 UI 插件
      "platform": "web",
      "inject": ["@deepseek-ai/dsh-client-connection", "@deepseek-ai/dsh-client-runtime",
                 "@deepseek-ai/dsh-client-locale", "@deepseek-ai/dsh-client-ui-slots",
                 "@deepseek-ai/dsh-client-ui-settings"]
    },
    "install": { "preferred": "tarball" }
  }
}
```

`cordis.patch.yml`（host 侧）支持四种操作 —— 实测 `dsh-purge/cordis.patch.yml`：

```yaml
- id: redteam-ui            # ① 禁用别的插件行
  name: dsh-redteam-ui
  disabled: true

- id: system-prompt         # ② 改别人的 config
  config: { includeHarnessIdentity: false }

- insert:                   # ③ 插入自己（可多条：子入口）
    - id: dsh-purge
      name: 'dsh-purge'
      config: { enabled: true, ... }
    - id: dsh-purge-redteam-store
      name: dsh-purge/redteam/store
      config:
        root: !!js dshHomePath('redteam')    # ④ config 里可写 JS 表达式

- id: computer-use-cua-driver-native
  disabled: false
```

`insert` + `disabled` 这两条，正是皮肤插件需要的全部机制 —— 官方桌面 patch（`resources\dsh-desktop.patch.yml`）本身就用了 `- id: ui-brand-official / disabled: true` 来关掉内置品牌插件。

### 1.3 客户端插件形态（实测两根样例）

`client.js` 是一个挂到全局 ModuleLoader 上的 CommonJS 工厂：

```js
window.__ModuleLoader__.load({
  id: "dsh-purge",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    let react = require("react");                 // ← 可以 require react 及别的基础包

    const name = "dsh-purge";
    const inject = ["slots", "locale"];           // ★ 短服务名数组，不是包名

    function apply(ctx) { /* 插件主体 */ }

    exports.name = name;
    exports.inject = inject;
    exports.apply = apply;                        // ★ 三个导出：name / inject / apply
    return module.exports;
  }
});
```

内置 `dsh-client-ui-theme` 的 client.js 是同一形状（尾部原文）：

```js
exports.SETTINGS_NS = SETTINGS_NS;
exports.ThemeRuntime = ThemeRuntime;
exports.apply = apply;
exports.inject = inject;
return module.exports;
```

→ **`inject` 用短服务名**（`slots` / `locale` / `remote` / `configForms` / `theme`）。这一点对皮肤插件是好消息：只要写 `inject: ["theme"]` 就能拿到主题服务。

### 1.4 装载 / 卸载步骤（落地时照做）

1. 把插件目录放到 `C:\Users\LHT\.dsh\plugins\<plugin-name>\`（与 `dsh-purge` 同级）
2. profile 的 `package.json` → `dependencies` 加 `"dsh-cindy-skin": "file:../../plugins/dsh-cindy-skin"`
3. profile 的 `package.json` → `dsh.profile.bundles` 数组追加 `"dsh-cindy-skin"`
4. 在 profile 目录跑一次包管理器安装（`pnpm install`）
5. **重启 DSH Desktop**（客户端插件在页面加载时由 ModuleLoader 装配）
6. 卸载 = 反向操作（移除 bundles 条目 → 重启）

> 注：`~/.dsh/profiles/desktop/cordis.patch.yml` 是**用户自己的 patch 层**，里面已经有模型 provider 等个人配置；皮肤插件的 host 侧补丁建议写进**插件自己的** `cordis.patch.yml`（由 `dsh.bundle.patch` 引入），不要往用户文件里塞。

---

## 2. 官方主题扩展点：`ctx.theme`

### 2.1 服务来源

`@deepseek-ai/dsh-client-ui-theme`（asar 内 `node_modules/@deepseek-ai/dsh-client-ui-theme/`）在客户端 `apply()` 里：

```js
function apply(ctx) {
  installThemeStyles(ctx);
  const theme = new ThemeRuntime(ctx, ctx.configForms.get(THEME_SETTINGS_NAMESPACE));
  ctx.provide("theme", theme);        // ★ 服务名就是 "theme"
  ...
}
```

其 `README.zh.md` 原文（第 12 行、第 36 行）：

> 本包还提供 `--dsw-*` token 样式表……**第三方主题可通过 `ctx.theme` 注册别名 token 覆盖。**
>
> 组合可以通过 `ctx.theme` 注册带别名 token 覆盖的第三方主题 id；**覆盖层按注册顺序折入活动快照的 token 中。**

### 2.2 API 全表（从 `ThemeRuntime` 类源码提取）

```js
ctx.theme.getTheme()                    // → 冻结快照 { preference, fontSize, active, themes, revision }
ctx.theme.register({                    // → disposer
  id: "cindy",                          //   不可为 "system"；重复 id 抛错
  colorScheme: "light" | "dark",        //   该定义属于哪个色板
  tokens: { "--dsw-alias-bg-base": "#F2F2ED", ... }   // 单色板 token 表
})
ctx.theme.overrideTokens(source, {      // → disposer   ★ 皮肤推荐用这个
  "--dsw-alias-bg-base": { light: "#F2F2ED", dark: "#181818" }
})
ctx.theme.setTheme(id)                  // 切主题（也可 "system"）
ctx.theme.setFontSize(px)               // 10..22 整数，只影响会话正文
ctx.theme.exportInspectTokens()         // → 全部 token 描述（含注册与覆盖引入的新名字）
ctx.on("theme/change", snapshot => …)   // 快照变更事件
```

### 2.3 语义与约束（源码注释 + 校验逻辑）

- **`overrideTokens` 是「层」模型**：`source` 一个来源一层，层按 `seq` 单调递增排序，**后注册的层按 token 取胜**；移除某层，它覆盖过的 token 自动回落到下层。
- **同一 source 再次调用 = 整层替换并重新置顶**（effect 重注册语义），返回的 disposer 对旧层变成 no-op。
- **值必须是 `{ light, dark }` 对**。传裸字符串会抛教学错误（原文）：
  `theme override "${name}" from "${source}" is a bare string — pass { light: …, dark: … } (repeat the …)`
- **`register` 的 id 全局唯一**，`"system"` 保留给偏好、不可注册；disposer 掉当前生效主题时，偏好自动回落默认值。
- **`composeActive` 只用 `active.colorScheme` 那一档的值** → 铺一层覆盖同时给出明暗两档，切到 dark 自动取 dark 值，无需二次干预。
- **内置主题是 `BUILTIN_THEMES = [{id:"light",colorScheme:"light",tokens:{}}, {id:"dark",…}]`** —— 即 light/dark 的实际颜色来自样式表，不是来自 token 表；token 表只承载**覆盖**。
- 官方明确承认：**不会校验一组覆盖是否完整**（README「已知限制」）。缺的 token 就保持原值 —— 这是渐进式皮肤化的有利条件，意味着可以只覆盖 30 个关键变量就先看到效果。

### 2.4 与文档一致的落地形态

```js
// dsh-cindy-skin 的 client.js 主体（示意）
const inject = ["theme"];

function apply(ctx) {
  ctx.effect(
    () => ctx.theme.overrideTokens("dsh-cindy-skin", {
      "--dsw-alias-bg-base":        { light: "#F2F2ED", dark: "#181818" },
      "--dsw-alias-label-primary":  { light: "#1A1A1A", dark: "#EDEDED" },
      "--dsw-font-family":          { light: '"Inter", var(--dsw-font-family)', dark: '"Inter", var(--dsw-font-family)' },
    }),
    "cindy-skin: token overrides"
  );
}
```

---

## 3. DSH 设计 token 全貌

### 3.1 命名空间与分层

在 `ui-theme` 客户端 bundle + 主 CSS（`dsh-web-frontend/dist/assets/index-BPHePDI_.css`，76 KB）里统计到 **403 个 `--dsw-*` 自定义属性定义**，另有 `--ds-*` 段（动效与代码字体）。三层结构：

| 层 | 前缀 | 作用 | 数量级 |
|---|---|---|---|
| 原始色阶 | `--dsw-static-*` | 与主题无关的原子色（明暗同值） | 77 |
| 语义别名 | `--dsw-alias-*` | 界面语义（底色/文字/边框/状态/按钮…），**绝大多数引用 static 层** | ~110 |
| 专用 | `--dsw-specific-*` | 侧栏填充、气泡、登录、菜单、tooltip… | ~15 |
| 形状/材质/动效 | `--dsw-radius-*`、`--dsw-shadow-lv*`、`--dsw-elevation-*`、`--dsw-mask-blur`、`--ds-transition-*`、`--ds-ease-in-out` | 圆角六档、三级阴影、毛玻璃 | ~20 |
| 字体 | `--dsw-font-family`、`--dsw-font-family-brand`、`--ds-font-family-code`、`--dsw-font-{base,l,m,s,xs,xxs,xxxs}-N-{font-family,font-size,font-weight,line-height}` | 字体族 + 11 档字号体系（含 markdown 专用 102 项） | ~150 |

关键：**alias 层几乎没有字面量**，全是 `var(--dsw-static-…)` 引用。这决定了覆盖粒度的两个选项（见 §4.1）。

### 3.2 static 色阶（77 档，明暗同值）

主灰阶是 **neutral-bluish**（带蓝的灰），另有纯 neutral 阶与品牌/状态色：

```
neutral-bluish-00 #fff      -50 #f9fafb   -60 #f5f6f7*  -75 #f1f3f5
        -100 #ebeef2  -150 #e9ecf2  -200 #e1e5ee  -300 #cfd3d6  -400 #adb2b8
        -500 #979da6  -600 #81858c  -700 #61666b  -750 #43454a  -800 #353638
        -850 #2c2c2e  -875 #232324  -900 #1b1b1c  -950 #151517  -1000 #0f1115
neutral- 00 #fff  -50 #fafafa  -100 #f5f5f5  -150 #ededed  -200 #e5e5e5
        -250 #dcdcdc  -300 #d4d4d4  -400 #a2a4a6  -500 #7f8287  -550 #65676b
        -600 #545557  -700 #3c3c3d  -800 #292929  -850 #212123  -900 #0f0f0f  -1000 #000
deepseek- 50 #edf3fe  -100 #e4edfd  -200 #d3e2ff  -300 #b7c8fe  -400 #7aaaff
        -450 #5686fe  -500 #4176e6  -600 #4868b2  -800 #34415b  -900 #283142
blue-     50 #eff6ff  -75 #e5f0ff  -50p #eaf3ff  -100 #dbeafe  -300 #93c5fd
        -400 #60a5fa  -450 #4d93f8  -500 #3b82f6  -600 #2563eb  -800 #1e40af  -900 #0e3074  -950 #172554
green-  100 #e6faed  -400 #4ed17e  -500 #22c55e  -900 #233c2c（+a08/a12 半透明态）
amber-  100 #fef5e7  -400 #f7ad31  -500 #f59e0b  -600 #dd8629  -900 #27241f
red-      50 #fef2f2  -100 #fee2e2  -400 #f25a5a  -500 #ef4444  -600 #ec1313  -900 #570c0c（+a08/a12）
```

\* `--dsw-static-neutral-bluish-60` 是唯一明暗有别的 static：light `#f5f6f7` / dark `#f9fafb`。

### 3.3 alias 层关键值（实测明暗对照）

| token | Light（引用 → 实值） | Dark（引用 → 实值） |
|---|---|---|
| `--dsw-alias-bg-base` | bluish-00 → **`#fff`** | bluish-950 → **`#151517`** |
| `--dsw-alias-bg-layer-1` | bluish-00 → `#fff` | bluish-875 → `#232324` |
| `--dsw-alias-bg-layer-2` | bluish-00 → `#fff` | bluish-850 → `#2c2c2e` |
| `--dsw-alias-bg-layer-3` | bluish-00 → `#fff` | bluish-800 → `#353638` |
| `--dsw-alias-bg-module-platform` | bluish-60 → `#f5f6f7` | bluish-800 → `#353638` |
| `--dsw-alias-bg-overlay` | bluish-150 → `#e9ecf2` | bluish-700 → `#61666b` |
| `--dsw-alias-label-primary` | bluish-1000 → **`#0f1115`** | bluish-50 → **`#f9fafb`** |
| `--dsw-alias-label-secondary` | bluish-700 → `#61666b` | bluish-300 → `#cfd3d6` |
| `--dsw-alias-label-tertiary` | bluish-600 → `#81858c` | bluish-400 → `#adb2b8` |
| `--dsw-alias-label-dimmed` | bluish-200 → `#e1e5ee` | bluish-750 → `#43454a` |
| `--dsw-alias-label-caption` | bluish-400 → `#adb2b8` | bluish-600 → `#81858c` |
| `--dsw-alias-border-l1` | `#0000000a` | `#ffffff0f` |
| `--dsw-alias-border-l2` | `#0000001a` | `#ffffff1f` |
| `--dsw-alias-border-l3` | `#0000001f` | `#ffffff29` |
| `--dsw-alias-border-l4` | `#00000029` | `#fff3` |
| `--dsw-alias-interactive-bg-hover` | `#2631480f` | `#ffffff14` |
| `--dsw-alias-interactive-bg-active` | `#2631481a` | `#ffffff24` |
| `--dsw-alias-brand-primary` | bluish-1000 → `#0f1115` | bluish-50 → `#f9fafb` |
| `--dsw-alias-button-primary-fill` | = brand-primary → `#0f1115` | = brand-primary → `#f9fafb` |
| `--dsw-alias-button-primary-hover` | bluish-750 → `#43454a` | bluish-100 → `#ebeef2` |
| `--dsw-alias-link` | deepseek-500 → `#4176e6` | deepseek-400 → `#7aaaff` |
| `--dsw-alias-state-success-primary` | green-500 → `#22c55e` | 同左 |
| `--dsw-alias-state-error-primary` | red-600 → `#ec1313` | red-400 → `#f25a5a` |
| `--dsw-alias-state-warn-primary` | amber-500 → `#f59e0b` | 同左 |
| `--dsw-alias-state-business-primary` | deepseek-500 → `#4176e6` | deepseek-400 → `#7aaaff` |
| `--dsw-specific-sidebar-fill` | bluish-50 → `#f9fafb` | bluish-900 → `#1b1b1c` |
| `--dsw-specific-bubble` | deepseek-50 → `#edf3fe` | bluish-850 → `#2c2c2e` |
| `--dsw-alias-menu-icon` | bluish-800 → `#353638` | = label-primary-dimmed |

（完整 388 项明暗对照表已落盘：`_dsh_probe\theme\dsw-palette-full.txt`）

### 3.4 字体 / 圆角 / 阴影 / 动效（`base.css` 与相关表）

```css
:root {
  --dsw-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
                     "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif;
  --dsw-font-family-brand: "Montserrat", var(--dsw-font-family);
  --ds-font-family-code: "SF Mono", "JetBrains Mono", "Fira Code", Consolas,
                         "Liberation Mono", Menlo, Courier, "PingFang SC", "Microsoft YaHei";
  --ds-ease-in-out: cubic-bezier(.4, 0, .2, 1);
  --ds-transition-duration: .2s;      /* fast .1s / slow .3s */
  --dsw-radius-xs: 4px;  --dsw-radius-sm: 8px;   --dsw-radius-md: 12px;
  --dsw-radius-lg: 16px; --dsw-radius-xl: 20px;  --dsw-radius-panel: 28px;
}
body { --dsw-alias-settings-card-fill: var(--dsw-alias-bg-layer-2);
       --dsw-alias-settings-card-stroke: var(--dsw-alias-border-l4); }
```

阴影与浮层（light 档实测；dark 由 `body[data-ds-dark-theme]` 覆盖）：

```css
--dsw-shadow-lv1: 0 2px 4px 0 #0000000d;
--dsw-shadow-lv2: 0 4px 12px 0 #00000005, 0 2px 8px 0 #0000000a;
--dsw-shadow-lv3: 0 0 1px 0 #0003, 0 0 4px 0 #00000005, 0 12px 32px 0 #00000014;
--dsw-elevation-stroke: 0 0 0 .5px var(--dsw-elevation-stroke-color);
--dsw-elevation-panel: <stroke>, 0 3px 8px 0 #00000008, 0 0 16px 0 #00000005;
--dsw-elevation-prominent: <stroke>, 0 3px 8px 0 #0000000a, 0 0 20px 0 #0000000d;
--dsw-elevation-soft: <stroke>, 0 4px 16px 0 #00000008, 0 0 24px 0 #00000008;
--dsw-menu-backdrop-filter: blur(40px) saturate(150%);   /* + --dsw-mask-blur */
--dsw-focus-ring-width: 2px;
/* --dsw-focus-ring-color 未定义 → 回落 var(--dsw-alias-state-business-primary) */
```

### 3.5 Cindy ↔ DSH 对照

| 维度 | DSH 现状 | Cindy 目标 | 差距性质 |
|---|---|---|---|
| 页面底色 | L `#fff` / D `#151517` | L `#F2F2ED`（暖象牙）/ D `#181818` | **纯 token** |
| 卡片层 | L 全 `#fff`（靠边框与阴影分层） | L `#FDFDF8` 近白 + `#EEEEE9` 侧栏 | **纯 token** |
| 文字阶梯 | bluish-1000/700/600/200 | `#0C0C0C`/`#1A1A1A`/`#6B6B67`/`#888883`/`#9D9D98` | **纯 token** |
| 主按钮 | 黑白反色（`#0f1115` / `#f9fafb`） | 中性灰 `#3C3F43` / `#EEEEEE` | **纯 token** |
| 字体族 | 系统栈（含 PingFang/雅黑） | `Inter` + 系统栈兜底 | **纯 token**（需自带 Inter 字体文件才能真装） |
| 品牌字体 | Montserrat | 无（Cindy 单族） | **纯 token**（把 brand 指向 Inter） |
| 圆角 | 4/8/12/16/20/28 | 0/2/4/8/12/**9999** | 数值可 token，**"按钮用哪一档"不可 token** |
| 阴影 | lv1/2/3 + elevation 三档 + 毛玻璃 40px | 基本零阴影 | **纯 token**（置 0） |
| 动效 | `.1s/.2s/.3s` + `cubic-bezier(.4,0,.2,1)` | 80/150/200/250ms + `cubic-bezier(0.16,1,0.3,1)` | **纯 token**（`--ds-*`） |
| 强调色 | 品牌蓝 `#4176e6`、token 化 | Cindy 无品牌蓝（accent 中性灰），仅焦点蓝 `#417CDD` | **纯 token** |
| 运行中橙 | 无对应语义 token | `#EA6B17`（Thinking/Warning Orange） | 语义映射问题 |
| 版块布局 | 三栏可拖拽布局树 | 侧栏 260/右栏 min 280/中区 880 | **非 token** |
| 窗口 chrome | Electron 标题栏按钮 | 同（差异小） | 不建议改 |

---

## 4. 能力边界

### 4.1 纯 token 层可达成（推荐第一段）

**方案 T（准）**：直接覆盖 `--dsw-alias-*` + `--dsw-specific-*`（约 60–80 项），粒度可控、明暗分别给值。
**方案 S（快）**：只覆盖 `--dsw-static-*` 灰阶与品牌色（约 30 项），alias 自动跟随。
- 优点：改动面最小，一行灰阶贯通全 UI。
- **缺点**：DSH 的明暗两档共用同一套 static 色阶（靠 alias 选不同档位实现），覆盖 static 会**同时影响明暗**，容易造成某一模式对比度失衡。→ **建议以方案 T 为主**，方案 S 只在需要快速看效果时用。

覆盖后可立即得到：暖象牙/中性近黑底色、Cindy 文字阶梯、中性灰主按钮、去阴影、Inter 字体、Cindy 动效曲线、圆角数值档位。

### 4.2 需要 CSS 覆写层（第二段，风险中）

DSH 组件用 **CSS Modules**，类名形如 `._8HJdBW_themeCube`（构建期固定 → 同一版本内可选中，但**跨版本会变**）。样式注入为 `<style data-plugin-css="<包名>/<文件>">` 标签，可定位。

因此以下必须靠"再注入一张样式表"来完成：

- **Cindy 的 pill-first 形状**：按钮/输入框/Chip 全 pill（DSH 用 `--dsw-radius-sm/md` 圆角矩形）。要改必须选中具体组件类名重写 `border-radius`。
- **Kbd / 数据标记的 0–2–4px 精细圆角**：同理。
- **间距与密度的整体收紧**：DSH 组件内 padding 是写死的 px。
- **隐藏/重排特定版块**（如新任务首页的引导区、模型选择行）。

维护成本：DSH 升级后哈希前缀变 → 覆写选择器失效 → 需要重新对位。**可用属性选择器降低脆性**（例如 `[data-plugin-css]` 内的结构选择器、`[data-tone=…]`/`[data-state=…]` 这类稳定属性），DSH 已经在用 `data-tone` / `data-state` / `data-menu-material` / `data-ds-dark-theme` 等语义属性。

### 4.3 不建议 / 成本过高

- **改 `app.asar`**：281 MB 单文件，DSH 每次升级即被覆盖，且破坏签名完整性。**明确排除。**
- **三栏布局结构改造**（Cindy 260px 侧栏 + 880px 中区）：布局由 `dsh-client-ui-layout` / `-sidebar` 的 `layoutTree` 驱动，是组件逻辑而非样式。可尝试 `disabled` 内置插件换成自研布局（`dsh-desktop.patch.yml` 有 `ui-brand-official / disabled: true` 先例），但这是"重写 UI"量级，不应放在第一版。
- **Electron 窗口整体 chrome**（无边框/自绘标题栏）：属桌面外壳层（`resources\` 的 `main` 侧），插件改不到。
- **换掉 DSH 品牌 logo/字标**（`dsh-client-ui-brand-official`）：可通过 `disabled: true` 关闭，但"换成品牌图形"需要自备资源与组件，非纯样式。

---

## 5. 推荐实施方案

### 5.1 插件骨架

```
C:\Users\LHT\.dsh\plugins\dsh-cindy-skin\
├── package.json
├── cordis.patch.yml          # host 侧：把自己 insert 进树
├── client.js                 # 客户端：inject ["theme"] + overrideTokens + 可选样式表
├── tokens/
│   ├── light.js              # Cindy light 映射表
│   └── dark.js               # Cindy dark 映射表
└── styles/
    └── shape.css             # 第二段：形状/间距覆写（可选）
```

`package.json`：

```json
{
  "name": "dsh-cindy-skin",
  "version": "0.1.0",
  "private": true,
  "exports": { "./client": "./client.js" },
  "peerDependencies": { "@deepseek-ai/cordis": "^4.0.1" },
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": { "platform": "web", "inject": ["theme"] }
  }
}
```

`cordis.patch.yml`：

```yaml
- insert:
    - id: dsh-cindy-skin
      name: 'dsh-cindy-skin'
      config:
        enabled: true
        stage: tokens        # tokens | tokens+shape，便于分阶段回退
```

`client.js`（第一段，仅 token 层）：

```js
window.__ModuleLoader__.load({
  id: "dsh-cindy-skin",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;

    const inject = ["theme"];
    const SOURCE = "dsh-cindy-skin";

    const TOKENS = {
      "--dsw-alias-bg-base":         { light: "#F2F2ED", dark: "#181818" },
      "--dsw-alias-bg-layer-1":      { light: "#FDFDF8", dark: "#212123" },
      "--dsw-alias-bg-layer-2":      { light: "#FDFDF8", dark: "#2c2c2e" },
      "--dsw-alias-bg-layer-3":      { light: "#FFFFFF", dark: "#353638" },
      "--dsw-alias-bg-module-platform": { light: "#EEEEE9", dark: "#1b1b1c" },
      "--dsw-alias-label-primary":   { light: "#1A1A1A", dark: "#F5F5F5" },
      "--dsw-alias-label-secondary": { light: "#888883", dark: "#C1C1C1" },
      "--dsw-alias-label-tertiary":  { light: "#6B6B67", dark: "#C1C1C1" },
      "--dsw-alias-border-l1":       { light: "#0000000a", dark: "#ffffff0f" },
      "--dsw-alias-border-l2":       { light: "#0000001a", dark: "#ffffff1f" },
      "--dsw-alias-brand-primary":   { light: "#3C3F43", dark: "#EEEEEE" },
      "--dsw-alias-button-primary-fill": { light: "#3C3F43", dark: "#EEEEEE" },
      "--dsw-alias-button-primary-hover": { light: "#2E3237", dark: "#FCFCFC" },
      "--dsw-alias-interactive-bg-hover": { light: "#2631480f", dark: "#ffffff14" },
      "--dsw-font-family": {
        light: '"Inter", var(--dsw-font-family)',
        dark:  '"Inter", var(--dsw-font-family)'
      },
      "--dsw-font-family-brand": {
        light: '"Inter", var(--dsw-font-family)',
        dark:  '"Inter", var(--dsw-font-family)'
      },
      "--dsw-radius-md": { light: "12px", dark: "12px" },
      "--dsw-shadow-lv1": { light: "none", dark: "none" },
      "--dsw-shadow-lv2": { light: "none", dark: "none" },
      "--dsw-shadow-lv3": { light: "none", dark: "none" },
      "--ds-transition-duration":      { light: ".15s", dark: ".15s" },
      "--ds-transition-duration-fast": { light: ".08s", dark: ".08s" },
      "--ds-ease-in-out": {
        light: "cubic-bezier(0.16, 1, 0.3, 1)",
        dark:  "cubic-bezier(0.16, 1, 0.3, 1)"
      }
    };

    function apply(ctx) {
      ctx.effect(() => ctx.theme.overrideTokens(SOURCE, TOKENS), "cindy-skin: token overrides");
      // 第二段（可选）：注入形状覆写样式表
      // ctx.effect(() => { const tag = document.createElement("style"); ... }, "cindy-skin: shape css");
    }

    exports.name = "dsh-cindy-skin";
    exports.inject = inject;
    exports.apply = apply;
    return module.exports;
  }
});
```

### 5.2 分阶段里程碑

| 阶段 | 内容 | 产出 | 风险 |
|---|---|---|---|
| **M0 打通链路**（0.5–1h） | 最小插件：只覆盖 `--dsw-alias-bg-base` + `label-primary` 两个 token，确认它能出现在界面上 | 证明 `inject:["theme"]` 可用、插件被加载 | 低（唯一未知项） |
| **M1 色板**（2–4h） | 覆盖《§3.3》全部 alias + specific 关键项（60–80 个），明暗双档 | Cindy 配色成型 | 低 |
| **M2 字体排版**（1–2h） | 覆盖 `--dsw-font-family` 等；若要真用 Inter 需自带 woff2 与 `@font-face`（可在插件内注入） | Cindy 字体观感 | 低—中（字体文件分发） |
| **M3 形状与密度**（3–6h） | 注入形状样式表：按钮 pill、输入框 pill、去阴影残留、收紧间距 | 观感接近 Cindy | **中**（类名敏感） |
| **M4 版块（可选，不做默认）** | 侧栏宽度、中区最大宽、隐藏引导区 | 版块结构接近 Cindy | 高 |

### 5.3 验收方法

- **可视对照**：以 Cindy 实机（已安装 0.1.101）截图与 DSH 截图并排比对，逐块核对（侧栏/中区/composer/设置页/弹层）。
- **明暗双模式**：每个 token 都要看 light 与 dark（官方扩展点强制 `{light,dark}` 对，正好覆盖这条）。
- **对比度自检**：Cindy 侧文字色均有 WCAG 门槛（`#888883` 是 ≥3.0 的下限档）；DSH 侧 `label-secondary` 落在 `#61666b`，换成 Cindy 值后需确认正文可读。
- **回退验证**：移除插件 → 重启 → 确认界面完全恢复；再验 `overrideTokens` 的 disposer 是否随插件卸载释放。

---

## 6. 风险与未知

| # | 事项 | 等级 | 处置 |
|---|---|---|---|
| 1 | 第三方客户端插件的 `inject` 是否接受短服务名 `"theme"`（内置包用短名，`dsh-purge` 用包名，两者形态不同） | **中** | M0 第一步就验证；若短名不通，退路是 `inject: ["@deepseek-ai/dsh-client-ui-theme"]`，再不行则纯 CSS 注入 |
| 2 | token 覆盖不完整（官方明说不校验） | 低 | 渐进式：先覆盖核心，再按截图差距补 |
| 3 | 颜色 token 覆盖后仍被组件内联值/半透明 `color-mix` 稀释 | 中 | 逐屏核对；必要时把 `--dsw-static-*` 也纳入覆盖 |
| 4 | CSS 覆写层依赖构建期哈希类名，DSH 升级即失效 | 中 | 尽量用 `data-*` 属性与结构选择器；把"每版本重对位"当作已知维护成本 |
| 5 | `--dsw-font-family` 与 CJK 字体栈：Cindy 的 Inter 不含中文，中文会回落系统字 | 低 | 保留 DSH 原栈作兜底（示例里已写成 `"Inter", var(--dsw-font-family)`） |
| 6 | 动效 token 实际生效面未知（`--ds-transition-duration` 是全局变量，但可能有组件写死 ms） | 低 | M3 观察；覆盖不了的部分并入 CSS 覆写层 |
| 7 | 插件与 DSH 版本绑定（`dshTarget` 字段） | 低 | 跟随版本号更新 |
| 8 | 用户 profile 的 patch 层含个人配置 | — | **皮肤插件只动自己的 `cordis.patch.yml`，不写入用户 profile 的 patch 文件** |

---

## 7. 证据索引

| 事实 | 出处（本机实测路径） |
|---|---|
| 插件树分层与用户级编辑点 | `C:\Users\LHT\.dsh\profiles\desktop\cordis.yml`（注释）、`cordis.patch.yml` |
| bundle 装载机制 | `C:\Users\LHT\.dsh\profiles\desktop\package.json`（`dsh.profile.bundles`，7 项含 3 个第三方） |
| 插件包契约 | `C:\Users\LHT\.dsh\plugins\dsh-purge\package.json`（`dsh.bundle.patch` / `dsh.client` / `exports["./client"]`） |
| patch 四种操作 | `C:\Users\LHT\.dsh\plugins\dsh-purge\cordis.patch.yml`（disabled / config / insert / `!!js dshHomePath()`） |
| 客户端插件形状 | `dsh-purge\client.js` 头尾；`node_modules/@deepseek-ai/dsh-client-ui-theme/lib/client.js` 尾（`exports.name/inject/apply`） |
| 主题服务与 API | `…/dsh-client-ui-theme/lib/client.js`（`ctx.provide("theme", …)`、`ThemeRuntime` 类）、`lib/index.js`、README.zh.md 第 12 / 36 行 |
| token 全表与明暗值 | `…/dsh-client-ui-theme/lib/client.js`（内联 `base.css` / `design-platform.css` / `focus.css` / `scrollbar.css` / shiki.css 等八张表）；主 CSS `dsh-web-frontend/dist/assets/index-BPHePDI_.css` |
| 桌面版 patch 先例（禁用内置 UI 插件） | `resources\dsh-desktop.patch.yml`（`ui-brand-official` / `ui-settings-account` = `disabled: true`） |
| Cindy 目标色值 | `cindy-design-research.md` §3 / §9 / §13.3；原始清单 `cindy-color-audit-appendix.md` |

**本轮侦察产出的中间材料**（工作区内，可复查）：`_dsh_probe\theme\` 下 `theme-client.js`（ui-theme 客户端 bundle 原文）、`theme-runtime-class.txt`（API 源码段）、`theme-inspect-tokens.txt`（官方 token 描述表 15 KB）、`dsw-palette-full.txt`（388 项明暗对照）、`dsw-token-groups.txt`（按前缀分组）、`dsw-token-names.txt`、`dsh-index.html`。

---

## 8. 待用户确认

1. **是否按 §5.1 骨架动手做 M0**（最小插件，只验证链路 + 改 2 个颜色）？
2. **第一段范围**：只做 token 层（颜色/字体/圆角/阴影/动效），还是连 M3 形状层（按钮 pill 化）一起做？
3. **字体**：是否接受先只改字体族声明（引用系统 Inter，无则为系统字），还是需要把 Inter 字体文件打进插件？
4. **暗色模式**：Cindy 的 dark 是纯中性 `#181818` 体系，是否两档一起做，还是先只做 light？
