/* Block 3 only: static cards remain available without Leaflet or tiles. */
(function () {
  'use strict';
  var root = document.getElementById('hall-map');
  if (!root) return;
  var status = document.getElementById('map-status');
  var button = document.getElementById('map-interact');
  var help = document.getElementById('map-help');
  function push(payload) { window.dataLayer = window.dataLayer || []; window.dataLayer.push(payload); }
  document.getElementById('halls').addEventListener('click', function (event) {
    var link = event.target.closest('[data-gmaps]');
    if (link) {
      var card = document.getElementById('hall-' + link.dataset.gmaps);
      push({event:'map_open_gmaps', map_hall:card.querySelector('h3').textContent});
    }
  });
  var venueRoot = document.getElementById('halls');
  function openVenue(id, force) {
    var detail = document.getElementById('hall-detail-' + id);
    if (!detail) return;
    var button = detail.querySelector('.venue-toggle'), content = detail.querySelector('.venue-detail-body');
    var open = typeof force === 'boolean' ? force : button.getAttribute('aria-expanded') !== 'true';
    if (open === (button.getAttribute('aria-expanded') === 'true')) return;
    content.hidden = !open; button.setAttribute('aria-expanded', String(open));
    button.firstChild.textContent = open ? '詳細を閉じる' : '詳細を見る'; button.querySelector('span').textContent = open ? '−' : '＋';
    var card = detail.closest('[data-venue]');
    push({event:'venue_open', map_hall:card.querySelector('h3').textContent, venue_id:card.dataset.venue, venue_open:open});
  }
  venueRoot.querySelectorAll('.venue-toggle').forEach(function (button) {
    button.addEventListener('click', function () { openVenue(button.closest('[data-venue]').dataset.venue); });
  });
  venueRoot.querySelectorAll('[data-venue]').forEach(function (card) {
    card.addEventListener('click', function (e) {
      if (!e.target.closest('a,button,summary,.venue-detail-body')) openVenue(card.dataset.venue);
    });
    card.addEventListener('keydown', function (e) {
      if (e.target === card && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openVenue(card.dataset.venue); }
    });
  });
  if (!window.L) { status.textContent = '地図を読み込めませんでした。下の一覧から所在地・詳細をご確認ください。'; return; }
  var halls;
  try { halls = JSON.parse(document.getElementById('hall-map-data').textContent); }
  catch (_) { status.textContent = '地図データを読み込めませんでした。下の一覧をご利用ください。'; return; }
  var compact = window.matchMedia('(pointer: coarse), (max-width: 767px)');
  var map = L.map(root, {dragging:!compact.matches, touchZoom:false, scrollWheelZoom:false, doubleClickZoom:!compact.matches, boxZoom:!compact.matches, zoomSnap:0.25, tapHold:false});
  map.zoomControl.setPosition('topright');
  map.on('popupopen', function () { root.classList.add('has-popup'); });
  map.on('popupclose', function () { root.classList.remove('has-popup'); });
  function lockMap(active) {
    root.classList.toggle('map-unlocked', active);
    button.setAttribute('aria-pressed', String(active));
    button.textContent = active ? 'ページのスクロールに戻る' : '地図を操作する';
    if (!compact.matches || active) { map.dragging.enable(); map.doubleClickZoom.enable(); map.boxZoom.enable(); }
    else { map.dragging.disable(); map.doubleClickZoom.disable(); map.boxZoom.disable(); }
    if (active) map.touchZoom.enable(); else map.touchZoom.disable();
    help.textContent = active ? '地図を動かせます。ページに戻るときは右のボタンを押してください。' : '地図上でも、そのままページをスクロールできます。';
  }
  function syncDevice() { button.hidden = !compact.matches; lockMap(false); }
  button.addEventListener('click', function () { lockMap(button.getAttribute('aria-pressed') !== 'true'); });
  compact.addEventListener('change', syncDevice);
  root.addEventListener('keydown', function (e) { if (e.key === 'Escape') lockMap(false); });
  syncDevice();
  var activeLayer, generation = 0, fallback = false, tileTimer;
  function useTiles(osm) {
    generation++; var current = generation, errors = 0, loaded = 0;
    clearTimeout(tileTimer);
    if (activeLayer) map.removeLayer(activeLayer);
    fallback = osm;
    activeLayer = L.tileLayer(osm ? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png' : 'https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png', {
      minZoom:5, maxZoom:18,
      attribution:osm ? '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>' : '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener noreferrer">地理院タイル</a>'
    });
    activeLayer.on('tileload', function () { if (current !== generation) return; loaded++; clearTimeout(tileTimer); status.textContent = osm ? 'OpenStreetMapを表示しています。' : ''; });
    activeLayer.on('tileerror', function () {
      if (current !== generation) return;
      errors++;
      if (!osm && errors >= 3) { useTiles(true); }
      else if (osm) status.textContent = '地図の一部を読み込めません。下の一覧もご利用いただけます。';
    });
    activeLayer.addTo(map);
    tileTimer = setTimeout(function () {
      if (current !== generation || loaded) return;
      if (!osm) useTiles(true);
      else status.textContent = '背景地図を読み込めませんでした。下の一覧をご利用ください。';
    }, 10000);
  }
  function element(tag, text, cls) { var el = document.createElement(tag); if (text) el.textContent = text; if (cls) el.className = cls; return el; }
  function popup(hall) {
    var panel = element('div', null, 'hall-popup');
    panel.appendChild(element('h3', hall.name));
    panel.appendChild(element('p', hall.address));
    panel.appendChild(element('span', hall.badge, 'badge'));
    if (hall.note) panel.appendChild(element('p', hall.note, 'popup-note'));
    var link = element('a', 'Googleマップで開く', 'gmaps-link');
    link.href = hall.googleMapsUrl; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.dataset.gmaps = hall.id;
    panel.appendChild(link);
    return panel;
  }
  var selectedId = null;
  function highlight(id, scrollList) {
    selectedId = Number(id);
    markers.forEach(function (entry) {
      var active = entry.hall.id === selectedId, el = entry.marker.getElement();
      if (el) el.classList.toggle('is-selected', active);
      entry.marker.setZIndexOffset(active ? 1000 : 0);
      document.getElementById('hall-' + entry.hall.id).classList.toggle('is-selected', active);
    });
    var card = document.getElementById('hall-' + id), list = venueRoot.querySelector('.hall-list');
    if (scrollList && !compact.matches && card) {
      list.scrollTo({top:list.scrollTop + card.getBoundingClientRect().top - list.getBoundingClientRect().top - 5, behavior:'smooth'});
    }
  }
  function mobileSelection(hall) {
    var panel = document.getElementById('venue-map-selection');
    panel.replaceChildren();
    panel.appendChild(element('strong', hall.id + '  ' + hall.name));
    panel.appendChild(element('small', hall.approximate ? '位置は目安です' : hall.badge));
    var btn = element('button', '詳細を見る ↓'); btn.type = 'button';
    btn.addEventListener('click', function () { openVenue(hall.id, true); document.getElementById('hall-' + hall.id).scrollIntoView({behavior:'smooth',block:'start'}); });
    panel.appendChild(btn); panel.hidden = false;
  }
  var markers = halls.map(function (hall) {
    var icon = L.divIcon({className:'hall-marker pin-' + hall.id + ' ' + (hall.type === 'hall' ? 'hall-only' : 'has-crematorium') + (hall.approximate ? ' approximate' : ''), html:'<span>' + hall.id + '</span>', iconSize:[48,48], iconAnchor:[24,44], popupAnchor:[0,-40]});
    var marker = L.marker([hall.latitude, hall.longitude], {icon:icon, title:hall.name + (hall.approximate ? '・位置は目安' : ''), alt:hall.name, keyboard:true});
    marker.on('click', function () {
      push({event:'map_pin', map_hall:hall.name}); highlight(hall.id, true);
      if (compact.matches) { map.closePopup(); mobileSelection(hall); }
      else { marker.bindPopup(popup(hall), {maxWidth:260,minWidth:200,autoPan:false}).openPopup(); }
    });
    var card = document.getElementById('hall-' + hall.id);
    card.addEventListener('mouseenter', function () { highlight(hall.id, false); });
    card.addEventListener('focusin', function () { highlight(hall.id, false); });
    card.addEventListener('click', function () { highlight(hall.id, false); });
    return {hall:hall, marker:marker};
  });
  var region = 'all';
  function showRegion(next) {
    region = next; map.closePopup(); document.getElementById('venue-map-selection').hidden = true; var points = [];
    markers.forEach(function (entry) {
      if (next === 'all' || entry.hall.region === next) { entry.marker.addTo(map); points.push(entry.marker.getLatLng()); }
      else map.removeLayer(entry.marker);
    });
    map.fitBounds(L.latLngBounds(points), {paddingTopLeft:[26,38], paddingBottomRight:[26,38], maxZoom:13, animate:false});
  }
  document.addEventListener('hall-map-filter', function (event) { showRegion(event.detail); });
  var selected = document.querySelector('[data-filter][aria-pressed="true"]');
  showRegion(selected ? selected.dataset.filter : 'all');
  useTiles(false);
  var lastMapWidth = root.clientWidth, lastMapHeight = root.clientHeight;
  new ResizeObserver(function () { if (root.clientWidth === lastMapWidth && root.clientHeight === lastMapHeight) return; lastMapWidth=root.clientWidth; lastMapHeight=root.clientHeight; map.invalidateSize({pan:false}); showRegion(region); }).observe(root);
})();
