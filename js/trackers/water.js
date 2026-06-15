import { Storage } from '../storage.js?v=2';
import { showSheet, buildTrackerHeader, makeNavState } from '../app.js?v=2';
import { renderMonthRectGrid, renderYearGrid } from './grid-tracker.js?v=2';

const GOAL = 8;

function glassesColor(n) {
  if (n === null || n === undefined) return 'var(--empty)';
  if (n === 0)  return '#F0E6D8';
  if (n <= 2)   return '#D4EAF5';
  if (n <= 4)   return '#A8D4EA';
  if (n <= 6)   return '#70B8D8';
  if (n <= GOAL)return '#4A9EC4';
  return '#2A7FA8';
}

const colorFn = val => glassesColor(val);
const labelFn = val => val !== null && val !== undefined ? `${val}` : '';

export function renderWater(container, navigate) {
  const now = new Date();
  const nav = makeNavState(now.getFullYear(), now.getMonth() + 1, 'month');

  function draw() {
    container.innerHTML = '';
    buildTrackerHeader(container, {
      title: 'Water', icon: '💧', onBack: () => navigate('trackers'),
      viewMode: nav.view, onViewToggle: v => { nav.view = v; draw(); },
      period: nav.periodLabel(), onPrev: () => { nav.prev(); draw(); }, onNext: () => { nav.next(); draw(); },
    });

    const content = document.createElement('div');
    content.className = 'page-content';
    const gridWrap = document.createElement('div');
    gridWrap.className = 'grid-fill';

    if (nav.view === 'month') {
      const data = Storage.getMonth('water', nav.year, nav.month);
      renderMonthRectGrid(gridWrap, { colorFn, labelFn }, data, nav.year, nav.month, (day, current, cell) => {
        openSheet(nav.year, nav.month, day, current ?? 0, () => {
          const v = Storage.getDay('water', nav.year, nav.month, day);
          cell.style.background = colorFn(v);
          cell.classList.toggle('filled', v !== null);
          const lbl = cell.querySelector('.rect-label');
          if (lbl) lbl.textContent = labelFn(v);
        });
      });

      const vals    = Object.values(data).filter(v => v !== null);
      const goalDays = vals.filter(v => v >= GOAL).length;
      const avg     = vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1) : '—';
      const stats   = document.createElement('div');
      stats.className = 'stats-bar';
      stats.innerHTML = `
        <div class="stat-chip">Avg: <span>${avg} glasses</span></div>
        <div class="stat-chip">Goal days: <span>${goalDays}</span></div>
      `;
      content.appendChild(gridWrap);
      content.appendChild(stats);
    } else {
      const allData = {};
      for (let m = 1; m <= 12; m++) allData[m] = Storage.getMonth('water', nav.year, m);
      renderYearGrid(gridWrap, { colorFn }, allData, nav.year, (month, day) => {
        openSheet(nav.year, month, day, Storage.getDay('water', nav.year, month, day) ?? 0, draw);
      });
      content.appendChild(gridWrap);
    }

    drawLegend(content);
    container.appendChild(content);
  }

  draw();
}

function openSheet(year, month, day, current, onSave) {
  showSheet(`Water — ${monthName(month)} ${day}`, (body, close) => {
    let val = current ?? 0;

    body.innerHTML = `
      <div style="text-align:center;color:var(--text-2);font-size:13px;margin-bottom:4px;">1 glass = 250ml</div>
      <div class="stepper">
        <button class="stepper-btn" id="btn-minus">−</button>
        <div>
          <div class="stepper-value" id="stepper-val">${val}</div>
          <div class="stepper-unit">glasses</div>
        </div>
        <button class="stepper-btn" id="btn-plus">+</button>
      </div>
      <div style="text-align:center;margin-bottom:12px;">
        <span style="font-size:13px;color:var(--text-3)">Daily goal: ${GOAL} glasses</span>
        <div style="height:8px;border-radius:4px;background:var(--bg-muted);margin:8px 20px 0;overflow:hidden;">
          <div id="water-bar" style="height:100%;border-radius:4px;background:var(--accent);transition:width 0.3s;width:${Math.min(val/GOAL*100,100)}%"></div>
        </div>
      </div>
    `;

    const valEl = body.querySelector('#stepper-val');
    const bar   = body.querySelector('#water-bar');

    body.querySelector('#btn-minus').addEventListener('click', () => {
      if (val > 0) val--;
      valEl.textContent = val;
      bar.style.width = Math.min(val/GOAL*100,100) + '%';
    });
    body.querySelector('#btn-plus').addEventListener('click', () => {
      val++;
      valEl.textContent = val;
      bar.style.width = Math.min(val/GOAL*100,100) + '%';
    });

    const save = document.createElement('button');
    save.className = 'btn-save';
    save.textContent = 'Save';
    save.addEventListener('click', () => {
      Storage.setDay('water', year, month, day, val);
      close(); onSave();
    });
    body.appendChild(save);
  });
}

function drawLegend(container) {
  const items = [
    { color: '#F0E6D8', label: '0 glasses' },
    { color: '#D4EAF5', label: '1–2' },
    { color: '#A8D4EA', label: '3–4' },
    { color: '#70B8D8', label: '5–6' },
    { color: '#4A9EC4', label: '7–8 (goal)' },
    { color: '#2A7FA8', label: '8+' },
  ];
  const leg = document.createElement('div');
  leg.className = 'legend';
  items.forEach(i => {
    leg.innerHTML += `<div class="legend-item"><div class="legend-swatch" style="background:${i.color}"></div>${i.label}</div>`;
  });
  container.appendChild(leg);
}

function monthName(m) {
  return new Date(2000, m - 1).toLocaleString('en-US', { month: 'long' });
}
