import { Storage } from './storage.js';

const PALETTE = [
  '#E8903A','#F2C94C','#8BAF8C','#7EC8C8','#7BAFC4','#9B8EC4',
  '#C4694F','#E8B4C8','#D4607A','#4A6FA5','#F7D070','#A8D4EA',
];

export function renderSettings(container, navigate) {
  let habits = Storage.getWheelHabits().map(h => ({ ...h }));

  function draw() {
    container.innerHTML = `
      <div class="page-header">
        <div style="display:flex;align-items:center;gap:10px">
          <button id="btn-back" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--text-2)">‹</button>
          <h1>⚙️ Habits</h1>
        </div>
      </div>
      <div class="settings-page">
        <div class="sub">Customize your Wheel of Habits. Changes apply to new logging only.</div>
        <div class="habit-list" id="habit-list"></div>
        <button class="btn-add-habit" id="btn-add">＋ Add habit</button>
        <button class="btn-settings-save" id="btn-save">Save changes</button>
      </div>
    `;

    container.querySelector('#btn-back').addEventListener('click', () => navigate('wheel'));

    const listEl = container.querySelector('#habit-list');
    habits.forEach((h, i) => renderHabitItem(listEl, h, i, habits, draw));

    container.querySelector('#btn-add').addEventListener('click', () => {
      habits.push({
        id: `habit_${Date.now()}`,
        name: 'New Habit',
        color: PALETTE[habits.length % PALETTE.length],
        type: 'binary',
      });
      draw();
    });

    container.querySelector('#btn-save').addEventListener('click', () => {
      // Sync edits from DOM before saving
      habits.forEach((h, i) => {
        const nameEl = container.querySelector(`#habit-name-${i}`);
        if (nameEl) h.name = nameEl.value.trim() || h.name;
        if (h.type === 'traffic') {
          const l0 = container.querySelector(`#label-${i}-0`);
          const l1 = container.querySelector(`#label-${i}-1`);
          const l2 = container.querySelector(`#label-${i}-2`);
          if (l0) h.labels = [l0.value, l1?.value ?? '', l2?.value ?? ''];
        }
      });
      Storage.setWheelHabits(habits.filter(h => h.name));
      navigate('wheel');
    });
  }

  draw();
}

function renderHabitItem(listEl, habit, i, habits, redraw) {
  const item = document.createElement('div');
  item.className = 'habit-item';

  const row = document.createElement('div');
  row.className = 'habit-item-row';

  // Color dot
  const dot = document.createElement('div');
  dot.className = 'habit-color-dot';
  dot.style.background = habit.color;
  dot.addEventListener('click', e => showColorPicker(e, dot, habit, redraw));

  // Name input
  const nameInput = document.createElement('input');
  nameInput.className = 'habit-name-input';
  nameInput.id = `habit-name-${i}`;
  nameInput.value = habit.name;
  nameInput.addEventListener('input', () => { habit.name = nameInput.value; });

  // Type toggle
  const typeBadge = document.createElement('button');
  typeBadge.className = 'habit-type-badge';
  typeBadge.textContent = habit.type === 'binary' ? 'Yes/No' : '3-Level';
  typeBadge.title = 'Toggle type';
  typeBadge.addEventListener('click', () => {
    habit.type = habit.type === 'binary' ? 'traffic' : 'binary';
    if (habit.type === 'traffic' && !habit.labels) {
      habit.labels = ['Option 1', 'Option 2', 'Option 3'];
      habit.colors = ['#8BAF8C', '#F2C94C', '#C4694F'];
    }
    redraw();
  });

  // Delete
  const del = document.createElement('button');
  del.className = 'habit-delete';
  del.textContent = '✕';
  del.addEventListener('click', () => {
    habits.splice(i, 1);
    redraw();
  });

  row.appendChild(dot);
  row.appendChild(nameInput);
  row.appendChild(typeBadge);
  row.appendChild(del);
  item.appendChild(row);

  // Traffic labels
  if (habit.type === 'traffic') {
    const trafficRow = document.createElement('div');
    trafficRow.className = 'traffic-labels';
    (habit.labels ?? ['Low', 'Medium', 'High']).forEach((lbl, li) => {
      const inp = document.createElement('input');
      inp.className = 'traffic-label-input';
      inp.id = `label-${i}-${li}`;
      inp.value = lbl;
      inp.placeholder = `Level ${li + 1}`;
      inp.addEventListener('input', () => {
        if (!habit.labels) habit.labels = ['', '', ''];
        habit.labels[li] = inp.value;
      });
      trafficRow.appendChild(inp);
    });
    item.appendChild(trafficRow);
  }

  listEl.appendChild(item);
}

function showColorPicker(e, dot, habit, redraw) {
  e.stopPropagation();
  document.querySelectorAll('.color-popover').forEach(p => p.remove());

  const pop = document.createElement('div');
  pop.className = 'color-popover';

  const rect = dot.getBoundingClientRect();
  pop.style.cssText = `position:fixed;top:${rect.bottom + 6}px;left:${Math.max(8, rect.left - 40)}px;`;

  PALETTE.forEach(c => {
    const d = document.createElement('div');
    d.className = 'color-dot-opt' + (habit.color === c ? ' selected' : '');
    d.style.background = c;
    d.addEventListener('click', () => {
      habit.color = c;
      dot.style.background = c;
      pop.remove();
    });
    pop.appendChild(d);
  });

  document.body.appendChild(pop);
  setTimeout(() => document.addEventListener('click', () => pop.remove(), { once: true }), 0);
}
