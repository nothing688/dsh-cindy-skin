# probe —— 只读侦查与验证工具

移植过程中用来**读**而不是**写**的一套工具：读 DSH 的构建产物（`app.asar`、CSS、token 表）、验证插件是否被正确装载、在真实页面上测量样式并定位问题。

- 不修改 DSH 安装目录，不修改 `app.asar`，不写 profile 的 `cordis.patch.yml`。
- `pw/` 里的少数探针会往当次页面**临时注入** `<style>`／挂测试属性做对照实验（例如 probe8 试算候选 CSS、probe27 关掉本插件做参照组），但那只存在于那一次浏览器会话，刷新即消失，不落盘到插件。

---

## 命令行工具

### `asar.py` —— 只读 `app.asar` 检查器

Electron 的 asar 就是一个带 JSON 目录头的归档。这个脚本按 Electron 的 pickle header 布局解析目录，支持三种用法：

```bash
python asar.py --list [PREFIX]                       # 列目录
python asar.py --get INNER_PATH --out OUT_PATH       # 提取单个文件
python asar.py --grep PATTERN [--prefix P] [--ext .js] [--limit N]   # 全文搜索
```

默认目标是本机安装路径，可用 `--asar` 或环境变量 `DSH_ASAR` 覆盖。

### `scan_main.py` —— 在主 bundle 里定位符号

把 `asar.py --get out/main/index.js` 提取出来的主进程 bundle 交给它，按符号打印命中位置与上下文片段，快速定位插件装载 / generation 投影相关实现：

```bash
python scan_main.py OUT_MAIN_INDEX_JS [SYMBOL ...]
```

不给 SYMBOL 时用内置的一组默认符号。

### `verify-host.mjs` —— 装载自检

三段检查，确认插件在宿主里「能被找到」：

1. host 侧入口 `lib/index.js` 能被 ESM 装载，且导出 `name` / `inject` / `apply` 契约完整；
2. `client.js` 是合法构建产物（loader 头正确、`@font-face` 与内联 woff2 数量一致、调用了 `overrideTokens`、占位符 `__INTER_FONT_FACE__` 已替换）；
3. profile 清单两处登记齐全（`dependencies` 与 `dsh.profile.bundles`），并核对 profile 的 `node_modules` 实体：里面的 `client.js` 是否与本仓库一致（不一致说明运行中的不是这份代码）。未安装时跳过，不算失败。

> 第 3 项刻意不用 `require.resolve`：在插件包自己的目录里解析 `dsh-cindy-skin/client` 会命中 Node 的**包自引用**（`package.json` 的 `name` + `exports`），测到的是本仓库而非 profile。

```bash
node probe/verify-host.mjs [PROFILE_DIR]
```

`PROFILE_DIR` 缺省取 `%APPDATA%\dsh-desktop\harness\profiles\web`。

---

## `pw/` —— 真实页面探针

用 `playwright-core` 驱动本机 Edge/Chrome，打开 DSH 的 Web GUI，在**真实 DOM**上采样样式、画坐标、做命中测试。为什么非要用真浏览器：DSH 的 token 大量走 `body` 内联 style 与 `:root`/`body *` 声明，只有拿到 computed style 才能确认最终生效值。

**前提**：DSH Desktop 正在运行；从当前 GUI 的 URL 里取 `token` 参数（形如 `http://127.0.0.1:43129/?token=<token>`）。

```bash
cd probe/pw
npm install            # 只装 playwright-core
node probe.mjs <token>
```

### 一览

