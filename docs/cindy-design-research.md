# Cindy 前端设计体系调研报告

> 调研对象：https://github.com/makecindy/cindy（Apache-2.0，默认分支 `main`）
> 调研性质：**只读**。本地镜像位于 `_ref_cindy/`（`git clone --depth 1`，13311 个文件），未对仓库做任何修改。
> 一手依据：`_ref_cindy/docs/design-rules/DESIGN.md`（2033 行 / 365KB，权威视觉规范正本）+ 同目录设计治理与索引文档 + `apps/desktop`、`apps/mobile`、`packages/design-tokens` 实现代码。

---

## 0. 结论速览

Cindy 是一款 Electron + React Native 双端的 AI Agent 工作台。它的前端外观不是"随手设计的 UI"，而是一套**有治理合同、有机器门禁、有决策台账**的完整设计系统：

- **视觉哲学**：激进极简的"纸张感"工作台——近单色画布 + 零阴影 + 1px 描边，彩色只作为语义信号出现（§1/§6/§7）。
- **字体**：全站**单一无衬线族 Inter**（显示标题与正文同一字体，层级只靠字号+字重）；等宽 JetBrains Mono 仅用于代码。字重四档 400/500/600/700 且 700 受豁免域严格限制（§3）。
- **主题**：VSCode 式 ColorRegistry + theme-override 架构，三层 token（语义槽 / 别名 / 单例），内置 Light/Dark + 社区主题 + 可导入 VSCode / Obsidian 配色（§10）。
- **版块设计**：整窗三区（sidebar + content + 可选右面板），区域靠 **1px Board 分隔线**而非背景色差；8px 基数间距；圆角由 §5「两步决策树」唯一裁决（0/2/4/8/12/9999px，**没有 3/6/10px**）（§5）。三栏不是写死的 DOM，而是 `layoutTree.ts` 里一棵**可拖拽的布局树**（sidebar 在分割树外层 + content 递归分割 + 恒空的 float 层），1px 缝本身就是拖宽把手（含 7px 隐形抓握区、双击均分）（§13.4）。
- **实现层四处反直觉（只读规范文档一定会踩）**：① **主题色真身不在 `styles/globals.css`**——它只 import 一个 106 行、不含任何主题色的 `tokens.css`；549 个色值住在 `apps/desktop/src/renderer/themes/colors.ts`（3216 行）的 `GENERATED_DEFAULTS`，由 `packages/design-tokens` 的 DTCG 三层反向管理（§13.3）；② **新用户默认主题族是 `cindy`**（`themes/families.ts:28 DEFAULT_FAMILY_ID='cindy'`），名字听起来更"默认"的 `default-light/dark` 其实是名为 **Classic** 的旧默认（§13.3）；③ **CINDY 皮肤的 accent / CTA 是中性灰**（Light `#3C3F43` / Dark `#EEEEEE`），品牌红 `#DF0C27` 只出现在登录界面点缀、**禁止作页面背景**，所以"Cindy 是红色品牌"的直觉在编辑器 UI 里是错的（§13.3 / §16.1）；④ **语义豁免 ≠ light/dark 同值**——`classify.ts:139-195` 的 11 个豁免 id 含义是"外部导入主题不覆盖它们"，与明暗两态取值是否相同无关（§13.3）。另有两个字体侧的实现细节：`tailwind.config.ts` **没有 `sans` 键**（UI 字体只走 CSS 变量 + body 继承），默认代码字体是**系统等宽栈**而非 JetBrains Mono（§13.1）。
- **治理强度**：设计规则由 `design-governance.md`（治理合同）+ `design-decision-log.md`（只增不改的决策台账）+ 一系列冻结测试（`cindyThemes.test.ts`、`typographyDiscipline.test.ts`、`switchThemeContrast.test.ts` 等）共同守护——**规范里写的规则大多有测试断言**。

---

## 1. 仓库与设计文档架构

### 1.1 仓库边界

本仓只负责 **desktop、mobile 及其共享 packages**（服务端在独立仓库）。主线包：

| 包 / 目录 | 角色 |
| --- | --- |
| `apps/desktop` | Electron 渲染层（主工作台，React + Tailwind） |
| `apps/mobile` | React Native 移动端 |
| `packages/design-tokens` | 设计 token 正本（DTCG 格式 + 生成链路） |
| `packages/*`（共 35 个） | 共享能力包 |

Topics：`agent`、`ai-agent`、`electron`、`ios`、`android`、`react-native`、`typescript`、`claude-code`、`codex`、`llm`、`macos`、`windows`。Homepage：`https://cindy.app`。

### 1.2 设计文档的三层真相源

这是整套体系最值得借鉴的地方——**文档分工被显式写成"真相源边界"**：

| 文档 | 体积 | 地位 |
| --- | --- | --- |
| `docs/design-rules/DESIGN.md` | 365KB / 2033 行 | **权威视觉规范正本**。所有视觉规则的最终解释权 |
| `docs/design-rules/cindy-design-system.md` | 27KB | 设计文档索引 + 版本台账 |
| `docs/design-rules/design-governance.md` | 45KB | **治理合同**：真相源边界、兼容红线、两级证据合同、PR 风险分类 |
| `docs/design-rules/design-decision-log.md` | 121KB | **决策史台账（只增不改）**。记录"为什么这样定"与历史值 |
| `docs/design-rules/token-decision-table.md` | 30KB | token 决策记录；**§9 是色彩阶梯权威值** |
| `docs/design-rules/figma-component-spec.md` | 72KB | 登录链路逐参数权威（含 Figma nodeId 溯源） |
| `docs/design-rules/design-inventory.md` | 269KB | 设计资产清单 |
| `docs/design-rules/usage-history-charts.md`、`ios-native-design.md` | — | 专题补充规范 |
| 根 `DESIGN.md` | 379B | 仅作历史路径兼容跳转，指向 `docs/design-rules/DESIGN.md` |

冲突裁决顺序被写死：**与 DESIGN.md 冲突时以 DESIGN.md 为准**；但色彩阶梯的"值"以 `token-decision-table.md §9` + `colors.ts` 为准；登录域逐参数以 `figma-component-spec.md` 为准。

### 1.3 DESIGN.md 章节地图（2033 行）

```
§1  视觉主题与氛围 (7)          §9  Agent Prompt Guide (736)
 §1.1 New-task home (25)       §10 主题系统与 Token 参考 (767)
§2  颜色与角色 (39)             §11 Voice & Content 微文案 (944)
§3  排版规则 (248)              §12 （并入 §4）(986)
§4  组件样式 (338)              §13 Open Spec/Token Gaps (990)
§5  布局原则 (560)              §14 交互约定 (998)
§6  深度与层级 (682)             §15 CINDY 皮肤族 (1487)
§7  Do's and Don'ts (694)       §16 登录链路 (1762)
§8  窗口与自适应 (721)
```

编号纪律：**章节号是稳定标识符**（被代码注释、冻结测试、其他文档引用），可以增补但不能重排；例如 15.9 从未分配，编号空缺被永久保留。

---

## 2. 视觉主题与氛围（§1）

> "Cindy 的界面是应用于 AI Agent 工作台的激进极简——一片安静、近乎单色的画布，用户的输入与 Agent 的输出是唯一要求注意力的东西。……这是 Dieter Rams 式物件的数字等价物：每个像素都挣得它的位置，**装饰的缺席本身就是设计**。"

关键特征（§1 Key Characteristics）：

1. **近单色默认主题**：彩色只经 §2 的许可语义集出现，且一律通过 token 消费。
2. **Inter 单一无衬线族**：同时承担显示标题与正文。
3. **紧凑圆角体系**：0 / 2（数据标记）/ 4（键盘 keycap）/ 8（内层控件）/ 12（容器）/ 9999px（pill 动作框）。
4. **基础语言零阴影**：深度只来自背景色阶与 1px 描边（窄例外经 token 门控，见 §10）。
5. **普通动作框默认 pill**；已注册形状（keycap、数据标记）与被包含内容作为独立可见层单独分配。
6. **工作中界面没有吉祥物与装饰插画**——品牌图像只出现在登记过的品牌表面（§15.7 / §16）。
7. **极致内容克制**：每个表面只讲一个清晰的想法。

`§1.1`（2026-09-06 用户决定）：新任务首页**不显示**继承订阅或推广积分的通知卡；订阅详情归服务商设置、余额与到期归计费设置。移除是显式产品决定，**不得以"保留一次性通知行为"为由恢复**。

---

## 3. 颜色体系（§2 + §15.16）

### 3.1 三层图层系统（Light/Dark 对称）

| 角色 | Light | Dark | 用途 |
| --- | --- | --- | --- |
| **Surface** | `#f8f8f6` | `#1f1f1e` | 页面底色——每个页面从这里开始 |
| **Card** | `#ffffff` | `#2c2c2a` | 抬升层：登录卡、模态、面板、需要离页浮起的一切 |
| **Board** | `#d7d7d4` | `#3c3c3a` | 发丝分隔线——1px 边框、卡片轮廓、同层分隔 |

**分层规则（扁平 vs 抬升）**——这是"版块设计"的根：

- **全窗应用**（主工作台、聊天界面、看板）：整窗用**单一 Surface 平底**，页面结构层面**没有 Card 层**；区域边界（sidebar / toolbar / 内容区）用 **1px Board 分隔线**绘制，**绝不用背景色差**。
- **居中卡片式布局**（登录、模态、空态卡）：Surface 作页底 + Card 作浮起卡，靠 Surface↔Card 的色差读作"抬升"，**不需要阴影**；卡片轮廓用 Board。
- **元素级 vs 页面级**（重要澄清）：全窗布局的"扁平 Surface"只约束**页面整体结构**，不约束单个控件。全窗聊天界面可以同时有"扁平 Surface 页面"和"Card 色的聊天输入框"——这是两个不同作用域。

### 3.2 交互中性色与文字色

- **Chip 与按钮中性色**（前景元素，不属于图层系统）：Light 用 `#e5e5e5`（`--surface-chip`）；Dark 主 chip 用 `#3c3c3a`（`--surface-chip`），变体 `--surface-chip-alt` `#2c2c2a` 收敛到 Dark Card 值（chip 直接坐在 Surface 上、只需 Card 级抬升时用）。拿不准时用 `--surface-chip`。
- **中性文字**：Stone `#737373`（次级正文、页脚链接）、Mid Gray `#525252`（加重次级）、Silver `#a3a3a3`（三级文字/深度弱化元信息）。
  - **Silver 永不用作 placeholder**——太显眼、读起来像已填写；placeholder 用 `--text-placeholder` `#c4c4c4`。
- Dark 模式文字用软化中性色减轻眼疲劳：Soft Gray `#d4d4d4` 主文字、Silver `#a3a3a3` 次级、Stone `#737373` 三级（`--text-secondary` / `--text-tertiary` 在明暗间**值互换**）。
- 已废弃：`#d4d4d4` "白色按钮描边色" 与 `#404040` "白底按钮文字色"（2026-06 G1/G2）——从未被真实组件使用；白色 pill 次级按钮统一用 Board 描边 + `--text-primary` 文字。

### 3.3 许可的语义色（近绝对的灰度规则的唯一出口）

新语义色**必须先登记入 §2 才能引入**。已登记的窄作用域彩色：

| 语义 | 值 | 作用域 |
| --- | --- | --- |
| **Focus Blue** | `#417CDD` @50% | 键盘焦点环（`--focus-ring` / `--focus-ring-soft`），2026-07-17 定稿，替代 Tailwind 默认 `#3b82f6`；正常交互流程中永不可见 |
| **Thinking / Warning Orange** | `#EA6B17` 双模同值 | 共享 warning-accent 族：ChatView 运行状态条（sparkles + 状态文字，无背景填充）、侧栏运行中呼吸图标、协作模式菜单行 ON 态、plan-approve 图标、Full Access 权限高亮、设置集成警告、workflow agent 状态条运行单元格（8×8px）、侧栏任务信息未解决 PR 角标点、Bot 群聊发言行（2026-09-27 登记） |
| **状态四色** | running `#EA6B17` / awaiting `#19D2C1` / error `#D91F37` / done `#2AAE5B` | 双模同值，9 个内置主题全部跟随 |
| **Toast 图标四色** | info `#417CDD` / success `#2AAE5B` / warning `#F3A115` / error `#D91F37` | **仅** Toast pill 内的 16×16 lucide 图标；pill 本体（背景/文字/描边/关闭图标）严格灰度 |
| **Diff** | Add fg `#22863a`/`#7ee787`，bg `#f0fff4`/`#033a16`；Del fg `#b31d28`/`#ff7b72`，bg `#ffeef0`/`#67060c` | GitHub 标准；作用于 `+`/`-` 字形、变更行文字**与整行背景**（三处：Edit 工具 DiffView 卡、markdown ```diff 代码块、`.diff`/`.patch` 的 TextLightbox）；行号槽与未变更行严格灰度 |
| **文件类型徽章** | pdf `#B23A26` / doc `#2C5CA8` / sheet `#2E7D4F` / slide `#A25A12` / code `#5B49A8` | 前景统一独立白 `#FFFFFF`（对比度 5.96–7.09，10px 小字过 AA） |
| **Bot 头像色相** | 9 个 tint（red/orange/amber/green/teal/blue/violet/pink/graphite） | 仅 `features/bots` 的 Bot 圆形头像填充；编码"这是哪个 Bot"的身份线索，不是状态；外部主题导入永不触碰 |
| **Bot 未读徽章** | `#417CDD` + 独立白前景 | 仅队友列表未读指示（IM 未读语义），不是 CTA |
| **权限选择器高亮** | Auto Approval `#417CDD` / Full Access `#EA6B17` | 仅选项文字/图标/勾与折叠触发器；选中行背景保持灰度 |
| **使用历史类别色** | heatmap 蓝色强度阶 + `--usage-model-1…5` 种子色 + `--engine-badge-cc/-codex` | 用量热力图与日 token 图；类别色不继承 process/status 语义 |
| **进程类别色** | 6 对（task 蓝/agent 服务紫/主进程粉/渲染器青/GPU 琥珀/工具绿） | **仅**资源用量表 14px 进程字形；编码进程类别，**不是健康/状态** |
| **任务标签十二色** | 红橙黄绿蓝紫灰粉珊瑚青靛蓝白 | 仅标签色球与编辑色板，表示用户分类**不表示运行状态**；色球圆形细描边、选中时勾在球内；白色在双模都保持白，用独立深色勾保对比度 |
| **ConfirmDialog Danger** | `#EF4444` | 仅 danger 变体的确认按钮背景 |
| **Windows 任务栏提醒徽章** | 背景 `#D91F37` + 白字无描边 | 原生 OS overlay，非应用内主题 token；1 位数字用圆、多位用圆角方、>99 用 `99+` |

### 3.4 渐变系统（§2）

- **核心 UI 零渐变**。视觉分隔只靠平面色块与 1px 描边——这是近乎哲学的设计选择（登录画布同样按裁定保持扁平，见 §16.5）。
- 唯一窄例外（Desktop 2026-08-10 批准）：`BrandLoadingMark` 可用一条中性 `transparent → --text-primary → transparent` 渐变，**仅**作为会话消息树延迟时官方字标内部的 mask 裁剪高光。它是加载进度信号，不是背景/分隔/填充/可复用表面处置；只在 200ms 延迟揭示阈值后才可能出现，消息树一挂载即消失。

### 3.5 2026-08 色彩阶梯修订（§15.16）——暖象牙 / 中性近黑

这是 CINDY 皮肤族的最新色彩模型，**值权威 = `token-decision-table.md §9`**，冻结在 `cindyDecisionData.ts`：

**Light = 暖象牙**
- page `#F2F2ED`；每个 surface/border 都是暖的，且 **B = R−5**（单一暖度常量）。
- 一个被认可的例外：纯白 `#FFFFFF` 保留给需要在近白卡片之上最大抬升的浮动平面（当前仅 `ask-option-list-bg`）。
- 卡片保持近白 `#FDFDF8`——卡片抬升 ≈9.4%，与原始 spec 一致。
- hover/chip 档坐在页面**之下**（白色天花板之上没有空间）；侧栏是自己的平面、深一档（`#EEEEE9` 配 85% 玻璃不透明度）。
- **文字阶梯**：最深强调 `#0C0C0C` → 正文 `#1A1A1A`（两者中性、清晰）→ 三级 `#6B6B67`（暖 −4）→ 次级/元信息 `#888883`（暖 −5，≥3.0 floor）→ disabled `#9D9D98`（WCAG 豁免）。**文字越浅，暖度越高。**

**Dark = 纯中性**
- page `#181818`，所有层 R=G=B（零暖度），是自 2026-07 值的简单平行位移。
- 已知债务：近黑压缩只保留约 **65%** 的原始感知层分离度，记录在 issue #2559，修法是等亮度阶梯。
- Dark 文字档全部中性（三级 `#C1C1C1`，2026-08 等亮度中性化）。

**双重锚定原则**（修订后单个 token 无法同时服务两个平面）：
- 坐在**页面**上的交互填充锚定到页面（surface-hover 档）。
- 坐在**卡片/popover**上的填充锚定到卡片：light `#F6F6F1`，约低于卡片 6%——`settings-menu-bg-selected`、`perm-item-selected-bg`、`ask-badge-bg`、`cmd-palette-item-hover`。
- Dark 例外（仅本次修订）：`settings-menu-bg-selected` 用菜单 hover 抬升 `#282828`，不是页面锚定的 `#1D1D1D` chip；其余三者暂留页面锚定值待各自后续。
- **不要把它们"统一"回去。**

**孪生同步**：每个同时以 hex 与 HSL 承载的颜色（24 对）必须值一致；派生半透明内联值（如 `chat-input-border-focus` = 三级色 30%）在其源移动时必须重新派生。

**豁免族不动**：`login-*`（58 token）、`diff-*`、`error-*`、`overlay-*`、语义状态色、阴影。

---

## 4. 排版与字体（§3）

### 4.1 字体族——全站单一无衬线

```
Display / Body / UI : Inter
  fallback: system-ui, -apple-system, "Segoe UI", sans-serif
Monospace           : JetBrains Mono
  fallback: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace
```

> **桌面默认澄清**：JetBrains Mono 是**可选预设与历史排版样本**；实际发布的默认使用 `reference/foundations.json` → `app-font-code-default` 的**系统等宽字体栈** + 既有 CJK 回退（DS-8 保留了该栈与用户字体选择）。

选 Inter 的三条理由（原文）：① 中性几何特征，不抢戏；② 小字号可读性极佳；③ 在 Web 与设计工具中广泛可用。**单一字体让层级保持干净——分离来自字号与字重，而不是字体的对比。**

原则四条：
- **单一无衬线族**：显示标题与正文同一字体，不切换字体造层级。
- **字重克制**：日常 chrome 默认 400 / 500；600 是**限量**强调档；700 只活在登记豁免域内。没有 light、没有 black、没有中间值。
- **紧凑显示、舒适正文**：标题压到 1.0 行高，正文放松到 1.43–1.56，对比本身造层级、无需字重对比。
- **等宽只给代码**：JetBrains Mono 仅用于行内代码、终端命令、代码块，**永不用作 UI chrome**。

### 4.2 层级表（Hierarchy）

| 角色 | 字体 | 字号 | 字重 | 行高 | 备注 |
| --- | --- | --- | --- | --- | --- |
| Display / Hero | Inter | 48px (3rem) | 500 | 1.00 tight | 最大冲击力标题 |
| Section Heading | Inter | 36px (2.25rem) | 500 | 1.11 tight | 功能区块标题 |
| Sub-heading | Inter | 30px (1.88rem) | 400/500 | 1.20 tight | 卡片标题、功能名 |
| Card Title | Inter | 24px (1.5rem) | 400 | 1.33 | 中等强调标题 |
| Body Large | Inter | 18px (1.13rem) | 400/500 | 1.56 | Hero 描述、按钮文字 |
| Body / Link | Inter | 16px (1rem) | 400/500 | 1.50 | 标准正文、导航 |
| Caption | Inter | 14px (0.88rem) | 400 | 1.43 | 元信息、描述 |
| Small | Inter | 12px (0.75rem) | 400 | 1.33 | 最小阅读字号 |
| Micro Label | Inter | 10–13px | 400/500 | 1.20–1.40 | **仅辅助/非阅读**标签：侧栏树分组头(13px)、树行计数、frontmatter 字段名、scope chips、tag pills、状态徽章、面包屑段。**永不用于正文** |
| Code Body | JetBrains Mono | 16px | 400 | 1.50 | 行内代码、命令 |
| Code Caption | JetBrains Mono | 14px | 400 | 1.43 | 代码片段 |
| Code Small | JetBrains Mono | 11–12px | 400/500 | 1.40–1.63 | 标签、树内路径 |

