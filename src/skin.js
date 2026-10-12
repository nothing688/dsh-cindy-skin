/*
 * dsh-cindy-skin — 把 Cindy（makecindy/cindy）的视觉体系套到 DSH Desktop 上。
 *
 * 本文件是**源文件**：由同目录 src/build.py 把 Inter 字体内联进 __INTER_FONT_FACE__
 * 占位符后，输出到插件根目录的 client.js。不要直接改 client.js。
 *
 * 数值权威（只读参考，未修改）：
 *   _ref_cindy/apps/desktop/src/renderer/themes/builtin/cindy-light.ts  → GENERATED_OVERRIDES
 *   _ref_cindy/apps/desktop/src/renderer/themes/builtin/cindy-dark.ts   → GENERATED_OVERRIDES
 *   _ref_cindy/apps/desktop/src/shared/windowBackdrop.ts:6-9            → 侧栏玻璃
 *
 * 覆盖通道（两段，缺一不可）：
 *   ① ctx.theme.overrideTokens() → ui-layout 的 ThemePresenter 把 token 写成 <body> 的
 *      inline style（ThemePresenter.apply，见 _dsh_probe/theme/layout-client.js:532-548）。
 *      inline 优先级最高，可压掉 :root{} 与 body{} 中的同名声明。
 *   ② <style> 注入 → 仅用于 --dsw-elevation-* 一族：它们声明在 `body, body *` 规则里，
 *      每个后代元素都有自己的声明，body 的 inline 值传不下去（直接声明的规则胜过继承），
 *      必须用特异性更高的选择器（html body …）覆盖。
 *
 * 本阶段（M1）只做 token 层：颜色 / 字体 / 圆角数值 / 阴影 / 动效 / 焦点环。
 * 不做形状层（pill 按钮、卡片轮廓）与布局层——它们不是 token 驱动的。
 */
