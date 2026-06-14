import { Storage } from './storage.js';

const TRACKERS = [
  { id: 'mood',    name: 'Mood',    icon: '🌸', check: v => v !== null },
  { id: 'weather', name: 'Weather', icon: '⛅', check: v => v !== null },
  { id: 'reading', name: 'Reading', icon: '📖', check: v => v !== null },
  { id: 'period',  name: 'Period',  icon: '🌙', check: v => v !== null },
  { id: 'water',   name: 'Water',   icon: '💧', check: v => v !== null },
  { id: 'sleep',   name: 'Sleep',   icon: '✨', check: v => v !== null },
];

const WHEEL_BINARY = ['exercise', 'b12', 'read'];

export function renderHome(container, navigate) {
  const now    = new Date();
  const hour   = now.getHours();
  const y      = now.getFullYear();
  const m      = now.getMonth() + 1;
  const d      = now.getDate();

  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const emoji    = hour < 12 ? '☀️' : hour < 17 ? '🌤️' : '🌙';
  const dateStr  = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  container.innerHTML = `
    <div class="home-greeting">
      <div class="time-label">${greeting} ${emoji}</div>
      <h1 class="font-hand">Ember</h1>
      <div class="date-label">${dateStr}</div>
    </div>

    <div class="home-section">
      <h2>Today</h2>
      <div class="status-strip" id="status-strip"></div>
    </div>

    <div class="home-section" id="streaks-section">
      <h2>Streaks 🔥</h2>
      <div class="streak-list" id="streak-list"></div>
    </div>

    <div style="height:20px"></div>
  `;

  // Status strip
  const strip = container.querySelector('#status-strip');
  TRACKERS.forEach(t => {
    const val    = Storage.getDay(t.id, y, m, d);
    const logged = val !== null;
    const chip   = document.createElement('div');
    chip.className = 'status-chip' + (logged ? ' logged' : '');
    chip.innerHTML = `
      <div class="chip-icon">${t.icon}</div>
      <div class="chip-name">${t.name}</div>
      <div class="chip-dot"></div>
    `;
    chip.addEventListener('click', () => navigate(t.id));
    strip.appendChild(chip);
  });

  // Wheel habits streak
  const habits   = Storage.getWheelHabits();
  const streakEl = container.querySelector('#streak-list');
  const streakItems = [];

  habits.forEach(h => {
    let count = 0;
    let day   = new Date(now);
    while (true) {
      const val = Storage.getDay('wheel', day.getFullYear(), day.getMonth() + 1, day.getDate());
      if (!val || val[h.id] === undefined || val[h.id] === null || val[h.id] === false || val[h.id] === 'none') break;
      count++;
      day.setDate(day.getDate() - 1);
    }
    if (count > 0) streakItems.push({ name: h.name, icon: '🔥', count });
  });

  // Tracker streaks
  TRACKERS.forEach(t => {
    const count = Storage.streak(t.id, v => v !== null);
    if (count > 1) streakItems.push({ name: t.name, icon: '', count });
  });

  if (streakItems.length === 0) {
    streakEl.innerHTML = `<div style="color:var(--text-3);font-size:13px;padding:8px 0">Start logging to build streaks ✨</div>`;
  } else {
    streakItems.sort((a, b) => b.count - a.count).slice(0, 5).forEach(s => {
      const row = document.createElement('div');
      row.className = 'streak-row';
      row.innerHTML = `
        <div class="streak-name">${s.icon} ${s.name}</div>
        <div class="streak-count">${s.count} <span>day${s.count !== 1 ? 's' : ''}</span></div>
      `;
      streakEl.appendChild(row);
    });
  }
}