**定位说明**：Display / Section Heading / Sub-heading 三行是**仅为品牌画布**（§16 登录/Splash 家族及自包含页）的概念角色目标；它们的实际值活在画布常量与 §16 表格里，不在应用代码中。日常 chrome **与**应用内空态都走 Body / Caption / Small / Micro 行；`apps/desktop` 代码的规范字号集是下方的「桌面 UI 字号白名单」——**层级表描述角色，白名单约束值。**

### 4.3 字重阶梯（2026-08 修订，issue #1505）

全站字重**只允许四个整百档**，禁止一切中间值（550/650…）与 800 及以上：

| 档 | 名称 | 用途 |
| --- | --- | --- |
| 400 | Regular | 长文阅读正文、代码 |
| 500 | Medium | **UI 默认强调、标题——日常 chrome 的主力档** |
| 600 | Semibold | 限量强调（徽标、表头、选中态等局部加重）。新增使用要能说出「为什么 500 不够」 |
| 700 | Bold | **仅限豁免登记表中的域**，禁止出现在普通 UI chrome |

- 与移动端 `apps/mobile/src/theme/tokens.ts` 的 `fontWeight` token（regular/medium/semibold/bold）**一一对应——两端一张梯子**。
- **手机端按角色选字重**（2026-09-26 用户定稿）：标题 600、列表行/按钮 500、正文与说明 400、分组小标签 600；**浅色字不配粗字重**。
- **两端 700 口径**：手机端 UI chrome 上限仍是 600；`bold`/700 在手机端只允许出现在登记域（原生 Markdown strong 与登录品牌画布）。"四档梯子"是两端共用的**档位定义**，不等于两端 chrome 都能用 700。
- **CJK 注记**（重要实践教训）：桌面未设 `font-synthesis: none`，中文回退字体（PingFang）**公开档位只到 600**——UI 里用 700 会在中文上触发**伪粗体**（算法加粗、边缘发糊），且 600 与 700 在 CJK 上的渲染差异不可靠。**中文层级不得依赖 600 vs 700 区分，强调靠字号或颜色。**

### 4.4 桌面 UI 字号白名单（2026-08，issue #1505）

- **UI 段：{10, 11, 12, 13, 14, 15, 16}px；标题/内容段：{18, 20, 24, 28}px。下限 10px——9px 及以下禁止（再小就不是文字是纹理）。**
- **下限约束的是"开发者写死的档位"，不约束运行期缩放结果**：用户可把 UI 字号设到 `appearanceSettings.uiSize` 最小值 12（默认 14），`useFontSettings` 按 `uiSize / 14` 缩放并 `Math.round`，此时 `--text-10` 与 `--text-11` 都会算成 9px（两档在该设置下失去区分）。这是用户主动选择的整体缩小，守卫只检查源码里写的档位。**若要保住 10px 视觉下限，应在字号设置侧（提高 `uiSize` 下限或改缩放曲线）解决，而不是往白名单里加更小的档位。**
- **写法**：一律用 `tailwind.config.ts` 的 `text-<n>` token 类（映射 `--text-<n>` 变量；doc 紧凑模式与字号缩放能力都挂在这层变量上，**任意值类会静默漏掉这些机制**）。语义类 `text-xs/sm/base/lg` 只收编存量（等值 12/14/16/18）；源码侧禁止 `text-xl` 及以上（守卫拦截）。**禁止新增任意值 `text-[Npx]`（含一切小数）与白名单外档位**；需要新档先改本表与权威来源。
- **单源约定（DS-8）**：DTCG 是已接管族的唯一编辑源，同一 Terrazzo 流程生成本节摘要、CSS 默认值、Tailwind / 字号 hook / class merge 的映射。生成新鲜度 + 独立白名单 + 实际缩放测试共同保护这条链，不再手动同步多份数值。
- **品牌画布域**（登录/Splash 等设计 px 坐标系表面）不映射白名单：字面量只允许进画布常量文件（`loginDesignTokens.ts` 的地位，对齐手机端 `loginSkinLayout.ts`）或登记的自包含品牌页生成器（`oauthResultPage.ts`），组件消费端照常受守卫扫描。

### 4.5 排版豁免登记表（登记过的刻意分歧，不要当 bug"修"）

| 域 | 范围 | 允许 | 理由 |
| --- | --- | --- | --- |
| 登录 / Splash 品牌画布 | 桌面 `LoginControls.tsx`、`loginDesignTokens.ts`、`LegacyMigrationDialog.tsx`（仅字重）、`oauthResultPage.ts`；手机 `(auth)/login.tsx`、`LoginSkinControls.tsx`、`loginSkinLayout.ts` | 700 + 设计 px 字号 | §16 已登记 Bold，两端共用同源登录画布与 figma 坐标系 |
| markdown 内容 | **仅 Markdown 渲染路径**：桌面 `MarkdownRenderer` 输出的 DOM `<strong>`（解析为绝对 700，嵌套 strong 仍封顶 700）、CodeMirror strong 语法节点、移动端原生 Markdown strong | 700 / `bold` | 用户内容语义，非 UI chrome。**不覆盖普通 UI chrome 里直接写的 `<strong>`**（如 `MakerExperimentalView.tsx`）——那些同样被 preflight 的相对 `bolder` 渲染成 700，但不属豁免域，是已登记缺口，待归一为 `font-medium`/`font-semibold` |
| hljs 主题移植 | `globals.css` 内 hljs 规则 | `bold` | 第三方主题移植，保真优先 |
| 第三方查看器 | `vendor/drawio/viewer-static.min.js` 及 `vendor/` 下上游产物 | 上游自带字重字号 | 渲染的是用户绘图内容而非本产品 chrome；**整个 `vendor/` 目录不纳入扫描**（守卫盲区已显式登记） |
| CodeMirror / Markdown 内容字号 | `codemirrorGithubTheme.ts` 标题层级（`2.15em`/`1.62em` 相对值） | 相对字号（`em` 派生） | 内容标题层级必须随编辑器基础字号等比缩放，固定 token 会打断比例关系 |
| 命令式第三方 API | xterm `ITerminalOptions.fontSize`、SVG `fontSize="N"` 等 | 数值字面量 | 这类 API 不消费 DOM class。**取值规则**：必须取自白名单档位或用户代码字号设置解析出的运行期值，不允许凭手感另取一个数 |
| 用户可配置代码字号 | `--app-code-font-size` 及其 `calc` 派生（约 19 个文件） | 变量与派生 | `appearanceSettings.codeSize` 允许 10–24 逐整数，运行期可落在白名单外的值；**白名单约束的是开发者写死的档位，不约束用户设置** |
| 外部页注入 | `browserCommentPreload.ts` | 系统字体族 | 注入他人网页，不强加 Inter |
| 手机 WebView HTML 生成器 | `selectableMarkdownHtml.ts` 等 | CSS 语法字面量 | 手机守卫已自登记盲区，值仍须守本阶梯 |
| 紧凑模式派生值 | `globals.css` `.chat-rail-compact` 段 | calc / -1px 派生 | 机制本体 |

### 4.6 排版 non-goals（已知且明确不治理）

- **line-height 档位统一**：桌面存在 `leading-[1.45]`/`leading-[1.55]` 等微调档与无单位/px 混轨，本轮不收敛。
  - **但有一条例外在 #1553 已治理完毕**：`text-<n>` 与**固定 px 行高**（`leading-[Mpx]`）并存属于**功能缺陷**而非风格漂移——`text-<n>` 会响应用户「外观 → UI 字号」设置，固定 px 行框不跟随，**用户放大字号时文字会裁切/重叠**。该组合一律改为无单位比例（比例 = 原 px ÷ 字号），默认字号下渲染不变而放大时正确。#1553 把当时全部 **38 处**清零（14 处为字号归一新引入、24 处先于其存在）；门禁为 `typographyDiscipline.test.ts` 的 `fixed-leading` 规则，**按 `className`/`cn(...)` 整块区域跨行判定**（只比对同一行会漏掉 `cn()` 分行写法，#1553 实际漏过一处）。
- 语义类 `text-xs/sm/base/lg` → `text-<n>` 的机械统一（等值改写零收益，收编即可）。
- letter-spacing 与 font-family 治理。
- 原生层排版（macOS agent-island helper 等 Swift/原生 UI）不在本白名单域。

### 4.7 移动端文字规范（交叉引用）

`apps/mobile/docs/mobile-design-guide.md §3`「文字规范速查」是移动端正本：**五档中性字色、浅色字不配粗字重、11 档字号、每种文字风格必须配行高**——由 `typographyTokenDiscipline.test.ts` 守护；角色是否选对靠 review。桌面/移动端排版规则的双向同步是硬要求。

---

## 5. 主题系统与 Token 架构（§10）

### 5.1 双模式交付门槛（硬性）

每个 UI **必须同时实现 Light 与 Dark**，只做一种视为未完成；颜色一律走语义 token，禁止只适配一种模式的硬编码或条件补丁。但——**双模式"实机目检"不是硬门槛**：能目检更好，做不到时如实写明哪种模式未验证；**"复用了 themed 样式"不得当成"双模式已验证"**。

### 5.2 架构：VSCode 式 ColorRegistry + theme-override

源码目录 `apps/desktop/src/renderer/themes/`：

| 文件 | 职责 |
| --- | --- |
| `color-registry.ts` | `ColorRegistry` 单例 + `registerColor(id, defaults, description)` |
| `colors.ts` | 注册所有 token（语义槽优先、别名与单例在后）——**是活清单** |
| `theme-service.ts` | `applyTheme(theme)` 把所有 token 序列化进 `:root{}` 并注入 `<style id="theme-vars">` |
| `builtin/` | `cindy-light.ts` / `cindy-dark.ts` / `eclipse.ts` / `default-light.ts` / `default-dark.ts` + 社区调色板 |
| `registry.ts` | `builtinThemes` 注册表 + `listThemesByType('light'|'dark')` |

切换由 `useTheme.ts` 提供 `theme(System/Light/Dark)` 与 `lightThemeId`/`darkThemeId`；UI 入口 = Settings → Appearance。

### 5.3 三层 Token 阶梯

| 层 | 内容 | 说明 |
| --- | --- | --- |
| **Tier 1 语义槽** | 跨上下文核心槽：`--surface-*`、`--text-*`、`--border-*`、`--accent-*` | **加主题时主要覆盖战场** |
| **Tier 2 别名** | 组件域 token：`--cmd-palette-bg`、`--msg-tool-card-text`、`--settings-input-border` | 默认解析为 `var(--slot)`，浏览器自动前向解析；组件继续用别名名 |
| **Tier 3 单例** | 真正独立的值：语义豁免色（`--destructive`、`--diff-add-*`、`--status-bar-accent`）、平台专属色、splash 时长、`--radius` 等非颜色 token | — |

Tier 1 实测值（DS-8 自动生成表，Light/Dark）：

```
Surface : --surface #f8f8f6/#1f1f1e      --surface-elevated #ffffff/#2c2c2a
          --surface-card-ivory #faf9f5/#2c2c2a   --surface-chip #e5e5e5/#3c3c3a
          --surface-chip-alt #e5e5e5/#2c2c2a     --surface-hover #e5e5e5/#3c3c3a
          --surface-hover-soft #f8f8f6/#3c3c3a   --surface-on-card #ffffff/#1f1f1e
Border  : --border-default #d7d7d4/#3c3c3a  --border-shadcn-hsl "0 0% 90%"/"30 4% 28%"
Text    : --text-primary #262626/#d4d4d4    --text-primary-emphasis #1a1a1a/#d4d4d4
          --text-secondary #737373/#a3a3a3  --text-tertiary #a3a3a3/#737373
          --text-placeholder #c4c4c4/#525252  --text-disabled #d4d4d4/#525252
Accent  : --accent-cta-bg #262626/#ffffff   --accent-cta-bg-pure #000000/#ffffff
          --accent-hover #262626/#e5e5e5    --accent-pure-cta-fg #ffffff/#000000
```

### 5.4 Token 命名与选择规则

- **命名**：slot = `{category}-{subkind}[-{variant}]`（如 `text-primary-emphasis`、`surface-chip-alt`）；`-hsl` 后缀标记 HSL 三元组形式；alias 保留历史组件域名无前缀；singleton 用清晰语义名通常带组件前缀。CSS 变量一律 **kebab-case，不用 VSCode 的 dot-style id**（`sidebar.itemActive`），因为 CSS 变量不支持点号。
- **新 UI 的 token 选择五条**：① 先 grep `colors.ts`；② **语义槽优先于组件域别名**（跨主题行为更可预测）；③ HSL token 必须包 `hsl(var(--x))`，**不能裸写 `var(--x)`**（裸写得到的是 HSL 字符串不是合法 CSS 颜色）；④ 没有合适 token 不要硬凑，找用户讨论新增槽/单例；⑤ **绝不用 `bg-[#xxx] dark:bg-[#xxx]` 硬编码对**（P2 前的反模式，已迁移过一次，新代码不得复现）。

### 5.5 新增主题的流程

1. 建 `themes/builtin/<id>.ts`，导出 `Theme { id, name, type: 'light'|'dark', colors: {…} }`，**只覆盖与 base 不同的 token**（多数主题只需覆盖 30–90 个 token；空对象 `{}` 也合法 = 与 base 相同）。
2. 在 `themes/registry.ts` 的 `builtinThemes` 注册。
3. Settings → Appearance 的 Light/Dark 下拉自动拾取。

### 5.6 外部主题导入（VSCode / Obsidian）

Settings → Appearance 可导入 VSCode 配色主题（`*.json/jsonc`）或 Obsidian `theme.css`，转成本地主题。实现分两侧：`apps/desktop/src/shared/theme-import/`（纯转换，无副作用）+ `apps/desktop/src/main/local-themes/importer.ts`（对话框/读/写）。

- **单一模板**来自人工移植的 7 个社区主题（one-dark-pro、github-dark、eclipse、material-ocean-hc、monokai-pro、atom-one-light、solarized-light），共享 **108-token base template**，由 13 个 palette role + 可选 light-only `inputBg` role 派生。派生逻辑代码化在 `shared/theme-import/palette.ts`；**`one-dark-pro.ts` 头部注释是"哪个 VSCode key 喂哪个 role"的真相源**。
- **allow-list only**：只发那 108 个 base id + 导入主题专属的 `switch-track-off`/`switch-thumb-off` 安全对。
- **豁免族永不被导入**：`--login-*`、品牌红、`--destructive`、`--error-*`、`--warning-accent`、`--status-bar-accent`、`--focus-ring*`、`--diff-*`、阴影与遮罩在所有导入主题下保持规范值。由 `shared/theme-import/protected-tokens.ts` 作为第二道闸强制；导入报告会告诉用户保留了多少 token。
- **`-hsl` token 是计算得来不是拷贝**：转换器用 `toHslTriplet()` 从 hex 派生，两种形式必须表示同一颜色。
- **Markdown 文字色**走 `--md-h1-fg…--md-h6-fg` / `--md-strong-fg`，**默认 `inherit`**（默认 `var(--text-primary)` 会重绘 blockquote/tool card/secondary 区的标题，故默认 inherit，保证每个内置主题渲染与之前完全一致）；导入主题从 Obsidian `--hN-color`/`--bold-color` 或 VSCode `markup.heading`/`markup.bold` 填充。守卫 `markdownColorTokens.test.ts`。
- **Obsidian 导入是"调色板导入"不是主题移植**：只读 CSS 自定义属性，**选择器/布局/圆角/字体全部丢弃**——Cindy 的布局与排版仍归 §3/§5 所有。无法静态求值的（`color-mix()`、未定义 `var()`）跳过并报告而非猜测。
- **勾选态 Switch track = 主题强调色**：7 个移植主题各自覆盖 `switch-track-on` 为自己的强调色（solarized-light 用 GREEN_DEEP，官方 `#859900` 不过 3:1）；注册表默认仍是 `hsl(var(--primary))`。守卫 `switchThemeContrast.test.ts` 断言每个内置主题勾选 track 对勾选 thumb 与**全部五个表面** ≥3:1。
- **本地主题可声明可选 `family`**：同 family 的 light+dark 变体合并为一个可切换 family（`themes/families.ts`）；无此字段的文件行为不变（family id = theme id）。Obsidian 的双模 CSS 借此落地为跟随 Light/Dark 的单一主题。

---

## 6. 布局原则（§5）

### 6.1 间距系统

- **基础单位 8px**；scale = `4, 6, 8, 10, 12, 14, 16, 20, 24, 32, 40, 48` px。
- 标准按钮动作框用 **24px 水平 padding** 并在 28/32/36px 高度内垂直居中；**不要在那个高度上再加 10px 上下 padding**。
- 容器 padding：对话框 16px（`p-4`）、下拉面板 6–8px。

### 6.2 布局结构（应用）

**整窗三区**：`sidebar + content area（+ 可选右面板）`，由 **1px Board 分隔线**在同一片**平坦 Surface** 上分隔——**绝不靠背景色差**。居中卡片式布局（登录、空态）遵循 §2 的 Surface + Card 两层规则。阅读宽度内容（设置表单、文档预览）用舒适的最大宽度居中；全出血内容（聊天流、文件树）铺满其区域。

### 6.3 留白哲学

> **空即是奢侈**：没有表面停留过久——每个概念得到最小但足够的空间。**内容密度按设计就低**：一个表面一个清晰想法；需要更多时按 §14 拆成**渐进披露**，而不是塞得更紧。**留白就是品牌**：平静、无装饰的空间传达"这工具不碍你的事"。

### 6.4 圆角体系（§5 Border Radius Scale，2026-09-07 重写）

**本节是圆角分配的唯一权威源**；其他章节的组件条目只引用它、不引入竞争规则。

**核心概念：被分配圆角的对象是"一个可见层"**——一个具体的框、表面或裁剪轮廓，**不是 DOM 标签也不是整个组件**。一个控件常规上携带多个层（"运行 ⌘Enter" 按钮有 pill 动作框、内部 4px keycap、以及不需要自己框的命中测试职责），逐层分配。**父级的圆角不是被包含层的分配规则。**

**两步决策树，Step 1 优先于 Step 2：**

**Step 1 — 已注册形状**（只有被批准的条目覆盖了那个具体可见层与用法时才用；语义论证支持申请但不确立成员资格；新增或扩大条目需走治理裁决 + 决策日志记录；**作者与评审都不得仅靠解读本节创造成员资格**）

| 类别 | 范围 | 圆角 |
| --- | --- | --- |
| **键盘 keycap** | 每一个可见键盘快捷键框，无论渲染成 `<kbd>` 还是接受该快捷键的交互按钮（注册于 2026-09-06） | **4px** |
| **数据标记** | 图表/可视化内部一个形状属于数据而非控件的可见层（注册于 2026-09-07） | **0px 或 2px，按成员钉定** |

已注册数据标记成员（值按成员固定，**绝不在调用点选择**）：

| 成员 ID | 定义 | 圆角 |
| --- | --- | --- |
| `usage-heatmap-day` | UsageHeatmap 中代表某天用量的着色单元格（排除命中区、图例、外层容器与 tooltip） | 2px 四角 |
| `usage-token-bar` | UsageTokenBars 中代表某天 token 量的着色条（排除命中区、外层容器与 tooltip） | 2px 四角 |
| `workflow-status-cell` | agent 状态条里的着色微单元格（后台任务面板详情 + workflow 聊天卡） | 2px 四角 |
| `system-category-square` | SystemCard 里注册的按类别状态方块 | 2px 四角 |

