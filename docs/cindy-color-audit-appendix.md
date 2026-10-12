# Cindy 桌面客户端颜色体系考古报告（色值与默认调色板）

## 0. 真相源架构与「colors.ts 在哪里」

`globals.css` 第 1 行只有 `@import './generated/tokens.css';`（`apps/desktop/src/renderer/styles/globals.css:1`），而 `generated/tokens.css` 仅 106 行，装的是字体族、字号 `--text-*`、行高、`--motion-*`、`--space-*`、`--radius-*`、字重与 4 个 `--quota-bar-*` 别名，**一个主题色都没有**。所以 globals.css 不是调色板所在。

真正的调色板真相源是 DTCG 三层（reference → semantic → themes），运行时由 JS 注入为 CSS 变量：

| 层 | 文件 | 作用 |
|---|---|---|
| 默认值 | `packages/design-tokens/src/reference/color.json` 的 `reference.defaults` | 549 个 token 的 light/dark 基准值 |
| 生成副本 | `apps/desktop/src/renderer/themes/colors.ts:3-2217` | `GENERATED_DEFAULTS`，与上一行一一对应 |
| 主题覆盖 | `packages/design-tokens/src/reference/themes.json`、各 `themes/builtin/*.ts` | 按主题 id 覆盖 |
| 语义映射 | `packages/design-tokens/src/themes/builtin.json` | 纯别名层，不含新色值 |

**答案：globals.css 引用的 colors.ts 在 `apps/desktop/src/renderer/themes/colors.ts`（3216 行），不在 styles/ 下。** 它由 `// BEGIN GENERATED DS-8: defaults`（:2）到 `// END GENERATED DS-8: defaults`（:2217）包住 `GENERATED_DEFAULTS`，之后是 `EFFORT_TIER_COLORS`（:2202）、`PRICE_TIER_COLORS`（:2212）与数百条 `registerColor(id, value, '中文说明')`。

主题 = 默认值 + 覆盖叠加。`builtin/cindy-light.ts:15` 的 `GENERATED_OVERRIDES`（:14-191）就是 CINDY 的覆盖表，末尾 `colors: { ...GENERATED_OVERRIDES, "surface-translucent-sidebar": … }`（:199-202）。**CINDY 是当前新用户默认主题族**：`themes/families.ts:28` `export const DEFAULT_FAMILY_ID = 'cindy';`，:30-38 注释写明「Cindy 作为新用户默认主题置顶」；`default-light`/`default-dark`（`themes/theme-ids.ts:1-2`）是名为 Classic 的旧默认（`families.ts:39`）。

## 1. 默认主题完整调色板（Light｜Dark 对照）

源：`reference/color.json` 的 `reference.defaults` = `colors.ts:3-2217` 的 549 条。下表按分组列出最有代表性的 90 余条。

