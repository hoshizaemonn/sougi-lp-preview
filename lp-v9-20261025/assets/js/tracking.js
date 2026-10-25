/* 家族葬光LP 計測イベント（dataLayer へ push するだけ。タグの送信先は GTM 側で管理）
   個人情報（氏名・電話・メール・相談内容の本文）は一切 push しない。 */
(function () {
  'use strict';
  window.dataLayer = window.dataLayer || [];
  function push(o) { try { window.dataLayer.push(o); } catch (e) {} }
  function txt(el, n) { return ((el && el.textContent) || '').replace(/\s+/g, ' ').trim().slice(0, n || 40); }
  function where(el) {
    var s = el.closest && el.closest('header,section,footer,.fixed-cta');
    if (!s) return 'page';
    return s.id || (s.className && String(s.className).split(' ')[0]) || s.tagName.toLowerCase();
  }

  // 電話：タップしただけでは tel_click にしない。
  //   タップ → tel_tap（dataLayerのみ・GA4には送らない）
  //   タップ後 4秒以内に画面が裏へ回る（電話アプリへ移った）→ tel_click（GA4のキーイベント）
  //   ※Webからは「発信ボタンを押したか」までは分からない。実際の通話はセントラル・アイ等の着信履歴が正
  var telPending = null;
  function telTap(loc) {
    push({ event: 'tel_tap', tel_location: loc });
    telPending = { loc: loc, t: Date.now() };
    setTimeout(function () { if (telPending && Date.now() - telPending.t >= 4000) telPending = null; }, 4100);
  }
  function telLeft() {
    if (!telPending) return;
    var p = telPending; telPending = null;
    if (Date.now() - p.t <= 4000) push({ event: 'tel_click', tel_location: p.loc, tel_stage: 'dialer_opened' });
  }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') telLeft(); });
  window.addEventListener('pagehide', telLeft);

  // 電話タップ／CTAクリック
  document.addEventListener('click', function (e) {
    try {
      var t = e.target;
      var a = t.closest && t.closest('a[href^="tel:"]');
      if (a) { telTap(where(a)); return; }
      var c = t.closest && t.closest('[data-cta]');
      if (c && c.getAttribute('data-cta') !== 'form' && c.getAttribute('data-cta') !== 'tel') {
        push({ event: 'cta_click', cta_type: c.getAttribute('data-cta'), cta_text: txt(c, 40) });
      }
    } catch (err) {}
  }, true);

  // 総額シミュレーターの操作（連続操作はまとめて1回）
  var simTimer = null;
  function simPush() {
    try {
      var p = document.querySelector('#segPlan [aria-pressed="true"]');
      var c = document.querySelector('#segCity [aria-pressed="true"]');
      var d = document.getElementById('days');
      var r = document.getElementById('simTotal');
      push({ event: 'sim_change', sim_plan: p ? p.getAttribute('data-plan') : '', sim_days: d ? d.value : '',
             sim_city: c ? c.getAttribute('data-city') : '', sim_total_label: txt(r, 30) });
    } catch (err) {}
  }
  function simSchedule() { clearTimeout(simTimer); simTimer = setTimeout(simPush, 600); }
  ['segPlan', 'segCity'].forEach(function (id) {
    var el = document.getElementById(id); if (el) el.addEventListener('click', function (e) { if (e.target.closest('button')) simSchedule(); });
  });
  var days = document.getElementById('days'); if (days) days.addEventListener('input', simSchedule);

  // 相談フォーム
  var formStarted = false;
  document.addEventListener('focusin', function (e) {
    if (formStarted) return;
    if (e.target.closest && e.target.closest('.form-wrap')) { formStarted = true; push({ event: 'form_start' }); }
  });
  function field(inputs, name) { for (var i = 0; inputs && i < inputs.length; i++) { if (inputs[i].name === name) return String(inputs[i].value || ''); } return ''; }
  document.addEventListener('wpcf7mailsent', function (e) {
    var inp = e.detail && e.detail.inputs;
    push({ event: 'form_submit', form_area: field(inp, 'your-area'), form_status: field(inp, 'your-status') });
  });
  function formError(e) {
    var n = 0; try { n = (e.detail.apiResponse.invalid_fields || []).length; } catch (x) {}
    push({ event: 'form_error', invalid_count: n });
  }
  document.addEventListener('wpcf7invalid', formError);
  document.addEventListener('wpcf7mailfailed', formError);

  // FAQを開いた
  Array.prototype.forEach.call(document.querySelectorAll('details'), function (d) {
    d.addEventListener('toggle', function () { if (d.open) push({ event: 'faq_open', faq_question: txt(d.querySelector('summary'), 60) }); });
  });

  // どこまで読まれたか（各セクションの上端が画面の上から6割の位置に入ったら1回。縦に長いセクションでも数えられる）
  if ('IntersectionObserver' in window) {
    var seen = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target, name = el.id || String(el.className).split(' ')[0];
        if (seen[name]) return; seen[name] = true; push({ event: 'section_view', section_name: name }); io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -40% 0px', threshold: 0 });
    ['.fv', '.urgent-section', '.price-section', '#sim', '.reason-section', '.hall-section', '.flow-section', '.faq-section', '#sodan', '#operator'].forEach(function (s) {
      var el = document.querySelector(s); if (el) io.observe(el);
    });
  }
})();