注册新数据标记所需**证据**（不是自动接纳的自助测试）：① 从数据字段到该层视觉通道（位置、尺寸、面积、颜色强度**或类别色**）的稳定映射；② 哪些可见层属数据、哪些属控件，分开陈述；③ 分类不依赖当前数据点数量、标签文本、是否有点击处理器或渲染技术（DOM/SVG/canvas）。**普通输入选项、控件选中态与动作框不因承载数据而进入。**

**Step 2 — 控件层**（Step 1 未覆盖的普通控件框、容器与内层控件表面）

| 层级 | 值 | 对象 |
| --- | --- | --- |
| **Pill** | `9999px` | 控件框：按钮、标签页、单行输入、tag、badge。**控件的填充风格绝不改变其层级**——透明与描边填充仍是 pill（对话框次要/取消按钮是透明填充的 pill） |
| **Container** | `12px`（`rounded-xl`） | 装内容的盒子：代码块、卡片、面板、对话框 |
| **Inner control** | `8px`（`rounded-lg`） | 多行输入（textarea，**永远 8px**，无论嵌套在可见容器里还是单独立于表单中）；外加下拉/菜单中的选中/hover 行高亮，以及容器内嵌套的小块单元格 |

**交互约束（分配之后适用）**：

- **让某物可点击永不把层在 Step 1 与 Step 2 之间搬动。**
- 命中测试与标记几何是独立职责，可共享同一个 DOM 元素或绘制原语，**不需要额外 wrapper**；命中目标几何不得替换、裁剪或扭曲标记注册的可见几何或其数据映射。为实现该结果，必要时用 `rounded-none` 重置已有圆角是允许的——**某个 class 的存在与否不是合规判据**。
- **在承载数据的层上，hover 不得改变编码数据的视觉映射。**
- 同一数据与显示配置下，已注册标记的几何与圆角处置**不得仅因交互启用或禁用而改变**。
- **命中目标尺寸**：已注册数据标记身份本身**不**提供指针目标要求的例外。用量热力图与日 token 图只有在 Usage History 视图同时提供一个满足 WCAG 2.2 SC 2.5.8 的日期选择控件、且该控件能以相同筛选结果到达每个可选日期时，才可通过 **Equivalent** 路径保留密集日期目标。**DS-11 在范围选择器旁加了一个 36px 高、带标签的日期字段**；不同日期的重叠目标不是可接受的放大技术。
- **已注册交互强调（Usage History 图表，owner 批准 2026-09-08）**：对 `usage-heatmap-day` 与 `usage-token-bar`，非命中测试的可见层可**扩张 2px**（热力图单元格宽/高、条宽），落在 3px 网格间隙内，不改变网格节距、静止几何或任何数据编码；条高、基线、类别色 token、热力图强度与命中区不变。09-08 细化只允许 token 图在窗内日期被选中或近七天范围被高亮时**淡出未选中的条**。**其他成员不得借用这个强调。**

**范围与清单**：

- **不要发明圆角。"看起来小"永远不是把层往下一层的理由**——Step 2 内层的层级跟随它**是**什么（控件框/盒子/textarea），不是它的尺寸或嵌套。
- 注意嵌套：12px 面板内的 8px 行高亮必须小于其容器；那里的 pill 会变成菱形，12px 显得臃肿。
- **受治理的圆角值：数据标记 0px 与 2px、keycap 4px、内层控件 8px、容器 12px、pill 框 9999px。没有 3px / 6px / 10px，也没有任意值。**
- 无框可圆的层不需要分配；"无分配"不是新增的圆角值。**内在内容与标记几何仍在本圆角清单之外**（散点圆的形状、饼图扇区弧、地图轮廓是标记自身的形状）。
- 既有的非 keycap `rounded-[4px]` 用法作为**已注册债务**保留；裸 `rounded` 与 `rounded-sm` 不替代任何东西。

### 6.5 窗口与自适应（§8）

- Cindy Desktop 是 Electron 应用：**布局响应窗口 resize，不是页面断点**。
- 最小窗口尺寸：主窗口与次级会话窗口 **800 × 600**（BrowserWindow 层强制，`main/bootstrap-electron.ts` / `secondary-windows.ts`）；分离的右侧栏窗口有自己的更小下限 **360 × 480**（`right-sidebar-window/window.ts`）——托管在那里的布局必须在该宽度下保持可读。
- 侧栏可折叠；区域分隔线与 padding 在窗口变窄时保持，内容流式重排；聊天流与 composer 随窗口重排，**代码块保持横向滚动而非折行**。
- 窗口 resize 不豁免适用的目标尺寸要求，也不授权改变标记的注册几何。
- Mobile（React Native）有自己的设备类规则（phone / pad 竖 / pad 横）；iOS 导航、sheet、材质与控件遵循平台补充 `ios-native-design.md`。

---

## 7. 组件样式（§4）

### 7.1 按钮族（Pill 三型）

```
button/primary  (Gray Pill)
  fill    --surface-chip     #e5e5e5 / #3c3c3a
  text    --text-primary     #262626 / #d4d4d4
  border  1px solid --surface-chip（与填充同色）
  radius  9999px (pill)
  padding 水平 24px；垂直在固定高度内居中
  height  32px (md) / 36px (lg)——没有 40px 尺寸（DS-4 G1, 2026-09-03）
          （2026-09-21 owner 反馈新增 28px sm）
  type    text-13 / font-medium 500（DS-4 G4, 2026-09-03）
  hover   --button-primary-hover  = 静止填充向 --text-primary 混 8%（换色，绝不用 opacity）
  pressed --button-primary-pressed = hover 再向 --text-primary 混 10%
  disabled opacity 60%；普通指针
  impl    components/ui/button.tsx variant="primary"

button/secondary  (White Pill)
  fill    --surface-elevated  #ffffff / #2c2c2a
  border  --border-default    #d7d7d4 / #3c3c3a
  其余同 primary；视觉上比 primary 更轻；绑定 Tier-1，不是 --settings-btn-secondary-*

button/cta  (Black Pill — 最大强调)
  fill    --accent-cta-bg-pure  #000000 / #ffffff
  text    --accent-pure-cta-fg  #ffffff / #000000
  hover   --button-cta-hover = --accent-hover #262626 / #e5e5e5（换色，非 opacity）
  note    白底纯黑（Dark 反转）；**一屏最多一个**
```

**为什么 hover/pressed 是"派生"而不是"别名"**（DS-4，比例由设计者 2026-09-04 裁定）——一条很值得学的工程理由：在 Dark 下 `--surface-hover` 与 `--surface-chip` 在 default-dark / cindy-dark / one-dark-pro / monokai-pro 中**解析为同一个值**，所以把 primary 的 hover 别名到 `--surface-hover` 会让 hover 态**看不见**；`--surface-hover-soft` 在 cindy-dark 中与 `--surface-elevated` 相差在 2/255 以内，同样会毁掉 secondary。因此每个状态都从**自己变体的静止填充**向**自己的前景**混合——hover 混 8%，pressed 再混 10%。这条阶梯自动跟随任何主题覆盖，且不引入主题盲字面量。守卫 `buttonStateContrast.test.ts` 断言每个内置主题每步 ΔRGB ≥ 8。

**桌面按钮反馈（HTML v3，2026-09-19 批准）**：共享动作按钮用 28/32/36px 高度、pill 圆角、13px/500 文字与既有语义色；图标/文字间距默认 6px。**按下时只有非交互的填充/描边层每条边内缩 1px**，用时 `--motion-instant`(80ms) + `--motion-ease-out`；文字、图标、布局与命中区保持不动。状态色过渡用 `--motion-fast`(150ms)。Loading 只显示居中 spinner 并保留可访问名与标签宽度；disabled/loading 控件不接收按下反馈。Reduced motion 移除内缩、过渡与 spinner 旋转。

同一绘制层被 `ChromeIconButton`(28px) 与 `SidebarIconButton`(36px，已移除 34px 网格旧样式) 共享。`--button-face-bg`/`--button-face-border` 是既有主题 token 的**组件局部别名**，不是新增主题 ID。

### 7.2 输入与表单

```
input/text
  fill        --surface-elevated  #ffffff / #2c2c2a
  text        --text-primary      #262626 / #d4d4d4
  border      --border-default    #d7d7d4 / #3c3c3a
  radius      9999px（pill——单行输入）
  height      32px (sm) / 36px (md) / 40px (lg)（与按钮共享 4px 台阶）
  focus       --focus-ring-soft   rgba(65,124,221,0.5)（#417CDD 的 50%；不透明边框变体 = --focus-ring）
  placeholder --text-placeholder  #c4c4c4 / #525252
  error       --error-border / --error-fg
  disabled    60% opacity + 普通指针
  ivory       surface="ivory" → --settings-input-bg（--surface-card-ivory），显式白面板/嵌套卡表面
  impl        components/ui/input.tsx
```

- **多行输入（textarea）取 8px 内层控件圆角，永不 pill**（高框会把它拉变形）——无论嵌套在容器里还是单独立于表单中（单一规则，无嵌套条件）。实现：`components/ui/input.tsx` 的 `Textarea`。
- 既有设置输入通过 `SettingsTextInput`（`ui/input` 的薄包装）保留其本地主题契约（`settings-input-text`、`-border`、`-border-focus`、`-placeholder` 别名），默认仍解析到 Tier-1。**不要把这些遗留覆盖提升为全局语义槽或改写用户主题文件。**
- **placeholder 必须读起来明显是空的**：Silver `#a3a3a3` 在两个 Card 表面上都太显眼（Dark ≈5:1 / Light ≈2.6:1），读起来像真实输入——**禁止**。所有输入表面的 placeholder（chat / ask / settings / plan-action-fb）都解析到 `--text-placeholder`。

**DS-11 字体角色与控件配对**：普通 ConfirmDialog 标题 18/500；provider/MCP 表单标题 18/600；紧凑提示标题 15/600——**角色不因为字号相同就可互换**。配对规则：Button md(32px) 配 Input sm(32px)，Button lg(36px) 配 Input md(36px)；Input lg 保持 40px 用于宽敞字段，**按钮没有 40px 尺寸**。字号名是各组件本地 API，不是共享序数标尺。

### 7.3 其余组件

Toast、Dialog & Modal、Tabs、Select & Dropdown、Desktop segmented controls、Cards & Containers、Provider detail header、Teammate model settings、Usage data graphics、Desktop chat and operation authorization（DS-9）、About: harness versions 等条目位于 §4 行 401–559；其实现层取值见本报告 §12 实现层附录。

---

## 8. 深度、层级与动效

### 8.1 层级表（§6）

| 层级 | 处置 | 用途 |
| --- | --- | --- |
| **Flat (Level 0)** | 无阴影、无边框 | Surface 背景、多数内容 |
| **Bordered (Level 1)** | `1px solid` Board（Light `#d7d7d4` / Dark `#3c3c3a`） | 卡片、代码块、分隔线、区块轮廓 |
| **Lifted (Card)** | Card 填充（Light `#ffffff` / Dark `#2c2c2a`）+ 可选 1px Board 轮廓 | 登录卡、模态、抬升面板 |

**阴影哲学**：Cindy 的基础视觉语言使用**零阴影**。这不是疏漏而是刻意的设计决定——扁平、无阴影的做法造出纸张般的体验，元素**纯粹靠背景色与单像素边框**区分；深度由**内容层级与排版字重**传达，而非视觉分层。系统中仅有的阴影是：移动端首页抽屉例外、经 token 门控的浮动层例外（`--shadow-menu` 用于菜单/popover/模态面板、`--cmd-palette-shadow`、`--segmented-selected-shadow`；`--confirm-shadow` 为兼容保留但已不再被对话框消费——**当前生效的浮层阴影例外以此为准**）以及 §15.18 的 Slider thumb。**绝不给页内元素加临时阴影。**

> Switch 旋钮阴影被实验过后**明确否决**（用户裁定 2026-08-05）：16px thumb 上遗留的 `shadow-lg` 实际不可见，而一个可见的替代品读起来像噪音——**旋钮按决定保持扁平，不要重新加回去**。

**移动端首页导航抽屉例外**（owner 要求 2026-09-27）：左缘主菜单用抬升表面、右侧容器圆角与来自移动端 `homeDrawerShadow` token 的柔和向外阴影。**仅限 `HomeChromeDrawer`**（含其配套入口），不适用于页内卡片或任务列表侧栏。账号头部把用户名放最前，带默认字母头像、可选邮箱、组织名旁的小组织 logo；**不要显示账号 ID**。

### 8.2 动效（§14.4）

Cindy 的动效性格延续 §1/§7 的纸张式克制：**普通 UI 平滑淡入淡出、微移与尺寸变化；过冲仅限于显式登记的 Done、Usage History 图表与移动端新任务 morph 响应**。功能性状态过渡允许，装饰性动效禁止。

**动效 token（唯一的档位源）**——桌面在 `:root`，移动端镜像同名同值于 `src/theme/tokens.ts`。**新过渡/动画必须引用 token，不得硬编码时长或 cubic-bezier**：

| Token | 值 | 用途 |
| --- | --- | --- |
| `--motion-instant` | 80ms | 即时 hover 反馈；轻浮层退出 |
| `--motion-fast` | 150ms | 颜色/不透明度状态变化（`transition-colors` = 此档）；轻浮层进入 |
| `--motion-base` | 200ms | 尺寸变化：展开/收起、面板开/关 |
| `--motion-enter` | 250ms | 重浮层（对话框）进入 |
| `--motion-exit` | 150ms | 重浮层退出 |
| `--motion-ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | 进入 / 展开 |
| `--motion-ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | 退出 |
| `--motion-ease-move` | `cubic-bezier(0.4, 0, 0.2, 1)` | 位置/尺寸插值 |

语义环周期例外：`--motion-spinner-cycle = 1000ms` 是功能性 loading spinner 的整圈时长，**不是第六个交互档**，不得用于进入/退出/hover/resize/装饰；spinner 旋转保持线性、仅 transform、挂在 HTML wrapper 上、reduced motion 下静止。

侧栏标题阅读例外：`--motion-sidebar-title-marquee-per-viewport = 2400ms` 是 Desktop 侧栏任务标题溢出时每个可见宽度跨度的阅读时间，**仅限** `SessionItem.tsx` 的 `SidebarTitleMarquee`：只在实际溢出时、仅指针 hover、一次性、离开即重置；轨道只可动 `transform`/`opacity`；`prefers-reduced-motion` 保持原始静态省略号。

**§7 Don't 中的动效纪律**：不要装饰性或大动作动画——没有 bounce、parallax、looping 或无谓移动。短的**功能性**状态过渡（颜色/背景/不透明度，**≤150ms**）是好的、且被期待。

---

## 9. CINDY 皮肤族（§15）

### 9.1 定位

§15 记录 CINDY 皮肤族，**不重写 §1–7 的默认皮肤规则**。值定稿自设计阶段工作文件 + 用户 2026-07-18 最终签字；实施时**零自由裁量**。仓库内权威编码是主题文件（`cindy-light.ts` / `cindy-dark.ts`）、`cindyDecisionData.ts` 与冻结测试，§15 是散文摘要。**子节号是稳定标识符（被 §16、代码注释、冻结测试引用），不得重排。**

### 9.2 调色板（§15.1）

| 角色 | Light | Dark |
| --- | --- | --- |
| Brand red | `#DF0C27` | `#DF0C27` |
| Deep brand red（hover/pressed） | `#A61629` | `#A61629` |
| Background | `#F2F2ED`（暖象牙，2026-08 修订） | `#181818`（纯中性，2026-08 修订） |
| Card / input | `#FDFDF8` | `#1F1F1F` |
| Border | `#E4E4DF`（桌面暖色） | `#313131` |
| Secondary info | `#888883`（2026-08 裁决：暖化并提到 ≥3.0） | `#6F6F6F` |
| Body text | `#1A1A1A`（强调层 `#0C0C0C`） | `#D4D4D4` |
| Pure white | `#FFFFFF` | `#FFFFFF` |

**移动端自 2026-09-26 拥有自己的 border 阶梯与文字值（见 §15.13 / mobile guide §3）。**

### 9.3 品牌红边界（§15.10，E1D 裁决）——**最值得抄的一条纪律**

- **普通主操作从不用品牌红，它们是中性反转的。** 中性按钮四态：Light bg `#3C3F43` / text `#FCFCFC`，hover `#2E3237`，pressed `#25282C`；Dark bg `#EEEEEE` / text `#151515`，hover `#E2E2E2`，pressed `#D4D4D4`（对比度 10.32 / 15.74:1）。
- 红只被限定在语义例外：destructive/删除、`error-*`、warning、diff 红、状态点、显式移动端 Beta 渠道徽章（2026-08-25 用户决定），加上登录品牌强调 `--login-brand-accent`（§16）。
- **单向禁令 + 白名单机制**：任何不在 `RED_EXCEPTION_ALLOWED_IDS` 内的 token 若含 `#DF0C27`/`#A61629`，**测试即失败**。红白名单**不含**光标、焦点环、普通按钮、普通选中背景。**新的红色消费者必须先记录语义并先进入 token/测试白名单，不许组件级硬编码。**
- 侧栏色彩层级（Light/Dark 同一套）：Body（会话标题）= `text-foreground`（= `--text-primary`：Light `#3C3F43` / Dark `#D4D4D4`）；次要灰（静止引导图标/时间戳/元信息/分组标签）Light `#888883` / Dark `#6F6F6F`；**选中 pill = 反转 pill**（Light `#3C3F43` / Dark `#EEEEEE`，前景 Light `#FCFCFC` / Dark `#151515`）。**任何坐在 `bg-sidebar-item-active` 上的前景必须用 `text-sidebar-item-active-foreground`——那里禁用 `text-foreground`。**
- 运行态引导图标（vendor glyph / Puzzle / RadioTower / Clock）= **Thinking Orange `--warning-accent` `#EA6B17`**，通过 `session-status-breathing` 呼吸；**选中态保持橙色**（优先级：running > 选中反转前景 > 其余）。
- 断言：③ `CINDY_EXPECTED` 锁 4 个 token 值；⑦ 增加层级断言（次要灰明显弱于正文；选中 pill 前景对其填充 ≥4.5）。测试映射 `NEUTRAL_PRIMARY_EXPECTED_BY_ID` / `NEUTRAL_PRIMARY_FOREGROUND_BY_ID` + `RED_EXCEPTION_ALLOWED_IDS`。

### 9.4 其他关键子节

- **§15.4 跨主题豁免**：`warning-accent #EA6B17`、`annotation-accent #FF3B30`（图像标注烧录墨色，豁免不改）、`status-bar-accent`（橙色别名）。状态四色（running `#EA6B17` / awaiting `#19D2C1` / error `#D91F37` / done `#2AAE5B`）双模同值，9 个内置主题全部跟随无 override。`focus-ring #417CDD` 蓝、永不红。
  - `sidebar-draft-indicator` 是窄语义例外：非选中侧栏行上的 8px 铅笔，表示 composer 草稿或暂停的发送队列；Light 深青 `#0B726B`，Dark 别名 `card-status-awaiting #19D2C1`；半透明侧栏合成到黑/白壁纸极值后对普通与 hover 表面仍需 ≥3:1（注册时最差 3.17:1 light / 5.65:1 dark）。Rail tiles 因此用 `--sidebar-item-hover`，**绝不用仅属升级按钮的 `--update-btn-hover`**。
  - **hljs 语法色双阈值裁决**（2026-07-17）：语法色 ≥3:1、正文 ≥4.5:1。守卫 `cindyCodeBlockContrast.test.ts`。