| 分组 | Token | Light | Dark |
|---|---|---|---|
| 表面 | `surface` | `#f8f8f6` | `#1f1f1e` |
| 表面 | `surface-hsl` | `60 12.5% 97%` | `60 2% 12%` |
| 表面 | `surface-elevated` | `#ffffff` | `#2c2c2a` |
| 表面 | `surface-elevated-soft` | `#e5e5e5` | `#2c2c2a` |
| 表面 | `surface-card-ivory` | `#faf9f5` | `#2c2c2a` |
| 表面 | `surface-chip` / `surface-chip-alt` | `#e5e5e5` | `#3c3c3a` / `#2c2c2a` |
| 表面 | `surface-hover` / `-soft` | `#e5e5e5` / `#f8f8f6` | `#3c3c3a` |
| 表面 | `surface-hover-hsl` | `0 0% 90%` | `60 2% 17%` |
| 表面 | `surface-on-card` | `#ffffff` | `#1f1f1e` |
| 表面 | `md-table-bg` | `rgba(236,236,234,0.55)` | `rgba(44,44,42,0.55)` |
| 边框 | `border-default` | `#d7d7d4` | `#3c3c3a` |
| 边框 | `border-default-hsl` | `60 3% 84%` | `60 2% 23%` |
| 边框 | `border-shadcn-hsl` | `0 0% 90%` | `30 4% 28%` |
| 文字 | `text-primary` | `#262626` | `#d4d4d4` |
| 文字 | `text-primary-emphasis` | `#1a1a1a` | `#d4d4d4` |
| 文字 | `text-primary-body-strong` | `#525252` | `#d4d4d4` |
| 文字 | `text-primary-hsl` | `0 0% 9%` | `0 0% 83%` |
| 文字 | `text-secondary` | `#737373` | `#a3a3a3` |
| 文字 | `text-secondary-mid` | `#525252` | `#a3a3a3` |
| 文字 | `text-tertiary` | `#a3a3a3` | `#737373` |
| 文字 | `text-disabled` | `#d4d4d4` | `#525252` |
| 文字 | `text-placeholder` | `#c4c4c4` | `#525252` |
| CTA | `accent-cta-bg` | `#262626` | `#ffffff` |
| CTA | `accent-cta-bg-pure` | `#000000` | `#ffffff` |
| CTA | `accent-emphasis` / `accent-soft` | `#262626` | `#d4d4d4` / `#ffffff` |
| CTA | `accent-pure-cta-fg` | `#ffffff` | `#000000` |
| CTA | `primary-foreground` | `0 0% 98%` | `60 3% 14%` |
| shadcn | `background` | `0 0% 100%` | `60 3% 14%` |
| shadcn | `muted` / `secondary` / `accent` | `0 0% 96%` | `30 6% 20%` |
| shadcn | `muted-foreground` | `0 0% 45%` | `24 5% 64%` |
| shadcn | `popover` | `0 0% 100%` | `60 3% 15%` |
| 语义 | `error-bg` | `#fef2f2` | `#3a2222` |
| 语义 | `error-border` | `rgba(220,38,38,0.4)` | `#7f1d1d` |
| 语义 | `error-fg` | `#dc2626` | `#f87171` |
| 语义 | `error-fg-strong` | `#991b1b` | `#fca5a5` |
| 语义 | `warning-bg-soft` | `rgba(234,107,23,0.12)` | `rgba(234,107,23,0.18)` |
| 语义 | `status-success` | `#177C3C` | `#2AAE5B` |
| 语义 | `info-700` | `#1D4ED8` | `#60a5fa` |
| 语义 | `destructive` | `0 84% 60%` | `0 72% 63%` |
| diff | `diff-del-fg` / `-bg` | `#b31d28` / `#ffeef0` | `#ff7b72` / `#67060c` |
| diff | `diff-add-fg` / `-bg` | `#22863a` / `#f0fff4` | `#7ee787` / `#033a16` |
| 聊天 | `agent-actions-rail` | `#DDD6CB` | `#404040` |
| 聊天 | `msg-md-inline-code-bg` | `rgba(175,184,193,0.2)` | `rgba(110,118,129,0.22)` |
| 聊天 | `msg-scrollbar-hover` | `#b0b0ae` | `#555553` |
| 聊天 | `msg-link` | `#2563eb` | `#60a5fa` |
| 聊天 | `chat-input-chip-border` | `#d7d7d4` | `#525250` |
| 聊天 | `file-chip-bg` | `#a3a3a3` | `#525252` |
| 输入 | `chat-input-text` | `#000000` | `#d4d4d4` |
| 输入 | `composer-pill-bg` / `-icon` | `#FCFCFC` / `#3C3F43` | `#393838` / `#D9D9D9` |
| 输入 | `tooltip-bg` | `#262626` | `#1f1f1e` |
| 侧栏 | `sidebar-item-active` | `0 0% 90%` | `60 2% 17%` |
| 侧栏 | `sidebar-action-icon` | `0 0% 64%` | `0 0% 45%` |
| 侧栏 | `sidebar-nav-text` | `#3C3F43` | `#D4D4D4` |
| 侧栏 | `sidebar-list-muted` | `#9A9DA3` | `#6F6F6F` |
| 侧栏 | `sidebar-user-card-bg` | `rgba(255,255,255,0.20)` | `rgba(255,255,255,0.05)` |
| 标题栏 | `titlebar-icon` | `0 0% 45%` | `0 0% 63.92%` |
| 启动屏 | `splash-bg` | `60 12.45% 96.86%` | `60 1.64% 11.96%` |
| 启动屏 | `splash-text-muted` | `30 3.6% 62.55%` | `30 2.78% 43.73%` |
| 搜索 | `search-match-bg` | `45 100% 70%` | `40 55% 21%` |
| 搜索 | `search-match-active-bg` | `34 100% 55%` | `42 100% 65%` |
| 遮罩 | `overlay-modal` | `rgba(0,0,0,0.5)` | `rgba(0,0,0,0.7)` |
| 阴影 | `shadow-soft-panel` | `0 4px 12px rgb(0 0 0/0.08)` | `… /0.3` |
| 阴影 | `shadow-menu` | `0 4px 16px rgba(0,0,0,0.15)` | `… /0.5` |
| 恒定 | `text-secondary-cross` | `#a3a3a3` | `#a3a3a3` |
| 恒定 | `text-tertiary-stone` | `#737373` | `#737373` |
| 恒定 | `text-tertiary-hsl` | `0 0% 45%` | `0 0% 45%` |
| 恒定 | `error-flat` / `error-700` | `#ef4444` / `#dc2626` | 同 Light |
| 恒定 | `warning-accent` / `warning-fg` | `#EA6B17` / `#F3A115` | 同 Light |
| 恒定 | `focus-ring` | `#417CDD` | `#417CDD` |
| 恒定 | `perm-auto-selected-text`、`bot-unread-bg` | `#417CDD` | `#417CDD` |
| 恒定 | `login-error-fg`、`remote-status-failed`、`card-status-error` | `#D91F37` | 同 Light |
| 恒定 | `file-badge-pdf/doc/sheet/slide/code` | `#B23A26`/`#2C5CA8`/`#2E7D4F`/`#A25A12`/`#5B49A8` | 同 Light |
| 恒定 | `engine-badge-cc` / `codex` / `pi` | `#d97757` / `#7a9dff` / `#a78bfa` | 同 Light |
| 恒定 | `search-match-active-fg`、`ask-checkbox-border` | `0 0% 10%`、`#525250` | 同 Light |
| 分级 | `effort-tier` low/medium/high/xhigh/max | `#2AAE5B`/`#14B8A6`/`#3B82F6`/`#4F46E5`/`#8B5CF6` | 同 Light |
| 分级 | `price-tier` t1/t2/t3 | `#2AAE5B`/`#B58A1F`/`#C05353` | 同 Light |
| 分级 | `usage-model-1…5` | `#14B8A6`/`#F43F5E`/`#8B5CF6`/`#6366F1`/`#F59E0B` | `#2DD4BF`/`#FB7185`/`#A78BFA`/`#818CF8`/`#FBBF24` |
| 分级 | `task-tag-pink`/`coral`/`teal`/`indigo` | `#df83b0`/`#de8970`/`#53a89d`/`#7c83cf` | `#e79fc1`/`#e6a08c`/`#75bfb4`/`#999fdf` |

