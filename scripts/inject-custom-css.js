/**
 * 把自己写的样式挂到每个页面的 <head> 末尾。
 *
 * 这样做的原因：themes/landscape 是受版本控制的主题文件，
 * 直接改它会在将来更新主题时被覆盖；用 Hexo 5+ 自带的
 * injector 就能做到「只加不改」。
 *
 * 对应样式文件：source/css/custom.css → 生成到站点根路径 /css/custom.css
 */
hexo.extend.injector.register(
  'head_end',
  '<link rel="stylesheet" href="/css/custom.css">',
  'default'
);