- **§15.5 U2 显式例外**：`text-secondary` 的 **dark 值**（`#6F6F6F`）是"忠实 Figma"例外——WCAG 实测对 surface 2.92:1、对 elevated 2.65:1、对 chip 2.72:1，均低于正文 AA 4.5:1；裁决 U2（2026-07-16）：**忠实 Figma 值，可读性损失作为记录在案的显式偏差接受**。**绝不单方面压暗**（`#686B72` 试过被否），改值需新的用户裁决。Light 侧 2026-08-13 被取代为 `#888883`。**范围 2026-09-26 起仅桌面端**；移动端不再承担 U2 例外（其次要文字 `#4D4D4A`/`#BDBDBD` 满足 4.5:1）。反向冻结测试 `cindyThemes.test.ts` 第 ⑦ 组断言精确终值，注入 `#686B72` 必须失败。
- **§15.6 HSL 格式契约**：42 个 `HSL_FORMAT_IDS` 必须是 HSL 三元组（`h s% l%`，h∈[0,360)，灰色 hue=0，1 位小数）；其他 token 全是 hex/rgba；HSL→RGB 往返通道误差 ≤1；`HSL_FORMAT_IDS` 之外不得写成 HSL 三元组。
- **§15.7 品牌资产**：新会话品牌块固定 50×50px 方形图标 + 110×37.5px 横向 logo，9px 间距；`ThemeBrandLockup` 是唯一渲染者；主题只通过 `theme.brand.icon/logo` 换美术资源——**绝不重缩放定稿 lockup**。cindy-light 用黑字 logo，cindy-dark 用白字。**logo 资产红 `#F70121` 是官方美术内在色，与 UI 品牌红 `#DF0C27` 并存且不同——保持原色，不要"纠正"。** splash wordmark 是独立资产对（白字用于 DARK / 深字用于 LIGHT），459×156 @2x、渲染框 229.5×78，**都不带投影**。
  - **已批准品牌表面只有 5 处**（各有 scope boundary，不得扩散）：① session-switch 延迟加载遮罩 `BrandLoadingMark`（2026-08-10）② 会话分享导出页脚（Desktop 2026-08-06 / Mobile 2026-08-08）③ 移动端下载弹窗头部 64px 图标（**QR 卡无品牌边缘、无边框、无阴影、无 3D 倾斜**——2px 图标边缘 2026-07-25 试当天删除，因为看起来像二维码后面怪异的旋转环，契约测试 `mobileDownloadDialog.test.tsx`）④ 支付宝支付 QR 的 40px 白色中心板（只在 payload 以 H 纠错编码成功后显示 32px 图标）⑤ Computer Use 光标（箭头与光晕用品牌红 → 深品牌红渐变，因由进程外 cua-driver 渲染、无法消费 CSS 变量，故固定双色）。
- **§15.8 `status-badge-fg`**：橙色徽章（bg = `#EA6B17`）的独立前景 token，默认镜像 `accent-pure-cta-fg`；**CINDY 覆盖 light 为 `#1F1F1F`、dark 为 `#121212`**（对 `#EA6B17` 对比 5.19:1 / 5.90:1）。
- **§15.11 输入光标 `--caret-accent`**：每个可编辑输入表面从它取光标色；`globals.css` 全局拥有（原生 `caret-color` + ProseMirror 伪光标）；**组件禁止自设光标色**；**不得把光标别名到 `--focus-ring`**（即使值相同——语义不同，必须保持独立可调）；CINDY 双模覆盖为 `#417CDD`。移动端对等：`apps/mobile/src/theme/tokens.ts` 的 `inputCaret`，由 `themeTokens.test.ts` 锁定。
- **§15.12 Vibrancy 磨砂玻璃**（macOS/Windows）：
  - **唯一半透明表面 token** `surface-translucent-sidebar`：CINDY light `rgba(238,238,233,0.85)` / dark `rgba(5,5,5,0.85)`（默认主题下为不透明 `var(--surface)`）。**未来任何半透明表面默认复用它——不许新增临时 rgba。**
  - **壁纸穿透三重管线——缺任一环都得到死黑**（设备上 A/B 验证）：① 在**窗口创建时**设置 vibrancy backing（`bootstrap-electron.ts` / `vibrancyConfig.ts`），运行期用 `setBackgroundColor` 改 alpha 不可靠；macOS 用 `backgroundColor '#00000000'`；Windows Acrylic 用当前 `surface-translucent-sidebar` 的 RGBA 作稳态 backing，且该平台/材质组合上普通侧栏 CSS 是透明的以避免双重着色。② CINDY 主题下**根容器让位**：`globals.css` 把 `.h-screen.bg-content-area` 设为 transparent，否则不透明根挡住一切。③ **普通侧栏不加 CSS `backdrop-filter`**——它会把透明窗口 backing 渲染成黑盒；壁纸模糊完全是原生 vibrancy 材质的职责。
  - 材质由 `XDT_VIBRANCY_MATERIAL` 选择，**代码默认 `hud`**（用户实测）；Windows：Win11+ 用 `backgroundMaterial`（默认 acrylic），Win10/非 CINDY 回退不透明 `--surface`。
  - **半透明表面上不加渐变叠加**（light-red 渐变层 2026-07-18 已确认设计中没有并整体移除）。
  - `surface-translucent-sidebar` 的 alpha 是主题冻结区**唯一开放的观感旋钮**；调整需三处同步（`cindy-light.ts` / `cindy-dark.ts` / `cindyDecisionData.ts`）且 themes 测试套件全绿。
- **§15.14 运行/协作橙**：运行中呼吸图标**永远是 Thinking Orange**（VendorIcon、SessionStatusIcon、AutomationSessionGroupItem）；选中态保持橙色。**协作菜单行 ON 态是橙色**（composer「+」菜单里的协作项，active 文字 + UsersRound 图标用 warning-accent；OFF 态保持中性）——这是 2026-07-17 中性 composer 菜单规则的显式 carve-out，仅限 ON 态。**SVG 持续动画红线：呼吸类持续动画放在 HTML wrapper（span）上，SVG 保持静止。**
- **§15.15 Create-Page 内容位置 + 标题栏 hover 纪律**：
  - CREATE AGENT 内容组垂直位置 = `max(96px, 28vh) + 46px`（自窗口顶部），实现 = `pt-[calc(max(96px,28vh)+46px-var(--content-header-h,46px))]`；**268px 上限已死**（Figma 帧高度遗留物——大窗口上内容偏高的根因）；`--content-header-h` 由 `ContentHeaderSlot` 经 `display:contents` wrapper 广播（渲染 46px / 隐藏 0px），选中项目切换 header 时内容**零跳动**。
  - **Hover token 纪律**：`--update-btn-hover` **专属**升级按钮的 hover——**禁止**用在普通 ghost 按钮/徽章上（CINDY light 下近黑 `#2E3237` 会吞掉文字与图标；2026-07-21 清理了 6 处误用）。正确选择：标题栏区 ghost 元素 → `titlebar-button-hover`；内容区普通浅色 hover → `--surface-hover`。
- **§15.17 Switch**：桌面 CINDY Light 与 Dark 都把 `switch-track-on` 覆盖为 `#417CDD`（2026-09-15，取代 08-05 的 Light `#4A4D51` / Dark `#EEEEEE`）；CINDY Dark 的勾选与未勾选 thumb 都是近白 `#FCFCFC`。共享桌面 Switch 保持 **36 × 20 轨道 / 16 × 16 静止 thumb**；hover 时 thumb 加宽到 17×16；按下/拖拽用 18×14。透明命中区提供至少 24px 高度而不改变可见轨道尺寸。**绝不要改全局 `background` 来给 Switch 上色。**
- **§15.18 Slider 族**（owner 批准 2026-09-17）：三个共享桌面变体——数值（`ui/slider`）、推理档（`ui/effort-slider`）、媒体位置（`ui/media-scrubber`）。数值：6px 轨道 / 36px 命中高度，thumb 16×16 → hover 18×18 → pressed 22×16；媒体：4px 轨道 / 28px 命中，thumb 10×10 → 12×12 → 14×10；推理档保留分档色 21×21 thumb。**几何变化改变实际宽高并用完整 pill 圆角，绝不椭圆缩放。** 数值/媒体 thumb **无常规描边**，用 `slider-thumb-shadow`（Light `0 1px 3px black 18% + 0 2px 6px black 8%`；Dark 30% + 16%）——**这个窄例外不允许 Switch 用阴影**。独立 CINDY token：轨道 Light `#A3A39E` / Dark `#626262`；填充 `#3C3F43` / `#EEEEEE`；thumb `#FDFDF8` / `#FCFCFC`。

### 9.5 跨端换肤定稿规则（§15.13）

品牌红 `#DF0C27` 仅用于品牌展示/splash、破坏性操作、运行/思考强调、列表活跃字形（dark 用 `#A61629` 作字形）。**普通 CTA、FAB、发送按钮、确认型主按钮都是中性反转**：桌面 light bg `#3C3F43`/text `#FCFCFC`，dark bg `#EEEEEE`/text `#151515`；移动 light `#0F0F0F`/`#FFFFFF`，dark `#EDEDED`/`#121212`（2026-09-26）。绝不品牌红。

---

## 10. 登录链路（§16）

登录页是**独立白底/深底反色体系**，与编辑器主界面解耦：

- **不消费编辑器主题的 `--surface` / `--text-*` 等 slot**，只走 `--login-*` token（已注册于 `themes/colors.ts`）。`--login-*` 随基础 light/dark **二态**切换，但**不跟随具体扩展主题**。
- **交付状态**：**亮色** as-built 已合并入 main；**深色**为目标规格（色值经 Figma 组件库 Dark symbol 逐个核验），token 已注册但 dark 槽位当前为 light 占位值，待实现 PR 填入。
- **面板/控件走墨黑–米白反色**，深色镜像反相：亮色白面板 `#FBFBFB` + 米白控件 `#EEEEEE` + 墨黑主按钮 `#2A2828`；深色反相为深面板 `#312F2F` + 深控件 `#2C2A2A` + 白主按钮 `#EEEEEE`。**两模式的面板/控件底色与文字都不出现纯黑 `#000` 或纯白 `#fff`**（例外：暗色主按钮/圆钮的 `#FFFFFF` 白边为 figma `white_button` 实测值）。
- **品牌红在登录画布内只用于区域徽标（旧称 Global pill）与字标红元素等品牌 accent，跨模式不变**；**禁止作页面背景**（wave4 改判）；不渗入面板内部。画布底走 `--login-bg-base`（亮 `#F2F2ED` / 深 `#181818`，与 CINDY 皮肤页底同值，固定不随扩展主题）。错误红 `#D91F37` 同样跨模式不变。

关键 `--login-*` 双态目标值（节选，完整表见 §16.1）：

| token | light | dark |
| --- | --- | --- |
| `--login-panel-bg` | `#FBFBFB` | `#312F2F` |
| `--login-panel-border` | `#D4D4D4` | `#434343` |
| `--login-control-bg`（输入框底） | `#EEEEEE` | `#2C2A2A` |
| `--login-action-control-bg`（方式行/返回钮底） | `#EEEEEE` | `#2A2828` |
| `--login-control-border-active`（focus/filled） | `#2A2828` | `#EEEEEE` |
| `--login-control-text`（Bold） | `#252222` | `#EEEEEE` |
| `--login-control-placeholder` | `#D4D4D4` | `#6F6F6F` |
| `--login-secondary-text`（副标题/倒计时） | `#6F6F6F` | `#6F6F6F`（两模式同值） |
| `--login-primary-button-bg` | `#2A2828` | `#EEEEEE` |
| `--login-primary-button-border` | `#434343` | `#FFFFFF` |
| `--login-link-text`（重发链接） | `#2A2828` | `#EEEEEE` |
| `--login-error-fg` | `#D91F37` | `#D91F37`（语义豁免不变） |

登录链路逐参数权威 = `figma-component-spec.md`（组件/色板速查，nodeId 溯源）+ `token-decision-table.md`（token/尺寸决策）；`DESIGN-login`（逐屏规格）、`flow-map`（状态机）、`fidelity-matrix`（保真度验收矩阵）仍为设计阶段工作文件，**不入仓库**。

---

## 11. 治理合同与门禁（design-governance.md）

这是整套设计系统最"工程化"的部分——**规则的执行力来自制度和测试，而不是靠自觉**。

### 11.1 治理合同章节结构（388 行）

```
§1  目的与范围（含 §1.1 管道与记账：守卫红灯的正确读法）
§2  四种真相与职责边界
§3  Token 层级
§4  兼容红线
§5  工具决定（单选，一次定案）
§6  证据合同（Level 1 静态守卫 / Level 2 真实截图）
§7  PR 风险分类与回退
§8  治理接线纪律
§9  计数纪律（registerColor 总数 / 内置主题数快照）
§10 待裁决登记
§11 存量门禁与文档处置表
§12 公开实施路线与目标验收（DS-1 … DS-11 批次）
§13 已知边界（如实登记，不夸大机器能力）
```

**当前计数快照（2026-08-29）**：`registerColor` 总数 **506**；内置主题数 **11**。

### 11.2 守卫红灯的正确读法（§1.1）

> **守卫红灯不是禁令，是提醒走合法路径**：改数值真相源 → 同一 PR 更新对应守卫快照 → 用户裁决（如 2026-08 亮色调整即循此路径，冻结测试 `cindyThemes.test.ts` 组⑦）。唯一禁止的事：为了让红灯变绿而**未经裁决**加豁免、绕加载路径、在别处重声明。

这条对任何"有设计系统 + 有测试"的项目都直接可抄。

### 11.3 组件层不得反向成为基础 Token 的来源

机器守卫检查该方向（§3）。即：**依赖方向只能是从基础 token → 组件别名**，不能反向。

### 11.4 兼容红线（§4）——五条硬边界

1. **旧 Token ID 不删除、不改名**——旧 ID 已进入用户本地主题文件，是长期兼容契约。
2. **用户主题只允许加载期内存兼容**（`local-themes-normalize` 一类），**不自动改写磁盘文件**；任何兼容转换必须幂等。
3. 生成物正式接管任何消费点之前，必须保留与切换前的**逐值对比**；任一不一致即不得切换。
4. Mobile 侧任何会改变原生 runtime fingerprint 的方案必须另立高风险 PR 并获得明确批准。
5. `DESIGN.md §10` 外部主题导入的豁免族与保护 Token 机制不受治理工作影响。

### 11.5 工具决定（§5，单选一次定案）

| 工具 | 决定 | 理由 |
| --- | --- | --- |
| **Terrazzo**（锁 2.7.1） | **采用**，DS-8 锁定 CLI/parser 同一版本作构建依赖 | 没有真实消费者不引工具；校验与生成必须共用同一 DTCG 解析器 |
| Style Dictionary | **不采用** | 与 Terrazzo 并存即两个 DTCG 解析器，会制造最难发现的双份真相 |
| Storybook | **不建** | 未来若引入，必须复用同一份真实 scenario 数据，不得另造假组件样例 |
| Impeccable 等通用 UI audit | 仅人工触发 | 不进 CI、不自动改码、**不得用通用规则推翻 Cindy 已确认的 Inter 与 pill-first 裁决** |

Token 源保持标准 DTCG JSON；**全仓任何时点最多存在一个 Token 工具依赖**。若 Terrazzo 停止维护，源文件保持标准 DTCG，只替换 `packages/design-tokens` 内的薄封装。

### 11.6 两级证据合同（§6）

**Level 1 — 静态守卫测试（每张可见 PR 必须）**
- 从生产源码/样式解析出规则台账，锁 Token 表达式、Light/Dark 双模式覆盖与关键对比度。
- 声明「零视觉变化」的 PR：迁移前后 computed 值逐值一致，或场景截图逐像素一致。

**Level 2 — 真实 Cindy 截图（每张可见 PR 必须，按受影响平台采集）**
- Desktop 改动：真实 Desktop 构建采集 Light/Dark 各一份（复用 `scripts/desktop-dev-runner.mjs` 与 `scripts/cdp-eval.mjs`）；用独立临时 `userData`，不触真实数据库、凭证与外部网络。
- Mobile 改动：真实构建采集 Light/Dark 各一份（复用 `apps/mobile/scripts/visual-baseline-check.mjs` 与 `apps/mobile/e2e/maestro/`）。
- 同时改两端的 PR：两个平台都要采集，**不得只交一侧**；只交未受影响平台的截图不算满足。
- 记录 commit SHA、平台、主题、日期。
- **栅格证据（截图/录屏）一律走 PR 附件或 artifact，不入仓**（2026-09-05 收口）。`docs/design-evidence/YYYY-MM-DD/` 只放**纯文本索引**：SHA、平台、主题、日期、逐格实测值、有意差异清单、缺口登记、指向 PR 评论的链接。
  - **为什么改（成本实据）**：DS-4（#3920）是第一张真正跑证据流程的 PR，选了"入仓"那条，实测代价 = **12 张 PNG / 944KB 永久进 Git 历史**；而栅格证据的效用是**一次性的**（供设计师 review 时看一眼），Git 历史是永久的、每次 clone 都要下。照此累积将达数 MB。真正需要长期留存的是**数值与结论**。
  - **既有入仓证据不追溯删除**（Git 历史重写代价大于收益）；本条只约束新增。
  - 操作说明：GitHub 图片附件上传端点依赖网页会话，`gh` CLI 与 REST API 都传不了图；需由人在 PR 评论框拖拽上传。**Agent 应把图落到工作区（gitignore 覆盖的临时目录）并在报告里给出路径，由人完成上传**；上传后把该评论链接回写进文本索引即成为稳定入口。

**批准边界**：有意视觉变化必须由设计师批准；**AI 不得用自己产出的截图自我批准；视觉基线不得自动 accept。**

### 11.7 PR 风险分类与回退（§7）

每张设计系统 PR 属于且只属于一类，**不同类不得混在同一张**：

| 类别 | 定义 | 验收特征 |
| --- | --- | --- |
| 零视觉基建 | 文档、台账、测试、影子 Token 包、生成器 | 产品界面逐像素不变 |
| 有意可见变化 | 标准组件落地、Pattern 迁移中的有意调整 | 附两级证据 + 设计师批准 |
| CI 门禁调整 | 新增/升级检查、required 名单变动 | 先报告后阻断 + 管理员人工审核 |

每张 PR 必须写明**独立回退方式**；任一阶段结束时仓库必须**不劣于**开始状态。影子 Token 包在约定复查期内没有真实消费者时应删除（DS-3 弃坑复查日期 2026-11-01）。**已登记缺口不得描述为已完成能力**；缺口未修复前，对应验收矩阵格不得记为通过。

### 11.8 门禁脚本与实施路线

- 视觉类门禁脚本：`pnpm check:design-colors`、`pnpm check:design-inventory`（复用 `client-ci` 的 `verify-checks → verify`），`scripts/brand-terminology-guard.mjs`（品牌术语）。
- 排版门禁：`typographyDiscipline.test.ts`（`fixed-leading` 规则）、`typographyTokenDiscipline.test.ts`（移动端）。
- 主题门禁：`cindyThemes.test.ts`（7 组断言，含反向冻结）、`switchThemeContrast.test.ts`、`buttonStateContrast.test.ts`、`markdownColorTokens.test.ts`、`cindyCodeBlockContrast.test.ts`、`themeTokens.test.ts`。
- 实施路线按 **DS-1 … DS-11** 编号批次推进，**编号即执行顺序**，每批默认一张 PR；DS-11（2026-09-15 用户追加）合并处理复核确认的修复与逐项视觉对照。

---

## 12. 对 DSH 皮肤工程的借鉴要点

> 本节是从调研对象提炼的**可移植结论**（工作区名为 `dsh-skin`，下述条目面向"把 Cindy 的设计体系借鉴到 DSH 皮肤"这一潜在目标）。仅作建议，本条不影响本报告"只读调研"的性质。

**可直接照搬的机制（与具体产品无关）**

1. **单一真相源 + 分工写死**：一份"规范正本"+ 一份"决策台账（只增不改）"+ 一份"治理合同"+ 一份"索引"。冲突裁决顺序显式写死。这解决了"文档多了以后谁说了算"。
2. **规则要能变成测试**：Cindy 把"字重只有四档""圆角只有 0/2/4/8/12/9999""红只出现在白名单 token""placeholder 不能用 silver""切换态对比度 ≥3:1"全部写成断言。规范里凡是能用测试表达的，都表达成了测试。
3. **守卫红灯的正确读法**："改真相源 → 同一 PR 更新快照 → 用户裁决"，唯一禁止的是为转绿而绕过。
4. **兼容红线**：旧 token ID 不删不改名；用户主题只在加载期做幂等内存兼容，不自动改盘；生成物接管消费点前必须逐值对比。
5. **两级证据 + 批准边界**：静态守卫（每 PR 必跑）+ 真实截图（按受影响平台，双模式各一份）；**AI 不得用自己的截图自我批准**。
6. **栅格证据不入仓**：图走 PR 附件，仓库只留文本索引（SHA/平台/主题/日期/实测值）。这是被 944KB Git 历史教训出来的规则。
7. **PR 风险三分类**且不混类、每张必须写明独立回退方式。
8. **工具单选**：全仓同一时点最多一个 token 工具依赖，避免双份真相。