大量 token 在表中未展开者（约 450 条）走别名而非字面值，例如 `panel-bg = var(--surface)`、`msg-user-bg = var(--surface-elevated)`、`send-btn-bg = var(--accent-cta-bg)`、`sidebar = var(--surface-hsl)`、`sidebar-border = var(--border-default-hsl)`、`diff-line-num = var(--text-tertiary-stone)`、`status-info = var(--info-700)`、`text-selection-bg = var(--focus-ring-soft)`。四组「恒定字面值」的别名群：`ring`/`primary`/`foreground`/`secondary-foreground`/`popover-foreground` 全部 = `var(--text-primary-hsl)`。

## 2. Dark 模式的结构性差异

- **不是简单反转**：`text-secondary-cross`、`text-tertiary-stone`、`text-tertiary-hsl`（`0 0% 45%`）三者在 Light/Dark 同值，是刻意锚定的中性档。
- **反相 CTA**：Light 深底 `#262626` → Dark 浅底 `#ffffff`，前景 `#ffffff` → `#000000`。
- **半透明加浓**：`overlay-modal` 0.5 → 0.7，`shadow-*` 0.08/0.12/0.15 → 0.3/0.4/0.5。
- **暖调微保留**：Dark 多组 HSL 仍带 60°/30° 色相（如 `surface-hsl 60 2% 12%`、`muted 30 6% 20%`），说明暗色不是纯灰。

## 3. 内置扩展主题调色板对照

`builtin.json` 是纯别名层（形如 `"surface": {…"{reference.themes.atom-one-light.palette-SURFACE_BG}"}`），色值全在 `reference/themes.json`。8 个内置家族见 `themes/families.ts:32-51`。

| 主题（id） | 页底 | 卡片/抬升 | chip/hover | 边框 | 主文字 | 次文字 | 强调色 |
|---|---|---|---|---|---|---|---|
| atom-one-light | `#FAFAFA` | `#FFFFFF` | `#EAEAEB` / `#E4E4E5` | `#D4D4D5` | `#383A42` | `#696C77` | `#4078F2` |
| solarized-light | `#FDF6E3` | `#EEE8D5` | `#EEE8D5` | `#E1DCC4` | `#757575` | `#828282` | `#859900` |
| one-dark-pro | `#282C34` | `#21252B` | `#2C313A` | `#3E4452` | `#ABB2BF` | `#7F848E` | `#61AFEF` |
| eclipse | `#0D1117` | `#161B22` | `#262C36` / `#1C2128` | `#30363D` | `#E6E6E6` | `#9CA3AF` | `#0CD2A5` |
| github-dark | `#0D1117` | `#161B22` | `#21262D` / `#1C2128` | `#30363D` | `#E6EDF3` | `#7D8590` | `#2F81F7` |
| material-ocean-hc | `#0F111A` | `#090B10` | `#1F2233` / `#1A1C25` | `#2A2F45` | `#EEFFFF` | `#A6ACCD` | `#80CBC4` |
| monokai-pro | `#2D2A2E` | `#221F22` | `#403E41` | `#5B595C` | `#FCFCFA` | `#C1C0C0` | `#FFD866` |