| 脚本 | 做什么 |
|---|---|
| `probe.mjs` | 基线：读主题 token 的实际值与插件痕迹 |
| `probe2.mjs` | 关掉欢迎向导后采集链接 / chip 的实际样式 |
| `probe3.mjs` | 进入真实会话，采集 markdown 链接 / 内联代码 / 文件 chip |
| `probe4.mjs` | 复审：确认新一批 token 与侧栏玻璃是否被宿主加载 |
| `probe5.mjs` | 诊断「收起侧边栏按钮错位」是否由 `backdrop-filter` 成为 `position:fixed` 后代的包含块引起（测量 → 临时移除该 style → 再测量） |
| `probe6.mjs` | 关掉 `dsh-auto-memory` 欢迎向导后拍侧栏，测量侧栏顶部与中部结构 |
| `probe7.mjs` | dump 侧栏 DOM 骨架（class / 文本 / rect / overflow），为紧凑化与导航折叠定位选择器 |
| `probe8.mjs` | 试算 A（导航折叠）+ B（紧凑化）两套候选 CSS，测量前后变化并截图，**不写插件** |
| `probe10.mjs` | 侧栏按钮坐标实测 + 玻璃层现状采样 |
| `probe11.mjs` | 侧栏结构采样 |
| `probe12.mjs` | 沿侧栏左缘中点逐层 `elementFromPoint` |
| `probe13.mjs` | 采样并批量截图，定位视觉缺口 |
| `probe14.mjs` | 折叠开关 `.cindy-nav-toggle` 自包含快照（不引用外部变量） |
| `probe15.mjs` | 展开 / 折叠 / rail 三态下的开关快照对比 |
| `probe16.mjs` | 单元素体检：位置 / 可见性 / 指针命中链；逐个子元素测量 logo 行 |
| `probe17.mjs` | 命中测试：插件按钮中心点上最顶层的元素是否是自己 |
| `probe18.mjs` | 找出插件注入的 `<style>`，核对注入脚本是否含 rail 分支 |
| `probe19.mjs` | rail 态下宿主按钮 class 是否变化；全量列出侧栏区按钮及其中心点命中对象 |
| `probe20.mjs` | 侧栏区元素采样 |
| `probe21.mjs` | 手动补上 `data-windows-titlebar`（`html` 与 `body` 都试），看是否复现用户现象；按 CSS 规则反推属性承载者 |
| `probe22.mjs` | 折叠开关多态截图与测量 |
| `probe23.mjs` | 诊断 rail（零宽）态下 `.cindy-nav-toggle` 为何 `elementFromPoint` 命中不到自己（先补 `data-windows-titlebar` 复现真实 Windows 标题栏环境） |
| `probe24.mjs` | 复现真实 Windows 标题栏环境（实机带原生菜单栏）后测开关与 rail 浮动入口 |
| `probe25.mjs` | 复现宿主 preload 的标题栏变量：缺 `height` 时宿主 `fixed` 定位的 `top` 会退化成 static position，右侧元素「跑到视口外」是**假故障** |
| `probe26.mjs` | 找出带内联 style 且含指定变量的元素 |
| `probe27.mjs` | 参照组：关掉本插件后，用坐标强点一次（绕开可操作性检查），验证能否恢复 |
| `probe28.mjs` | 收起侧栏后观察左上角 |
| `probe29.mjs` | 收起 / 恢复后的带高测量 |

编号不是连续的（`probe9` 缺失）：这是一条真实的排查时间线，脚本顺序即当时的提问顺序。

---

## token 快照数据

从 DSH 的样式产物里导出的 token 清单，用于比对「覆盖了哪些、还剩哪些」：

| 文件 | 内容 |
|---|---|
| `dsw-tokens.tsv` | `selector / name / value` 三列全量导出 |
| `dsw-palette-full.txt` | 每个 `--dsw-*` 在浅色 / 深色下的取值 |
| `dsw-palette-alias.txt` | 只含 alias 层（深色取值） |
| `theme/dsw-token-names.txt` | 全部 token 名（一行一个） |
| `theme/dsw-token-groups.txt` | 按前缀分组并计数 |
| `theme/dsw-token-inspect-list.tsv` | DSH 内置 token 检查面板暴露的 14 个核心 token：名称 / 描述 / 类型 |

---

## 不入库的内容

探针产出的截图（`*.png`）与结构化输出（`p*.json`）体积大、且只在当次排查里有意义，已由仓库根目录的 `.gitignore` 排除。

## 版权

本目录**不含** DSH Desktop 的源码副本。`asar.py` / `scan_main.py` / `verify-host.mjs` / `pw/*.mjs` 都是为本次移植自写的工具；`theme/` 与 `dsw-*` 数据文件是从运行时样式与 DOM 里读取出的 **token 名称与取值**（数据，非源码）。
