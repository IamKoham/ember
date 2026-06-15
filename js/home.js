import { Storage } from './storage.js';

const TRACKERS = [
  { id: 'mood',    name: 'Mood',    icon: '🌸' },
  { id: 'weather', name: 'Weather', icon: '⛅' },
  { id: 'reading', name: 'Reading', icon: '📖' },
  { id: 'period',  name: 'Period',  icon: '🌙' },
  { id: 'water',   name: 'Water',   icon: '💧' },
  { id: 'sleep',   name: 'Sleep',   icon: '✨' },
];

export function renderHome(container, navigate) {
  const now    = new Date();
  const hour   = now.getHours();
  const y      = now.getFullYear();
  const m      = now.getMonth() + 1;
  const d      = now.getDate();

  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const emoji    = hour < 12 ? '☀️' : hour < 17 ? '🌤️' : '🌙';
  const dateStr  = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  // Count logged trackers today
  const loggedCount = TRACKERS.filter(t => Storage.getDay(t.id, y, m, d) !== null).length;
  const total = TRACKERS.length;
  const pct = Math.round((loggedCount / total) * 100);

  container.innerHTML = `
    <div class="home-greeting">
      <div class="time-label">${greeting} ${emoji}</div>
      <h1 class="font-hand">Ember</h1>
      <div class="date-label">${dateStr}</div>
    </div>

    <div class="home-section">
      <div class="today-progress-row">
        <span class="today-label">Today</span>
        <span class="today-count">${loggedCount}/${total} logged</span>
      </div>
      <div class="today-progress-bar">
        <div class="today-progress-fill" style="width:${pct}%"></div>
      </div>
      <div class="status-strip" id="status-strip"></div>
    </div>

    <div class="home-section" id="habits-section"></div>

    <div style="height:12px"></div>
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

  // Wheel habits with streaks — only show if any data exists
  const habits   = Storage.getWheelHabits();
  const habitSection = container.querySelector('#habits-section');
  const rows = [];

  habits.forEach(h => {
    let count = 0;
    let day = new Date(now);
    while (count < 366) {
      const val = (Storage.getDay('wheel', day.getFullYear(), day.getMonth() + 1, day.getDate()) ?? {})[h.id];
      if (val === null || val === undefined || val === false) break;
      count++;
      day.setDate(day.getDate() - 1);
    }
    if (count > 0) rows.push({ h, count });
  });

  if (rows.length > 0) {
    habitSection.innerHTML = `<h2 style="font-family:Caveat,cursive;font-size:20px;margin-bottom:8px">Habit Streaks 🔥</h2>`;
    const list = document.createElement('div');
    list.className = 'streak-list';
    rows.forEach(({ h, count }) => {
      const row = document.createElement('div');
      row.className = 'streak-row';
      row.innerHTML = `
        <div class="streak-name" style="display:flex;align-items:center;gap:8px">
          <div style="width:10px;height:10px;border-radius:3px;background:${h.color};flex-shrink:0"></div>
          ${h.name}
        </div>
        <div class="streak-count">${count} <span>day${count !== 1 ? 's' : ''}</span></div>
      `;
      list.appendChild(row);
    });
    habitSection.appendChild(list);
  }
}
