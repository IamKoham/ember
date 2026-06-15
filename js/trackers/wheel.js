import { Storage } from '../storage.js?v=2';
import { showSheet, makeNavState } from '../app.js?v=2';

const CX = 150, CY = 150, R_OUT = 138, R_IN = 40, GAP_DEG = 0.8;

function polar(cx, cy, r, angleDeg) {
  const rad = (angleDeg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx, cy, r1, r2, a1, a2) {
  const s1 = polar(cx, cy, r2, a1), e1 = polar(cx, cy, r2, a2);
  const s2 = polar(cx, cy, r1, a2), e2 = polar(cx, cy, r1, a1);
  const large = (a2 - a1) > 180 ? 1 : 0;
  return `M${s1.x.toFixed(2)} ${s1.y.toFixed(2)} A${r2} ${r2} 0 ${large} 1 ${e1.x.toFixed(2)} ${e1.y.toFixed(2)} L${s2.x.toFixed(2)} ${s2.y.toFixed(2)} A${r1} ${r1} 0 ${large} 0 ${e2.x.toFixed(2)} ${e2.y.toFixed(2)}Z`;
}

export function renderWheel(container, navigate) {
  const now   = new Date();
  const nav   = makeNavState(now.getFullYear(), now.getMonth() + 1, 'month');

  function draw() {
    container.innerHTML = '';
    const habits  = Storage.getWheelHabits();
    const n       = habits.length;
    const ringW   = n > 0 ? (R_OUT - R_IN) / n : 0;

    // Header
    container.innerHTML = `
      <div class="page-header">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <h1>🔥 Wheel of Habits</h1>
          <button id="btn-settings" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--text-2)" title="Edit habits">⚙️</button>
        </div>
        <div class="nav-controls">
          <div class="view-toggle">
            <button id="btn-month" class="${nav.view==='month'?'active':''}">Month</button>
            <button id="btn-year"  class="${nav.view==='year' ?'active':''}">Year</button>
          </div>
          <div class="month-nav">
            <button id="btn-prev">‹</button>
            <div class="period-label" id="period-label">${nav.periodLabel()}</div>
            <button id="btn-next">›</button>
          </div>
        </div>
      </div>
    `;

    container.querySelector('#btn-settings').addEventListener('click', () => navigate('settings'));
    container.querySelector('#btn-month').addEventListener('click', () => { nav.view = 'month'; draw(); });
    container.querySelector('#btn-year').addEventListener('click',  () => { nav.view = 'year';  draw(); });
    container.querySelector('#btn-prev').addEventListener('click',  () => { nav.prev(); draw(); });
    container.querySelector('#btn-next').addEventListener('click',  () => { nav.next(); draw(); });

    const content = document.createElement('div');
    content.className = 'page-content wheel-page';

    if (nav.view === 'month') {
      drawMonthWheel(content, habits, n, ringW, nav.year, nav.month, now, draw);
    } else {
      drawYearView(content, habits, nav.year);
    }

    container.appendChild(content);
  }

  draw();
}

function drawMonthWheel(container, habits, n, ringW, year, month, now, draw) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const data        = Storage.getMonth('wheel', year, month);
  const degPerDay   = 360 / daysInMonth;
  const isNow       = now.getFullYear() === year && now.getMonth() + 1 === month;

  const svgWrap = document.createElement('div');
  svgWrap.className = 'wheel-svg-wrap';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 300 300');
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svg.style.touchAction = 'manipulation';

  // Background circle
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  bg.setAttribute('cx', CX); bg.setAttribute('cy', CY);
  bg.setAttribute('r', R_OUT); bg.setAttribute('fill', '#F5EDE0');
  svg.appendChild(bg);

  // Inner hole label
  const innerBg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  innerBg.setAttribute('cx', CX); innerBg.setAttribute('cy', CY);
  innerBg.setAttribute('r', R_IN - 2); innerBg.setAttribute('fill', '#FDF6EC');
  svg.appendChild(innerBg);

  const centerText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  centerText.setAttribute('x', CX); centerText.setAttribute('y', CY + 5);
  centerText.setAttribute('text-anchor', 'middle');
  centerText.setAttribute('font-size', '10');
  centerText.setAttribute('fill', '#B89880');
  centerText.setAttribute('font-family', 'Nunito, sans-serif');
  centerText.textContent = new Date(year, month-1).toLocaleString('en-US',{month:'short'});
  svg.appendChild(centerText);

  // Segments
  for (let d = 1; d <= daysInMonth; d++) {
    const dayData = data[d] ?? {};
    const a1 = (d - 1) * degPerDay + GAP_DEG / 2;
    const a2 = d * degPerDay - GAP_DEG / 2;
    const isToday = isNow && now.getDate() === d;

    habits.forEach((habit, hi) => {
      const r1 = R_IN + hi * ringW + 1;
      const r2 = R_IN + (hi + 1) * ringW - 1;
      const val = dayData[habit.id] ?? null;
      const fill = segmentColor(habit, val);

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', arcPath(CX, CY, r1, r2, a1, a2));
      path.setAttribute('fill', fill);
      path.setAttribute('stroke', '#FDF6EC');
      path.setAttribute('stroke-width', '0.5');
      path.classList.add('wheel-seg');

      if (isToday) {
        path.setAttribute('stroke', '#E8903A');
        path.setAttribute('stroke-width', '1.5');
      }

      path.addEventListener('click', () => openDaySheet(year, month, d, data[d] ?? {}, habits, draw));
      svg.appendChild(path);
    });

    // Day number tick marks for every 5 days
    if (d % 5 === 0 || d === 1) {
      const tickAngle = (a1 + a2) / 2;
      const tickOuter = polar(CX, CY, R_OUT + 6, tickAngle);
      const tick = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      tick.setAttribute('x', tickOuter.x.toFixed(1));
      tick.setAttribute('y', tickOuter.y.toFixed(1));
      tick.setAttribute('text-anchor', 'middle');
      tick.setAttribute('dominant-baseline', 'middle');
      tick.setAttribute('font-size', '7');
      tick.setAttribute('fill', '#B89880');
      tick.setAttribute('font-family', 'Nunito, sans-serif');
      tick.textContent = d;
      svg.appendChild(tick);
    }
  }

  svgWrap.appendChild(svg);
  container.appendChild(svgWrap);

  // Legend
  const legend = document.createElement('div');
  legend.className = 'wheel-legend';
  habits.forEach(h => {
    const streak = habitStreak(h, year, month);
    const row = document.createElement('div');
    row.className = 'wheel-legend-row';
    row.innerHTML = `
      <div class="wheel-legend-dot" style="background:${h.color}"></div>
      <div class="wheel-legend-name">${h.name}</div>
      <div class="wheel-legend-streak">${streak > 0 ? `🔥 ${streak}d` : ''}</div>
    `;
    legend.appendChild(row);
  });
  container.appendChild(legend);

  // Log today button
  const fab = document.createElement('button');
  fab.className = 'wheel-fab';
  fab.innerHTML = `<span>✏️</span> Log Today`;
  fab.addEventListener('click', () => {
    const today = now.getDate();
    const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month;
    const day   = isCurrentMonth ? today : 1;
    openDaySheet(year, month, day, Storage.getMonth('wheel', year, month)[day] ?? {}, habits, draw);
  });
  container.appendChild(fab);
}

