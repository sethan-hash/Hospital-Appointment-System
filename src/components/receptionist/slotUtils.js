/**
 * Helper to compute available slot strings ("H:MM AM/PM")
 * based on doctor schedules and a chosen YYYY-MM-DD date.
 */
export function generateSlotsForDate(schedule, dateStr) {
  if (!schedule || !Array.isArray(schedule) || schedule.length === 0 || !dateStr) {
    return [];
  }

  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3) return [];
  const [y, m, d] = parts;
  const targetDay = new Date(y, m - 1, d).getDay();
  const dayName = DAY_NAMES[targetDay];

  const dayEntry = schedule.find((s) => s.day === dayName && s.available);
  if (!dayEntry || !dayEntry.hours) return [];

  const parseTime12 = (str) => {
    const [timePart, period] = str.trim().split(' ');
    let [h, min] = timePart.split(':').map(Number);
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return h * 60 + min;
  };

  try {
    const [startStr, endStr] = dayEntry.hours.split(' - ');
    const startMins = parseTime12(startStr);
    const endMins = parseTime12(endStr);
    const step = dayEntry.slotDurationMinutes || 30;

    const slots = [];
    for (let mins = startMins; mins + step <= endMins; mins += step) {
      const h24 = Math.floor(mins / 60);
      const min = mins % 60;
      const suffix = h24 >= 12 ? 'PM' : 'AM';
      const h12 = h24 % 12 || 12;
      slots.push(`${h12}:${String(min).padStart(2, '0')} ${suffix}`);
    }
    return slots;
  } catch (err) {
    console.error('Error generating slots for schedule entry:', err);
    return [];
  }
}
