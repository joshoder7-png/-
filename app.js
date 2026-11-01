/* נכנסים בשאלה – ישיבת אמית עמיחי
   הנתונים מגיעים מ-data.js (QA_DATA). הקובץ הזה רק מציג אותם. */
(function () {
  "use strict";

  var DATA = typeof QA_DATA !== "undefined" ? QA_DATA : [];
  var PAGE_SIZE = 20;

  var CATS = [
    "תפילה וכוונה",
    "מיניות צניעות ויצר",
    "ימים מיוחדים שבת מועדים ואבלות",
    "הלכה מעשית",
    "אמונה ושאלות על ה",
    "שונות / כללי",
    "תשובה רוחניות ועבודת ה אישית",
    "חינוך ישיבה ואישיות",
    "מלחמה ואמונה לאומית"
  ];
  var CAT_META = {
    "תפילה וכוונה": { icon: "🙏", h: 218 },
    "מיניות צניעות ויצר": { icon: "🛡️", h: 345 },
    "ימים מיוחדים שבת מועדים ואבלות": { icon: "🕯️", h: 28 },
    "הלכה מעשית": { icon: "📜", h: 155 },
    "אמונה ושאלות על ה": { icon: "✨", h: 46 },
    "שונות / כללי": { icon: "💬", h: 262 },
    "תשובה רוחניות ועבודת ה אישית": { icon: "🌱", h: 100 },
    "חינוך ישיבה ואישיות": { icon: "🎓", h: 300 },
    "מלחמה ואמונה לאומית": { icon: "🎖️", h: 200 }
  };
  function catMeta(c) { return CAT_META[c] || { icon: "❔", h: 40 }; }

  // שמות המשיבים מופיעים בנתונים בכמה כתיבים; לצורך סינון בלבד מאחדים אותם.
  // בכרטיס עצמו מוצג תמיד השם בדיוק כפי שנכתב.
  var RABBIS = [
    { key: "אודרברג", name: "יהושע אודרברג", re: /אוד/ },
    { key: "פסטין", name: "דוד פסטין", re: /פסטין|ראש הישיבה/ },
    { key: "אסרף", name: "אור אסרף", re: /אסרף/ },
    { key: "רייכנר", name: "יואל רייכנר", re: /רייכנר/ },
    { key: "שמיר", name: "אלירן שמיר", re: /שמיר/ },
    { key: "דובלין", name: "רועי דובלין", re: /דובלין/ },
    { key: "אזרחי", name: "איתי אזרחי", re: /אזרחי/ },
    { key: "דוייב", name: "דור דוייב", re: /דוי?יב/ },
    { key: "אלפי", name: "בר חיים אלפי", re: /אלפי/ },
    { key: "נהרי", name: "דוד נהרי", re: /נהרי/ },
    { key: "ללום", name: "אסף ללום", re: /ללום/ },
    { key: "רוזינסקי", name: "אהרון רוזינסקי", re: /רוז/ },
    { key: "צרפתי", name: "ינון צרפתי", re: /צרפתי/ }
  ];
  function rabbiKey(r) {
    if (!r) return "";
    for (var i = 0; i < RABBIS.length; i++) if (RABBIS[i].re.test(r)) return RABBIS[i].key;
    return "";
  }

  var KEYWORDS = [
    // בין אדם לחברו
    "חבר", "מריבה", "עלבון", "סליחה", "קנאה", "בדידות", "לשון הרע", "רכילות", "חרם",
    // רגשות ונפש
    "כעס", "עצב", "בושה", "חרדה", "ייאוש", "דיכאון", "מחשבות", "ספק", "בטחון עצמי",
    // צניעות ויצר
    "אוננות", "פורנוגרפיה", "בנות", "יצר", "פנטזיה", "נגיעה",
    // משפחה
    "הורים", "אחים", "גירושין", "כיבוד", "בית",
    // ישיבה וחיים
    "טלפון", "אינטרנט", "ישיבה", "לימוד", "שינה", "מלחמה", "אמונה", "תשובה"
  ];
  var KW_VISIBLE = 12;

  // ---------- Precompute ----------
  var catCount = {}, rabbiCount = {};
  DATA.forEach(function (item, i) {
    catCount[item.c] = (catCount[item.c] || 0) + 1;
    item._rk = rabbiKey(item.r);
    if (item._rk) rabbiCount[item._rk] = (rabbiCount[item._rk] || 0) + 1;
    item._i = i;
  });

  var POPULAR_IDS = (function () {
    // Categories most relevant for 15yo boys in yeshiva
    var youthCats = new Set([
      "מיניות צניעות ויצר",
      "תשובה רוחניות ועבודת ה אישית",
      "אמונה ושאלות על ה",
      "חינוך ישיבה ואישיות",
      "שונות / כללי",
      "מלחמה ואמונה לאומית"
    ]);
    // Keywords that signal personal/emotional questions
    var personalKeywords = [
      "אוננות", "יצר", "בנות", "פורנו",
      "כעס", "עצב", "בדידות", "חרדה", "בושה",
      "חבר", "מריבה", "עלבון", "סליחה", "הורים",
      "אמונה", "ספק", "יאוש", "דיכאון",
      "טלפון", "אינטרנט", "מחשבות",
      "פחד", "לחץ", "עצמאות", "נגיעה"
    ];
    var ids = [];
    DATA.forEach(function (item, i) {
      if (!item.q || !item.c) return;
      var q = item.q.toLowerCase();
      var inYouthCat = youthCats.has(item.c);
      var hasPersonalKw = personalKeywords.some(function (kw) { return q.includes(kw); });
      var goodLength = item.q.length > 20 && item.q.length < 150;
      if (goodLength && (inYouthCat || hasPersonalKw)) ids.push(i);
    });
    return new Set(ids.slice(0, 60));
  })();

  // ---------- State ----------
  var state = { cat: "", rabbi: "", search: "", keyword: "", view: "all", shown: PAGE_SIZE, focus: -1, kwOpen: false };

  // ---------- Helpers ----------
  var $ = function (id) { return document.getElementById(id); };
  function nf(n) { return Number(n).toLocaleString("he-IL"); }

  function cleanText(s) {
    if (!s) return "";
    // Remove emoji and symbols that display as squares
    return s.replace(/[\u{1F000}-\u{1FFFF}|\u{2600}-\u{27BF}|\u{1F300}-\u{1FAFF}]/gu, "")
      .replace(/[👍👎😊😀🙏✅❌⚠️🔥💪🌟]/g, "")
      .replace(/️/g, "")
      .trim();
  }
  function escHtml(s) {
    if (!s) return "";
    return cleanText(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  var URL_RE = /https?:\/\/[A-Za-z0-9\-._~:\/?#\[\]@!$&;'()*+,=%]+/g;

  // WhatsApp-style *bold* + clickable links + search highlight. The text itself is untouched.
  function richText(raw, tokens) {
    var esc = escHtml(raw);
    var out = "", last = 0, m;
    URL_RE.lastIndex = 0;
    while ((m = URL_RE.exec(esc))) {
      var url = m[0], trail = "";
      while (/[.,)\]']$/.test(url)) { trail = url.slice(-1) + trail; url = url.slice(0, -1); }
      out += bold(esc.slice(last, m.index)) +
        '<a href="' + url + '" target="_blank" rel="noopener" dir="ltr">' + url + "</a>" + trail;
      last = m.index + m[0].length;
    }
    out += bold(esc.slice(last));
    return highlight(out, tokens);
  }
  function bold(s) { return s.replace(/\*([^*\n]+?)\*/g, "<strong>$1</strong>"); }
  function highlight(html, tokens) {
    if (!tokens || !tokens.length) return html;
    var re = new RegExp("(" + tokens.map(function (t) { return escRe(escHtml(t)); }).join("|") + ")", "gi");
    return html.split(/(<[^>]+>)/).map(function (part) {
      return part.charAt(0) === "<" ? part : part.replace(re, "<mark>$1</mark>");
    }).join("");
  }

  function searchTokens() {
    var s = state.search.trim().toLowerCase();
    if (!s) return [];
    var t = s.split(/\s+/).filter(function (x) { return x.length > 1; });
    return t.length ? t : [s];
  }

  function scoreItem(item, tokens, fullQuery) {
    var q = (item.q || "").toLowerCase();
    var a = (item.a || "").toLowerCase();
    var r = (item.r || "").toLowerCase();
    var score = 0;
    if (q.includes(fullQuery)) score += 100;
    if (a.includes(fullQuery)) score += 50;
    if (r.includes(fullQuery)) score += 40;
    tokens.forEach(function (t) {
      if (t.length < 2) return;
      if (q.includes(t)) score += 10;
      if (a.includes(t)) score += 3;
    });
    return score;
  }

  function getViewCounts() {
    try { return JSON.parse(localStorage.getItem("qa_views") || "{}"); } catch (e) { return {}; }
  }
  function recordView(idx) {
    try {
      var v = getViewCounts();
      v[idx] = (v[idx] || 0) + 1;
      localStorage.setItem("qa_views", JSON.stringify(v));
    } catch (e) {}
  }

  function filtered() {
    var s = state.search.trim().toLowerCase();
    var tokens = s ? s.split(/\s+/).filter(function (t) { return t.length > 1; }) : [];
    var views = state.view === "popular" ? getViewCounts() : null;
    var results = [];
    DATA.forEach(function (item, idx) {
      if (views && !POPULAR_IDS.has(idx) && (views[idx] || 0) < 2) return;
      if (state.cat && item.c !== state.cat) return;
      if (state.rabbi && item._rk !== state.rabbi) return;
      if (!s) { results.push({ item: item, score: 0 }); return; }
      var sc = scoreItem(item, tokens, s);
      if (sc > 0) results.push({ item: item, score: sc });
    });
    if (s) results.sort(function (a, b) { return b.score - a.score; });
    return results.map(function (r) { return r.item; });
  }

  // ---------- Card ----------
  function cardHtml(item, tokens, open) {
    var i = item._i, meta = catMeta(item.c);
    var rabbi = escHtml(item.r);
    return '<article class="qa-card reveal' + (open ? " open" : "") + '" id="q-' + i + '" style="--h:' + meta.h + '">' +
      '<button class="qa-q" aria-expanded="' + (open ? "true" : "false") + '" aria-controls="qa-a-' + i + '" data-toggle="' + i + '">' +
        '<span class="q-badge" aria-hidden="true">?</span>' +
        '<span><span class="q-text">' + richText(item.q, tokens) + "</span>" +
          '<span class="q-sub">' +
            (item.c ? '<span class="tag"><span aria-hidden="true">' + meta.icon + "</span>" + escHtml(item.c) + "</span>" : "") +
            (rabbi ? "<span>✍ " + rabbi + "</span>" : "") +
          "</span></span>" +
        '<span class="q-chev" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></span>' +
      "</button>" +
      '<div class="qa-a" id="qa-a-' + i + '" role="region"><div class="qa-a-inner">' +
        '<div class="answer">' +
          (rabbi ? '<div class="answer-head"><span class="rabbi"><span class="rabbi-av" aria-hidden="true">' + rabbiInitial(item.r) + "</span>" + rabbi + "</span></div>" : "") +
          '<div class="answer-text">' + richText(item.a, tokens) + "</div>" +
        "</div>" +
        '<div class="qa-actions">' +
          '<button class="act" data-copy="' + i + '">🔗 העתק קישור</button>' +
          '<a class="act wa" href="' + waHref(item) + '" target="_blank" rel="noopener">💬 שתף בוואטסאפ</a>' +
        "</div>" +
      "</div></div>" +
    "</article>";
  }
  function rabbiInitial(r) {
    var n = (r || "").replace(/^(ראש הישיבה[-\s]*)?(הרב\s+)?/, "").trim();
    return escHtml(n.charAt(0) || "?");
  }
  function linkFor(i) { return location.href.split("#")[0] + "#q-" + i; }
  function waHref(item) {
    var q = cleanText(item.q).replace(/\*/g, "");
    if (q.length > 140) q = q.slice(0, 140) + "…";
    return "https://wa.me/?text=" + encodeURIComponent("❓ " + q + "\n\nהתשובה ב\"נכנסים בשאלה\":\n" + linkFor(item._i));
  }

  // ---------- Render Q&A ----------
  function render() {
    var list = $("qaList"), more = $("loadMore"), banner = $("focusBanner");
    var tokens = searchTokens();

    if (state.focus >= 0 && DATA[state.focus]) {
      banner.innerHTML = '<div class="focus-banner"><span>מוצגת שאלה אחת מתוך הארכיון</span>' +
        '<button class="btn btn-outline" style="min-height:38px;padding:4px 16px" data-unfocus>לכל השאלות ←</button></div>';
      list.innerHTML = cardHtml(DATA[state.focus], [], true);
      more.innerHTML = "";
      $("resultsCount").innerHTML = "שאלה #" + nf(state.focus + 1);
      observeReveal(list);
      return;
    }
    banner.innerHTML = "";

    var data = filtered();
    var slice = data.slice(0, state.shown);
    $("resultsCount").innerHTML = "מציג <strong>" + nf(slice.length) + "</strong> מתוך <strong>" + nf(data.length) + "</strong> שאלות";

    if (!data.length) {
      list.innerHTML = '<div class="empty"><span class="empty-icon" aria-hidden="true">🔍</span>לא נמצאו שאלות מתאימות. נסו מילה אחרת או נקו את הסינון.' +
        '<div style="margin-block-start:14px"><button class="btn btn-outline" data-reset>ניקוי סינון</button></div></div>';
      more.innerHTML = "";
      return;
    }
    list.innerHTML = slice.map(function (item) { return cardHtml(item, tokens, false); }).join("");
    observeReveal(list);

    if (data.length > slice.length) {
      var next = Math.min(PAGE_SIZE, data.length - slice.length);
      more.innerHTML = '<button class="btn btn-primary" data-more>טען עוד ' + nf(next) + " שאלות</button>" +
        '<span class="hint">נותרו עוד ' + nf(data.length - slice.length) + "</span>";
    } else {
      more.innerHTML = data.length > PAGE_SIZE ? '<span class="hint">✦ הגעתם לסוף הרשימה ✦</span>' : "";
    }
  }

  function appendMore() {
    var data = filtered(), tokens = searchTokens();
    var from = state.shown;
    state.shown += PAGE_SIZE;
    var list = $("qaList");
    list.insertAdjacentHTML("beforeend", data.slice(from, state.shown).map(function (it) { return cardHtml(it, tokens, false); }).join(""));
    observeReveal(list);
    var slice = Math.min(state.shown, data.length);
    $("resultsCount").innerHTML = "מציג <strong>" + nf(slice) + "</strong> מתוך <strong>" + nf(data.length) + "</strong> שאלות";
    var more = $("loadMore");
    if (data.length > state.shown) {
      var next = Math.min(PAGE_SIZE, data.length - state.shown);
      more.innerHTML = '<button class="btn btn-primary" data-more>טען עוד ' + nf(next) + " שאלות</button>" +
        '<span class="hint">נותרו עוד ' + nf(data.length - state.shown) + "</span>";
    } else {
      more.innerHTML = '<span class="hint">✦ הגעתם לסוף הרשימה ✦</span>';
    }
  }

  function buildCatFilters() {
    var html = '<button class="chip' + (!state.cat ? " active" : "") + '" data-cat="">הכל<span class="n">' + nf(DATA.length) + "</span></button>";
    html += CATS.map(function (c) {
      var m = catMeta(c);
      return '<button class="chip topic' + (state.cat === c ? " active" : "") + '" style="--h:' + m.h + '" data-cat="' + escHtml(c) + '">' +
        m.icon + " " + escHtml(c) + '<span class="n">' + nf(catCount[c] || 0) + "</span></button>";
    }).join("");
    $("catFilters").innerHTML = html;
  }
  function buildRabbiFilters() {
    var html = '<button class="chip' + (!state.rabbi ? " active" : "") + '" data-rabbi="">כולם</button>';
    html += RABBIS.filter(function (r) { return rabbiCount[r.key]; }).map(function (r) {
      return '<button class="chip' + (state.rabbi === r.key ? " active" : "") + '" data-rabbi="' + r.key + '">' + r.name +
        '<span class="n">' + nf(rabbiCount[r.key]) + "</span></button>";
    }).join("");
    $("rabbiFilters").innerHTML = html;
  }
  function buildKeywords() {
    var el = $("keywordChips");
    el.classList.toggle("collapsed", !state.kwOpen);
    el.innerHTML = KEYWORDS.map(function (k, i) {
      return '<button class="chip kw' + (i >= KW_VISIBLE ? " extra" : "") + (k === state.keyword ? " active" : "") + '" data-kw="' + k + '">' + k + "</button>";
    }).join("") + '<button class="chip more" data-kwtoggle>' + (state.kwOpen ? "פחות" : "עוד +" + (KEYWORDS.length - KW_VISIBLE)) + "</button>";
  }
  function syncSeg() {
    $("btnAll").classList.toggle("active", state.view === "all");
    $("btnPopular").classList.toggle("active", state.view === "popular");
    $("btnAll").setAttribute("aria-pressed", state.view === "all");
    $("btnPopular").setAttribute("aria-pressed", state.view === "popular");
  }
  function refresh(scroll) {
    state.shown = PAGE_SIZE;
    state.focus = -1;
    buildCatFilters(); buildRabbiFilters(); buildKeywords(); syncSeg();
    $("searchClear").classList.toggle("show", !!state.search);
    render();
    if (scroll) {
      var tb = document.querySelector("#tab-qa .filters");
      var y = tb.getBoundingClientRect().top + window.scrollY - 150;
      if (window.scrollY > y) window.scrollTo({ top: y });
    }
  }

  // ---------- Tabs ----------
  var TABS = ["home", "qa", "ask", "team", "about", "parents"];
  function showTab(tab, opts) {
    opts = opts || {};
    if (TABS.indexOf(tab) < 0) tab = "home";
    document.querySelectorAll(".tab-content").forEach(function (t) { t.classList.toggle("active", t.id === "tab-" + tab); });
    document.querySelectorAll(".nav-btn").forEach(function (b) {
      var on = b.getAttribute("data-tab") === tab;
      b.classList.toggle("active", on);
      if (on) { b.setAttribute("aria-current", "page"); b.scrollIntoView({ block: "nearest", inline: "nearest" }); }
      else b.removeAttribute("aria-current");
    });
    if (!opts.keepHash) {
      try { history.replaceState(null, "", tab === "home" ? location.pathname + location.search : "#" + tab); } catch (e) {}
    }
    if (!opts.noScroll) window.scrollTo(0, 0);
    observeReveal(document.getElementById("tab-" + tab));
    onScroll();
  }

  function openQuestion(i) {
    if (!DATA[i]) return;
    state.focus = i;
    showTab("qa", { keepHash: true });
    try { history.replaceState(null, "", "#q-" + i); } catch (e) {}
    render();
    recordView(i);
    var el = $("q-" + i);
    if (el) { el.classList.add("in", "target"); el.scrollIntoView({ block: "start" }); }
  }

  function routeFromHash() {
    var h = decodeURIComponent(location.hash.replace(/^#/, ""));
    var m = /^q-(\d+)$/.exec(h);
    if (m) { openQuestion(parseInt(m[1], 10)); return; }
    showTab(TABS.indexOf(h) >= 0 ? h : "home", { keepHash: true });
  }

  // ---------- Home ----------
  function buildStats() {
    var top = CATS.slice().sort(function (a, b) { return (catCount[b] || 0) - (catCount[a] || 0); })[0];
    var answerers = RABBIS.filter(function (r) { return rabbiCount[r.key]; }).length;
    var topics = CATS.filter(function (c) { return catCount[c]; }).length;
    $("stats").innerHTML =
      stat(DATA.length, "שאלות ותשובות באתר") +
      stat(answerers, "משיבים") +
      stat(topics, "נושאים") +
      '<div class="stat"><div class="stat-num small">' + catMeta(top).icon + " " + escHtml(top) + '</div><div class="stat-label">הנושא הנפוץ ביותר</div></div>';
    $("qaIntro").textContent = nf(DATA.length) + " שאלות שנשאלו בצורה אנונימית ונענו על ידי הרמי\"ם. חפשו, סננו לפי נושא או משיב, ושתפו.";
  }
  function stat(n, label) {
    return '<div class="stat"><div class="stat-num" data-count="' + n + '">' + nf(n) + '</div><div class="stat-label">' + label + "</div></div>";
  }
  function countUp(root) {
    if (reduceMotion) return;
    root.querySelectorAll("[data-count]").forEach(function (el) {
      var end = +el.getAttribute("data-count"), t0 = performance.now(), dur = 1100;
      (function tick(t) {
        var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
        el.textContent = nf(Math.round(end * e));
        if (p < 1) requestAnimationFrame(tick);
      })(t0);
    });
  }

  function buildTopics() {
    var max = Math.max.apply(null, CATS.map(function (c) { return catCount[c] || 0; }));
    $("topicsGrid").innerHTML = CATS.map(function (c) {
      var m = catMeta(c), n = catCount[c] || 0;
      return '<button class="topic-tile reveal" style="--h:' + m.h + '" data-topic="' + escHtml(c) + '">' +
        '<span class="topic-icon" aria-hidden="true">' + m.icon + "</span>" +
        '<span><span class="topic-name">' + escHtml(c) + '</span><span class="topic-bar" aria-hidden="true"><span style="width:' + Math.max(4, Math.round(n / max * 100)) + '%"></span></span></span>' +
        '<span class="topic-count">' + nf(n) + "</span></button>";
    }).join("");
  }

  var FEATURED_POOL = DATA.filter(function (d) { var l = cleanText(d.q).length; return l > 25 && l < 260 && d.a && d.a.length > 80; });
  var featuredIdx = -1;
  function rollFeatured(animate) {
    var pool = FEATURED_POOL.length ? FEATURED_POOL : DATA;
    if (!pool.length) return;
    var item;
    do { item = pool[Math.floor(Math.random() * pool.length)]; } while (pool.length > 1 && item._i === featuredIdx);
    featuredIdx = item._i;
    var m = catMeta(item.c), body = $("featuredBody");
    body.innerHTML =
      '<div class="featured-top"><span class="tag" style="--h:' + m.h + '"><span aria-hidden="true">' + m.icon + "</span>" + escHtml(item.c) + "</span>" +
      (item.r ? '<span class="rabbi"><span class="rabbi-av" aria-hidden="true">' + rabbiInitial(item.r) + "</span>" + escHtml(item.r) + "</span>" : "") + "</div>" +
      '<p class="featured-q">' + richText(item.q) + "</p>" +
      '<p class="featured-a">' + richText(item.a) + "</p>";
    if (animate) { body.classList.remove("swap"); void body.offsetWidth; body.classList.add("swap"); }
  }

  function buildTeamCounts() {
    document.querySelectorAll(".team-card[data-rabbi]").forEach(function (card) {
      var k = card.getAttribute("data-rabbi"), n = rabbiCount[k];
      if (n) card.insertAdjacentHTML("beforeend", '<button class="team-count" data-rabbi-go="' + k + '">' + nf(n) + " תשובות ←</button>");
    });
  }

  // ---------- UI chrome ----------
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var io = null;
  if ("IntersectionObserver" in window && !reduceMotion) {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("in");
        if (e.target.id === "stats") countUp(e.target);
        io.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -6% 0px" });
  }
  function observeReveal(root) {
    (root || document).querySelectorAll(".reveal:not(.in)").forEach(function (el) {
      if (io) io.observe(el); else el.classList.add("in");
    });
  }

  var progress = $("progress"), toTop = $("toTop"), ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = "scaleX(" + (h > 0 ? Math.min(1, window.scrollY / h) : 0) + ")";
      toTop.classList.toggle("show", window.scrollY > 700);
      ticking = false;
    });
  }

  var toastTimer;
  function toast(msg) {
    var t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2200);
  }
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallbackCopy(text); });
    }
    return Promise.resolve(fallbackCopy(text));
  }
  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (e) {}
    document.body.removeChild(ta);
    return ok;
  }

  function currentTheme() {
    var t = document.documentElement.getAttribute("data-theme");
    if (t) return t;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  // ---------- Events ----------
  document.addEventListener("click", function (e) {
    var t = e.target.closest("button, a");
    if (!t) return;
    var v;
    if ((v = t.getAttribute("data-tab")) || (v = t.getAttribute("data-go"))) { showTab(v); return; }
    if ((v = t.getAttribute("data-toggle")) !== null) {
      var card = $("q-" + v), open = !card.classList.contains("open");
      card.classList.toggle("open", open);
      t.setAttribute("aria-expanded", open);
      if (open) recordView(+v);
      return;
    }
    if ((v = t.getAttribute("data-copy")) !== null) {
      copyText(linkFor(+v)).then(function (ok) { toast(ok ? "הקישור הועתק ✓" : "לא הצלחנו להעתיק"); });
      return;
    }
    if (t.hasAttribute("data-more")) { appendMore(); return; }
    if (t.hasAttribute("data-unfocus")) {
      try { history.replaceState(null, "", "#qa"); } catch (e2) {}
      refresh(false); window.scrollTo(0, 0); return;
    }
    if (t.hasAttribute("data-reset")) {
      state.cat = state.rabbi = state.search = state.keyword = ""; state.view = "all";
      $("searchInput").value = ""; refresh(true); return;
    }
    if ((v = t.getAttribute("data-cat")) !== null) { state.cat = v; refresh(true); return; }
    if ((v = t.getAttribute("data-rabbi")) !== null && t.classList.contains("chip")) { state.rabbi = v; refresh(true); return; }
    if ((v = t.getAttribute("data-kw")) !== null) {
      state.keyword = state.keyword === v ? "" : v;
      state.search = state.keyword;
      $("searchInput").value = state.search;
      refresh(true); return;
    }
    if (t.hasAttribute("data-kwtoggle")) { state.kwOpen = !state.kwOpen; buildKeywords(); return; }
    if ((v = t.getAttribute("data-topic")) !== null) {
      state.cat = v; state.rabbi = state.search = state.keyword = ""; $("searchInput").value = "";
      showTab("qa"); refresh(false); return;
    }
    if ((v = t.getAttribute("data-rabbi-go")) !== null) {
      state.rabbi = v; state.cat = state.search = state.keyword = ""; $("searchInput").value = "";
      showTab("qa"); refresh(false); return;
    }
  });

  var searchTimer;
  $("searchInput").addEventListener("input", function () {
    clearTimeout(searchTimer);
    var val = this.value;
    searchTimer = setTimeout(function () {
      state.search = val;
      if (state.keyword && val !== state.keyword) state.keyword = "";
      refresh(false);
    }, 140);
  });
  $("searchClear").addEventListener("click", function () {
    $("searchInput").value = ""; state.search = state.keyword = ""; refresh(false); $("searchInput").focus();
  });
  $("btnAll").addEventListener("click", function () { state.view = "all"; refresh(false); });
  $("btnPopular").addEventListener("click", function () { state.view = "popular"; refresh(false); });

  $("diceBtn").addEventListener("click", function () {
    var b = this;
    b.classList.add("rolling");
    setTimeout(function () { b.classList.remove("rolling"); }, 500);
    rollFeatured(true);
  });
  $("featuredOpen").addEventListener("click", function () { openQuestion(featuredIdx); });

  $("themeToggle").addEventListener("click", function () {
    var next = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("nbs-theme", next); } catch (e) {}
  });
  toTop.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }); });
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  window.addEventListener("hashchange", routeFromHash);
  window.addEventListener("beforeprint", function () {
    document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("in"); });
  });

  // ---------- Init ----------
  buildStats();
  buildTopics();
  buildTeamCounts();
  rollFeatured(false);
  refresh(false);
  routeFromHash();
  observeReveal(document);
  if (!io) countUp($("stats"));

  // Fade out the opening screen (kept up briefly so it doesn't just flash)
  var splash = $("splash");
  if (splash) {
    var wait = Math.max(0, 1700 - (Date.now() - (window.__splashT0 || 0)));
    setTimeout(function () {
      splash.classList.add("hide");
      setTimeout(function () { if (splash.parentNode) splash.parentNode.removeChild(splash); }, 700);
    }, reduceMotion ? 0 : wait);
  }

  if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) {
    window.addEventListener("load", function () { navigator.serviceWorker.register("/sw.js"); });
  }
})();