覆盖粒度差异很大：cindy-light=168 / cindy-dark=171 个 `value-*` 键（全量语义覆盖），solarized-light=42，atom-one-light=28，github-dark=27，one-dark-pro=23，eclipse / material-ocean-hc / monokai-pro 各 22（仅 `palette-*`），default-light / default-dark 各 1（仅 `value-perm-auto-selected-text`，故 Classic 家族实际走 549 条默认值）。扩展主题还带各自的 10% alpha 投放色 `drop-overlay-bg`：atom `rgba(64,120,242,0.10)`、github `rgba(47,129,247,0.10)`、eclipse `rgba(12,210,165,0.10)`、monokai `rgba(255,216,102,0.10)`、one-dark `rgba(97,175,239,0.10)`、material `rgba(128,203,196,0.10)`、solarized `rgba(133,153,0,0.10)`。

## 4. CINDY 皮肤族（品牌化）

CINDY 是**暖象牙色系**，不是红色系。`surface` 全暖（B=R−5）：`#F2F2ED` / `#181818`，卡片 `#FDFDF8` / `#1F1F1F`，边框 `#E4E4DF` / `#313131`，正文 `#1A1A1A` / `#D4D4D4`，二级 `#888883` / `#6F6F6F`。HSL 契约上带 60° 暖相：`surface-hsl = 60.0 16.1% 93.9%`（默认主题是 `60 12.5% 97%`），`border-default-hsl = 60.0 8.5% 88.4%`。

**关键反直觉点：CINDY 的 CTA/accent 族不是品牌红，而是中性灰**（`cindy-light.ts:51-56` 注释「E1D 反相中性底(用户批准 2026-07-17,不用红)」）：`accent-cta-bg` `#3C3F43` / `#EEEEEE`，`accent-pure-cta-fg` `#FCFCFC` / `#151515`，`accent-soft` `#25282C`，`accent-hover` `#2E3237`。

品牌红被严格限定在登录品牌点缀，且**双模式同值**：`login-brand-accent` `#DF0C27`（light/dark 同为 #DF0C27，`colors.ts:2448-2451`）、`login-brand-accent-pressed` `#A61629`（`colors.ts:2452-2455`）。注释明确「禁止表达页面/画板背景——命名刻意不含 bg/background」（`colors.ts:2445-2447`；判定常量见 `themes/__tests__/cindyThemes.test.ts:138` `const BRAND_RED_HEX = '#DF0C27'`，:282-291 断言 `caret-accent` 不得为品牌红）。登录页 CTA 消费路径：`components/login/loginDesignTokens.ts:307` `brandAccent: 'var(--login-brand-accent)'` → `LoginControls.tsx:143`。更早的双红渐变层已撤：`login-bg-gradient-radial` / `-linear` 双模式均为 `none`（`colors.ts:2434-2441`）。

其他 CINDY 专有值：`caret-accent` `#417CDD`、`switch-track-on` `#417CDD`、`switch-track-off` `#888888` / `#787878`、`info-700` `#1D4ED8` / `#93C5FD`、`msg-link` `#1D4ED8` / `#93C5FD`、`slider-track` `#A3A39E` / `#626262`、`slider-fill` `#3C3F43` / `#EEEEEE`、`status-badge-fg` `#1F1F1F` / `#121212`、`create-agent-segment-inactive-text` `#9D9D98` / `#6F6F6F`。

CINDY 还独占毛玻璃契约（`globals.css:2068-2226`）：`[data-theme='cindy-light'] body, [data-theme='cindy-dark'] body { background: transparent }`（:2073-2076），侧栏 `var(--surface-translucent-sidebar)`（:2093-2099），浮层卡 `var(--surface-translucent-overlay)` + `blur(6px)`（:2122-2127），peek drawer `blur(28px)`（:2112-2117），`--menu-panel-surface` 在 CINDY 下切到半透明（:2209-2212）；win32 acrylic 与无 blur 平台均有回落分支（:2103-2108、:2132-2137、:2213-2216）。基础主题的浮层则用不透明的 `var(--cmd-palette-bg)`。

## 5. 语义色豁免清单（theme-invariant）

