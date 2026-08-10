const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

export function localISO(date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function startOfWeek(date = new Date()) {
  const value = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = value.getDay() || 7;
  value.setDate(value.getDate() - day + 1);
  return value;
}

export function weekDays() {
  const start = startOfWeek();
  return dayNames.map((name, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return { name, iso: localISO(date), day: date.getDate(), month: date.getMonth() + 1 };
  });
}

export function WeekStrip({ selectedDate, onSelect }) {
  const today = localISO(new Date());
  return (
    <div className="week-strip" aria-label="选择日期">
      {weekDays().map((date) => {
        const selected = selectedDate === date.iso;
        return (
          <button
            className="day-button"
            data-selected={selected || undefined}
            key={date.iso}
            aria-pressed={selected}
            onClick={() => onSelect(date.iso)}
          >
            <span>{date.name}</span>
            <strong>{date.month}/{date.day}</strong>
            {date.iso === today && <small>今天</small>}
          </button>
        );
      })}
    </div>
  );
}
