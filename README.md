# dsh-cindy-skin

把 [Cindy](https://github.com/makecindy/cindy) 的视觉体系套到 **DSH Desktop**（DeepSeek Harness）上的客户端插件，外加一份完整的移植调研。

> **English TL;DR** — A client plugin that ports Cindy's design language onto DSH Desktop, plus the research behind it. It only uses the official `ctx.theme` extension point: no `app.asar` patching, no edits to the DSH installation, no writes to your profile's `cordis.patch.yml`.

不改 `app.asar`、不改 DSH 安装目录、不写用户 profile 的 `cordis.patch.yml`。卸载即恢复原样。

---

## 效果

| 维度 | 覆盖 |
|---|---|
| **颜色** | Cindy 暖象牙（浅）／中性近黑（深）两套色板 → 表面、边框四档、文字阶梯、按钮、交互态、语义色、代码块与 diff、侧栏导航、tooltip，共 60+ 个 `--dsw-*` token |
| **字体** | `--dsw-font-family` → `Inter, …`；Inter 四个字重（400/500/600/700，latin 子集）以 base64 内联进 `client.js`，自包含、零外部请求。中文继续走原 CJK 回退栈 |
| **圆角** | 4 / 8 / 12 / 12 / 12 / 12 px —— Cindy 的容器档一律 12px |
| **阴影** | 全部收敛为 `none` / 单层描边（Cindy 是「零阴影」哲学，靠 1px 边框分层） |
| **动效** | `--ds-transition-duration` 三档 → 200 / 150 / 250 ms |
| **焦点环** | `#417CDD` |
| **侧栏** | 液态玻璃背景（`backdrop-filter` + 描边分层）；导航组折叠开关 `⊕`／`⊖`；底部区块（今日用量／记忆／设置）紧凑化，让出的高度还给会话列表；宿主收起侧栏时的 rail 态适配 |

## 安装

插件按 DSH 的 profile 机制装载。在你的 profile `package.json` 里登记两处：

```jsonc
{
  "dependencies": {
    "dsh-cindy-skin": "file:/绝对路径/to/dsh-cindy-skin"
  },
  "dsh": {
    "profile": {
      "bundles": [ /* … 其它插件 … */ "dsh-cindy-skin" ]
    }
  }
}
```

也可以直接从 GitHub 装：

```jsonc
"dsh-cindy-skin": "github:nothing688/dsh-cindy-skin"
```

**生效需要重启 DSH Desktop**：插件在启动时装载，运行中修改 `bundles` 不会热更。

### 卸载

1. 从 profile `package.json` 的 `bundles` 数组删掉 `"dsh-cindy-skin"`，并从 `dependencies` 删掉对应行；
2. 删掉 profile 的 `node_modules/dsh-cindy-skin`；
3. 重启 DSH Desktop。

## 开发

```bash
python src/build.py     # 把 fonts/ 里的 Inter 内联进 src/skin.js → client.js
```

- **改数值请改 `src/skin.js`，然后跑 build。** `client.js` 是构建产物，不要手改。
- 构建只需要 Python 3 标准库，无第三方依赖。
- 若把插件目录链接进 profile 的 `node_modules`，改源 + build 后按 `Ctrl+R` 刷新页面即可看到效果，无需重启宿主进程。

## 仓库结构

```
.
├── package.json              # 插件清单：dsh.bundle.patch + dsh.client
├── cordis.patch.yml          # bundle patch：只 insert 本插件自身
├── lib/index.js              # host 侧入口（有意为空，皮肤全在客户端）
├── client.js                 # ★ 构建产物（勿手改）
├── src/skin.js               # ★ 插件源：色板 + token 映射 + 装载逻辑
├── src/build.py              # 把 Inter 内联进 src/skin.js → client.js
├── fonts/                    # Inter latin 子集 woff2（400/500/600/700）
├── LICENSE-Inter.txt         # Inter 的 SIL OFL 1.1 许可
├── docs/
│   ├── cindy-design-research.md      # Cindy 前端设计体系调研（13 章）
│   ├── cindy-color-audit-appendix.md # 颜色普查附录
│   ├── dsh-skin-feasibility.md       # DSH 皮肤化可行性分析
│   └── plugin-architecture.md        # 本插件的实现说明
└── probe/                    # 只读侦查与验证工具（见 probe/README.md）
```

## 文档

- **[Cindy 前端设计体系调研](docs/cindy-design-research.md)** —— 对 `makecindy/cindy` 的只读调研：设计哲学、字体、主题三层 token、版块设计、圆角决策树、治理合同与冻结测试。§13 是逐条带 `路径:行号` 的实现层核对。
- **[DSH 皮肤化可行性分析](docs/dsh-skin-feasibility.md)** —— 插件载体机制、官方主题扩展点 `ctx.theme` 的能力边界、token 层与形状层的风险划分。
- **[颜色普查附录](docs/cindy-color-audit-appendix.md)** —— 色值清单。
- **[插件实现说明](docs/plugin-architecture.md)** —— 双通道覆盖（`overrideTokens` + `<style>` 注入）的原因与实现细节。

## 已知限制

- **形状层未做**：Cindy 的 pill 按钮、卡片轮廓、紧凑密度不是 token 驱动的；要做到需要第二段 CSS 覆写，而 DSH 的 `.module.css` 类名是构建期哈希 `_<hash>_<name>`，跨版本会变，维护成本高。
- **三栏结构未动**：sidebar／聊天／右栏的整体结构保持 DSH 原样。已做的侧栏改动限于背景、间距与导航折叠开关；宿主自带的「收起 / 打开侧边栏」按钮不碰。
- **品牌字标保留 DSH 原有的 Montserrat**：Cindy 的字标是定制图形而非字体，无法用字体替换达成。
- **底层色阶 `--dsw-static-*` 未覆盖**：alias 层已全部指过去；留 static 给未覆盖的少数消费点兜底。
- **中文不换字体**：Inter 的 CJK 子集体积过大，保留系统 CJK 栈，与 Cindy 自身做法一致。
- **版本耦合**：token 名与 DOM 结构跟随 DSH Desktop 版本，`package.json` 里的 `dshTarget` 记录开发时的目标版本。

## 许可

- 插件代码：**MIT**（见 [LICENSE](LICENSE)）。
- `fonts/` 内的 Inter 字体：**SIL Open Font License 1.1**，全文见 [LICENSE-Inter.txt](LICENSE-Inter.txt)。
- 调研文档中引用/改述的 Cindy 项目内容，其著作权归 `makecindy/cindy`（Apache-2.0）所有；本仓库只做**只读**引用，未修改参考仓任何文件。文档中出现的 DSH Desktop 内部路径与行号为调研时点的实测记录，仅供参考。
