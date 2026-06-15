import { Storage } from '../storage.js?v=2';
import { showSheet, buildTrackerHeader, makeNavState } from '../app.js?v=2';
import { renderMonthRectGrid, renderYearGrid } from './grid-tracker.js?v=2';

const OPTIONS = [
  { id: 'sunny',   label: 'Sunny',        color: '#F7D070', emoji: '☀️' },
  { id: 'partly',  label: 'Partly Cloudy', color: '#F5B96E', emoji: '⛅' },
  { id: 'cloudy',  label: 'Cloudy',        color: '#C0C8D0', emoji: '☁️' },
  { id: 'rainy',   label: 'Rainy',         color: '#7BAFC4', emoji: '🌧️' },
  { id: 'stormy',  label: 'Stormy',        color: '#4A6FA5', emoji: '⛈️' },
  { id: 'snowy',   label: 'Snowy',         color: '#C8E0F0', emoji: '❄️' },
  { id: 'windy',   label: 'Windy',         color: '#7EC8C8', emoji: '💨' },
];

const optMap = Object.fromEntries(OPTIONS.map(o => [o.id, o]));
const colorFn = val => optMap[val]?.color ?? 'var(--empty)';
const labelFn = val => optMap[val]?.emoji ?? '';

export function renderWeather(container, navigate) {
  const now = new Date();
  const nav = makeNavState(now.getFullYear(), now.getMonth() + 1, 'month');

  function draw() {
    container.innerHTML = '';
    buildTrackerHeader(container, {
      title: 'Weather', icon: '⛅', onBack: () => navigate('trackers'),
      viewMode: nav.view, onViewToggle: v => { nav.view = v; draw(); },
      period: nav.periodLabel(), onPrev: () => { nav.prev(); draw(); }, onNext: () => { nav.next(); draw(); },
    });

    const content = document.createElement('div');
    content.className = 'page-content';
    const gridWrap = document.createElement('div');
    gridWrap.className = 'grid-fill';

    if (nav.view === 'month') {
      const data = Storage.getMonth('weather', nav.year, nav.month);
      renderMonthRectGrid(gridWrap, { colorFn, labelFn }, data, nav.year, nav.month, (day, current, cell) => {
        openSheet(nav.year, nav.month, day, current, () => {
          const v = Storage.getDay('weather', nav.year, nav.month, day);
          cell.style.background = v ? colorFn(v) : '';
          cell.classList.toggle('filled', v !== null);
          const lbl = cell.querySelector('.rect-label');
          if (lbl) lbl.textContent = v ? labelFn(v) : '';
          if (!v) cell.style.removeProperty('background');
        });
      });
    } else {
      const allData = {};
      for (let m = 1; m <= 12; m++) allData[m] = Storage.getMonth('weather', nav.year, m);
      renderYearGrid(gridWrap, { colorFn }, allData, nav.year, (month, day) => {
        openSheet(nav.year, month, day, Storage.getDay('weather', nav.year, month, day), draw);
      });
    }

    content.appendChild(gridWrap);
    drawLegend(content);
    container.appendChild(content);
  }

  draw();
}

function openSheet(year, month, day, current, onSave) {
  showSheet(`Weather — ${monthName(month)} ${day}`, (body, close) => {
    const grid = document.createElement('div');
    grid.className = 'option-grid';

    OPTIONS.forEach(o => {
      const btn = document.createElement('button');
      btn.className = 'option-btn' + (current === o.id ? ' selected' : '');
      btn.innerHTML = `
        <div class="option-emoji">${o.emoji}</div>
        <div class="option-swatch" style="background:${o.color}"></div>
        <div class="option-label">${o.label}</div>
      `;
      btn.addEventListener('click', () => {
        grid.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        current = o.id;
      });
      grid.appendChild(btn);
    });

    body.appendChild(grid);

    const save = document.createElement('button');
    save.className = 'btn-save';
    save.textContent = 'Save';
    save.addEventListener('click', () => {
      if (current) Storage.setDay('weather', year, month, day, current);
      close(); onSave();
    });
    body.appendChild(save);

    if (Storage.getDay('weather', year, month, day) !== null) {
      const clr = document.createElement('button');
      clr.className = 'btn-clear';
      clr.textContent = 'Clear entry';
      clr.addEventListener('click', () => { Storage.clearDay('weather', year, month, day); close(); onSave(); });
      body.appendChild(clr);
    }
  });
}

function drawLegend(container) {
  const leg = document.createElement('div');
  leg.className = 'legend';
  OPTIONS.forEach(o => {
    leg.innerHTML += `<div class="legend-item"><div class="legend-swatch" style="background:${o.color}"></div>${o.emoji} ${o.label}</div>`;
  });
  container.appendChild(leg);
}

function monthName(m) {
  return new Date(2000, m - 1).toLocaleString('en-US', { month: 'long' });
}
