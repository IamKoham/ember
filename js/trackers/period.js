import { Storage } from '../storage.js?v=2';
import { showSheet, buildTrackerHeader, makeNavState } from '../app.js?v=2';
import { renderMonthRectGrid, renderYearGrid } from './grid-tracker.js?v=2';

const OPTIONS = [
  { id: 'none',   label: 'None',     color: '#F0E6D8', emoji: '○' },
  { id: 'spot',   label: 'Spotting', color: '#F5C6D0', emoji: '·' },
  { id: 'light',  label: 'Light',    color: '#E8A0B0', emoji: '●' },
  { id: 'medium', label: 'Medium',   color: '#D4607A', emoji: '●' },
  { id: 'heavy',  label: 'Heavy',    color: '#A83050', emoji: '●' },
  { id: 'pms',    label: 'PMS / Symptoms', color: '#C4B0D8', emoji: '~' },
];

const optMap  = Object.fromEntries(OPTIONS.map(o => [o.id, o]));
const colorFn = val => optMap[val]?.color ?? 'var(--empty)';
const labelFn = val => optMap[val]?.emoji ?? '';

export function renderPeriod(container, navigate) {
  const now = new Date();
  const nav = makeNavState(now.getFullYear(), now.getMonth() + 1, 'month');

  function draw() {
    container.innerHTML = '';
    buildTrackerHeader(container, {
      title: 'Period', icon: '🌙', onBack: () => navigate('trackers'),
      viewMode: nav.view, onViewToggle: v => { nav.view = v; draw(); },
      period: nav.periodLabel(), onPrev: () => { nav.prev(); draw(); }, onNext: () => { nav.next(); draw(); },
    });

    const content = document.createElement('div');
    content.className = 'page-content';
    const gridWrap = document.createElement('div');
    gridWrap.className = 'grid-fill';

    if (nav.view === 'month') {
      const data = Storage.getMonth('period', nav.year, nav.month);
      renderMonthRectGrid(gridWrap, { colorFn, labelFn }, data, nav.year, nav.month, (day, current, cell) => {
        openSheet(nav.year, nav.month, day, current, () => {
          const v = Storage.getDay('period', nav.year, nav.month, day);
          cell.style.background = v ? colorFn(v) : '';
          cell.classList.toggle('filled', v !== null);
          const lbl = cell.querySelector('.rect-label');
          if (lbl) lbl.textContent = v ? labelFn(v) : '';
          if (!v) cell.style.removeProperty('background');
        });
      });
    } else {
      const allData = {};
      for (let m = 1; m <= 12; m++) allData[m] = Storage.getMonth('period', nav.year, m);
      renderYearGrid(gridWrap, { colorFn }, allData, nav.year, (month, day) => {
        openSheet(nav.year, month, day, Storage.getDay('period', nav.year, month, day), draw);
      });
    }

    content.appendChild(gridWrap);
    drawLegend(content);
    container.appendChild(content);
  }

  draw();
}

function openSheet(year, month, day, current, onSave) {
  showSheet(`Period — ${monthName(month)} ${day}`, (body, close) => {
    const grid = document.createElement('div');
    grid.className = 'option-grid';

    OPTIONS.forEach(o => {
      const btn = document.createElement('button');
      btn.className = 'option-btn' + (current === o.id ? ' selected' : '');
      btn.innerHTML = `
        <div class="option-swatch" style="background:${o.color};border-radius:8px;"></div>
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
      if (current) Storage.setDay('period', year, month, day, current);
      close(); onSave();
    });
    body.appendChild(save);

    if (Storage.getDay('period', year, month, day) !== null) {
      const clr = document.createElement('button');
      clr.className = 'btn-clear';
      clr.textContent = 'Clear entry';
      clr.addEventListener('click', () => { Storage.clearDay('period', year, month, day); close(); onSave(); });
      body.appendChild(clr);
    }
  });
}

function drawLegend(container) {
  const leg = document.createElement('div');
  leg.className = 'legend';
  OPTIONS.forEach(o => {
    leg.innerHTML += `<div class="legend-item"><div class="legend-swatch" style="background:${o.color}"></div>${o.label}</div>`;
  });
  container.appendChild(leg);
}

function monthName(m) {
  return new Date(2000, m - 1).toLocaleString('en-US', { month: 'long' });
}