权威登记表在 `packages/design-tokens/src/classify.ts:139-195` `SEMANTIC_EXEMPTION_IDS`，11 个 id，规则文本统一为「theme-invariant 语义豁免色（Tier-3 singleton），外部主题不覆盖」（同文本冗余登记于 `src/classification.json`、`src/semantic/color.json`，守卫见 `src/guards.ts:139-170`：豁免色必须已进 semantic 建模且带 exemption 元数据）。

| 豁免 id | 值 | 是否连 light/dark 都恒定 |
|---|---|---|
| `error-flat` | `#ef4444` | 是 |
| `error-700` | `#dc2626` | 是 |
| `warning-accent` | `#EA6B17` | 是 |
| `warning-fg` | `#F3A115` | 是 |
| `focus-ring` | `#417CDD` | 是 |
| `focus-ring-soft` | `rgba(65,124,221,0.5)` | 是 |
| `destructive` | `0 84% 60%` / `0 72% 63%` | 否 |
| `error-bg` | `#fef2f2` / `#3a2222` | 否 |
| `error-border` | `rgba(220,38,38,0.4)` / `#7f1d1d` | 否 |
| `error-fg` | `#dc2626` / `#f87171` | 否 |
| `error-fg-strong` | `#991b1b` / `#fca5a5` | 否 |
| `warning-bg-soft` | `rgba(234,107,23,0.12)` / `…0.18` | 否 |

这里必须分清两件事：豁免 = **外部主题不覆盖**（monokai-pro 等仍取上表值），不等于 Light/Dark 同值。`classify.ts:136-137` 说明豁免表其余未建模项（`diff-*`、`login-error-fg` 等）待进 shadow 层再登记。默认值里另有大量跨模式恒定的品牌/分级色：`bot-unread-bg`/`perm-auto-selected-text` `#417CDD`、`file-badge-*` 五色、`engine-badge-cc/codex/pi`、`effort-tier` 五档、`price-tier` 三档、`card-status-*`、`pr-open-on-light/dark`、`overlay-lightbox` `rgba(0,0,0,0.85)`、`ask-checkbox-border` `#525250`、`search-match-active-fg` `0 0% 10%`、`tooltip-text` `#ffffff`、`diff-line-num`（别名至 `text-tertiary-stone` `#737373`）。

## 6. HSL vs HEX vs rgb 的表示约定

三种格式由 token 的 `$extensions["com.cindy.desktop"].format` 声明，序列化规则在 `packages/design-tokens/src/production.ts:348-388`：

| format | 输出 | 约束（行号） |
|---|---|---|
| `hex` | `#RRGGBB`，`uppercase` 时大写 | 分量 ×255 取整（:382-387） |
| `triplet` | `H S% L%`（裸三元组，**不带 `hsl()`**） | 必须 `colorSpace==="hsl"`；带 `alphaPrecision` 时追加 ` / a`；无 alphaPrecision 却 alpha≠1 直接抛错 "Triplet format cannot discard alpha"（:353-363） |
| `rgb` | `rgba(r, g, b, a)` 或 `rgb(r, g, b)` | 逗号分隔（:378-381） |
| `transparent` | 字面量 `transparent` | 要求 alpha=0 且分量全 0，否则抛错（:369-375） |
| 非以上 | sRGB 映射 | `Math.round(v*255)`（:366-368） |

**为什么这样分**：CSS 侧要能用 alpha 后缀做 `hsl(H S% L% / a)` 语法，所以这类变量存裸三元组、消费时必须自己包 `hsl()`——这正是 globals.css:133 `border-color: hsl(var(--border));`、:147-148 `background-color: hsl(var(--background)); color: hsl(var(--foreground));`、:898/:920 以及 `sortable.css:69` 的写法；反例是 hex 变量直接裸用：globals.css:689 `border: 1px solid var(--border-default);`、:2050、:2196。带透明度的叠加色则用 `rgb`/`rgba`（`overlay-modal`、`md-table-bg`、`focus-ring-soft`）或 `transparent` 字面量（`border-transparent-mixed`、`login-bg-gradient-*`）。

命名上 `-hsl` 后缀只是约定，`classify.ts:277-287` 明确它**不能单独作为判据**：必须双模式取值都真的是 hsl-triplet（形如 `60 12.5% 97%`）才归类为 `'hsl-triplet'`（`classify.ts:7`、:215）。HSL 三元组还支持 `alphaPrecision: 2` 承载主题级 alpha（如 CINDY `sidebar-item-hover = 0.0 0.0% 0.0% / 0.05`），这是 HEX 无法表达的同色相不同透明度档。