**可借鉴的具体设计决策**

9. **零阴影 + 1px 分隔 + 色阶造深度**：区域边界靠 1px 分隔线而非背景色差，是低成本高一致性的一条。
10. **单字体族 + 字号/字重造层级**：不靠字体对比造层级，天然避免"多个字体混用"的失控。
11. **圆角两步决策树**（先注册形状、再"控件框/盒子/内部控件"三层）：把"圆角该用多少"从审美争议变成可判定的分类问题；**"看起来小"不是降一档的理由**。
12. **受治理的枚举值**：圆角、动效时长/曲线、字重、字号白名单——都是封闭集合，新增需裁决。
13. **hover/pressed 派生而非别名**：从"自己变体的静止填充"向"自己的前景"混合，避免多主题下状态不可见（Dark 里 `--surface-hover` 与 `--surface-chip` 同值这条坑非常真实）。
14. **双重锚定**：页面上的填充锚定页面、卡片上的填充锚定卡片；不要强行统一。
15. **品牌色的边界纪律**：品牌红只用于品牌展示/破坏性/运行强调；**普通 CTA 一律中性反转**；用 ID 白名单 + 反向测试保证不扩散。
16. **CJK 字重坑**：中文回退字体公开档位到 600，**700 会在中文上触发伪粗体**，中文层级不得靠 600 vs 700 区分。
17. **`text-<n>` + 固定 px 行高 = 功能缺陷**：用户放大字号时会裁切/重叠；行高要用无单位比例。
18. **双模式是硬门槛但目检是 best-effort**：只做一种模式 = 未完成；做不到实机目检要**如实申报**，不得把"复用了 themed 样式"说成"已验证"。
19. **动效 token 化**：5 档时长 + 3 条曲线 + 一个 spinner 环周期例外；**新过渡必须引用 token**。
20. **placeholder 要读起来是空的**：禁用过显眼的次级色，用专门的 `--text-placeholder`。

**需要注意的差异（不能照搬的部分）**

- Cindy 是 Electron 桌面 + React Native 移动双端，其 vibrancy/玻璃、iOS Liquid Glass、原生导航等条款绑定平台，移植需按目标平台取舍。
- 其 token 数量（`registerColor` 506 个、内置主题 11 个、`DESIGN.md` 365KB）意味着**很高的维护成本**，配套的治理合同与守卫测试是让这个规模可持续的前提；只抄设计不抄治理会迅速腐化。

---

## 13. 实现层附录

> 附：颜色体系的原始实测清单（90+ 条 Light｜Dark 变量对照、7 个扩展主题对照表、语义豁免清单、HSL/HEX 序列化契约）另存为工作区附件 `cindy-color-audit-appendix.md`，本节已提炼其结论。

> 本章是并行代码考古的结果，回答"规范在代码里到底怎么落地"。所有引用行号对应调研时的 `main` 分支快照。

### 13.1 字体与排版实现层

**字体族：UI 字体完全不走 Tailwind，只走 CSS 变量**

- 桌面 UI 默认链在 `apps/desktop/src/renderer/styles/generated/tokens.css:4`：`--app-font-ui-default` = `'Inter Variable', Inter, -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'HarmonyOS Sans SC', 'Microsoft YaHei UI', 'Microsoft YaHei', 'Noto Sans CJK SC', 'Source Han Sans SC', 'Segoe UI', Roboto, sans-serif`。**CJK 字体刻意排在 `Segoe UI`/`Roboto` 之前**（`globals.css:150-153` 注释：避免《》半角/全角混排），这是把 §3 的 CJK 注记真正落地的位置。
- 消费点：`globals.css:154` `body { font-family: var(--app-font-ui, var(--app-font-ui-default)) }`。**`apps/desktop/tailwind.config.ts:192-194` 的 `fontFamily` 只声明了 `mono` 一个键，没有 `sans` 键**——即 UI 字体无 Tailwind 工具类可用，全仓只能通过 CSS 变量与 `body` 继承拿到。这是"单一字体族"原则在工程上的硬实现。
- 桌面 mono：`tokens.css:5` `--app-font-code-default` = `ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', <同一组 CJK>, monospace`；`tailwind.config.ts:193` 映射为 `mono: ['var(--app-font-code, var(--app-font-code-default))']`。**默认不是 JetBrains Mono**（决策见 `packages/design-tokens/src/reference/foundations.json:24` 与 `design-decision-log.md:789`，2026-09-11），JetBrains Mono 已降级为可选预设；桌面之所以仍 import `@fontsource-variable/jetbrains-mono`，是为了用户选中它时无需再取字体。
- 移动端字体族独立：`apps/mobile/src/theme/monoFont.ts:12-16` `Platform.select({ ios: 'JetBrains Mono', android: 'JetBrains Mono', default: 'monospace' })`。拆成单独文件是为了让 `tokens.ts` 不依赖 react-native、可在 node 单测里直接 import（同文件 `:7-10` 注释）。
- **用户可选字体**：`apps/desktop/src/renderer/components/settings/AppearanceSection.tsx:60-76` `UI_FONT_PRESETS` = 默认（`family: ''`，回落默认链）/ Codex 风（`-apple-system, BlinkMacSystemFont, "Segoe UI"`）/ HarmonyOS（`"HarmonyOS Sans SC"`）；`:78-89` `CODE_FONT_PRESETS` = 默认 / JetBrains Mono（`"JetBrains Mono Variable", "JetBrains Mono"`）。另有自由输入框（`FontFamilyPicker.tsx:235-243`），保存时经 `unquoteFontFamily` 去引号。
- **打包字体与法务**：桌面三包全走 npm——`apps/desktop/package.json:100-101` `@fontsource-variable/inter ^5.2.8`、`@fontsource-variable/jetbrains-mono ^5.2.8`，`:147` `harmonyos-sans-sc-webfont-splitted 1.1.0`；五个渲染入口逐个 import（`main-entry.tsx:3-5`、`sidebar-window-entry.tsx:13-15`、`ghost-panel-window-entry.tsx:15-17`、`resource-usage-entry.tsx:3-5`；`remote-desktop-viewer-entry.tsx:2-3` 只 import inter + harmonyos）。root `package.json:62` 挂了 `dependency-patches/harmonyos-sans-sc-webfont-splitted.patch`，**剥掉该依赖按语言全局覆盖 `font-family` 的规则**，把界面字体的决定权收回应用自己。仓库内唯一实体字体二进制在移动端：`apps/mobile/assets/fonts/JetBrainsMono-Regular.ttf`（267.5 KB）、`JetBrainsMono-Medium.ttf`（267.4 KB）、`JetBrainsMono-OFL.txt`，由 `apps/mobile/app.json:115-129` 的 expo-font config plugin 打进原生资源。授权登记见 `docs/legal/notices/sbom/desktop-{macos,win,linux}.spdx.json` 与 `mobile-ios.spdx.json:15`、`mobile-android.spdx.json:45`。

**字号：数字档不带行高、语义档带行高**

- 数字档 11 个：10/11/12/13/14/15/16/18/20/24/28px（`tokens.css:26-36`），Tailwind 类 `text-10`…`text-28` 映射为**纯字符串** `var(--text-N)`、不带行高（`tailwind.config.ts:4-70`）。
- 语义档 9 个：xs/sm/base/lg/xl/2xl/3xl/4xl/5xl = 12/14/16/18/20/24/30/36/48px（`tokens.css:8-16`），Tailwind 侧写成元组 `[var(--text-K), { lineHeight: var(--text-K-line-height) }]`——**语义档自带行高，数字档必须自行配 leading**，这正是 §3 那条"缩放 token 不得与固定 px 行高同处一个 class 区域"的由来。
- 移动端是另一套命名档：`apps/mobile/src/theme/tokens.ts:617-629` typeScale = micro 11 / caption 12 / footnote 13 / bodySmall 15 / body 16 / bodyLarge 17 / subtitle 18 / title 20 / headline 24 / largeTitle 30 / hero 40（**与桌面白名单不共享**）。
- 生成物：`apps/desktop/src/renderer/styles/generated/token-mappings.ts:2-14` `UI_TEXT_TOKEN_SIZES`、`:15-25` `SCALED_TAILWIND_TOKENS`、`:26-36` `TAILWIND_LINE_HEIGHTS`、`:37-49` `NUMERIC_TEXT_CLASSES`，由 Terrazzo 2.7.1 从 DTCG token 生成（文件头 `:1` 标注）。
- 白名单与任意值：`typographyDiscipline.test.ts:111` `SIZE_WHITELIST = [10,11,12,13,14,15,16,18,20,24,28]`；`text-[13px]` 一类被 `findArbitrarySizes`（`:333`）判违规，**唯一放行的是精确签名的代码字体派生值**（`text-[length:var(--app-code-font-size)]` 及 calc 派生，EXEMPTIONS `:146-288` 按文件逐条登记出现次数）。已移除的幽灵档 9/17/19/21/22/23/25/26/27 由 `fontSettings.test.ts:19,125-128` 断言无残留。

**缩放：只有 uiSize 参与，整档重算**

- 设置面 `FontSettings = {uiFamily, codeFamily, uiSize, codeSize}`（`useFontSettings.ts:27-32`），默认 14/14（`shared/generated/appearance-tokens.ts:2-5`），范围 uiSize 12–24、codeSize 10–24（`shared/appearanceSettings.ts:55-62`）。
- 公式 `useFontSettings.ts:92` `scale = uiSize / DEFAULT_UI_FONT_SIZE`（基准 14），`:114-122` 三轮回写 `document.documentElement` 与 `document.body`：数字档 `--text-${N} = Math.round(base * scale)px`、语义档同公式、行高 `--text-${token}-line-height` 同公式。**只有 uiSize 参与缩放**；`--app-code-font-size = ${codeSize}px`（`:111`）与 `--app-ui-font-size`（`:112`）是独立直写、不乘 scale。取整一律 `Math.round`——所以 uiSize=18 时 `--text-sm-line-height` = round(20×18/14) = 26px。
- 钳制与安全：`clampFontSize = Math.min(MAX, Math.max(MIN, Math.round(value)))`（`:53-56`）；主进程 `appearance-settings-ipc.ts:166-257` `parsePatch` 白名单只允许 uiFamily/codeFamily/uiSize/codeSize/windowZoom/wallpaper*，越界值由 `parseNumber`（`:266-281`）**静默收敛而非报错**，非有限数抛 `INVALID_PARAMS`；`parseFamily`（`:259-264`）要求字符串 ≤256 字符并 trim。IPC 安全由 `appearanceSettingsIpcSecurity.test.ts` 守护（未授权窗口拿不到快照、三通道都必须过 `assertTrustedAppRendererEvent`、utility 窗口读与广播要剥离 `customWallpaperUrl`）。
- 持久化：`appearance-settings-store.ts:19-21` → `%userData%/appearance-settings.json`，16KB 上限、`preserveUnreadableFile=true`；旧 localStorage 键 `font.uiFamily/codeFamily/uiSize/codeSize` 被完全忽略（`fontSettings.test.ts:64-76` 断言）。

**字重：代码里只有三档，700 是豁免域的例外**

- 桌面 `tokens.css:92-94` 只有 `--font-weight-normal: 400` / `medium: 500` / `semibold: 600`；`tailwind.config.ts:119-123` 只映射 normal/medium/semibold。守卫 `WEIGHT_SET = {400,500,600}`（`typographyDiscipline.test.ts:125`）——`font-bold` 与任意字面 `fontWeight: 700` 均判违规，全仓仅 1 处 MarkdownRenderer 的 `font-bold` 有豁免，另有 `globals.css` 内 4 处 hljs 的 `font-weight: bold`（`:1381,1411,1474,1512`）按 selector context 豁免。
- 移动端四档（`tokens.ts:663-668`，含 bold 700，注释写明只用于 login hero 与 markdown 强调），且**"颜色越浅字重不能越粗"被固化成断言**（`typographyTokenDiscipline.test.ts:176-202`：textTertiary 只配 regular，textSecondary 不许 semibold/bold）。CJK 回退字体不参与字重声明，两套 CJK 标点 `@font-face` 都固定 `font-weight: 400`（`globals.css:489,500,509,519,530`）。

**行高、字距与 CJK 专门处理**

- 行高：语义档 9 组固定配对 16/20/24/28/28/32/36/40/48px（`tokens.css:17-25`）；移动端 11 组（`tokens.ts:633,642-655`）。两条硬规则：①会缩放的 token 不得与固定行高同处一个 class 区域（`typographyDiscipline.test.ts:571`）；②移动端每个设了 fontSize token 的样式必须配 lineHeight，且行高必须大于字号（`typographyTokenDiscipline.test.ts:148-174,204-221`）——由 `AppText.tsx` 统一承载（业务代码禁止直接 import react-native 的 Text/TextInput）。
- 字距：**没有全局 letter-spacing**。桌面设置页标签统一 `letterSpacing: '0.12px'`（`FontFamilyPicker.tsx:110`、`AppearanceSection.tsx` 数十处），另有 `0.5px` 小标签（`InstallTargetPicker.tsx:354` 等）、SVG `0.3`、分享图 `2px`。移动端 `letterSpacing: 0` 被显式判违规（视为 no-op 应删除）。
- CJK 三处专门处理：①默认链前置 CJK；②`html:lang(ja)`（`globals.css:191-200`）与 `html:lang(ko)`（`:202-211`）重写 `--app-font-ui-default`/`--app-font-code-default`，由 `useLocale.ts` 写 `<html lang>` 触发；③CJK 标点字体 `@font-face` `'Cindy CJK Punctuation Local'`（`:483-494`，src 全为 `local(...)`，`unicode-range` 覆盖 `U+0021-0022,U+0027-0029,U+002C,U+002E,U+003A-003B,U+003F,U+005B,U+005D,U+007B,U+007D,U+3000-303F,U+FF00-FFEF`）+ 四段 `'Cindy CJK Punctuation Bundled'`（`:495-535`，引用 harmonyos woff2 分片，`font-display: swap`）。
- 紧凑栏降级：`.chat-rail-compact` 内字号整体 -1px，语义档写成 `calc(var(--text-K) - 1px)`、数字档同降级、代码字体派生值再 -1/-2px，并注明一处刻意不补的 `calc(var(--app-code-font-size) - 1.5px)`；`[data-chat-input-root]` 内还原默认（`globals.css:213-314`）。`compactComposerTypography.test.ts:8-18` 断言该块行高必须写成 `var(--text-{xs,sm,base,lg}-line-height)`、禁止固定 rem。

**代码排版：字号走独立变量，且刻意回避 mono 的场景**

- 代码字号统一 `--app-code-font-size`（默认 14px，`tokens.css:6`，由 `useFontSettings.ts:111` 按 codeSize 改写）。消费签名：`MarkdownRenderer.tsx:1804`（代码块）、`:296`（行内码 `font-mono text-14`）、`chatChrome.ts:9-11`、`MarkdownMermaidBlock.tsx:221,266`、`MarkdownDiffBlock.tsx:78`（-1px）、`UserMessage.tsx:1417`（-2px，行高 `calc(var(--app-code-font-size) + 4px)`）、`SystemCard.tsx:1061,1477,1483`、`AgentActionRow.tsx:1140`、`codemirrorGithubTheme.ts:25`。
- **反向约束（JetBrains Mono 缺 CJK 字形）**：skillhub 详情页刻意不加 `font-mono`（`SkillhubDetailView.tsx:193` 注释）；右侧文件浏览器换回系统 mono（`FileBrowserBody.css:135` 注释「JetBrains Mono 圆润宽体，窄栏里视觉违和」）；`KeyboardShortcutsSection.tsx:492` 注明"不用 font-mono：项目的 mono 映射到代码字体"。这条对任何"给代码换字体"的工程都成立：**候选字体必须覆盖你的实际字符集**。
- `globals.css:474` `tab-size: 8ch`。

**排版守卫的完整清单（写规范时值得照抄的"可测试化"程度）**

- 桌面 `apps/desktop/src/renderer/__tests__/typographyDiscipline.test.ts`（约 994 行，核心）：字号必须落在白名单或语义档；字重 ∈ {400,500,600}；禁止任意 px 值、阶梯外 token、内联字面 `fontSize`/`fontWeight`、字符串字面字重、`font:` 简写（仅 `font: inherit` 放行）；禁止缩放 token 与固定 leading 混用（`:571`）。`:676` 断言"违规清单"与"豁免漂移"**同时为空**——豁免表按文件登记精确签名与出现次数，多一处少一处都红灯；`:727` 做**镜像校验**，把 `tailwind.config.ts`、`tokens.css`、`globals.css`、`useFontSettings.ts` 与 `DESIGN.md` §3 的档位表互相对齐；`:758` 校验 tailwind-merge 消费端一致（`renderer/lib/utils.ts:1-19` 用 `NUMERIC_TEXT_CLASSES` 扩展 `classGroups['font-size']`，保证 `cn('text-13','text-11')` 后者胜出）。
- **已登记盲区**：内联 `style={{fontSize}}` 只要落在白名单档位就放行，约 48 处因此**不响应 uiSize 缩放**。这是"规范 → 测试"路线的一个真实代价，值得在借鉴时记住：测试只能覆盖它被写出来去覆盖的东西，盲区必须显式登记而不是默认不存在。
- 其余：`fontSettings.test.ts`（默认值/legacy 键失效/clamp/自定义 family 拼接/取整/乐观更新）、`fontFamilyValue.test.ts`（引号剥离，保留 `var(--app-font-code-default)` 不被误剪）、`compactComposerTypography.test.ts`、移动端 `typographyTokenDiscipline.test.ts`（六条：禁字面值、禁绕过 AppText、光标必须用 `colors.inputCaret`、禁红色光标字面量、fontSize 必须配 lineHeight、浅色字不配粗字重），以及移动端全局缩放限幅 `AppText.tsx:17` `MAX_FONT_SIZE_MULTIPLIER = 1.2`（尊重系统字号但封顶 1.2 倍，防固定高度容器被撑爆；React 19 起函数组件 `defaultProps` 被忽略，故必须走包装组件）。

**未验证项**：桌面 woff2 实际字节数（本地 `node_modules` 未安装，未下载）；`apps/desktop/src/renderer` 下 `font-weight` 的逐处清单未穷举（仅按守卫规则抽样）。

### 13.2 主题系统与 design-tokens 实现层

**分层架构：三层 DTCG 编辑源，构建期校验，运行期零依赖**

三层编辑源全在 `packages/design-tokens/src/`，由 **Terrazzo 2.7.1** 在构建期校验并生成；**产品运行时只读生成产物，不 import 该包、也不 import 生成器**（`packages/design-tokens/README.md:3`）。这条由守卫机检（见本节末"零运行时接线"）。

| 层 | 文件 | 规模 | 职责 |
| --- | --- | --- | --- |
| reference | `src/reference/color.json` | 11502 行 / 581 个 `$value` | **唯一允许字面量的层** |
| semantic | `src/semantic/color.json` | 3220 行 / 594 个 `$value` | 每个叶子只写别名，不带值 |
| component | `src/component/color.json` | 6021 行 / 501 个 `$value` | 别名指向 semantic + CSS 绑定 |

