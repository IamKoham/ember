// Shared grid rendering for all trackers

// Month view: 7-column rectangular grid (sequential days, no DOW alignment)
// Looks like a bullet journal color grid — cozy and compact.
export function renderMonthRectGrid(container, { colorFn, labelFn }, data, year, month, onTap) {
  const today = new Date();
  const daysInMonth = new Date(year, month, 0).getDate();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;

  const grid = document.createElement('div');
  grid.className = 'rect-grid';

  for (let d = 1; d <= daysInMonth; d++) {
    const val = data[d] ?? null;
    const isToday = isCurrentMonth && today.getDate() === d;
    const color = val !== null ? colorFn(val) : null;

    const cell = document.createElement('div');
    cell.className = 'rect-cell' + (isToday ? ' today' : '') + (val !== null ? ' filled' : '');
    if (color) cell.style.background = color;

    const num = document.createElement('span');
    num.className = 'rect-day-num';
    num.textContent = d;
    cell.appendChild(num);

    if (labelFn && val !== null) {
      const lbl = document.createElement('span');
      lbl.className = 'rect-label';
      lbl.textContent = labelFn(val);
      cell.appendChild(lbl);
    }

    cell.addEventListener('click', () => onTap(d, val, cell));
    grid.appendChild(cell);
  }

  // Pad to complete the last row of 7
  const remainder = daysInMonth % 7;
  if (remainder !== 0) {
    for (let i = 0; i < 7 - remainder; i++) {
      const pad = document.createElement('div');
      pad.className = 'rect-cell empty-pad';
      grid.appendChild(pad);
    }
  }

  container.innerHTML = '';
  container.appendChild(grid);
}

export function renderYearGrid(container, { colorFn }, allData, year, onTap) {
  const today = new Date();
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const wrap = document.createElement('div');
  wrap.className = 'year-grid-wrap';

  const grid = document.createElement('div');
  grid.className = 'year-grid';

  // Header row: empty corner + 12 month names
  const corner = document.createElement('div');
  grid.appendChild(corner);
  months.forEach(m => {
    const h = document.createElement('div');
    h.className = 'ygrid-header';
    h.textContent = m;
    grid.appendChild(h);
  });

  // 31 day rows
  for (let d = 1; d <= 31; d++) {
    const dayNum = document.createElement('div');
    dayNum.className = 'ygrid-daynum';
    dayNum.textContent = d;
    grid.appendChild(dayNum);

    for (let m = 1; m <= 12; m++) {
      const daysInM = new Date(year, m, 0).getDate();
      const cell = document.createElement('div');

      if (d > daysInM) {
        cell.className = 'ygrid-cell';
        cell.style.background = 'transparent';
        cell.style.pointerEvents = 'none';
      } else {
        const isToday = today.getFullYear() === year && today.getMonth() + 1 === m && today.getDate() === d;
        const val = (allData[m] ?? {})[d] ?? null;
        cell.className = 'ygrid-cell' + (isToday ? ' today' : '');
        if (val !== null) cell.style.background = colorFn(val);
        cell.addEventListener('click', () => onTap(m, d, val));
      }

      grid.appendChild(cell);
    }
  }

  wrap.appendChild(grid);
  container.innerHTML = '';
  container.appendChild(wrap);
}
