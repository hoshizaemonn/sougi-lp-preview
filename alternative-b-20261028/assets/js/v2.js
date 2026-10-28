/* v2 additions only. Existing tracking.js and its event payloads are unchanged. */
(function () {
  'use strict';
  function push(payload) { window.dataLayer = window.dataLayer || []; window.dataLayer.push(payload); }
  function show_detail(id, open) {
    var detail = document.getElementById('hall-detail-' + id);
    var button = document.querySelector('[data-detail="' + id + '"]');
    detail.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
    button.innerHTML = open ? '詳細を閉じる <span>−</span>' : '詳細を見る <span>＋</span>';
  }
  document.querySelectorAll('[data-detail]').forEach(function (button) {
    button.addEventListener('click', function () { show_detail(button.dataset.detail, button.getAttribute('aria-expanded') !== 'true'); });
  });
  document.querySelectorAll('[data-filter]').forEach(function (button) {
    button.addEventListener('click', function () {
      var region = button.dataset.filter;
      document.querySelectorAll('[data-filter]').forEach(function (b) { b.setAttribute('aria-pressed', String(b === button)); });
      document.querySelectorAll('[data-region]').forEach(function (el) { el.hidden = region !== 'all' && region !== el.dataset.region; });
      document.getElementById('hall-count').textContent = document.querySelectorAll('.hall-card:not([hidden])').length + '施設' + (region === 'kawasaki' ? '' : '（開設予定を含む）');
      push({event:'map_filter', map_region:region});
      document.dispatchEvent(new CustomEvent('hall-map-filter', {detail:region}));
    });
  });
  var plan_buttons = document.querySelectorAll('[data-plan-tab]');
  function choose_plan(index, report) {
    plan_buttons.forEach(function (button) { button.setAttribute('aria-pressed', String(button.dataset.planTab === index)); });
    document.querySelectorAll('[data-plan-column]').forEach(function (col) { col.classList.toggle('is-active', col.dataset.planColumn === index); });
    if (report) push({event:'plan_tab', plan_index:index});
  }
  plan_buttons.forEach(function (button) { button.addEventListener('click', function () { choose_plan(button.dataset.planTab, true); }); });
  choose_plan('0', false);
  document.querySelector('.comparison').classList.add('plan-ready');
  // Constants and state are read from the unchanged calculation module: no duplicate pricing source.
  function draw_graph() {
    var base = PRICE[state.plan], city = CITY[state.city];
    var max_total = base + Math.max(0, 7 - INCLUDED_DAYS) * STAY_PER_DAY + city;
    var ceiling = Math.ceil(max_total / 100000) * 100000;
    var scale = 165 / ceiling;
    var svg = '<svg viewBox="0 0 560 250" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">';
    for (var tick = 0; tick <= 4; tick++) {
      var amount = ceiling * tick / 4, y = 195 - amount * scale;
      svg += '<line x1="48" y1="'+y+'" x2="550" y2="'+y+'" stroke="#ded8c8"/><text x="39" y="'+(y+4)+'" text-anchor="end" font-size="11">'+(amount/10000)+'</text>';
    }
    for (var day = 1; day <= 7; day++) {
      var x = 67 + (day-1)*69, stay = Math.max(0,day-INCLUDED_DAYS)*STAY_PER_DAY, total = base + stay + city;
      if (day === state.days) svg += '<rect x="'+(x-7)+'" y="10" width="53" height="218" rx="4" fill="#f5edcf"/>';
      svg += '<rect x="'+x+'" y="'+(195-base*scale)+'" width="39" height="'+(base*scale)+'" fill="#20843e"/>';
      svg += '<rect x="'+x+'" y="'+(195-(base+stay)*scale)+'" width="39" height="'+(stay*scale)+'" fill="#ad975b"/>';
      svg += '<rect x="'+x+'" y="'+(195-total*scale)+'" width="39" height="'+(city*scale)+'" fill="#ded6bd"/>';
      svg += '<text x="'+(x+19.5)+'" y="'+(187-total*scale)+'" text-anchor="middle" font-size="11">'+(total/10000).toFixed(1)+'</text>';
      svg += '<text class="'+(day===state.days?'active-label':'')+'" x="'+(x+19.5)+'" y="216" text-anchor="middle" font-size="12">'+day+'日</text>';
    }
    svg += '</svg>';
    var graph = document.getElementById('cost-graph');
    graph.innerHTML = svg;
    graph.setAttribute('aria-label', LABEL[state.plan]+'、'+state.days+'日待つ場合の計算例。基本料金'+yen(base)+'、延長'+yen(Math.max(0,state.days-INCLUDED_DAYS)*STAY_PER_DAY)+'、火葬場料金'+yen(city)+'。すべてたたき、要確認。');
  }
  ['segPlan','segCity'].forEach(function (id) { document.getElementById(id).addEventListener('click', draw_graph); });
  document.getElementById('days').addEventListener('input', draw_graph);
  draw_graph();
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      if (entries.some(function (entry) { return entry.isIntersecting; })) { push({event:'graph_view'}); observer.disconnect(); }
    }, {threshold:0.25});
    observer.observe(document.getElementById('wait-graph'));
  }
})();