function drawYearView(container, habits, year) {
  const months  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const wrap    = document.createElement('div');
  wrap.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:12px;';

  months.forEach((mName, mi) => {
    const m     = mi + 1;
    const data  = Storage.getMonth('wheel', year, m);
    const days  = new Date(year, m, 0).getDate();
    const degPerDay = 360 / days;
    const n     = habits.length;
    const ringW = n > 0 ? (50 - 15) / n : 0;

    const card  = document.createElement('div');
    card.style.cssText = 'background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:8px;text-align:center;';

    const title = document.createElement('div');
    title.style.cssText = 'font-size:12px;font-weight:700;color:var(--text-2);margin-bottom:4px;';
    title.textContent = mName;
    card.appendChild(title);

    // Mini wheel SVG
    const miniSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    miniSvg.setAttribute('viewBox', '0 0 100 100');
    miniSvg.style.cssText = 'width:100%;max-width:80px;';

    const mbg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    mbg.setAttribute('cx', 50); mbg.setAttribute('cy', 50);
    mbg.setAttribute('r', 50); mbg.setAttribute('fill', '#F5EDE0');
    miniSvg.appendChild(mbg);

    for (let d = 1; d <= days; d++) {
      const dayData = data[d] ?? {};
      const a1 = (d-1) * degPerDay + 0.5;
      const a2 = d * degPerDay - 0.5;
      habits.forEach((habit, hi) => {
        const r1 = 15 + hi * ringW + 0.5;
        const r2 = 15 + (hi+1) * ringW - 0.5;
        const fill = segmentColor(habit, dayData[habit.id] ?? null);
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', arcPath(50, 50, r1, r2, a1, a2));
        path.setAttribute('fill', fill);
        miniSvg.appendChild(path);
      });
    }

    const mhole = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    mhole.setAttribute('cx', 50); mhole.setAttribute('cy', 50);
    mhole.setAttribute('r', 13); mhole.setAttribute('fill', '#FDF6EC');
    miniSvg.appendChild(mhole);

    card.appendChild(miniSvg);
    wrap.appendChild(card);
  });

  container.appendChild(wrap);
}

