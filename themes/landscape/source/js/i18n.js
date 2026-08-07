/* ============================================================
 * 博客双语支持 + 文章翻译
 * 1. UI 双语：右上角语言切换按钮（中 / EN），localStorage 记忆
 * 2. 文章翻译：调用 Google 免费翻译接口（translate.googleapis.com）
 * ============================================================ */
(function () {
  'use strict';

  /* ---------- 1. UI 双语字典 ---------- */
  var DICT = {
    zh: {
      'menu-home': '首页',
      'menu-archives': '归档',
      'categories': '分类',
      'tags': '标签',
      'tagcloud': '标签云',
      'archive_a': '归档',
      'recent_posts': '最新文章',
      'share': '分享',
      'search': '搜索',
      'translate-btn': '🌐 翻译文章'
    },
    en: {
      'menu-home': 'Home',
      'menu-archives': 'Archives',
      'categories': 'Categories',
      'tags': 'Tags',
      'tagcloud': 'Tag Cloud',
      'archive_a': 'Archives',
      'recent_posts': 'Recent Posts',
      'share': 'Share',
      'search': 'Search',
      'translate-btn': '🌐 Translate Article'
    }
  };

  var LANG_KEY = 'blog-lang';
  var currentLang = localStorage.getItem(LANG_KEY) || 'zh';

  /* ---------- 2. 注入样式 ---------- */
  var style = document.createElement('style');
  style.textContent =
    '.nav-lang-btn{font-size:12px;font-weight:bold;letter-spacing:1px}' +
    '.article-translate-btn{background:#fff;border:1px solid #ddd;border-radius:3px;' +
    'padding:4px 12px;font-size:13px;cursor:pointer;color:#555;margin-right:8px}' +
    '.article-translate-btn:hover{background:#f0f0f0;color:#333}' +
    '.article-translate-btn:disabled{opacity:.6;cursor:wait}' +
    '.translated-article{padding:15px 18px;margin:15px 0;border:1px dashed #bbb;' +
    'border-radius:4px;background:#fafafa;display:none;line-height:1.8}' +
    '.translated-article p{margin:8px 0}' +
    '.translated-article blockquote{border-left:3px solid #ddd;padding-left:12px;color:#666}' +
    '.translated-article pre{background:#f5f5f5;padding:10px;overflow-x:auto;border-radius:3px}' +
    '.article-toolbar{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin:10px 0 14px}' +
    '.article-poll{display:flex;align-items:center;flex-wrap:wrap;gap:6px}' +
    '.poll-toggle{background:#fff;border:1px dashed #bbb;border-radius:20px;padding:3px 12px;font-size:13px;cursor:pointer;color:#555}' +
    '.poll-toggle:hover{border-color:#258fb8;color:#258fb8}' +
    '.poll-options{display:flex;align-items:center;gap:4px}' +
    '.poll-options[hidden]{display:none}' +
    '.poll-opt{background:#fff;border:1px solid #ddd;border-radius:50%;width:34px;height:34px;font-size:16px;cursor:pointer;transition:all .15s}' +
    '.poll-opt:hover{border-color:#258fb8;transform:scale(1.12)}' +
    '.poll-opt:disabled{opacity:.5;cursor:default}' +
    '.poll-opt.poll-chosen{border-color:#258fb8;background:#e8f5fb}' +
    '.poll-result{font-size:13px;color:#258fb8}';
  document.head.appendChild(style);

  /* ---------- 3. 语言切换 ---------- */
  function applyLang(lang) {
    currentLang = lang;
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
    var dict = DICT[lang];

    // 替换所有带 data-i18n 的文本
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (dict[key]) el.textContent = dict[key];
    });

    // 搜索框 placeholder
    var searchInput = document.querySelector('#search-form-wrap input');
    if (searchInput && dict.search) searchInput.placeholder = dict.search;

    // 切换按钮显示「目标语言」
    var toggle = document.getElementById('lang-toggle');
    if (toggle) {
      if (lang === 'zh') { toggle.textContent = 'EN'; toggle.setAttribute('title', 'Switch to English'); }
      else { toggle.textContent = '中'; toggle.setAttribute('title', '切换到中文'); }
    }

    // 翻译按钮文案跟随语言
    var tbtn = document.getElementById('translate-btn');
    if (tbtn && dict['translate-btn']) {
      var state = tbtn.getAttribute('data-state');
      if (state !== 'translated' && state !== 'translating') tbtn.textContent = dict['translate-btn'];
    }
  }

  function toggleLang() {
    applyLang(currentLang === 'zh' ? 'en' : 'zh');
  }

  /* ---------- 4. 文章翻译（Google 免费接口） ---------- */
  function gtrans(text, cb) {
    var url = 'https://translate.googleapis.com/translate_a/single' +
      '?client=gtx&sl=auto&tl=en&dt=t&q=' + encodeURIComponent(text);
    fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var out = '';
        if (d && d[0]) {
          d[0].forEach(function (seg) { if (seg && seg[0]) out += seg[0]; });
        }
        cb(out);
      })
      .catch(function () { cb(null); });
  }

  // 长文本按中文句号断点分段（每段 ≤ 450 字符）
  function splitText(text, max) {
    var parts = [], rest = text;
    while (rest.length > max) {
      var cut = rest.lastIndexOf('。', max);
      if (cut < 0) cut = rest.lastIndexOf('.', max);
      if (cut < 0) cut = max;
      parts.push(rest.slice(0, cut + 1));
      rest = rest.slice(cut + 1);
    }
    if (rest) parts.push(rest);
    return parts;
  }

  function translateArticle() {
    var entry = document.querySelector('.article-entry');
    var btn = document.getElementById('translate-btn');
    if (!entry || !btn) return;

    var state = btn.getAttribute('data-state') || 'original';

    if (state === 'translated') { // 切回原文
      entry.style.display = '';
      var translated = document.getElementById('translated-article');
      if (translated) translated.style.display = 'none';
      btn.setAttribute('data-state', 'original');
      btn.textContent = DICT[currentLang]['translate-btn'];
      return;
    }
    if (state === 'translating') return; // 翻译中，忽略重复点击

    /* --- 开始翻译：克隆原文，排版结构完整保留 --- */
    btn.setAttribute('data-state', 'translating');
    btn.textContent = '翻译中…';
    btn.disabled = true;

    var clone = entry.cloneNode(true);

    // 收集「叶子文本元素」（无块级子元素）逐个翻译；代码块原样保留
    var targets = [];
    clone.querySelectorAll('p,h1,h2,h3,h4,h5,h6,li,td,th,blockquote,dt,dd,figcaption').forEach(function (el) {
      if (el.closest('pre,code,.highlight,script,style')) return;
      if (el.querySelector('p,h1,h2,h3,h4,h5,h6,li,td,th,blockquote')) return; // 有块级子元素 → 交给子级
      var t = el.textContent.replace(/\s+/g, ' ').trim();
      if (!t) return;
      targets.push({ el: el, text: t });
    });

    // 串行翻译并替换文本（保留标签与 CSS 样式）
    var idx = 0;
    function next() {
      if (idx >= targets.length) { finish(); return; }
      var tgt = targets[idx];
      var segs = splitText(tgt.text, 450);
      var out = '', i = 0;
      (function segNext() {
        if (i >= segs.length) {
          tgt.el.textContent = out;
          idx++;
          next();
          return;
        }
        gtrans(segs[i], function (tr) {
          if (tr) out += tr;
          i++;
          segNext();
        });
      })();
    }
    next();

    function finish() {
      // 把排版保留的译文（clone）作为译文容器显示
      var translated = document.getElementById('translated-article');
      if (!translated) {
        translated = document.createElement('div');
        translated.id = 'translated-article';
        entry.parentNode.insertBefore(translated, entry.nextSibling);
      }
      translated.innerHTML = '';
      translated.appendChild(clone);
      entry.style.display = 'none';
      translated.style.display = 'block';
      btn.setAttribute('data-state', 'translated');
      btn.textContent = '🌐 显示原文';
      btn.disabled = false;
    }
  }

  /* ---------- 5. 投票条（默认折叠，点击展开 emoji 选项） ---------- */
  function initPoll() {
    var poll = document.getElementById('article-poll');
    if (!poll) return;                       // 没有投票条（如首页）就不初始化

    // 每个页面单独记忆：blog-poll:/文章路径/
    var key = 'blog-poll:' + location.pathname;
    var toggle  = document.getElementById('poll-toggle');
    var options = document.getElementById('poll-options');
    var opts    = poll.querySelectorAll('.poll-opt');
    var result  = poll.querySelector('.poll-result');

    // 选项 emoji 对应的中文含义（显示在结果里）
    var TITLES = { helpful: '有帮助', unhelpful: '没帮助', hate: '讨厌我', learned: '学到了', poop: '丢大便' };

    // 投票完成：锁定所有选项、收起列表、隐藏触发器、显示结果
    function lockAndShow(opt) {
      opts.forEach(function (b) { b.disabled = true; });
      if (opt) opt.classList.add('poll-chosen');
      if (options) options.hidden = true;
      if (toggle) toggle.style.display = 'none';
      if (result) result.textContent = '已投：' + (TITLES[opt.getAttribute('data-opt')] || '');
    }

    // 如果这个访客之前投过，恢复已选状态（不显示触发器）
    var voted = localStorage.getItem(key);
    if (voted) {
      var prev = poll.querySelector('[data-opt="' + voted + '"]');
      if (prev) lockAndShow(prev);
    }

    // 触发器：点击展开 / 收起 emoji 选项
    if (toggle) toggle.addEventListener('click', function () {
      if (options) options.hidden = !options.hidden;
    });

    // 每个 emoji 选项：点击即投票
    opts.forEach(function (b) {
      b.addEventListener('click', function () {
        var opt = b.getAttribute('data-opt');
        try { localStorage.setItem(key, opt); } catch (e) {}
        lockAndShow(b);
      });
    });
  }

  /* ---------- 6. 绑定事件 ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    applyLang(currentLang);
    var toggle = document.getElementById('lang-toggle');
    if (toggle) toggle.addEventListener('click', toggleLang);
    var tbtn = document.getElementById('translate-btn');
    if (tbtn) tbtn.addEventListener('click', translateArticle);
    initPoll();
  });
})();