window.__ModuleLoader__.load({
  id: "dsh-cindy-skin",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;

    const PLUGIN_ID = "dsh-cindy-skin";

    /** 只要 theme 服务：token 覆盖与字体注入都不需要 slots / locale。 */
    const inject = ["theme"];

    /* ────────────────────────────────────────────────────────────────
     * 1. 字体：Inter（latin 子集，SIL OFL）内联为 base64，自包含、零外部请求。
     *    中文不在此子集内，继续走 --dsw-font-family 里的 CJK 回退栈
     *    （PingFang SC / 微软雅黑），与 Cindy 自身的做法一致。
     * ──────────────────────────────────────────────────────────────── */
    const INTER_FONT_FACE = "__INTER_FONT_FACE__";

    /** Cindy DESIGN.md §3 的字体族，后段保留 DSH 原有的 CJK 回退。 */
    const CINDY_FONT_STACK =
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", ' +
      '"Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif';

    /* ────────────────────────────────────────────────────────────────
     * 2. 阴影：Cindy 是「零阴影」哲学（DESIGN.md §6：靠 1px Board 边框分层，不靠投影）。
     *    DSH 的 --dsw-elevation-* 声明在 `body, body *` 上，必须用更高特异性覆盖。
     *    --dsw-shadow-lv1/2/3 声明在 body{} 上，走 token 通道即可。
     * ──────────────────────────────────────────────────────────────── */
    const SHADOW_CSS = [
      "html body, html body * {",
      "  --dsw-elevation-panel: var(--dsw-elevation-stroke);",
      "  --dsw-elevation-prominent: var(--dsw-elevation-stroke);",
      "  --dsw-elevation-soft: var(--dsw-elevation-stroke);",
      "}",
    ].join("\n");

    /* ────────────────────────────────────────────────────────────────
     * 3. Cindy 色板。每条给出 { light, dark }，值取自 cindy-light/dark.ts。
     * ──────────────────────────────────────────────────────────────── */
    const CINDY = {
      // 表面：页底 / 卡片 / 次级卡 / chip·hover / 柔和 hover
      page: { light: "#F2F2ED", dark: "#181818" },
      card: { light: "#FDFDF8", dark: "#1F1F1F" },
      cardSoft: { light: "#FAFAF5", dark: "#1D1D1D" },
      chip: { light: "#EEEEE9", dark: "#1D1D1D" },
      hoverSoft: { light: "#F0F0EB", dark: "#191919" },
      // 纯白浮动面（Cindy 只允许 ask-option-list 一类用纯白）；dark 侧用菜单档
      floating: { light: "#FFFFFF", dark: "#282828" },
      // 侧栏（Cindy 侧栏是独立平面、比页底深一档）
      sidebar: { light: "#EEEEE9", dark: "#141414" },
      // 菜单（DSH 的 specific-menu 带 alpha 的玻璃底，保留其半透明特性）
      menu: { light: "#FDFDF8F0", dark: "#282828F0" },
      // 边框：Cindy 只有一个实色 border-default，这里按 DSH 的四档层级摊成暖/中性阶梯
      borderSoft: { light: "#ECECE7", dark: "#2A2A2A" },
      border: { light: "#E4E4DF", dark: "#313131" },
      borderMid: { light: "#DCDCD7", dark: "#383838" },
      borderStrong: { light: "#D4D4CF", dark: "#404040" },
      // 文字阶梯：primary（正文）> tertiary（中）> secondary（最弱）
      textPrimary: { light: "#1A1A1A", dark: "#D4D4D4" },
      textEmphasis: { light: "#0C0C0C", dark: "#FFFFFF" },
      textMid: { light: "#6B6B67", dark: "#C1C1C1" },
      textWeak: { light: "#888883", dark: "#6F6F6F" },
      // CTA：Cindy 明确用中性反色，不用品牌红（DESIGN.md §3 / cindy-light.ts:51-56）
      cta: { light: "#3C3F43", dark: "#EEEEEE" },
      ctaHover: { light: "#2E3237", dark: "#E2E2E2" },
      ctaFg: { light: "#FCFCFC", dark: "#151515" },
      // 语义 / 强调
      focus: { light: "#417CDD", dark: "#417CDD" },
      link: { light: "#2563EB", dark: "#60A5FA" },
      success: { light: "#177C3C", dark: "#2AAE5B" },
      warning: { light: "#EA6B17", dark: "#EA6B17" },
      danger: { light: "#DC2626", dark: "#F87171" },
      // 浮层
      tooltip: { light: "#262626", dark: "#1F1F1E" },
      // 代码块底（Cindy: surface-hover-soft 档）
      codeBlock: { light: "#F0F0EB", dark: "#191919" },
      // 用户气泡（Cindy msg-user-bg = surface-elevated）
      bubble: { light: "#FDFDF8", dark: "#1F1F1F" },
      // diff 整行底色
      diffAdd: { light: "#F0FFF4", dark: "#033A16" },
      diffDel: { light: "#FFEEF0", dark: "#67060C" },
      // 侧栏导航态
      navActive: { light: "#E4E4DF", dark: "#1D1D1D" },
      // 内联代码 / 引用 chip：Cindy 的 chip 只比页底深一档，不出现"白底块"
      inlineCode: { light: "#EAEAE4", dark: "#262626" },
      // 滚动条（DSH 默认偏冷灰，这里换暖）
      scrollBg: { light: "#E5E5E0", dark: "#3C3C3C" },
      scrollHover: { light: "#D4D4CF", dark: "#545450" },
      // 反色面（toast / 反白元素）
      inverse: { light: "#35363A", dark: "#43454A" },
      inverseFg: { light: "#FCFCFC", dark: "#FCFCFC" },
      switchThumb: { light: "#FFFFFF", dark: "#ADB2B8" },
      // 禁用文字
      disabled: { light: "#9D9D98", dark: "#6F6F6F" },
      // 圆角（Cindy 授权档位：0 / 2 / 4 / 8 / 12 / 9999；容器一律 12px）
      radiusXs: { light: "4px", dark: "4px" },
      radiusSm: { light: "8px", dark: "8px" },
      radiusMd: { light: "12px", dark: "12px" },
      radiusLg: { light: "12px", dark: "12px" },
      radiusXl: { light: "12px", dark: "12px" },
      radiusPanel: { light: "12px", dark: "12px" },
      // 零阴影
      noShadow: { light: "none", dark: "none" },
      // 动效（Cindy: instant 80 / fast 150 / base 200 / enter 250 / exit 150）
      motionFast: { light: "150ms", dark: "150ms" },
      motionBase: { light: "200ms", dark: "200ms" },
      motionSlow: { light: "250ms", dark: "250ms" },
    };

    /* ────────────────────────────────────────────────────────────────
     * 4. token 映射：DSH 变量名 → Cindy 值。键是**完整 CSS 变量名**
     *    （ThemeRuntime 的 name 与 cssVariable 同名，见 theme-client.js:1236-1240）。
     *    刻意未覆盖的：--dsw-static-*（底层色阶，被 alias 引用）、
     *    --dsw-alias-bg-mask-*（遮罩纯黑）、--dsw-alias-label-dimmed（Cindy 无对应）、
     *    滚动条、--dsw-alias-brand-text（品牌字标）。
     * ──────────────────────────────────────────────────────────────── */
    const TOKENS = {
      // ── 表面 ──
      "--dsw-alias-bg-base": CINDY.page,
      "--dsw-alias-bg-document-preview": CINDY.page,
      "--dsw-alias-bg-layer-1": CINDY.card,
      "--dsw-alias-bg-layer-2": CINDY.card,
      "--dsw-alias-bg-layer-3": CINDY.cardSoft,
      "--dsw-alias-bg-module-platform": CINDY.chip,
      "--dsw-alias-bg-overlay": CINDY.chip,
      "--dsw-alias-bg-multi-select": CINDY.chip,
      "--dsw-alias-bg-skeleton": CINDY.chip,
      "--dsw-alias-settings-card-fill": CINDY.card,
      "--dsw-specific-sidebar-fill": CINDY.sidebar,
      "--dsw-specific-menu": CINDY.menu,
      "--dsw-specific-selector": CINDY.chip,
      "--dsw-specific-tip": CINDY.chip,
      "--dsw-specific-bubble": CINDY.bubble,

      // ── 边框（Cindy 暖色单档 → DSH 四档摊开） ──
      "--dsw-alias-border-l1": CINDY.borderSoft,
      "--dsw-alias-border-l2": CINDY.border,
      "--dsw-alias-border-l2-darkmode-thin": CINDY.borderSoft,
      "--dsw-alias-border-l3": CINDY.borderMid,
      "--dsw-alias-border-l4": CINDY.borderStrong,
      "--dsw-alias-settings-card-stroke": CINDY.border,
      "--dsw-elevation-stroke-color": CINDY.borderStrong,

      // ── 文字 ──
      "--dsw-alias-label-primary": CINDY.textPrimary,
      "--dsw-alias-label-primary-bluish": CINDY.textPrimary,
      "--dsw-alias-label-primary-dimmed": CINDY.textMid,
      "--dsw-alias-label-secondary": CINDY.textMid,
      "--dsw-alias-label-tertiary": CINDY.textWeak,
      "--dsw-alias-label-caption": CINDY.textWeak,
      "--dsw-alias-menu-icon": CINDY.textMid,
      "--dsw-alias-label-primary-foreground": CINDY.ctaFg,
      "--dsw-alias-label-primary-inverted": CINDY.ctaFg,

      // ── 按钮 / 品牌 ──
      "--dsw-alias-brand-primary": CINDY.cta,
      "--dsw-alias-button-primary-fill": CINDY.cta,
      "--dsw-alias-button-primary-hover": CINDY.ctaHover,
      "--dsw-alias-button-contrast-fill": CINDY.cta,
      "--dsw-alias-button-elevated-fill": CINDY.card,
      "--dsw-alias-button-floating-fill": CINDY.card,
      "--dsw-alias-button-floating-hover": CINDY.chip,
      "--dsw-alias-button-tool-bar-fill": CINDY.card,
      "--dsw-alias-button-tool-bar-hover": CINDY.chip,
      "--dsw-alias-button-ghost-active-fill": CINDY.chip,
      "--dsw-alias-button-ghost-active-hover": CINDY.hoverSoft,
      "--dsw-alias-button-ghost-active-border": CINDY.border,

      // ── 交互态 ──
      "--dsw-alias-interactive-bg-hover": CINDY.chip,
      "--dsw-alias-interactive-bg-active": CINDY.hoverSoft,

      // ── 语义 / 强调 ──
      "--dsw-alias-link": CINDY.link,
      "--dsw-alias-state-business-primary": CINDY.focus,
      "--dsw-alias-state-success-primary": CINDY.success,
      "--dsw-alias-state-warn-primary": CINDY.warning,
      "--dsw-alias-state-error-primary": CINDY.danger,
      "--dsw-focus-ring-color": CINDY.focus,

      // ── 代码块 / 内联代码 / 引用 chip ──
      // DSH 默认把内联代码画成 #fafafa 底 + 1px 边，在暖象牙页底上就是用户看到的
      //「白色边框」；Cindy 的 chip 只比页底深一档，所以这里统一压到暖灰。
      "--dsw-alias-markdown-code-block": CINDY.codeBlock,
      "--dsw-alias-markdown-inline-code": CINDY.inlineCode,
      "--dsw-alias-markdown-citation": CINDY.inlineCode,
      "--dsw-alias-markdown-code-block-banner": CINDY.cardSoft,
      "--dsw-alias-markdown-code-segment-selected": CINDY.card,
      "--dsw-alias-markdown-code-segment-unselected": CINDY.codeBlock,
      "--dsw-alias-markdown-placeholder": CINDY.codeBlock,
      "--dsw-alias-markdown-tag": CINDY.chip,
      "--dsw-alias-file-diff-added-bg": CINDY.diffAdd,
      "--dsw-alias-file-diff-deleted-bg": CINDY.diffDel,

      // ── 滚动条 / 反色面 / 杂项 ──
      "--dsw-alias-scrollbar-bg-l1": CINDY.scrollBg,
      "--dsw-alias-scrollbar-bg-l2": CINDY.scrollBg,
      "--dsw-alias-scrollbar-hover-l1": CINDY.scrollHover,
      "--dsw-alias-scrollbar-hover-l2": CINDY.scrollHover,
      "--dsw-alias-toast-bg": CINDY.inverse,
      "--dsw-alias-toast-label": CINDY.inverseFg,
      "--dsw-alias-switch-thumb": CINDY.switchThumb,
      "--dsw-alias-interactive-bg-hover-solid": CINDY.chip,
      "--dsw-alias-menu-group-header-fill": CINDY.menu,
      "--dsw-alias-label-dimmed": CINDY.borderMid,
      "--dsw-alias-label-document-preview": CINDY.textMid,
      "--dsw-alias-button-primary-dimmed": CINDY.chip,
      // 发送键/主 CTA 的蓝色来自这个 DSH 内建新色；Cindy 的 CTA 是中性反色
      "--dsw-alias-brand-primary-new-colorprimary-new-color": CINDY.cta,

      // ── 侧栏导航 ──
      "--dsw-specific-sidebar-nav-item-active": CINDY.navActive,
      "--dsw-specific-sidebar-nav-item-active-accent": CINDY.chip,
      "--dsw-specific-sidebar-nav-item-hover": CINDY.chip,

      // ── 浮层 ──
      "--dsw-alias-tooltip-bg": CINDY.tooltip,

      // ── 字体 ──
      "--dsw-font-family": { light: CINDY_FONT_STACK, dark: CINDY_FONT_STACK },

      // ── 圆角数值（Cindy 授权档位；形状层是否 pill 是另一件事） ──
      "--dsw-radius-xs": CINDY.radiusXs,
      "--dsw-radius-sm": CINDY.radiusSm,
      "--dsw-radius-md": CINDY.radiusMd,
      "--dsw-radius-lg": CINDY.radiusLg,
      "--dsw-radius-xl": CINDY.radiusXl,
      "--dsw-radius-panel": CINDY.radiusPanel,

      // ── 零阴影 ──
      "--dsw-shadow-lv1": CINDY.noShadow,
      "--dsw-shadow-lv1-blur": CINDY.noShadow,
      "--dsw-shadow-lv2": CINDY.noShadow,
      "--dsw-shadow-lv3": CINDY.noShadow,

      // ── 动效档位 ──
      "--ds-transition-duration-fast": CINDY.motionFast,
      "--ds-transition-duration": CINDY.motionBase,
      "--ds-transition-duration-slow": CINDY.motionSlow,
    };

    /* 侧栏「液态玻璃」。
     * 诊断（playwright 实测）：上一版已经把侧栏做成 rgba(238,238,233,.88) +
     * backdrop-filter: blur(24px)，属性全部生效，但**看不出玻璃感**——
     * 因为侧栏底下只有一层纯色 body 背景（bodyBgImage: none），
     * 磨砂再强也只能把同一个纯色再磨一遍。macOS 上之所以好看，是它在透桌面壁纸。
     *
     * 所以这里补上缺的那半：在 body 上铺一层极淡的暖/冷色光斑当「环境光层」。
     * 内容区本身不透明会盖住绝大部分，只有半透明的侧栏能把它们磨砂透出来，
     * 于是得到与 vibrancy 同类的观感，且完全不依赖宿主窗口是否支持 acrylic。 */
    const GLASS_CSS = [
      "html body {",
      "  background-image:",
      "    radial-gradient(38% 40% at 0% 0%, rgba(255, 198, 150, 0.95), transparent 72%),",
      "    radial-gradient(34% 36% at -2% 50%, rgba(158, 186, 255, 0.85), transparent 74%),",
      "    radial-gradient(32% 32% at 2% 100%, rgba(255, 172, 192, 0.80), transparent 72%) !important;",
      "  background-attachment: fixed !important;",
      "}",
      "html body[data-ds-dark-theme] {",
      "  background-image:",
      "    radial-gradient(38% 40% at 0% 0%, rgba(255, 150, 90, 0.34), transparent 72%),",
      "    radial-gradient(34% 36% at -2% 50%, rgba(92, 128, 255, 0.32), transparent 74%),",
      "    radial-gradient(32% 32% at 2% 100%, rgba(255, 112, 152, 0.28), transparent 72%) !important;",
      "}",
      /* 关键：这两条不透明「夹心」让上一版玻璃层完全白做。
       * probe（elementsFromPoint 祖先链）实测：
       *   … → hHd-Xa_root hHd-Xa_quietBars  bg rgb(238,238,233) 不透明  ← 侧栏内层实底，盖住玻璃层
       *       → pI_x6G_sidebarCol            bg …/0.62 + 本插件玻璃层
       *       → pI_x6G_frame                 bg rgb(242,242,237) 不透明  ← 框架层实底，挡住 body 光斑
       *       → BODY(光斑) → HTML
       * 侧栏内层不自铺底、框架层让位后，玻璃层才是侧栏唯一实底，body 光斑也才上得来。 */
      "html body [class*='_frame'] { background-color: transparent !important; }",
      "html body [class*='_sidebarCol'] [class*='_root'] { background-color: transparent !important; }",
      /* ★backdrop-filter 会为后代里的 position:fixed 元素创建**包含块**。
       * 宿主「收起 / 打开侧边栏」按钮在 Windows 标题栏模式下正是
       * `position: fixed; left: 12px; top: calc((var(--dsh-windows-titlebar-height) - 28px) / 2)`，
       * 一旦侧栏列本身带 backdrop-filter，它的包含块就从视口变成侧栏列 —— 实测被整体
       * 下移 40px（rect y 6 → 46，因为 _frame 有 padding-top:40px），落进内容区标题行下方
       * 被盖住，收起后点不到（probe25 带此属性 vs probe27 去掉插件样式的对照）。
       * 故磨砂改挂到列的 ::before 伪元素：伪元素不是任何元素的祖先、不充当包含块；
       * 列加 isolation:isolate 使其成为层叠上下文，好让 z-index:-1 的磨砂留在列内
       * 且恰好压在本列背景之上、内容文字之下（文字不会被 backdrop-filter 糊掉）。 */
      "html body [class*='_sidebarCol'] {",
      "  position: relative;",
      "  isolation: isolate;",
      "  background-color: color-mix(in srgb, var(--dsw-specific-sidebar-fill) 62%, transparent) !important;",
      "  background-image: linear-gradient(175deg, color-mix(in srgb, #FFFFFF 16%, transparent), transparent 40%, color-mix(in srgb, #FFFFFF 8%, transparent)) !important;",
      "  box-shadow: inset 0 1px 0 color-mix(in srgb, #FFFFFF 30%, transparent), inset -1px 0 0 color-mix(in srgb, #FFFFFF 22%, transparent);",
      "}",
      "html body [class*='_sidebarCol']::before {",
      "  content: ''; position: absolute; inset: 0; z-index: -1; pointer-events: none;",
      "  backdrop-filter: blur(42px) saturate(200%);",
      "  -webkit-backdrop-filter: blur(42px) saturate(200%);",
      "}",
      "html body[data-ds-dark-theme] [class*='_sidebarCol'] {",
      "  background-image: linear-gradient(175deg, color-mix(in srgb, #FFFFFF 8%, transparent), transparent 40%, color-mix(in srgb, #FFFFFF 4%, transparent)) !important;",
      "  box-shadow: inset 0 1px 0 color-mix(in srgb, #FFFFFF 12%, transparent), inset -1px 0 0 color-mix(in srgb, #FFFFFF 8%, transparent);",
      "}",
      /* 收起/展开导航区的开关：淡显但必须可辨识（0.42 会让按钮看起来像被遮挡的残留），
       * 指到侧栏或聚焦时全亮。展开态与宿主「收起侧边栏」按钮并排，间距靠 logoRow gap。 */
      ".cindy-nav-toggle { opacity: .72; }",
      "[class*='_sidebarCol']:hover .cindy-nav-toggle,",
      ".cindy-nav-toggle:focus-visible { opacity: 1; }",
    ].join("\n");

    /* 侧栏空间优化（M2-B）。
     * B｜紧凑化：导航行 36→30、新会话 38→34、logo 行 60→52，
     *   省下的高度全给中部工作区/会话列表（实测 335px → 371px）。
     * A｜折叠：收起「工作台」切换条与「插件/SSH/IG5」面板列表，
     *   折叠后中部列表实测 335px → 515px。
     * 两条都是纯 CSS；开关是注入到 logo 行的小按钮，状态存 localStorage，
     * React 重渲染把按钮带走时由 MutationObserver 重挂。 */
    const NAV_COLLAPSED_KEY = "dsh-cindy-skin:nav-collapsed";

    const NAV_TOGGLE_SVG = [
      '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"',
      ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">',
      '<path d="M4 6.2 8 2.4l4 3.8"/>',
      '<path d="M4 9.8 8 13.6l4-3.8"/>',
      "</svg>",
    ].join("");

    const SIDEBAR_SPACE_CSS = [
      /* B｜紧凑化。★Windows 标题栏模式下不覆盖 logo 行高度：宿主自带
         `[data-windows-titlebar] .hHd-Xa_logoRow { height: 40px; margin: 0; padding: 0 }`，
         保持宿主原生几何，才不会有任何因素连带影响宿主按钮的定位。 */
      "html:not([data-windows-titlebar]) [class*='_sidebarCol'] [class*='_logoRow'] { height: 52px !important; }",
      /* 新会话药丸：宿主默认 34px 高、横向铺满，占掉一整条视觉带。
         先试过压到 26px（用户 m01557），用户 m01599 判定观感不佳 → 改为整条隐藏，
         「工作台」行直接接排到 logo 行下方。
         ★只隐藏侧栏内这一条：Ctrl+Alt+N 快捷键与内容区的 ⊕ 入口不受影响。
         想恢复：删掉下面这一行即可。 */
      "html:not([data-cindy-rail]) [class*='_sidebarCol'] [class*='_newSession'] { display: none !important; }",
      "[class*='_sidebarCol'] [class*='_panelRow'] { height: 30px !important; min-height: 30px !important; }",
      "[class*='_sidebarCol'] [class*='dshWbSidebarSwitcher'] { height: 30px !important; min-height: 30px !important; }",
      "[class*='_sidebarCol'] [class*='dshWbWorkbenchHome'] { height: 30px !important; }",
      /* ★宿主「收起 / 打开侧边栏」按钮一律不碰（用户 m01459 明确要求：保持默认主题那种
         「按键固定在左上角、点击后不消失」，不要改动它的位置）。
         Windows 标题栏模式下宿主把它设为 `position: fixed; left: 12px; z-index: 30`，
         钉在窗口左上角，收起侧栏后依然在原处可见可点 —— 这就是要保留的恢复入口。
         故本插件**不再**覆盖它的 position / left / top / z-index，**不再**在收起态隐藏它，
         **不再**用 flex order 干预 logo 行内排布，**不再**自造 rail 浮标。 */
      /* A｜折叠导航组 */
      "html[data-cindy-nav-collapsed] [class*='_sidebarCol'] [class*='_panelList'] { display: none !important; }",
      "html[data-cindy-nav-collapsed] [class*='_sidebarCol'] [class*='dshWbSidebarSwitcher'] { display: none !important; }",
      /* 折叠开关按钮：尺寸与宿主「收起侧边栏」按钮一致，观感跟随主题 token。 */
      ".cindy-nav-toggle {",
      "  width: 28px; height: 28px; flex: 0 0 auto; display: inline-flex;",
      "  align-items: center; justify-content: center; margin-right: 2px; padding: 0;",
      "  border: 1px solid transparent; border-radius: 8px; cursor: pointer;",
      "  background: transparent; color: var(--dsw-alias-label-secondary, #6b6b67);",
      "  transition: background-color 150ms ease, color 150ms ease;",
      "}",
      ".cindy-nav-toggle:hover {",
      "  background: var(--dsw-alias-interactive-bg-hover, rgba(120, 120, 120, 0.12));",
      "  color: var(--dsw-alias-label-primary, #1a1a1a);",
      "}",
      ".cindy-nav-toggle:focus-visible {",
      "  outline: 2px solid var(--dsw-alias-focus-ring, #417cdd);",
      "  outline-offset: 1px;",
      "}",
      ".cindy-nav-toggle svg { width: 16px; height: 16px; display: block; }",
      "html[data-cindy-nav-collapsed] .cindy-nav-toggle svg { transform: rotate(180deg); }",
      /* C｜侧栏被宿主收起时（rail）：probe23 实测 _sidebarCol 宽度归零（Windows 标题栏
         模式下是 0，不是 56），本插件按钮留在宽 0 的子列里既看不见也点不到，故隐藏；
         恢复入口交回宿主原生那个钉在窗口左上角的按钮（不隐藏、不改位置）。 */
      "html[data-cindy-rail] .cindy-nav-toggle {",
      "  display: none !important;",
      "}",
      /* D｜底部区域压缩：footArea / settingsArea 的块间距与行高一起收一档
         （今日用量徽标行 38→28、设置行 42→30，去掉各自多余的 margin），
         省下的高度全部还给上方的会话列表。
         只改尺寸与间距，不动结构、不改 DOM 顺序。 */
      "[class*='_sidebarCol'] [class*='_footArea'] { padding-bottom: 0 !important; }",
      "[class*='_sidebarCol'] [class*='_footerActions'] { gap: 2px !important; }",
      "[class*='_sidebarCol'] [class*='UR1xtW_root'] { margin-top: 2px !important; }",
      "[class*='_sidebarCol'] [class*='UR1xtW_unified'] { height: 28px !important; min-height: 28px !important; padding: 2px 6px !important; }",
      "[class*='_sidebarCol'] [class*='_settingsArea'] { padding-bottom: 0 !important; }",
      "[class*='_sidebarCol'] [class*='VOzbGW_triggerRow'] { margin: 2px -2px 0 !important; }",
      "[class*='_sidebarCol'] [class*='VOzbGW_trigger'] { height: 30px !important; min-height: 30px !important; }",
    ].join("\n");

    /** 在侧栏 logo 行挂一个「折叠 / 展开导航区」按钮，并同步折叠态 class。 */
    function installNavToggle(ctx) {
      if (typeof document === "undefined") return;
      ctx.effect(() => {
        const root = document.documentElement;
        let collapsed = false;
        try {
          collapsed = localStorage.getItem(NAV_COLLAPSED_KEY) === "1";
        } catch (_) {
          /* localStorage 不可用时按展开处理 */
        }

        const sync = () => {
          if (collapsed) root.setAttribute("data-cindy-nav-collapsed", "1");
          else root.removeAttribute("data-cindy-nav-collapsed");
        };
        sync();

        /* rail 态判据：侧栏列宽 <100px 即宿主已收起。
           ★注意必须包含 **width === 0** 的情况：Windows 标题栏模式下宿主收起侧栏会把
           列宽压到 0（不是 56），若沿用 `width > 0 && width < 100` 则不判定为 rail 态，
           按钮会留在零宽容器里溢出、被内容区盖住 → 用户找不到恢复入口。
           尺寸变化 MutationObserver 抓不到，须用 ResizeObserver。 */
        let railObserver = null;
        let railCol = null;
        const ensureRailObserver = () => {
          const col = document.querySelector("[class*='_sidebarCol']");
          if (!col || col === railCol) return;
          if (railObserver) railObserver.disconnect();
          railCol = col;
          const syncRail = () => {
            const width = col.getBoundingClientRect().width;
            if (width < 100) root.setAttribute("data-cindy-rail", "1");
            else root.removeAttribute("data-cindy-rail");
          };
          syncRail();
          if (typeof ResizeObserver !== "undefined") {
            railObserver = new ResizeObserver(syncRail);
            railObserver.observe(col);
          }
        };

        const place = () => {
          ensureRailObserver();
          const row = document.querySelector("[class*='_sidebarCol'] [class*='_logoRow']");
          if (!row || row.querySelector(":scope > .cindy-nav-toggle")) return;
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "cindy-nav-toggle";
          btn.dataset.plugin = PLUGIN_ID;
          btn.setAttribute("aria-label", "折叠或展开导航区");
          btn.title = "折叠 / 展开导航区";
          btn.innerHTML = NAV_TOGGLE_SVG;
          btn.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            collapsed = !collapsed;
            try {
              localStorage.setItem(NAV_COLLAPSED_KEY, collapsed ? "1" : "0");
            } catch (_) {
              /* 存不下也不影响本次生效 */
            }
            sync();
          });
          /* 追加到 logo 行末尾即可：Windows 标题栏模式下宿主按钮由宿主 fixed 定位、
             不在行内，行内只有品牌区与本按钮，DOM 顺序即视觉顺序。 */
          row.appendChild(btn);
        };

        place();
        const observer = new MutationObserver(place);
        observer.observe(document.body, { childList: true, subtree: true });

        return () => {
          observer.disconnect();
          if (railObserver) railObserver.disconnect();
          root.removeAttribute("data-cindy-rail");
          root.removeAttribute("data-cindy-nav-collapsed");
          const btn = document.querySelector(".cindy-nav-toggle");
          if (btn) btn.remove();
        };
      }, PLUGIN_ID + ": sidebar nav toggle");
    }

    /* ────────────────────────────────────────────────────────────────
     * 5. 装载
     * ──────────────────────────────────────────────────────────────── */

    /** 注入一段插件自有的 <style>，随插件 fiber 生命周期回收。 */
    function injectStyle(ctx, label, css) {
      if (typeof document === "undefined") return;
      ctx.effect(() => {
        const tag = document.createElement("style");
        tag.dataset.plugin = PLUGIN_ID;
        tag.dataset.pluginCss = PLUGIN_ID + "/" + label;
        tag.textContent = css;
        document.head.appendChild(tag);
        return () => {
          tag.remove();
        };
      }, PLUGIN_ID + ": " + label);
    }

    function apply(ctx) {
      const theme = ctx.theme;
      if (!theme || typeof theme.overrideTokens !== "function") {
        // 主题服务缺失时不要连坐整个客户端树：只跳过皮肤层并留痕。
        if (typeof console !== "undefined" && console.warn) {
          console.warn("[" + PLUGIN_ID + "] ctx.theme unavailable — Cindy token layer skipped");
        }
      } else {
        const tokenCount = Object.keys(TOKENS).length;
        ctx.effect(
          () => theme.overrideTokens(PLUGIN_ID, TOKENS),
          PLUGIN_ID + ": " + tokenCount + " token overrides",
        );
        if (typeof console !== "undefined" && console.info) {
          console.info("[" + PLUGIN_ID + "] Cindy token layer applied (" + tokenCount + " tokens)");
        }
      }

      injectStyle(ctx, "inter-font.css", INTER_FONT_FACE);
      injectStyle(ctx, "elevation.css", SHADOW_CSS);
      injectStyle(ctx, "sidebar-glass.css", GLASS_CSS);
      injectStyle(ctx, "sidebar-space.css", SIDEBAR_SPACE_CSS);
      installNavToggle(ctx);
    }

    exports.name = PLUGIN_ID;
    exports.inject = inject;
    exports.apply = apply;
    return module.exports;
  },
});