- reference 叶子结构：`reference.defaults.<role>.<light|dark>` → `{ $type: "color", $value: { colorSpace, components }, $extensions["com.cindy.desktop"].format }`（`reference/color.json:2-41`），格式化方式含 `hex`、`triplet`（HSL 三元组带 `precision`）等（`:53-60`）——**hex 与 HSL 双形态是同源生成，不是两份手写值**。
- semantic 叶子形如 `"$value": "{reference.defaults.surface.light}"`（`semantic/color.json:5-12`）。
- component 叶子额外带 CSS 绑定：`$extensions["com.cindy.desktop"].{cssAlias, wrapper, mode}`（`component/color.json:4-26`，例：`panel-bg` → cssAlias `surface`/wrapper `var`；`board` → `border-default`）。
- foundations 层各 91 个 `$value`（`reference/foundations.json`、`semantic/foundations.json`），产出尺寸/间距/圆角/motion 变量；**间距的事实源在 `desktop-bindings.json` 的 `foundations.spacing`**（`README.md:16`）。
- 命名：kebab-case 语义角色名（`surface`、`surface-elevated`、`text-primary`、`border-default`、`accent-cta-bg`）；`-hsl` 后缀 = HSL 三元组形态；`-soft/-alt/-mid/-strong` 为同族变体（`renderer/themes/builtin/eclipse.ts:15-122` 可见全套）。路径段必须匹配 `TOKEN_NAME_RE`（`guards.ts:301-354`）。
- 规模基线：**541 个 token ID / 11 个内置主题**（`README.md:42`；`themes/builtin.json` 内 1111 个 `$value`）。注意 `design-governance.md` 的另一处计数写 `registerColor` 506 个——**两个数字口径不同**，引用时需说明取自哪个文件。

**构建管道（`src/generate.ts`）**

1. 把 9 个源文件摊平后按 token id 查重，重复即抛 `Duplicate token`（`generate.ts:16-35`）。
2. `readBindings()` + `validateProduction()`（`:36-37`）。
3. Terrazzo 插件 `cindy-desktop` 用 `replaceRegion` **只重写 `BEGIN/END GENERATED DS-8: <name>` 标记区**（`production.ts:393-418`）——生成物与手写代码混居同文件而互不破坏，靠的是显式标记区。
4. `generate --check` 走 `assertFresh()` 断言产物新鲜，否则抛 `Stale generated output: <path>`（`generate.ts:251-266`）；写盘先写 tmp 再 `renameSync` 原子替换（`:280-284`）。

**11 个内置主题（`apps/desktop/src/renderer/themes/builtin/*.ts`，由 `themes/builtin.json` 生成 `GENERATED_OVERRIDES`，`generate.ts:156-171`）**

| 主题 | 覆盖 key 数 | 来源 |
| --- | --- | --- |
| `default-light` / `default-dark` | 1 / 1 | 基础主题（Classic 家族），只覆盖 1 个豁免色，其余走 `colors.ts` 的 `GENERATED_DEFAULTS` 三级回退 |
| `cindy-light` / `cindy-dark` | 174 / 174 | 品牌全量覆盖 |
| `atom-one-light` | 108 | VSCode 人工移植 |
| `solarized-light` | 111 | VSCode 人工移植 |
| `eclipse` | 108 | VSCode 人工移植 |
| `material-ocean-hc` / `monokai-pro` | 108 / 108 | VSCode 人工移植 |
| `github-dark` / `one-dark-pro` | 109 / 109 | VSCode 人工移植 |

- **家族分组**（`renderer/themes/families.ts:32-51`）：`cindy`、`default`、`atom-one`（light=atomOneLight，dark=oneDarkPro）、`solarized-light`（仅 light）、`eclipse`/`monokai-pro`/`github`/`material-ocean-hc`（仅 dark）。**切换靠 family 而非单主题 id**（`families.ts:121-136`）——这是"双模式主题"能成对切换的结构原因。
- 示例值：`default-light` 只覆盖 `"perm-auto-selected-text": "#417CDD"`（`builtin/default-light.ts:5`）。`eclipse` 核心值：`surface` `#0d1117`、`surface-elevated` `#161b22`、`surface-chip` `#262c36`、`surface-hover` `#1c2128`、`border-default` `#30363d`、`text-primary` `#e6e6e6`、`text-secondary` `#9ca3af`、`text-tertiary` `#6b7280`、`text-disabled` `#4b5563`、`accent-cta-bg` `#0CD2A5`、`accent-soft` `#5eead4`、`accent-hover` `#0f8a73`、`send-btn-bg` `#e6e6e6`、`confirm-btn-secondary-hover` `rgba(255,255,255,0.06)`、`drop-overlay-bg` `rgba(12,210,165,0.1)`，配 HSL 三元组 `surface-hsl "220 12% 7%"`、`border-default-hsl "215 12% 21%"`、`text-primary-hsl "0 0% 90%"`（`builtin/eclipse.ts:15-122`）。对应源常量在 `reference/themes.json`（eclipse 22 个常量，如 `palette-SURFACE_NAVY = srgb[0.05098,0.066667,0.090196]`、`palette-TEAL_PRIMARY = srgb[0.047059,0.823529,0.647059]`）。

**消费链路：JSON → 生成产物 → 运行时 `<style>` 注入**

1. 三层 color.json → `renderer/themes/colors.ts` 的 `GENERATED_DEFAULTS = { "<id>": { light, dark } }`（`generate.ts:222-239`；`colors.ts:2-60` 可见 `surface` `#f8f8f6`/`#1f1f1e`、`panel-bg` `var(--surface)`）。
2. foundations → `renderer/styles/generated/tokens.css`（106 行，`:root` 内 `--text-*`/`--space-*`/`--radius-*`/`--motion-*`；**`.dark` 只重写 bootstrap 白名单 4 条 `--quota-*`**，`tokens.css:95-105`）+ `token-mappings.ts`。
3. foundations → `apps/desktop/tailwind.config.ts` 生成区（`TAILWIND_FONT_SIZE/SPACING/RADIUS/FONT_WEIGHT`、`MOTION_CSS`）与 `shared/generated/appearance-tokens.ts`（`generate.ts:129-155`）。
4. `themes/builtin.json` + `reference/themes.json` → 11 个 `builtin/*.ts`。
- **运行时注入**：`themeService.applyTheme()` 写 `<style id="theme-vars">` 到 `documentElement`（`theme-service.ts:56-69`，常量 `THEME_STYLE_ID = 'theme-vars'` 见 `:5`），逐 token 求值走 `resolveThemeValue`（`:7-29`：**主题覆盖 → `colorRegistry.resolveDefault` → dark 回退 light**）。同一函数设置 `root.dataset.theme = theme.id`、`root.classList.toggle('dark', type === 'dark')`、`root.style.colorScheme`——**`.dark` class（CSS 生效层）与 `data-theme` 属性（身份标识）同时存在**，二者不要混用。
- 调用点：各窗口入口在渲染前直接调 `themeService.applyTheme(getInitialThemeVariant().theme)`（`renderer/main-entry.tsx:139`、`resource-usage-entry.tsx:22`、`sidebar-window-entry.tsx:36`、`ghost-panel-window-entry.tsx:38`、`remote-desktop-viewer-entry.tsx:21`）——**多窗口架构下每个窗口各自 bootstrap，避免首帧闪白**。
- 组件树走 `ThemeProvider`/`useTheme`（`renderer/App.tsx:11,406`；`hooks/useTheme.ts:246-389`），`applyThemeClass` 对相同结果短路（`:130-147`）。模式真源 = localStorage `theme`（system/light/dark）与 `theme.familyId`（`:28-30`，旧 `theme.lightId`/`darkId` 有迁移路径 `:64-95`）；system 模式经 `matchMedia('(prefers-color-scheme: dark)')` 解析（`:37-43,316-329`）；跨窗口同步靠 `storage` 事件（`:334-352`）。

**外部主题导入（VSCode / Obsidian）**

- 入口 `apps/desktop/src/main/local-themes/importer.ts` 的 `importExternalTheme()`（`:206-276`）：**main 进程自己弹对话框、自己读字节**（安全边界见 `:8-10`），单文件上限 4MB（`:43,230-232`），按扩展名判源（`.css`→obsidian，`.json/.jsonc`→vscode，`shared/theme-import/index.ts:157-162`）。
- **VSCode 映射**（`shared/theme-import/vscode.ts:215-374`）：`editor.background`→surface、`sideBar.background`/`editorWidget.background`→elevated、`list.hoverBackground`→hover、`list.activeSelectionBackground`→chip、`panel.border`→border、`editor.foreground`→textPrimary、`comment` scope→textSecondary、`editorLineNumber.foreground`→textDisabled、`button.background`/`focusBorder`/`textLink.foreground`→accentPrimary；accentSoft/accentDeep/elevatedSoft 由 `shade()` 推导并记入报告（`:332-337`）；`markup.heading`→md-h1..h6、`markup.bold`→md-strong（`:339-344`）。解析前剥 jsonc 注释与尾逗号（`:29-126`）。
- **Obsidian 映射**（`shared/theme-import/obsidian.ts:401-492`）：`--background-primary`→surface、`--background-secondary`→elevated、`--background-modifier-hover`→hover、`--background-modifier-border`→border、`--text-normal`→textPrimary、`--text-muted`→textSecondary、`--text-faint`→textTertiary、`--interactive-accent`→accentPrimary、`--h1-color..--h6-color`→md-h1..h6、`--bold-color`→md-strong。识别 `:root`/`body`/`.theme-dark`/`.theme-light`，双态 CSS 产出 light+dark 两个主题（`index.ts:99-154`）。
- **模板 allow-list**：`shared/theme-import/palette.ts` 的 `TEMPLATE_TOKEN_IDS`（`:89-202`）决定导入主题可覆盖哪些 token，实测数组条目 **110 项**（Tier1 段 37 + alias/singleton 段 73）；**文件内注释标称的「35 + 56」「108 个 token」已与代码不同步**——这是一个真实的"文档漂移"样本。展开逻辑 `buildThemeColorsFromPalette()` 用 13 个色板角色 + 22 处 light/dark 分支（`:253-454`）。
- **保护闸**：`shared/theme-import/protected-tokens.ts` 的 `PROTECTED_PREFIXES`（`login-`/`diff-`/`error-`/`overlay-`，`:19-28`）+ 24 个 `PROTECTED_IDS`（`:31-63`）；`stripProtectedTokens()` 过滤并把数量写进导入报告（`index.ts:85,131`）——**与 §11.4 兼容红线里的"§10 导入豁免族不受治理影响"是同一条纪律的两个面**。
- **本地主题存储**：`~/.cindy/themes/*.json`（`main/local-themes/loader.ts:36-40`），旧目录 `~/.xdmaker/themes` 一次性 `rename` 迁移（`:64-90`）。schema `{id, name, type, family?, colors, brand?}`（`:21-29,116-152`）；loader 给 id 加 `-local` 后缀（`:244`），重复 id 丢弃并记 diagnostic（`:245-250`）；brand 图片经 `nativeImage` 算透明像素边界与版本号，**不写回用户文件**（`:154-197`）。
- **family 字段**：把一组 light+dark 本地主题配成可跟随系统模式切换的家族（`shared/local-themes.ts:30-35`）；renderer 分组键 = `family + '-local'`，缺省退化 `theme.id`（`families.ts:65-87`）；双态导入生成 `family=<slug>`、`id=<slug>-light`/`<slug>-dark`（`importer.ts:157-195`），撞名时 `pickFamilyId` 退避 `<slug>-2`（`:86-92`）。
- **导出/复制**：`themeService.exportThemeColors()` 展开全部已注册 token（`theme-service.ts:35-44`）；`local-themes.buildCopyFromTheme()` 生成 `<id>-copy` 副本并在 brand 写入示例绝对路径教用户配置（`renderer/themes/local-themes.ts:91-123`）；落盘 `writer.ts` 走 `sanitizeBaseId` + tmp/rename，重名退避 `-1..-99`（`:16-63`）。

**窗口材质：renderer 是真源，main 只持一份启动前快照**

renderer 是主题唯一真源，main 侧只保留一份能在创建首个窗口前决定 backing 的快照（`main/window-theme-mode-store.ts:10-11` 注释）。

- `main/resolved-app-theme.ts`：`AppThemeMode = 'system'|'light'|'dark'`（`:3`）；`rememberResolvedAppTheme()` 缓存 renderer 的解析结果（`:10-12`）；`resolveAppThemeIsDark()` 回退顺序 = renderer 已解析值 → system 模式取系统 → 持久化 `resolvedIsDark` → dark/light（`:15-26`）。
- 快照文件 `<userData>/window-theme-mode.json`（`window-theme-mode-store.ts:101-113`，4KB 上限），字段 `{mode, resolvedIsDark, systemIsDark, familyId, systemModeFollowsSystem}`（`:13-19`）；**system 模式下若持久化的 `systemIsDark` 与当前不符则丢弃 stale 值**（`:80-99`）。写入方是 IPC `theme:apply-vibrancy` 处理器（`main/bootstrap-electron.ts:4463-4469`），先做载荷校验再做任何副作用（`main/__tests__/windowThemeVibrancyIpcSecurity.test.ts:25,36`）。
- 毛玻璃：`main/vibrancyConfig.ts` 的 `resolveVibrancyConfig(familyId, isDark, platform)`（`:65-97`）——**darwin**：仅 `familyId === 'cindy'` 且材质非 `none` 时给 `vibrancy`（缺省 `'hud'`，可用 `XDT_VIBRANCY_MATERIAL` 调参）并把背景设为 `#00000000` 透壁纸，其他家族回退不透明 `#1f1f1e`/`#f8f8f6`；**win32**：CINDY 且 Windows 11（build ≥ 22000）时启用 `backgroundMaterial`（`XDT_BACKDROP_MATERIAL`，缺省 `acrylic`），背景取 `CINDY_ACRYLIC_WINDOW_BACKING`（light `rgba(238,238,233,0.85)` / dark `rgba(5,5,5,0.85)`，`shared/windowBackdrop.ts:6-9`）；Win10 与 Linux 不透明。
- 应用路径：创建主窗时按 `readWindowThemeSnapshot()` 决定材质（`bootstrap-electron.ts:3741-3810`，macOS 创建期 `vibrancy: 'hud'`）；IPC `theme:apply-vibrancy` 调 `applyWindowVibrancy` 并同步全部副窗 `applyVibrancyToSecondaryWindows`（`:4445-4460`；`main/secondary-windows.ts:273-292`）；renderer 在 family/mode 变化时发 IPC（`hooks/useTheme.ts:354-365`）。原生标题栏 macOS 用 `titleBarStyle: 'hidden'` + `trafficLightPosition`（`bootstrap-electron.ts:3728`）。
- 与 §9（CINDY Skin Family）的对应：**vibrancy 只对 `familyId === 'cindy'` 生效**，这是"皮肤族"在工程上真正被识别的唯一位置之一；侧栏玻璃 85% 不透明度（§15.16）在 `shared/windowBackdrop.ts:6-9` 有对应常量。

**关键约束与不变量（`packages/design-tokens/src/guards.ts` 等）**

- **快照一致（DS-2b）**：与冻结快照不一致即失败；唯一合法改值路径 = 改 DTCG 源 + 生成产物 + 同 PR 更新快照 + 治理合同证据 + 设计师批准，**禁止加豁免绕过**（`guards.ts:31-39`）。分类登记必须与快照逐字一致、四分类（literal / alias / hsl-triplet / runtime-derived-or-protected）**互斥完备**（`:41-95`）；semantic 角色数与快照逐值在**标准 DTCG 颜色对象层**比对，hex 大小写不算差异（`:176-236`）。
- **保护与豁免分离**：register-only 保护色不得进 semantic、不得被建模；semantic-modeled 保护色必须进 `SEMANTIC_ROLE_IDS`（`:97-136`）；豁免项必须已进 semantic 且不得同时带 protected 标记（`:144-174`）；`semantic.defaults.<role>.$extensions['com.cindy.governance']` 必须与 `classify.ts` 的 `PROTECTED_IDS`/`SEMANTIC_EXEMPTION_IDS` **深度相等**（`production.ts:112-130`）。`classify.ts` 中 `PROTECTED_IDS` 仅 5 条（`annotation-accent`、`login-brand-accent(-pressed)` 为 register-only；`text-secondary`、`text-secondary-cross` 为 semantic-modeled，`:95-126`）；`SEMANTIC_EXEMPTION_IDS` = DESIGN.md §10 的 theme-invariant 族（destructive、error-*、warning-*、focus-ring* 等，`:139-194`）。
- **DTCG 语法**：`$type` 只允许 `color`——注释记录历史上放行自定义 `"other"` 曾导致 **12 个 HSL triplet 节点被 Terrazzo 静默丢弃**（`:301-354`）；`$value` 必须是别名或标准颜色对象，禁裸字符串；分量范围 srgb [0,1]、hsl hue [0,360)、s/l [0,100]、alpha [0,1]（`:256-270`）。
- **结构**：每个 semantic/component 角色必须有 light+dark（`:356-383`）；**别名方向单向**——reference 禁别名、semantic 必须指向 reference、component 必须指向 semantic（`:385-475`）。
- **生产绑定**：11 个 `builtin/*.ts` 文件名必须与 `desktop-bindings.json` 的 `themes` 键完全一致，否则抛 `Theme bindings must cover every builtin file`（`production.ts:46-64`）；运行期像素绑定禁止 `cssAlias` 且必须解析为 `px` dimension（`:229-240`）；`cssAlias` 必须与 DTCG 引用解析到同一个 token（`:243-287`）；`replaceRegion` 标记必须恰好各一次且顺序正确（`:393-418`）。
- **零运行时接线**：产品代码不得 import `@cindy/design-tokens`、也不得按路径读 `packages/design-tokens/`——扫描 `apps/desktop`、`apps/mobile`、`packages` 的静态/动态 import 与 package.json 依赖字段（`guards.ts:488-529,743-800`），带注释剥除与相对路径归一（`:616-740`）。

### 13.3 颜色体系实现层（实测色值）

**一个容易踩的定位问题：主题色不在 `styles/` 下**

`apps/desktop/src/renderer/styles/globals.css:1` 只有 `@import './generated/tokens.css';`，而 `tokens.css` 仅 106 行，**只含字体/字号/行高/motion/spacing/radius/字重与 4 个 `--quota-bar-*` 别名，没有任何主题色**。

**主题色的真实落点是 `apps/desktop/src/renderer/themes/colors.ts`（3216 行）**：`// BEGIN GENERATED DS-8: defaults`（`:2`）→ `const GENERATED_DEFAULTS = {`（`:3`）→ `// END GENERATED DS-8: defaults`（`:2217`），**共 549 个 token**，每条形如 `"surface": {"light":"#f8f8f6","dark":"#1f1f1e"}`；其后是 `EFFORT_TIER_COLORS`（`:2202`）、`PRICE_TIER_COLORS`（`:2212`）与数百条 `registerColor(id, value, '中文说明')`。

真相源三级：`packages/design-tokens/src/reference/color.json` 的 `reference.defaults`（与 `GENERATED_DEFAULTS` **一一对应**）→ `reference/themes.json` 与 `themes/builtin/*.ts` 按主题覆盖 → `themes/builtin.json` 是**纯别名层**（形如 `"surface": {"$value":"{reference.themes.atom-one-light.palette-SURFACE_BG}"}`，不含新色值）。

**默认主题族是 `cindy` 而不是 `default`**：`themes/families.ts:28` `DEFAULT_FAMILY_ID = 'cindy'`（`:30-38` 注释「Cindy 作为新用户默认主题置顶」）；`default-light` / `default-dark`（`themes/theme-ids.ts:1-2`）是名为 **Classic** 的旧默认（`families.ts:39`）。主题 = 默认值 + 覆盖叠加，CINDY 覆盖表见 `themes/builtin/cindy-light.ts:14-191` 的 `GENERATED_OVERRIDES`，末尾 `colors:{...GENERATED_OVERRIDES, "surface-translucent-sidebar":…}`（`:199-202`）。

**默认调色板（549 条中的代表值，Light｜Dark）**

