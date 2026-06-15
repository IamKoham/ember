import { Storage } from '../storage.js?v=2';
import { showSheet, buildTrackerHeader, makeNavState } from '../app.js?v=2';
import { renderMonthRectGrid, renderYearGrid } from './grid-tracker.js?v=2';

function hoursColor(h) {
  if (h === null || h === undefined) return 'var(--empty)';
  if (h < 5)  return '#C4694F';
  if (h < 6)  return '#E8903A';
  if (h < 7)  return '#F2C94C';
  if (h < 8)  return '#8BAF8C';
  if (h < 9)  return '#7EC8C8';
  return '#7BAFC4';
}

const colorFn = val => hoursColor(val?.hours ?? val);
const labelFn = val => {
  const h = val?.hours ?? val;
  return h !== null && h !== undefined ? `${h}h` : '';
};

export function renderSleep(container, navigate) {
  const now = new Date();
  const nav = makeNavState(now.getFullYear(), now.getMonth() + 1, 'month');

  function draw() {
    container.innerHTML = '';
    buildTrackerHeader(container, {
      title: 'Sleep', icon: '✨', onBack: () => navigate('trackers'),
      viewMode: nav.view, onViewToggle: v => { nav.view = v; draw(); },
      period: nav.periodLabel(), onPrev: () => { nav.prev(); draw(); }, onNext: () => { nav.next(); draw(); },
    });

    const content = document.createElement('div');
    content.className = 'page-content';
    const gridWrap = document.createElement('div');
    gridWrap.className = 'grid-fill';

    if (nav.view === 'month') {
      const data = Storage.getMonth('sleep', nav.year, nav.month);
      renderMonthRectGrid(gridWrap, { colorFn, labelFn }, data, nav.year, nav.month, (day, current, cell) => {
        openSheet(nav.year, nav.month, day, current, () => {
          const v = Storage.getDay('sleep', nav.year, nav.month, day);
          cell.style.background = v ? colorFn(v) : '';
          cell.classList.toggle('filled', v !== null);
          const lbl = cell.querySelector('.rect-label');
          if (lbl) lbl.textContent = v ? labelFn(v) : '';
          if (!v) cell.style.removeProperty('background');
        });
      });

      const vals  = Object.values(data).map(v => v?.hours ?? v).filter(v => v !== null && v !== undefined);
      const avg   = vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1) : '—';
      const best  = vals.length ? Math.max(...vals) : '—';
      const stats = document.createElement('div');
      stats.className = 'stats-bar';
      stats.innerHTML = `
        <div class="stat-chip">Avg: <span>${avg}h</span></div>
        <div class="stat-chip">Best: <span>${best}h</span></div>
      `;
      content.appendChild(gridWrap);
      content.appendChild(stats);
    } else {
      const allData = {};
      for (let m = 1; m <= 12; m++) allData[m] = Storage.getMonth('sleep', nav.year, m);
      renderYearGrid(gridWrap, { colorFn }, allData, nav.year, (month, day) => {
        openSheet(nav.year, month, day, Storage.getDay('sleep', nav.year, month, day), draw);
      });
      content.appendChild(gridWrap);
    }

    drawLegend(content);
    container.appendChild(content);
  }

  draw();
}

function openSheet(year, month, day, current, onSave) {
  const currBed  = current?.bed  ?? '';
  const currWake = current?.wake ?? '';
  const currHours = current?.hours ?? null;

  showSheet(`Sleep — ${monthName(month)} ${day}`, (body, close) => {
    body.innerHTML = `
      <div class="time-inputs">
        <div class="time-field">
          <label>Bedtime</label>
          <input type="time" id="bed-input" value="${currBed}">
        </div>
        <div class="time-field">
          <label>Wake time</label>
          <input type="time" id="wake-input" value="${currWake}">
        </div>
      </div>
      <div class="sleep-hours-display" id="hours-display">${currHours !== null ? currHours + 'h' : '—'}</div>
    `;

    const bedEl  = body.querySelector('#bed-input');
    const wakeEl = body.querySelector('#wake-input');
    const dispEl = body.querySelector('#hours-display');

    function calcHours() {
      if (!bedEl.value || !wakeEl.value) { dispEl.textContent = '—'; return null; }
      const [bh, bm] = bedEl.value.split(':').map(Number);
      const [wh, wm] = wakeEl.value.split(':').map(Number);
      let mins = (wh * 60 + wm) - (bh * 60 + bm);
      if (mins < 0) mins += 24 * 60;
      const h = Math.round(mins / 60 * 10) / 10;
      dispEl.textContent = `${h}h`;
      dispEl.style.color = hoursColor(h);
      return h;
    }

    bedEl.addEventListener('change', calcHours);
    wakeEl.addEventListener('change', calcHours);

    const save = document.createElement('button');
    save.className = 'btn-save';
    save.textContent = 'Save';
    save.addEventListener('click', () => {
      const h = calcHours();
      if (h !== null) {
        Storage.setDay('sleep', year, month, day, { bed: bedEl.value, wake: wakeEl.value, hours: h });
      }
      close(); onSave();
    });
    body.appendChild(save);

    if (current !== null) {
      const clr = document.createElement('button');
      clr.className = 'btn-clear';
      clr.textContent = 'Clear entry';
      clr.addEventListener('click', () => { Storage.clearDay('sleep', year, month, day); close(); onSave(); });
      body.appendChild(clr);
    }
  });
}

function drawLegend(container) {
  const items = [
    { color: '#C4694F', label: '< 5h' },
    { color: '#E8903A', label: '5–6h' },
    { color: '#F2C94C', label: '6–7h' },
    { color: '#8BAF8C', label: '7–8h ✓' },
    { color: '#7EC8C8', label: '8–9h' },
    { color: '#7BAFC4', label: '9h+' },
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
