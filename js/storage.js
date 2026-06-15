// All data lives in localStorage under keys like: ember_mood_2026-06
// No user data ever touches the network or git repo.

const PREFIX = 'ember_';

export const Storage = {
  key(tracker, year, month) {
    return `${PREFIX}${tracker}_${year}-${String(month).padStart(2, '0')}`;
  },

  getMonth(tracker, year, month) {
    const raw = localStorage.getItem(this.key(tracker, year, month));
    return raw ? JSON.parse(raw) : {};
  },

  getDay(tracker, year, month, day) {
    return this.getMonth(tracker, year, month)[day] ?? null;
  },

  setDay(tracker, year, month, day, value) {
    const data = this.getMonth(tracker, year, month);
    data[day] = value;
    localStorage.setItem(this.key(tracker, year, month), JSON.stringify(data));
  },

  clearDay(tracker, year, month, day) {
    const data = this.getMonth(tracker, year, month);
    delete data[day];
    localStorage.setItem(this.key(tracker, year, month), JSON.stringify(data));
  },

  // Wheel habits config stored separately
  getWheelHabits() {
    const raw = localStorage.getItem(`${PREFIX}wheel_habits`);
    return raw ? JSON.parse(raw) : defaultWheelHabits();
  },

  setWheelHabits(habits) {
    localStorage.setItem(`${PREFIX}wheel_habits`, JSON.stringify(habits));
  },

  // Streak: count consecutive days with a logged value
  streak(tracker, valueCheck) {
    const today = new Date();
    let count = 0;
    let d = new Date(today);
    while (true) {
      const val = this.getDay(tracker, d.getFullYear(), d.getMonth() + 1, d.getDate());
      if (val === null || val === undefined || !valueCheck(val)) break;
      count++;
      d.setDate(d.getDate() - 1);
    }
    return count;
  }
};

function defaultWheelHabits() {
  return [
    { id: 'exercise',  name: 'Exercise',   color: '#E8903A', type: 'binary' },
    { id: 'b12',       name: 'B12 Vitamin', color: '#F2C94C', type: 'binary' },
    { id: 'sugar',     name: 'Sugar',       color: '#8BAF8C', type: 'traffic',
      labels: ['≤2 spoons', '3–4 spoons', '5+ spoons'],
      colors: ['#8BAF8C', '#F2C94C', '#C4694F'] },
    { id: 'instagram', name: 'Instagram',   color: '#9B8EC4', type: 'traffic',
      labels: ['< 1 hr', '1–2 hrs', '2+ hrs'],
      colors: ['#8BAF8C', '#F2C94C', '#C4694F'] }
  ];
}
