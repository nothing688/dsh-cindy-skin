/**
 * dsh-cindy-skin — host 侧入口。
 *
 * 皮肤本体全部在客户端执行（见 ./client.js 与 src/skin.js）：
 *   · ctx.theme.overrideTokens('dsh-cindy-skin', TOKENS)
 *       覆盖 DSH 设计 token —— 颜色 / 字体族 / 圆角数值 / 阴影 / 动效档位。
 *       ui-layout 的 ThemePresenter 会把这些值写进 <body> 的 inline style
 *       （优先级最高，能压掉 :root{} 与 body{} 的同名声明）。
 *   · 注入 Inter 的 @font-face（base64 内联，自包含、零外部请求）。
 *   · 注入 --dsw-elevation-* 的子代覆盖规则 —— 该族声明在 `body, body *` 上，
 *      每个后代元素都有自己的声明，body 的 inline 值传不下去，
 *      必须用特异性更高的选择器（html body, html body *）覆盖。
 *
 * host 侧不需要任何服务，只需要一个能被 cordis 正常装载的入口，
 * 使 profile 的 dsh.profile.bundles 能登记本插件、并把 client.js 交给前端。
 * 本插件不读写任何磁盘路径，不改 app.asar，不触碰 profile 的 cordis.patch.yml。
 */

export const name = "dsh-cindy-skin";

/** host 侧不注入任何服务。 */
export const inject = [];

/**
 * 有意为空：本插件的全部行为都在客户端完成。
 * 保留该导出是为了满足 cordis 插件的装载契约。
 */
export function apply() {}

const plugin = {
  name,
  inject,
  apply,
};

export default plugin;