function segmentColor(habit, val) {
  if (val === null || val === undefined) return '#EDE0D0';
  if (habit.type === 'binary') return val === true ? habit.color : '#EDE0D0';
  if (habit.type === 'traffic') {
    const colors = habit.colors ?? ['#8BAF8C', '#F2C94C', '#C4694F'];
    if (val === 0 || val === 'green')  return colors[0];
    if (val === 1 || val === 'yellow') return colors[1];
    if (val === 2 || val === 'red')    return colors[2];
  }
  return '#EDE0D0';
}

function habitStreak(habit, year, month) {
  const now   = new Date();
  let count   = 0;
  let d       = new Date(now);
  while (true) {
    const val = (Storage.getDay('wheel', d.getFullYear(), d.getMonth()+1, d.getDate()) ?? {})[habit.id];
    if (val === null || val === undefined || val === false) break;
    count++;
    d.setDate(d.getDate() - 1);
  }
  return count;
}

function openDaySheet(year, month, day, dayData, habits, onSave) {
  showSheet(`Habits — ${new Date(year, month-1, day).toLocaleDateString('en-US',{month:'short',day:'numeric'})}`, (body, close) => {
    const list = document.createElement('div');
    list.className = 'habit-log-list';

    const state = { ...dayData };

    habits.forEach(habit => {
      const item = document.createElement('div');
      item.className = 'habit-log-item';
      item.innerHTML = `
        <div class="habit-log-label">
          <div class="dot" style="background:${habit.color}"></div>
          ${habit.name}
        </div>
        <div class="habit-log-options" id="opts-${habit.id}"></div>
      `;

      const optsEl = item.querySelector(`#opts-${habit.id}`);

      if (habit.type === 'binary') {
        [{ label: '✓ Done', val: true }, { label: '✗ Skip', val: false }].forEach(opt => {
          const btn = document.createElement('button');
          btn.className = 'habit-log-opt' + (state[habit.id] === opt.val ? ' selected' : '');
          btn.textContent = opt.label;
          btn.addEventListener('click', () => {
            optsEl.querySelectorAll('.habit-log-opt').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            state[habit.id] = opt.val;
          });
          optsEl.appendChild(btn);
        });
      } else if (habit.type === 'traffic') {
        const labels = habit.labels ?? ['Low', 'Med', 'High'];
        const vals   = ['green', 'yellow', 'red'];
        labels.forEach((lbl, i) => {
          const btn = document.createElement('button');
          btn.className = 'habit-log-opt' + (state[habit.id] === vals[i] ? ' selected' : '');
          btn.textContent = lbl;
          btn.addEventListener('click', () => {
            optsEl.querySelectorAll('.habit-log-opt').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            state[habit.id] = vals[i];
          });
          optsEl.appendChild(btn);
        });
      }

      list.appendChild(item);
    });

    body.appendChild(list);

    const save = document.createElement('button');
    save.className = 'btn-save';
    save.style.marginTop = '16px';
    save.textContent = 'Save';
    save.addEventListener('click', () => {
      const existing = Storage.getDay('wheel', year, month, day) ?? {};
      Storage.setDay('wheel', year, month, day, { ...existing, ...state });
      close(); onSave();
    });
    body.appendChild(save);
  });
}