| 组 | token | Light | Dark |
| --- | --- | --- | --- |
| 表面 | `surface` | `#f8f8f6` | `#1f1f1e` |
| | `surface-hsl` | `60 12.5% 97%` | `60 2% 12%` |
| | `surface-elevated` | `#ffffff` | `#2c2c2a` |
| | `surface-chip` / `surface-hover` | `#e5e5e5` | `#3c3c3a` |
| | `surface-hover-soft` | `#f8f8f6` | `#3c3c3a` |
| | `card-ivory` | `#faf9f5` | `#2c2c2a` |
| | `surface-on-card` | `#ffffff` | `#1f1f1e` |
| | `md-table-bg` | `rgba(236,236,234,0.55)` | `rgba(44,44,42,0.55)` |
| 边框 | `border-default` | `#d7d7d4` | `#3c3c3a` |
| | `border-default-hsl` | `60 3% 84%` | `60 2% 23%` |
| | `border-shadcn-hsl` | `0 0% 90%` | `30 4% 28%` |
| 文字 | `text-primary` | `#262626` | `#d4d4d4` |
| | `text-primary-emphasis` | `#1a1a1a` | `#d4d4d4` |
| | `text-body-strong` | `#525252` | `#d4d4d4` |
| | `text-primary-hsl` | `0 0% 9%` | `0 0% 83%` |
| | `text-secondary` / `-mid` | `#737373` / `#525252` | `#a3a3a3` |
| | `text-tertiary` | `#a3a3a3` | `#737373` |
| | `text-disabled` | `#d4d4d4` | `#525252` |
| | `text-placeholder` | `#c4c4c4` | `#525252` |
| CTA | `accent-cta-bg` | `#262626` | `#ffffff` |
| | `accent-cta-bg-pure` | `#000000` | `#ffffff` |
| | `accent-pure-cta-fg` | `#ffffff` | `#000000` |
| 语义 | `error-bg` | `#fef2f2` | `#3a2222` |
| | `error-fg` / `-strong` | `#dc2626` / `#991b1b` | `#f87171` / `#fca5a5` |
| | `status-success` | `#177C3C` | `#2AAE5B` |
| | `info-700` | `#1D4ED8` | `#60a5fa` |
| | `diff-del-fg`\|`-bg` | `#b31d28`\|`#ffeef0` | `#ff7b72`\|`#67060c` |
| | `diff-add-fg`\|`-bg` | `#22863a`\|`#f0fff4` | `#7ee787`\|`#033a16` |
| 聊天 | `agent-actions-rail` | `#DDD6CB` | `#404040` |
| | `msg-link` | `#2563eb` | `#60a5fa` |
| | `msg-scrollbar-hover` | `#b0b0ae` | `#555553` |
| | `composer-pill-bg` | `#FCFCFC` | `#393838` |
| 输入 | `chat-input-text` | `#000000` | `#d4d4d4` |
| | `composer-pill-icon` | `#3C3F43` | `#D9D9D9` |
| | `tooltip-bg` | `#262626` | `#1f1f1e` |
| 侧栏 | `sidebar-item-active` | `0 0% 90%` | `60 2% 17%` |
| | `sidebar-nav-text` | `#3C3F43` | `#D4D4D4` |
| | `sidebar-list-muted` | `#9A9DA3` | `#6F6F6F` |
| | `sidebar-user-card-bg` | `rgba(255,255,255,0.20)` | `rgba(255,255,255,0.05)` |
| 标题栏/启动 | `titlebar-icon` | `0 0% 45%` | `0 0% 63.92%` |
| | `splash-bg` | `60 12.45% 96.86%` | `60 1.64% 11.96%` |
| 搜索/遮罩 | `search-match-bg` | `45 100% 70%` | `40 55% 21%` |
| | `overlay-modal` | `rgba(0,0,0,0.5)` | `rgba(0,0,0,0.7)` |
| | `shadow-menu` | `0 4px 16px rgba(0,0,0,0.15)` | `…0.5` |

**Light/Dark 刻意同值（"锚定"而非"反转"）**：`text-secondary-cross` `#a3a3a3`、`text-tertiary-stone` `#737373`、`text-tertiary-hsl` `0 0% 45%`、`error-flat` `#ef4444`、`error-700` `#dc2626`、`warning-accent` `#EA6B17`、`warning-fg` `#F3A115`、`focus-ring` `#417CDD`、`focus-ring-soft` `rgba(65,124,221,0.5)`、`perm-auto-selected-text`/`bot-unread-bg` `#417CDD`、`login-error-fg`/`remote-status-failed`/`card-status-error` `#D91F37`，以及全套分级色——文件类型徽章 `#B23A26`/`#2C5CA8`/`#2E7D4F`/`#A25A12`/`#5B49A8`、引擎徽章 `#d97757`/`#7a9dff`/`#a78bfa`、推理档 low→max `#2AAE5B`/`#14B8A6`/`#3B82F6`/`#4F46E5`/`#8B5CF6`、价格档 `#2AAE5B`/`#B58A1F`/`#C05353`、任务标签粉/珊瑚/青/靛 `#df83b0`/`#de8970`/`#53a89d`/`#7c83cf`（Dark 微提亮为 `#e79fc1`/`#e6a08c`/`#75bfb4`/`#999fdf`）。**这份"同值清单"是 §2 那条"语义色是近绝对灰度规则的唯一出口"的实测答案。**

Dark 的结构性差异只有三条：①CTA 反相（`#262626`→`#ffffff`，前景 `#ffffff`→`#000000`）；②半透明加浓（overlay 0.5→0.7，shadow 0.08/0.12/0.15→0.3/0.4/0.5）；③暖相微保留（Dark 仍带 60°/30°，如 `surface-hsl 60 2% 12%`、`muted 30 6% 20%`）。另有约 450 条是**别名而非字面值**（`panel-bg`=`var(--surface)`、`msg-user-bg`=`var(--surface-elevated)`、`send-btn-bg`=`var(--accent-cta-bg)`、`sidebar`=`var(--surface-hsl)`、`diff-line-num`=`var(--text-tertiary-stone)`、`status-info`=`var(--info-700)`、`text-selection-bg`=`var(--focus-ring-soft)`；`ring`/`primary`/`foreground`/`secondary-foreground`/`popover-foreground` 全 = `var(--text-primary-hsl)`）。

**内置扩展主题对照（`reference/themes.json`）**

| 主题 | 页底 | 卡片 | chip / hover | 边框 | 主文字 | 次文字 | 强调 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| atom-one-light | `#FAFAFA` | `#FFFFFF` | `#EAEAEB`/`#E4E4E5` | `#D4D4D5` | `#383A42` | `#696C77` | `#4078F2` |
| solarized-light | `#FDF6E3` | `#EEE8D5` | `#EEE8D5` | `#E1DCC4` | `#757575` | `#828282` | `#859900` |
| one-dark-pro | `#282C34` | `#21252B` | `#2C313A` | `#3E4452` | `#ABB2BF` | `#7F848E` | `#61AFEF` |
| eclipse | `#0D1117` | `#161B22` | `#262C36`/`#1C2128` | `#30363D` | `#E6E6E6` | `#9CA3AF` | `#0CD2A5` |
| github-dark | `#0D1117` | `#161B22` | `#21262D`/`#1C2128` | `#30363D` | `#E6EDF3` | `#7D8590` | `#2F81F7` |
| material-ocean-hc | `#0F111A` | `#090B10` | `#1F2233`/`#1A1C25` | `#2A2F45` | `#EEFFFF` | `#A6ACCD` | `#80CBC4` |
| monokai-pro | `#2D2A2E` | `#221F22` | `#403E41` | `#5B595C` | `#FCFCFA` | `#C1C0C0` | `#FFD866` |

覆盖粒度：`cindy-light` 168 / `cindy-dark` 171（全量为 `value-*` 记法），`solarized-light` 42，`atom-one-light` 28，`github-dark` 27，`one-dark-pro` 23，`eclipse`/`material-ocean-hc`/`monokai-pro` 各 22（仅 `palette-*`），`default-light`/`default-dark` 各 1。`drop-overlay-bg` 统一 = 各主题主强调色 10% alpha（github `rgba(47,129,247,0.10)`、monokai `rgba(255,216,102,0.10)`……）。

**CINDY 皮肤族实测值（暖象牙系，Light｜Dark）**

`surface` `#F2F2ED`/`#181818`、`surface-elevated` `#FDFDF8`/`#1F1F1F`、`surface-elevated-soft` `#FAFAF5`/`#1D1D1D`、`surface-chip` `#EEEEE9`/`#1D1D1D`、`surface-hover` `#EEEEE9`/`#1D1D1D`、`surface-hover-soft` `#F0F0EB`/`#191919`、`surface-on-card` `#FFFFFF`/`#181818`、`border-default` `#E4E4DF`/`#313131`、`text-primary` `#1A1A1A`/`#D4D4D4`、`text-secondary` `#888883`/`#6F6F6F`、`text-tertiary` `#6B6B67`/`#C1C1C1`、`text-primary-emphasis` `#0C0C0C`。

HSL 契约带 60° 暖相：`surface-hsl` `60.0 16.1% 93.9%`（默认主题是 `60 12.5% 97%`）、`border-default-hsl` `60.0 8.5% 88.4%`、`text-tertiary-hsl` `60.0 1.9% 41.2%`、`background`/`titlebar`/`splash-bg` 同为 `60.0 16.1% 93.9%`；Dark 侧 `surface-hsl`/`bg`/`titlebar`/`sidebar` `0 0% 9.4%`、`border` `0 0% 19.2%`、`text-primary-hsl` `0.0 0.0% 83.1%`、`ring` `217.3 69.7% 56.1%`（含 alpha 变体，如 `sidebar-item-hover` = `0.0 0.0% 0.0% / 0.05`）。

**最关键的反直觉点：CINDY 的 CTA/accent 族不是红，是中性灰。** `accent-cta-bg`/`-pure`/`-emphasis` = `#3C3F43`/`#EEEEEE`、`accent-soft` `#25282C`、`accent-hover` `#2E3237`、`accent-pure-cta-fg` `#FCFCFC`/`#151515`（`cindy-light.ts:51-56` 注释「E1D 反相中性底（用户批准 2026-07-17，不用红）」）。

品牌红被限定在登录点缀且双模式同值：**`login-brand-accent` `#DF0C27`（`colors.ts:2448-2451`）、`login-brand-accent-pressed` `#A61629`（`:2452-2455`）**，注释明确「禁止表达页面/画板背景——命名刻意不含 bg/background」（`:2445-2447`）。测试常量 `themes/__tests__/cindyThemes.test.ts:138` `BRAND_RED_HEX = '#DF0C27'`，`:282-291` 断言 caret-accent 不得为品牌红；决策数据 `themes/__tests__/cindyDecisionData.ts:393-440`（E1D 红色体系重构：红仅限 A 类 brand-login/error；`sidebar-item-active` 2026-07-20 撤红改中性）。消费链 `loginDesignTokens.ts:307` `brandAccent:'var(--login-brand-accent)'` → `LoginControls.tsx:143`。**旧双红渐变已撤**：`login-bg-gradient-radial`/`-linear` 双模式均 `none`（`colors.ts:2434-2441`)。这与 §9.3 的"品牌红边界"是同一套纪律的代码证据。

其他 CINDY 专有：`caret-accent` `#417CDD`、`switch-track-on` `#417CDD`、`switch-track-off` `#888888`/`#787878`、`info-700`|`msg-link` `#1D4ED8`/`#93C5FD`、`slider-track` `#A3A39E`/`#626262`、`slider-fill` `#3C3F43`/`#EEEEEE`、`status-badge-fg` `#1F1F1F`/`#121212`、`create-agent-segment-inactive-text` `#9D9D98`/`#6F6F6F`、`surface-translucent-overlay` `rgba(251,251,246,0.9)`/`rgba(21,21,21,0.8)`、`md-table-bg` `rgba(241,241,236,0.55)`/`rgba(26,26,26,0.55)`。

CINDY 独占的毛玻璃契约全在 `globals.css:2068-2226`，且**由 `data-theme` 属性选择器门控**：`[data-theme='cindy-light'|'cindy-dark'] body{background:transparent}`（`:2073-2076`）、侧栏 `var(--surface-translucent-sidebar)`（`:2093-2099`）、浮层卡 `var(--surface-translucent-overlay)` + `blur(6px)`（`:2122-2127`）、peek drawer `blur(28px)`（`:2112-2117`）、`--menu-panel-surface` 切半透明（`:2209-2212`），win32 acrylic / 无 blur 回落分支在 `:2103-2108`、`:2132-2137`、`:2213-2216`；**基础主题浮层用不透明 `var(--cmd-palette-bg)`**。这解释了 §13.2 里"`.dark` class 与 `data-theme` 属性并存"的用途之一：玻璃契约必须绑身份而不是绑明暗。

**语义色豁免清单（theme-invariant）**

权威登记表 = `packages/design-tokens/src/classify.ts:139-195` `SEMANTIC_EXEMPTION_IDS`，**11 个 id**，规则统一为「theme-invariant 语义豁免色（Tier-3 singleton），外部主题不覆盖」（同文本冗余于 `src/classification.json`、`src/semantic/color.json`；守卫 `src/guards.ts:139-170`）：`destructive` `0 84% 60%`/`0 72% 63%`、`error-flat` `#ef4444`、`error-bg` `#fef2f2`/`#3a2222`、`error-border` `rgba(220,38,38,0.4)`/`#7f1d1d`、`error-fg` `#dc2626`/`#f87171`、`error-fg-strong` `#991b1b`/`#fca5a5`、`warning-accent` `#EA6B17`、`warning-fg` `#F3A115`、`warning-bg-soft` `rgba(234,107,23,0.12)`/`…0.18`、`focus-ring` `#417CDD`、`focus-ring-soft` `rgba(65,124,221,0.5)`。

**重要区分**：豁免 = **外部主题不覆盖，不等于 Light/Dark 同值**。真正连明暗都恒定的只有 `error-flat` `#ef4444`、`error-700` `#dc2626`、`warning-accent` `#EA6B17`、`warning-fg` `#F3A115`、`focus-ring` `#417CDD`、`focus-ring-soft` `rgba(65,124,221,0.5)`。`classify.ts:136-137` 说明豁免表其余未建模项（`diff-*`、`login-error-fg` 等）待进 shadow 层再登记。

**HSL vs HEX vs rgba 的序列化约定（含"为什么"）**

序列化规则在 `packages/design-tokens/src/production.ts:348-388`：

- `hex` → `#RRGGBB`（分量 ×255 取整，`:382-387`）。
- `triplet` → **裸三元组 `H S% L%`，不带 `hsl()`**，要求 `colorSpace === 'hsl'`，带 `alphaPrecision` 时追加 ` / a`；**无 `alphaPrecision` 却 alpha≠1 直接抛错** `Triplet format cannot discard alpha`（`:353-363`）。
- `rgb` → `rgba(r, g, b, a)` / `rgb(r, g, b)` 逗号分隔（`:378-381`）。
- `transparent` → 字面量（须 alpha=0 且分量全 0，`:369-375`）。

**为什么要这样分**：CSS 需要用 `hsl(H S% L% / a)` 语法做主题级 alpha，所以这类变量存裸三元组、**消费时必须自行包 `hsl()`**——证据 `globals.css:133` `border-color: hsl(var(--border))`、`:147-148` `hsl(var(--background))`/`hsl(var(--foreground))`、`:898`、`:920`、`sortable.css:69`；而 hex 变量则裸用：`globals.css:689`/`:2050`/`:2196` `var(--border-default)`。带透明度叠加色用 rgba（`overlay-modal`、`md-table-bg`、`focus-ring-soft`）或 `transparent` 字面量。**`-hsl` 后缀只是命名约定、不能单独作判据**：`classify.ts:277-287` 要求双模式取值都真的是 hsl-triplet（形如 `60 12.5% 97%`）才归类 `'hsl-triplet'`。HSL 三元组另支持 `alphaPrecision:2` 承载主题级 alpha（如 CINDY `sidebar-item-hover` = `0.0 0.0% 0.0% / 0.05`），**这是 HEX 无法表达的同色相不同透明度档**——也是"为什么不能把所有颜色都压成 hex"的答案。

---

### 13.4 版块布局与组件实现层

**版块结构：布局树数据模型，不是一个写死的三栏**

布局的真身是三处：数据模型 `apps/desktop/src/shared/layoutTree.ts`、渲染引擎 `apps/desktop/src/renderer/layout/LayoutRoot.tsx`（1061 行）、三块所有权 `apps/desktop/src/renderer/components/layout/MainLayout.tsx`（1702 行）。

- 数据模型 `Layout = sidebar（树外全高独立柱，edge:'left'）+ content（递归分割树）+ float（v1 恒空）`（`layoutTree.ts:89-100`）。**sidebar 在分割树外层**，所以不被里层切割，v1 只允许贴左、不可进入内容区（`:95`）。
- `createDefaultLayout()` 就是今天的三栏：sidebar `{id:'sessions', panelKind:'session-list', edge:'left'}` + content = `row` split `'root'`，children `[{fraction:0.5, chat-main, minWidth:400}, {fraction:0.5, right-tabs}]`（`layoutTree.ts:121-139`）。
- **不变量**（`layoutTree.ts:334-369`）：schemaVersion=1（`:14`）；sidebar 必须是 session-list + edge `'left'`；**content 中 chat-main 恰好一个且 `collapsed` 不得为 true**；content 内不得出现 session-list；split ≥2 children、fraction 正有限、深度 ≤8（`:17`）、id 全局唯一；任何校验失败 → `coerceLayout` **静默回退默认树**（`:376`），不报错。折叠记忆粒度：`session-list` = `global`、`chat-main` = `none`（不可折叠）、`right-tabs` = `per-session`（`panels/builtinPanels.tsx:43-45`）。
- **DOM/视觉层**（`MainLayout.tsx`）：根容器 `relative flex h-screen bg-content-area text-foreground`（`:1424`）；左栏 `<div className="flex shrink-0">`（`:1433`）；`<main data-panel-drag-root="chat-main" className="relative flex flex-1 flex-col overflow-hidden bg-content-area"` + `min-w-[400px]`（`:1477-1488`）；右栏 `<RightSidebar>` 在 `rightSidebarAvailable && loaded && !detached` 时渲染。三大块所有权：`BuiltinPanelBridgeProvider`（`:1472-1595`）把 chatMain/rightTabs 交给面板桥，**`sessionList: null`**——会话列表由 `Sidebar` 直接渲染，不经面板桥。
- **分隔方式**：**一律 1px Board 细线、铺在同一张扁平 Surface 上，绝不用背景色差**（对应 DESIGN.md §5）。缝由布局引擎统一绘制：`.layout-divider-v { width:1px; background: var(--border-default) }`（`styles/globals.css:2046-2051`，横缝 `:2052-2056`）；**面板自己不再画侧边框**（`RightSidebar.tsx:227-228` 注释、`globals.css:2041-2045` 说明"两块时代各画一侧在 N 块布局下会漏缝"）。缝的隐藏是**单侧**的：折叠（0 宽）面板藏它**前面**那条缝，`.hidden` 面板藏它**后面**那条（`globals.css:2057-2066`）。
- **缝即拖宽把手**：相邻可见面板之间有且仅有一条引擎缝，每条缝都可拖；拖动只在缝两侧邻居之间转移份额（其余面板不受影响），拖动中走本地瞬时值实时跟手、**松手才写树**；**双击缝 = 两侧份额均分**。1px 缝 + **7px 隐形抓握区** `absolute inset-y-0 left-[-3px] z-10 w-[7px] cursor-col-resize`（`LayoutRoot.tsx:663-670`；横缝 `h-[7px] top-[-3px] cursor-row-resize` `:789-793`），hover 用 `hsl(var(--sidebar-action-icon))`（`:666`——该 token 是 HSL 三元组，**必须 `hsl()` 包裹**）。拖宽期间 `document.body.classList.add('resizing-pane')` + `col-resize` + `userSelect:none`（`:603`）。
- **宽度数值**：左栏默认 **260**、min **180**、max **480**，rail 阈值 **120**、rail 宽 **78**（容纳 macOS 红绿灯），卡片版两列磁吸点 272（`hooks/useSidebarResize.ts:10-23`；`Sidebar.tsx:38` `RAIL_WIDTH` 与之一致）。右栏 min **280**、`CHAT_AREA_MIN_WIDTH=400`、默认 fraction **0.5**（右栏与聊天 1:1）、fraction 区间 [0.1, 0.9]、可用宽兜底 1200（`hooks/useRightSidebarResize.ts:29-42`、`fractionToWidth` clamp `:129-135`）。**宽度是占比制 fraction**，窗口缩放时两侧按比例变化（`layoutTree.ts:425-427`）。
- **非 chat 面板像素宽** = 在场份额 × 可用宽，公式 `clamp(${min}px, ${share*100}cqw, calc(100cqw - 400px))`（`LayoutRoot.tsx:258`），容器 `containerType: 'inline-size'`（`:966,1054`）——**用 `cqw` 而非 `%`**，避免 `%` 相对各消费者父级二次解析与 live resize 期间的 state 往返。常量：`CHAT_MIN_PX=400`（`:62`）、`NON_CHAT_FLOOR_PX=120`（`:71`，2026-07-09 定案"**只有聊天区有硬下限，其它面板一律自由拉**"）、`AVAILABLE_WIDTH_FALLBACK=1200`（`:60`）。
- **在场份额（active share）**：树上 fraction 是"全体 pane"的账本，不渲染的 pane（未安装残留/已抽离/已最小化）那份地方实际被弹性的 chat 吸收，故引擎一律按 `share = fraction / Σ在场 fraction` 计算（`activeSplitLedger`），隐藏面板的 fraction **一字不动**（位置与宽度记忆保留，重装/合并/恢复即原位复活）。这条设计直接对应 §13.2 的"数据保留、画面消失"哲学。

