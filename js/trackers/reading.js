import { Storage } from '../storage.js?v=2';
import { showSheet, buildTrackerHeader, makeNavState } from '../app.js?v=2';
import { renderMonthRectGrid, renderYearGrid } from './grid-tracker.js?v=2';

const RANGES = [
  { id: '0',    label: '0 pages',    color: '#F0E6D8', min: 0,   max: 0   },
  { id: '20',   label: '1–20 pages', color: '#E8CFA8', min: 1,   max: 20  },
  { id: '40',   label: '21–40 pages',color: '#7EC8C8', min: 21,  max: 40  },
  { id: '60',   label: '41–60 pages',color: '#8BAF8C', min: 41,  max: 60  },
  { id: '80',   label: '61–80 pages',color: '#F2C94C', min: 61,  max: 80  },
  { id: '100',  label: '81–100 pages',color:'#E8B4C8', min: 81,  max: 100 },
  { id: '100p', label: '100+ pages', color: '#C4694F', min: 101, max: Infinity },
];

function pagesColor(pages) {
  if (pages === null || pages === undefined) return 'var(--empty)';
  const entry = typeof pages === 'object' ? pages : { pages };
  const p = typeof pages === 'object' ? pages.pages : pages;
  const r = RANGES.find(r => p >= r.min && p <= r.max);
  return r ? r.color : 'var(--empty)';
}

const colorFn = val => {
  if (!val) return 'var(--empty)';
  const p = typeof val === 'object' ? val.pages : val;
  return pagesColor(p);
};

const labelFn = val => {
  if (!val) return '';
  const p = typeof val === 'object' ? val.pages : val;
  return p > 0 ? String(p) : '';
};

export function renderReading(container, navigate) {
  const now = new Date();
  const nav = makeNavState(now.getFullYear(), now.getMonth() + 1, 'month');

  function draw() {
    container.innerHTML = '';
    buildTrackerHeader(container, {
      title: 'Reading', icon: '📖', onBack: () => navigate('trackers'),
      viewMode: nav.view, onViewToggle: v => { nav.view = v; draw(); },
      period: nav.periodLabel(), onPrev: () => { nav.prev(); draw(); }, onNext: () => { nav.next(); draw(); },
    });

    const content = document.createElement('div');
    content.className = 'page-content';
    const gridWrap = document.createElement('div');
    gridWrap.className = 'grid-fill';

    if (nav.view === 'month') {
      const data = Storage.getMonth('reading', nav.year, nav.month);
      renderMonthRectGrid(gridWrap, { colorFn, labelFn }, data, nav.year, nav.month, (day, current, cell) => {
        openSheet(nav.year, nav.month, day, current, () => {
          const v = Storage.getDay('reading', nav.year, nav.month, day);
          cell.style.background = colorFn(v);
          cell.classList.toggle('filled', v !== null);
          const lbl = cell.querySelector('.rect-label');
          if (lbl) lbl.textContent = labelFn(v);
          if (!v) cell.style.removeProperty('background');
        });
      });

      // Monthly total
      const total = Object.values(Storage.getMonth('reading', nav.year, nav.month))
        .reduce((sum, v) => sum + (typeof v === 'object' ? v.pages : (v || 0)), 0);
      const stats = document.createElement('div');
      stats.className = 'stats-bar';
      stats.innerHTML = `<div class="stat-chip">Pages this month: <span>${total}</span></div>`;
      content.appendChild(gridWrap);
      content.appendChild(stats);
    } else {
      const allData = {};
      for (let m = 1; m <= 12; m++) allData[m] = Storage.getMonth('reading', nav.year, m);
      renderYearGrid(gridWrap, { colorFn }, allData, nav.year, (month, day) => {
        openSheet(nav.year, month, day, Storage.getDay('reading', nav.year, month, day), draw);
      });
      content.appendChild(gridWrap);
    }

    drawLegend(content);
    container.appendChild(content);
  }

  draw();
}

function openSheet(year, month, day, current, onSave) {
  const currPages = current ? (typeof current === 'object' ? current.pages : current) : 0;
  const currBook  = current?.book ?? '';

  showSheet(`Reading — ${monthName(month)} ${day}`, (body, close) => {
    body.innerHTML = `
      <div class="reading-input-wrap">
        <label>Pages read today</label>
        <input class="reading-pages-input" type="number" min="0" max="9999" value="${currPages || ''}" placeholder="0">
        <div class="reading-color-preview" id="color-prev" style="background:${pagesColor(currPages)}"></div>
      </div>
      <input class="book-title-input" type="text" placeholder="Book title (optional)" value="${currBook}">
    `;

    const pagesInput = body.querySelector('.reading-pages-input');
    const preview    = body.querySelector('#color-prev');
    pagesInput.addEventListener('input', () => {
      preview.style.background = pagesColor(Number(pagesInput.value) || 0);
    });

    const save = document.createElement('button');
    save.className = 'btn-save';
    save.textContent = 'Save';
    save.addEventListener('click', () => {
      const p    = parseInt(pagesInput.value) || 0;
      const book = body.querySelector('.book-title-input').value.trim();
      Storage.setDay('reading', year, month, day, { pages: p, book });
      close(); onSave();
    });
    body.appendChild(save);

    if (current !== null) {
      const clr = document.createElement('button');
      clr.className = 'btn-clear';
      clr.textContent = 'Clear entry';
      clr.addEventListener('click', () => { Storage.clearDay('reading', year, month, day); close(); onSave(); });
      body.appendChild(clr);
    }
  });
}

function drawLegend(container) {
  const leg = document.createElement('div');
  leg.className = 'legend';
  RANGES.forEach(r => {
    leg.innerHTML += `<div class="legend-item"><div class="legend-swatch" style="background:${r.color}"></div>${r.label}</div>`;
  });
  container.appendChild(leg);
}

function monthName(m) {
  return new Date(2000, m - 1).toLocaleString('en-US', { month: 'long' });
}
