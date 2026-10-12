# dsh-cindy-skin

把 [Cindy](https://github.com/makecindy/cindy) 的视觉体系套到 **DSH Desktop** 上的客户端插件。

不改 `app.asar`、不改 DSH 安装目录、不写 profile 的 `cordis.patch.yml`；
全部通过官方扩展点 `ctx.theme`（`@deepseek-ai/dsh-client-ui-theme` 提供的 `theme` 服务）覆盖设计 token。

---

## 覆盖范围

做到的是**数值层**：颜色、字体、圆角数值、阴影、动效档位，外加把 `--dsw-elevation-*` 收敛成单层描边。
Cindy 的「形状层」（pill-first 按钮、卡片轮廓）与三栏布局**不在 token 驱动范围内**，未做——详见文末「已知限制」。

### 覆盖内容

| 类别 | 做法 |
|---|---|
| 颜色 | Cindy 暖象牙（浅）／中性近黑（深）两套色板 → 表面 / 边框四档 / 文字阶梯 / 按钮 / 交互态 / 语义 / 代码块与 diff / 侧栏导航 / tooltip，共 60+ 个 `--dsw-*` token |
| 字体 | `--dsw-font-family` → `Inter, …`；Inter 四个字重（400/500/600/700）以 base64 内联进 `client.js`，自包含、零外部请求。中文继续走原 CJK 回退栈（PingFang SC / 微软雅黑） |
| 圆角 | `--dsw-radius-xs/sm/md/lg/xl/panel` → 4 / 8 / 12 / 12 / 12 / 12 px（Cindy 的容器档一律 12px） |
| 阴影 | `--dsw-shadow-lv1/lv2/lv3` → `none`；`--dsw-elevation-panel/prominent/soft` 用注入 CSS 收敛为单层描边（Cindy 是「零阴影」哲学：靠 1px 边框分层） |
| 动效 | `--ds-transition-duration` 三档 → 200 / 150 / 250 ms |
| 焦点环 | `--dsw-focus-ring-color` → `#417CDD` |
| 侧栏 | 注入 `<style>`：液态玻璃背景（`backdrop-filter` + 1px 描边分层）、导航组折叠开关（`.cindy-nav-toggle`，折叠态 `.cindy-nav-collapsed`）、底部区块紧凑化、宿主收起时的 rail 态（`.cindy-rail`）适配 |

色值权威来自（只读引用，未修改参考仓）：

- `_ref_cindy/apps/desktop/src/renderer/themes/builtin/cindy-light.ts` → `GENERATED_OVERRIDES`
- `_ref_cindy/apps/desktop/src/renderer/themes/builtin/cindy-dark.ts` → `GENERATED_OVERRIDES`
- `_ref_cindy/docs/design-rules/DESIGN.md`（§2 颜色 / §3 排版 / §5 圆角 / §6 深度）

### 为什么分两条通道

1. **`ctx.theme.overrideTokens()`** —— 官方通道。ui-layout 的 `ThemePresenter` 会把 token 写成 `<body>` 的 inline style，优先级最高，能压掉 `:root{}` 与 `body{}` 的同名声明。
2. **注入 `<style>`** —— 只用于 `--dsw-elevation-*`。这四个变量声明在 `body, body *{}` 规则上，每个后代元素都有**自己的**声明，body 的 inline 值传不下去（直接声明胜过继承），必须用特异性更高的选择器（`html body, html body *`）覆盖。

---

## 目录结构

```
dsh-cindy-skin/
├── package.json              # 插件清单：dsh.bundle.patch + dsh.client
├── cordis.patch.yml          # bundle patch：只 insert 本插件自身
├── lib/index.js              # host 侧入口（有意为空，皮肤全在客户端）
├── client.js                 # ★ 构建产物（勿手改）
├── src/skin.js               # ★ 插件源：色板 + token 映射 + 装载逻辑
├── src/build.py              # 把 Inter 内联进 src/skin.js → client.js
├── fonts/                    # Inter latin 子集 woff2（400/500/600/700）
└── LICENSE-Inter.txt         # Inter 的 SIL OFL 1.1 许可
```

**改数值请改 `src/skin.js`，然后跑 `python src/build.py` 重新生成 `client.js`。**

---

## 安装

DSH Desktop 读取的是 **web profile**，本机路径：
`C:\Users\LHT\AppData\Roaming\dsh-desktop\harness\profiles\web\package.json`（清单 `name` 为 `dsh-profile-web`）。

需要两处登记：

```jsonc
"dependencies": {
  "dsh-cindy-skin": "file:C:/Users/LHT/.dsh/plugins/dsh-cindy-skin"
},
"dsh": { "profile": { "bundles": [ /* … */ "dsh-cindy-skin" ] } }
```

`dependencies` 里的 `file:` 指向插件源目录，改源码后重启即生效；换成 `github:nothing688/dsh-cindy-skin` 则是远端安装。

### 生效

**重启 DSH Desktop。** 插件在启动时装载，运行中改 `bundles` 不会热更。

---

## 卸载

1. 从 profile `package.json` 的 `bundles` 数组删掉 `"dsh-cindy-skin"`，并从 `dependencies` 删掉对应行；
2. 删掉 profile 的 `node_modules\dsh-cindy-skin`；
3. 重启 DSH Desktop。

改动 profile 前先备份它的 `package.json`，出问题按上面三步撤销即可。

---

## 已知限制

- **形状层未做**：Cindy 的 pill 按钮、卡片轮廓、紧凑密度不是 token 驱动的；要做到需要第二段 CSS 覆写（`.module.css` 类名是构建期哈希 `_<hash>_<name>`，跨版本会变，需改用稳定的 `data-*` 属性或 CSS 变量）。
- **三栏布局未动**：DSH 的 sidebar / 聊天 / 右栏结构保持原样。
- **品牌字标保留 DSH 的 Montserrat**：`--dsw-font-family-brand` 未覆盖；Cindy 的字标是定制图形而非字体，无法用字体替换达成。
- **底层色阶 `--dsw-static-*` 未覆盖**：alias 层全部指过去，覆盖 alias 已足够；留 static 给未覆盖的少数消费点兜底。
- **遮罩 `--dsw-alias-bg-mask-*` 保持纯黑**：Cindy 也如此。
- **中文不换字体**：Inter 的 CJK 子集体积过大，改为保留系统 CJK 栈，与 Cindy 自身做法一致。

## 许可

插件代码 MIT。`fonts/` 内的 Inter 字体为 SIL Open Font License 1.1，全文见 `LICENSE-Inter.txt`。