**顶栏与标题栏**

- 右内容区顶栏 `ContentHeader`：`h-[46px] w-full shrink-0` + `border-b border-titlebar-border`（设置页"隐形 chrome"**连边框都不画**）+ `pl-[78px]`（mac 红绿灯让位 70+8）或 `pl-2`，`WebkitAppRegion:'drag'`（`components/layout/ContentHeader.tsx:117-136`，让位逻辑 `:86-88`）。**无背景**，继承 main 的 `bg-content-area`。
- 折叠态占位 spacer **68px = 28 折叠按钮 + 4 gap + 28 菜单 + 8 间隙**（`:154-166`）；右端只留占位：mac 36px、Windows `WIN_CONTROLS_WIDTH=138`（3×46px）（`:36,44,178-184`）。`ContentHeaderSlot` 用 `display:contents` 广播 `--content-header-h`（46px / 0px）给新建页补偿占位（`:196-220`）——**这就是 §15.15「零跳动」的机制**。
- `Sidebar` 顶行同为 **46px**（`flex h-[46px] w-full shrink-0 items-center`，`components/sidebar/Sidebar.tsx:204`）——46px 是"红绿灯钉 y=16、标题与红绿灯同轴"的全局面板行高常量。
- Windows 窗口控制浮层 `absolute right-0 top-0 z-50 flex h-[46px] items-center pr-2`（`MainLayout.tsx:1627-1632`，所有路由常驻含设置页）；mac 右栏折叠浮层同款 `h-[46px] gap-1 pr-2`（`:1650-1652`）。
- 右栏内部：Windows 端 46px 拖拽带 + 36px TabBar（`RightSidebar.tsx:236-241`）；面板头/页签条 `h-[36px] px-3 border-b border-[var(--border-default)] bg-[var(--panel-bg)]`（`panels/PanelChrome.tsx:113`，面板头 46px 见 `:88`）。

**多主视图差异（同一套壳，三种形态）**

- **会话页（三栏）**：默认布局——左会话列表 + 中聊天 + 右工具面板。
- **设置页**：左栏隐藏（`MainLayout.tsx:1432` `!isSettingsRoute`），非 chat 面板统一歇业 `LayoutRoot suppressNonChatPanels={isSettingsRoute}`（`:1598`，**引擎级开关**，2026-07-08 实测设置页右缘会冒意识面板）；ContentHeader 退化为隐形 chrome。设置页自身是**阅读宽度居中两列**：左目录列 `shrink-0 flex-col gap-2 overflow-y-auto pl-6 pr-4 pt-7`（`components/settings/SettingsView.tsx:256`），返回行 `gap-2.5 px-3 pb-[18px]`（`:261`）；右内容列 `flex-1 flex-col pl-4 pr-6`（`:296`），内层 `mx-auto w-full max-w-[920px] px-1`（`:310`），小节以 `py-[18px]` 分隔（`:345…`）。这正是 §5 里"阅读宽度内容用舒适最大宽度居中"的落地。
- **新建任务页**：Sidebar 以 `forceMountFeatureContent={pathname==='/cc-agent/new'}` 保持在场（`MainLayout.tsx:1450` 附近）；路由视图由 `FadeSwitcher key={pathname.split('/')[1]}` 管理（`:1539`，**跨 Feature 才重挂**跑淡入）；折叠/rail 态为浮动 ChromeActions 预留 **68px**（`:1483-1487`）。
- **聊天界面（中区）**：滚动容器 `overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable]`（`components/chat/MessageStream.tsx:6176-6183`）；内层内容列 `relative mx-auto w-full pt-7` + `maxWidth: contentWidth ?? 880`（`:6184-6193`）——**消息流与输入框共享同一水平边界**（`:6189-6192` 注释），文件头记为 "Content area max-width 880px, centered"（`:16`）；消息竖向 `gap-3.5` = **14px**（v2 由 28px 减半，`:15,6224`）。气泡宽度：agent/orca 通信 `w-full max-w-[560px]`、用户编辑态 `max-w-[720px]`、常规用户气泡 `max-w-[488px]`（`components/chat/UserMessage.tsx:1355-1365`）。Composer 根 `relative flex w-full flex-col items-center gap-4` + `data-chat-input-root`（`components/new-chat/ChatInput.tsx:8600`）；输入卡 **12px 圆角**（`:8656,8704`，注释明确"与对话页统一为 12px，不再用 Figma 的 6px"，用户定稿 2026-07-22）；卡内头行 `border-b border-[var(--chat-input-border)] px-[11px] py-2`（`:8686`）、正文区 `px-[11px] pt-[11px] pb-[6px]`（`:8693`）、编辑器 `min-h-[22px] max-h-[186px]`（`:2271`）、底部动作行 `h-[46px] gap-[10px] rounded-full`（`:9643`）。计划/权限类卡 `max-w-[914px] rounded-[12px] border`（`PlanActionCard.tsx:136`、`PlanViewerCard.tsx:146`、`PermissionPrompt.tsx:203`）。

**间距实测锚点**（基础单位 8px、档位 4/6/8/10/12/14/16/20/24/32/40/48）：侧栏与顶栏行高 46px；面板页签条 36px + `px-3`；设置目录列 `pl-6 pr-4 pt-7`；设置小节 `py-[18px]`；聊天内容 `pt-7`（28px）；消息间距 14px；composer 内边距 11px；对话框默认 `p-4`（16px）；下拉面板 6–8px。

**圆角实测**：composer 12px（`ChatInput.tsx:8656`）、设置卡 `rounded-xl`（`SettingsView.tsx:359`）、`GoalIndicator`/`PlanModeIndicator` `rounded-lg` 8px（`GoalIndicator.tsx:228`、`PlanModeIndicator.tsx:26`）、快捷键框 `rounded-[4px]`（`ChatInput.tsx:9023`）。另有一条容易踩的警告：**卡片的 12px 与 §10 的 `--radius`（shadcn 原语 0.5rem = 8px）无关**，后者是 shadcn 组件的圆角变量、不是容器档位。

**深度实现约定（零阴影的工程细节）**

- 浮层阴影写法必须是 `shadow-[shadow:var(--shadow-menu)]`——**无类型版 `shadow-[var(--shadow-menu)]` 会被当成阴影颜色、不渲染**（DESIGN.md §4）。`globals.css:2194-2199` `.modal-panel { background-color: var(--confirm-bg); box-shadow: var(--shadow-menu) }`；遮罩 `.modal-scrim { background-color: var(--overlay-modal) }`（`:2177-2181`，Windows 无模糊 `:2190`）；侧栏 peek 抽屉用 `shadow-[var(--shadow-menu)]`（`Sidebar.tsx:163`）。
- **毛玻璃**：仅 CINDY 主题族，窗口 vibrancy 透壁纸，**只侧栏 blur 50px + 浮层 blur 6px，主内容区不透明**（`--content-area` = `--surface-hsl`，globals.css:2068-2072、:2119）；Windows 下所有 `--cmd-palette-bg` 面不透明且无 `backdrop-filter`。这是"§15.12 Vibrancy"的实现边界。
- **z-index 阶梯（实测）**：面板页面层 `z-10`（拖缝抓握区，`LayoutRoot.tsx:670`）→ 顶栏/窗口控制/右上浮层 `z-50`（`MainLayout.tsx:1628,1650`，含设置页常驻）→ ghost 面板气泡层 `z-[9900]`（portal 到 body，`:1619`）→ **modal overlay `z-[10000]`** → **modal 内 Tooltip `z-[10001]`**（DESIGN.md §4：`Tip` 默认 `z-[60]` 低于 modal overlay，必须传 `contentClassName="z-[10001]"`，Input 密码按钮用 `secretTipContentClassName`）→ 设备切换浮层 `z-[10010]`（`DeviceSwitcherPill.tsx:143`）；面板内 tooltip `z-[10002]`（`ModelCompatibilityNotice.tsx:28`）。

**组件视觉规范实测补充**

- **Button**：三档标准高度 **28(sm) / 32(md) / 36(lg)**，**无 40px 档**（DS-4 G1, 2026-09-03）；紧凑例外 `xs`(24px)、`xxs`(22px)（2026-09-22 授权清单）；pill 圆角、13px/500、图标文字 gap 6px、水平 padding 24px。disabled = opacity 60% + 普通指针（2026 DS-4 新增）。审计口径：**仅静止截图或只比颜色不能证明按压位移**，须比对计算后的 hover/pressed 颜色与 1px face inset。"打开菜单"型触发器继承正常按压反馈，**不是禁用反馈的理由**。
- **卡片/容器**：fill `--surface-elevated`（页面级扁平布局用 `--surface`）、border 1px `--border-default`、radius 12px、**shadow none**、hover `--surface-hover`。
- **Select & Dropdown**：触发器 = 单行输入同款；面板 = container（12px + 1px Board + 6–8px padding）；**Select listbox 面板无阴影**（用 `--surface-elevated` 靠层色分隔），菜单/popover 面板 12px + `--shadow-menu`。菜单行 `text-14`/`leading-[1.43]`（32px 行 `py-1.5`）、快捷键 `text-12`/`leading-[1.33]`/400、组标签 `text-12`/500、破坏性行 `--error-fg`、禁用行 50% opacity；**高亮/勾选/展开行字重 500**，图标描边 1.5→2。**行高亮用 8px 内圈圆角**（面板 12px 容器，内圈必须更小才能干净嵌套）；**面板宽度必须绑定触发器宽度**（`position="popper"` + `width: var(--radix-select-trigger-width)`），**宽度永不移动**（行文字与 truncate 预留 500 字重宽，零高 `::after` 复制 `content: attr(data-menu-label)`，共享面板 `lockMenuWidth`）。hover 高亮用**一个 8px 面在行间滑动**（`components/ui/dropdown-menu-highlight.ts`）。
- **Toast**：短通知保留 pill 外框；**消息或动作换行时外层改 12px 内容容器**（`rounded-xl`），沿用同一背景/边框/状态图标色/padding；整条装在视口内留 **16px** 边距；hover 与键盘焦点**各自独立**暂停自动消失。
- **Dialog/Modal**：唯一参考实现 `components/ui/confirm-dialog.tsx`，**不得另造平行实现**。遮罩用共享 `.modal-scrim`（调用点**绝不自己写**遮罩色、`bg-black/…`、`backdrop-blur-*`）；容器用共享 `.modal-panel`（12px + `--confirm-bg` + 1px `--border-default` + `--shadow-menu`），调用点只设宽度/位置/padding 与布局，**绝不自己加圆角/背景/边框色/阴影或玻璃 `--cmd-palette-bg`**；门禁 `__tests__/modalSurfaceContract.test.ts`。宽度：confirm/notice ≈400px（`max-w-[400px]`）；含输入表单 ≈460px 并随视口收缩 `min(460px, 100vw-32px)`；多运行时 provider 与 MCP 表单 **600px**、body 限 88vh 内可滚。标题 18px（`--confirm-title`/`--confirm-desc`）。按钮 pill，primary = **反相中性**（`--confirm-btn-primary-*`，不是自动 CTA 指派），secondary/cancel = 描边透明，footer `justify-end`。**关闭方式（2026-07-30 明确，09-24 更新，10-01 扩大）：没有任何 modal 靠点遮罩关闭**——只能经自身控件或 Esc（Android 为 Back）；Radix `Dialog.Content` 恒设 `onPointerDownOutside={e => e.preventDefault()}`；**带 Cancel 的弹窗不得再有右上 ×**。例外：媒体查看器/锚定菜单与普通 popover/侧抽屉/移动端底部面板仍可点外关闭。多步向导：步骤指示器放**页头行**（圆角数字 chip——当前步实心 `--accent-cta-bg` + `--surface-on-card` 文字、已完成步 ✓ 于 `--surface-chip`、未到步描边 `--border-default`）；页脚**返回导航（"← 上一步"）是左对齐裸文字按钮**（`--text-secondary`、13px/500、无背景、无圆角，§5 裸文字按钮豁免）——导航不是提交动作，**不得放进右对齐 pill 组**；目录/列表步骤把滚动区夹在**两条整宽 1px `--border-default` 细线**之间；宽 600px（`min(600px, 100vw-32px)`）、高 `min(640px, 85vh)`。
- **Desktop segmented controls**（v8 外观/v9 布局，owner 2026-09-25 批准）：统一实现 `components/ui/segmented-control.tsx`。轨道 = 无边框 pill，`--segmented-track`（黑色 alpha 覆盖，Light 6% / Dark 25%，**只作用于背景**）；选中 pill 用组件局部 `--segmented-selected-bg/-border/-shadow`（CINDY Light `#FDFDF8`/`#F0F0EB`，Dark `#353535`/`#3B3B3B`），**其两层阴影是 owner 批准的抬升例外，不授权其它控件加阴影**。默认 **32px 轨道 / 28px 选项**；紧凑 Diff 保留 **24px / 18px** 视觉 + 最小 **24px** 透明命中区。**一块实测 plate 随选中在 `--motion-base` 上移动**；hover/press 用 `--motion-fast`，按压缩放 **.98**；reduced motion 禁用移动与过渡。所有选项字重 500。语义：设置与筛选用 `radiogroup`/`radio`/`aria-checked`，面板导航保留 `tablist`/`tab`/`aria-selected`。
- **用量数据图形**：热力图 12×12px 方格、2px 圆角、3px 间隙、外留 3px gutter；token 条 30 根等宽细柱、3px 间隙、外圈 2px 圆角、共享基线。**可点数据标记保留数据几何、不是普通 pill 按钮**（与 §5 数据标记注册一致）。

**Do / Don't 全文（DESIGN.md §7）**

Do 11 条：①用 Surface（Light `#f8f8f6` / Dark `#1f1f1e`）作页面背景——每个页面都从这里开始；②按 §5 给每个可见层赋值（先查 Step 1 注册形状，普通控件框再取 Step 2 pill 档）；③内容盒子用 container 档，所含层单独赋值；④多行 textarea（恒 8px）、下拉/菜单行高亮与 Step 1 未覆盖的块内 cell 用内控件档；⑤调色板严格灰阶，彩色只能经 §2 认可的语义集合且一律走 token；⑥展示型标题用 Inter 400/500，**层次来自尺寸 + 字重而非换字体**；⑦保持零阴影；⑧保持低内容密度；⑨终端命令与代码用等宽字体；⑩普通动作框保持其 §4 处理与 §5 所赋档位（含临时 hover/pressed 面）；⑪焦点与选中指示器是独立处理。

Don't 9 条：①不引入 §2 之外的任何彩色（无品牌蓝、无强调绿、无超出已注册例外的暖色）；②不发明任意圆角（无 3/6/10px 或任意值）；③**不给任何元素加阴影**；④UI chrome 不用 600 以上字重（**700 仅限豁免域**：markdown 内容、hljs 主题移植、登录/Splash 品牌画布、`vendor/` 第三方查看器、命令式第三方 API；**任何地方都无 800+、无中间值**）；⑤不加装饰性插画；⑥**任何地方都不要用渐变**；⑦不把布局搞复杂，守住区域结构；⑧不用比 1px 更重的边框；⑨不加装饰性或大幅动效——**无回弹、视差、循环或多余移动**，短的**功能性**状态过渡（颜色/背景/不透明度 ≤150ms）是好的且被期待的。

**窗口与自适应 + 响应式/紧凑模式**

- Electron 应用 —— **布局响应窗口 resize，而不是页面断点**。主窗口与副会话窗口**最小 800×600**（BrowserWindow 层强制：`main/bootstrap-electron.ts` / `secondary-windows.ts`）；**独立的右侧栏分离窗口下限 360×480**（`right-sidebar-window/window.ts`）。**窗口变窄时区域分隔线与内边距保持不变，内容流式重排**；代码块保持水平滚动不换行。代码层兜底：`<main>` 恒 `min-w-[400px]`，右栏允许 flex shrink、`min-w-0 max-w-full`（`RightSidebar.tsx:202-205`）；可用宽 <680px 时右栏上界退回 280（**"右栏优先保命、中间让步"**，`useRightSidebarResize.ts:126-135`）。
- **doc 紧凑模式**：`.chat-rail-compact` 段（`globals.css:213-256`）**只作用于挂了该 class 的容器**（`WorkdirBrowseRoute` doc-mode rail 的 `CCAgentSessionView` 外层），把常见 Tailwind 字号整体下调 1px；**`ChatInput`（`data-chat-input-root`）单独还原回默认字号**（`:216-217`），变量字号路径另按同样 -1px 语义补降级。DESIGN.md §3 明确：机制**挂在 `--text-<n>` 变量层**，"doc 紧凑模式与后续字号缩放能力都挂在这层变量上，**任意值类会静默漏掉这些机制**"——这是 §13.1 与本节交汇的地方。
- **折叠/rail 态**：左栏拖到 <120px 进 rail，rail 宽 78px；rail 态在 drag header 左缘挖 `CHROME_ACTIONS_GEOMETRY.clusterWidth` 宽的 `no-drag` 洞，**否则点浮动按钮会被 Electron 当窗口拖拽吞掉**（`ContentHeader.tsx:138-150`）；折叠/展开宽度过渡统一 **250ms `cubic-bezier(0.4,0,0.2,1)`**，`motion-reduce:duration-0`（`MainLayout.tsx:210-229`、`ContentHeader.tsx:163`、`RightSidebar.tsx:197-198`）。
- **撑满态（maximize）**：目标 pane 独占一行 `flex-1`，兄弟收成 **0 宽 + `aria-hidden`**（保持挂载、不动 `display`——**webview 卸载会丢 webContents**），分割线整组不画，树账本不动（`LayoutRoot.tsx:946` 附近；`RightSidebar.tsx:199-204` 记录 2026-07-01 实测 bug：传固定宽会导致 maximize 后文件树消失）。
- **面板增删**：`insertRootSplitPane` 新 child 份额夹到 `[0.05, 0.8]`、默认 0.2；根分割至少保留 2 children；**根布局恒为横向（row）**，纵向 `column` grid 只存在于一个根 child 内且只含 `ghost:*` pane——**避免主界面演化成任意深度自由网格**（`layoutTree.ts:469-540,615-621`）。

**本节证据缺口（如实标注）**：未逐行读 `RightSidebar` 全部 Tab 内容组件与 `AuthGate`/登录画布（§15/§16 属另一报告域），也未核对 `layoutDevTools.ts` / `collapsePrefs.ts` 的持久化细节。上述全部结论可由所列 `路径:行号` 直接复核。

---

*报告依据：`docs/design-rules/` 全部设计文档 + `apps/desktop` / `apps/mobile` / `packages/design-tokens` 源码。所有引用行号对应调研时的 `main` 分支快照。*
