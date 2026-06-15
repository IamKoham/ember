import { renderHome } from './home.js';
import { renderMood } from './trackers/mood.js';
import { renderWeather } from './trackers/weather.js';
import { renderReading } from './trackers/reading.js';
import { renderPeriod } from './trackers/period.js';
import { renderWater } from './trackers/water.js';
import { renderSleep } from './trackers/sleep.js';
import { renderWheel } from './trackers/wheel.js';
import { renderSettings } from './settings.js';

const app = document.getElementById('app');

// Current page and tracker state
let currentPage = 'home';
let currentTracker = null;

// Router
const routes = {
  home:     () => renderHome(app, navigate),
  trackers: () => renderTrackerHub(app, navigate),
  wheel:    () => renderWheel(app, navigate),
  settings: () => renderSettings(app, navigate),
  mood:     () => renderMood(app, navigate),
  weather:  () => renderWeather(app, navigate),
  reading:  () => renderReading(app, navigate),
  period:   () => renderPeriod(app, navigate),
  water:    () => renderWater(app, navigate),
  sleep:    () => renderSleep(app, navigate),
};

export function navigate(page, pushState = true) {
  currentPage = page;
  app.innerHTML = '';
  // Briefly block pointer events so the tap that triggered navigation
  // doesn't also fire on newly rendered elements underneath
  app.style.pointerEvents = 'none';
  updateNav(page);
  const render = routes[page];
  if (render) render();
  requestAnimationFrame(() => requestAnimationFrame(() => { app.style.pointerEvents = ''; }));
  // Push to browser history so the hardware back button navigates within the app
  if (pushState) {
    const backDest = ['mood','weather','reading','period','water','sleep'].includes(page)
      ? 'trackers' : page === 'settings' ? 'wheel' : null;
    history.pushState({ page, backDest }, '', `#${page}`);
  }
}

function updateNav(page) {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === page ||
      (btn.dataset.page === 'trackers' && ['mood','weather','reading','period','water','sleep'].includes(page)));
  });
}

function renderTrackerHub(container, nav) {
  const trackers = [
    { id: 'mood',    name: 'Mood',    icon: '🌸', desc: 'How are you feeling?' },
    { id: 'weather', name: 'Weather', icon: '⛅', desc: 'What\'s the sky like?' },
    { id: 'reading', name: 'Reading', icon: '📖', desc: 'Pages read today' },
    { id: 'period',  name: 'Period',  icon: '🌙', desc: 'Cycle tracking' },
    { id: 'water',   name: 'Water',   icon: '💧', desc: 'Glasses of water' },
    { id: 'sleep',   name: 'Sleep',   icon: '✨', desc: 'Hours of rest' },
  ];

  container.innerHTML = `
    <div class="page-header">
      <h1>Trackers</h1>
      <div class="subtitle">Tap a tracker to log or explore</div>
    </div>
    <div class="trackers-hub" id="trackers-hub"></div>
  `;

  const hub = container.querySelector('#trackers-hub');
  trackers.forEach(t => {
    const card = document.createElement('div');
    card.className = 'tracker-card';
    card.innerHTML = `
      <div class="tracker-card-icon">${t.icon}</div>
      <div class="tracker-card-info">
        <div class="tracker-card-name">${t.name}</div>
        <div class="tracker-card-last">${t.desc}</div>
      </div>
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="color:var(--text-3)">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
      </svg>
    `;
    card.addEventListener('click', () => nav(t.id));
    hub.appendChild(card);
  });
}

// ── Bottom sheet utility (used by all trackers) ──
export function showSheet(titleText, buildBody, onClose) {
  const overlay = document.createElement('div');
  overlay.className = 'sheet-overlay';
  overlay.innerHTML = `
    <div class="sheet">
      <div class="sheet-handle"></div>
      <div class="sheet-title">${titleText}</div>
      <div class="sheet-body" id="sheet-body"></div>
    </div>
  `;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('open'));

  const close = () => {
    overlay.classList.remove('open');
    overlay.addEventListener('transitionend', () => {
      overlay.remove();
      if (onClose) onClose();
    }, { once: true });
  };

  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  buildBody(overlay.querySelector('#sheet-body'), close);
  return close;
}

// ── Page header builder (used by trackers) ──
export function buildTrackerHeader(container, { title, icon, onBack, viewMode, onViewToggle, period, onPrev, onNext, extra }) {
  const header = document.createElement('div');
  header.className = 'page-header';
  header.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px">
      <button id="btn-back" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--text-2);padding:0 4px 0 0">‹</button>
      <h1>${icon} ${title}</h1>
      ${extra || ''}
    </div>
    <div class="nav-controls">
      <div class="view-toggle">
        <button id="btn-month" class="${viewMode==='month'?'active':''}">Month</button>
        <button id="btn-year"  class="${viewMode==='year' ?'active':''}">Year</button>
      </div>
      <div class="month-nav">
        <button id="btn-prev">‹</button>
        <div class="period-label" id="period-label">${period}</div>
        <button id="btn-next">›</button>
      </div>
    </div>
  `;

  header.querySelector('#btn-back').addEventListener('click', onBack);
  header.querySelector('#btn-month').addEventListener('click', () => onViewToggle('month'));
  header.querySelector('#btn-year').addEventListener('click',  () => onViewToggle('year'));
  header.querySelector('#btn-prev').addEventListener('click', onPrev);
  header.querySelector('#btn-next').addEventListener('click', onNext);

  container.appendChild(header);
  return header;
}

// ── Month/year navigation helper ──
export function makeNavState(initYear, initMonth, initView = 'month') {
  const state = {
    year: initYear,
    month: initMonth,
    view: initView,
    periodLabel() {
      if (this.view === 'year') return String(this.year);
      return new Date(this.year, this.month - 1, 1)
        .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    },
    prev() {
      if (this.view === 'year') { this.year--; return; }
      this.month--;
      if (this.month < 1) { this.month = 12; this.year--; }
    },
    next() {
      const now = new Date();
      if (this.view === 'year') {
        if (this.year < now.getFullYear()) this.year++;
        return;
      }
      const nextYear  = this.month === 12 ? this.year + 1 : this.year;
      const nextMonth = this.month === 12 ? 1 : this.month + 1;
      if (nextYear > now.getFullYear() || (nextYear === now.getFullYear() && nextMonth > now.getMonth() + 1)) return;
      this.year  = nextYear;
      this.month = nextMonth;
    }
  };
  return state;
}

// ── Init ──
export function initApp() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.page));
  });

  // Hardware back button navigates within the app instead of exiting
  window.addEventListener('popstate', e => {
    const page = e.state?.page;
    const back = e.state?.backDest;
    navigate(back || page || 'home', false);
  });

  history.replaceState({ page: 'home', backDest: null }, '', '#home');
  navigate('home', false);
}
