import { Storage } from '../storage.js';
import { showSheet, buildTrackerHeader, makeNavState } from '../app.js';
import { renderMonthRectGrid } from './grid-tracker.js';

const MOODS = [
  { id: 'happy',     label: 'Happy',     color: '#F2C94C', emoji: '😊' },
  { id: 'energetic', label: 'Energetic', color: '#E8903A', emoji: '⚡' },
  { id: 'okay',      label: 'Okay',      color: '#8BAF8C', emoji: '😐' },
  { id: 'tired',     label: 'Tired',     color: '#7BAFC4', emoji: '😴' },
  { id: 'sad',       label: 'Sad',       color: '#9B8EC4', emoji: '😢' },
  { id: 'angry',     label: 'Angry',     color: '#C4694F', emoji: '😤' },
];

const moodMap = Object.fromEntries(MOODS.map(m => [m.id, m]));
const colorFn = val => moodMap[val]?.color ?? 'var(--empty)';
const labelFn = val => moodMap[val]?.emoji ?? '';

export function renderMood(container, navigate) {
  const now = new Date();
  const nav = makeNavState(now.getFullYear(), now.getMonth() + 1, 'month');

  function draw() {
    container.innerHTML = '';
    buildTrackerHeader(container, {
      title: 'Mood', icon: '🌸', onBack: () => navigate('trackers'),
      viewMode: nav.view, onViewToggle: v => { nav.view = v; draw(); },
      period: nav.periodLabel(), onPrev: () => { nav.prev(); draw(); }, onNext: () => { nav.next(); draw(); },
    });

    const content = document.createElement('div');
    content.className = 'page-content';
    const gridWrap = document.createElement('div');

    if (nav.view === 'month') {
      const data = Storage.getMonth('mood', nav.year, nav.month);
      renderMonthRectGrid(gridWrap, { colorFn, labelFn }, data, nav.year, nav.month, (day, current, cell) => {
        openMoodSheet(nav.year, nav.month, day, current, () => {
          const v = Storage.getDay('mood', nav.year, nav.month, day);
          cell.style.background = v ? colorFn(v) : '';
          cell.classList.toggle('filled', v !== null);
          const lbl = cell.querySelector('.rect-label');
          if (lbl) lbl.textContent = v ? labelFn(v) : '';
          if (!v) cell.style.removeProperty('background');
        });
      });
    } else {
      drawYearView(gridWrap, nav.year);
    }

    content.appendChild(gridWrap);
    drawLegend(content);
    container.appendChild(content);
  }

  draw();
}

function drawYearView(container, year) {
  const now    = new Date();
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const wrap   = document.createElement('div');
  wrap.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:12px;';

  months.forEach((mName, mi) => {
    const m    = mi + 1;
    const data = Storage.getMonth('mood', year, m);
    const days = new Date(year, m, 0).getDate();

    const card = document.createElement('div');
    card.style.cssText = 'background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:8px;';

    const title = document.createElement('div');
    title.style.cssText = 'font-size:12px;font-weight:700;color:var(--text-2);margin-bottom:5px;';
    title.textContent = mName;
    card.appendChild(title);

    const mini = document.createElement('div');
    mini.style.cssText = 'display:grid;grid-template-columns:repeat(7,1fr);gap:2px;';

    for (let d = 1; d <= days; d++) {
      const val  = data[d] ?? null;
      const mood = val ? moodMap[val] : null;
      const isToday = now.getFullYear() === year && now.getMonth() + 1 === m && now.getDate() === d;
      const dot  = document.createElement('div');
      dot.style.cssText = `aspect-ratio:1;border-radius:3px;background:${mood ? mood.color : 'var(--empty)'};${isToday ? 'outline:1.5px solid var(--accent);outline-offset:1px;' : ''}`;
      mini.appendChild(dot);
    }

    card.appendChild(mini);
    wrap.appendChild(card);
  });

  container.innerHTML = '';
  container.appendChild(wrap);
}

function openMoodSheet(year, month, day, current, onSave) {
  showSheet(`Mood — ${monthName(month)} ${day}`, (body, close) => {
    const grid = document.createElement('div');
    grid.className = 'option-grid';

    MOODS.forEach(m => {
      const btn = document.createElement('button');
      btn.className = 'option-btn' + (current === m.id ? ' selected' : '');
      btn.innerHTML = `
        <div class="option-emoji">${m.emoji}</div>
        <div class="option-swatch" style="background:${m.color}"></div>
        <div class="option-label">${m.label}</div>
      `;
      btn.addEventListener('click', () => {
        grid.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        current = m.id;
      });
      grid.appendChild(btn);
    });

    body.appendChild(grid);

    const save = document.createElement('button');
    save.className = 'btn-save';
    save.textContent = 'Save';
    save.addEventListener('click', () => {
      if (current) Storage.setDay('mood', year, month, day, current);
      close(); onSave();
    });
    body.appendChild(save);

    if (Storage.getDay('mood', year, month, day) !== null) {
      const clr = document.createElement('button');
      clr.className = 'btn-clear';
      clr.textContent = 'Clear entry';
      clr.addEventListener('click', () => {
        Storage.clearDay('mood', year, month, day);
        current = null;
        close(); onSave();
      });
      body.appendChild(clr);
    }
  });
}

function drawLegend(container) {
  const leg = document.createElement('div');
  leg.className = 'legend';
  leg.style.marginTop = '16px';
  MOODS.forEach(m => {
    leg.innerHTML += `<div class="legend-item"><div class="legend-swatch" style="background:${m.color}"></div>${m.emoji} ${m.label}</div>`;
  });
  container.appendChild(leg);
}

function monthName(m) {
  return new Date(2000, m - 1, 1).toLocaleString('en-US', { month: 'long' });
}
