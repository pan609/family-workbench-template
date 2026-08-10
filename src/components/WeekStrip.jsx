const shortDayNames = ['一', '二', '三', '四', '五', '六', '日'];
const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const fullDayNames = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];

function asLocalDate(value = new Date()) {
  if (value instanceof Date) return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 12);
  const [year, month, day] = String(value).split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

export function localISO(date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function shiftDate(value, amount) {
  const date = asLocalDate(value);
  date.setDate(date.getDate() + amount);
  return localISO(date);
}

export function startOfWeek(value = new Date()) {
  const date = asLocalDate(value);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return date;
}

export function weekDays(anchor = new Date()) {
  const start = startOfWeek(anchor);
  return dayNames.map((name, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      name,
      fullName: fullDayNames[index],
      shortName: shortDayNames[index],
      iso: localISO(date),
      day: date.getDate(),
      month: date.getMonth() + 1,
      year: date.getFullYear(),
    };
  });
}

export function isCurrentWeek(anchor) {
  return localISO(startOfWeek(anchor)) === localISO(startOfWeek(new Date()));
}

export function weekRangeLabel(days) {
  const first = days[0];
  const last = days[days.length - 1];
  if (first.year !== last.year) return `${first.year}年${first.month}月${first.day}日—${last.year}年${last.month}月${last.day}日`;
  if (first.month !== last.month) return `${first.month}月${first.day}日—${last.month}月${last.day}日`;
  return `${first.month}月${first.day}日—${last.day}日`;
}

export function WeekStrip({ selectedDate, days, onSelect, onPrevious, onNext, onCurrent }) {
  const today = localISO(new Date());
  const currentWeek = isCurrentWeek(days[0].iso);

  return (
    <section className="calendar-bar" aria-label="日期与周切换">
      <div className="week-navigator">
        <button className="week-arrow" type="button" aria-label="上一周" onClick={onPrevious}>‹</button>
        <div className="week-period">
          <strong>{weekRangeLabel(days)}</strong>
          {currentWeek
            ? <span className="week-badge">本周</span>
            : <button className="week-current-button" type="button" onClick={onCurrent}>回到本周</button>}
        </div>
        <button className="week-arrow" type="button" aria-label="下一周" onClick={onNext}>›</button>
      </div>
      <div className="week-strip" aria-label="选择日期">
        {days.map((date) => {
          const selected = selectedDate === date.iso;
          const isToday = date.iso === today;
          return (
            <button
              className="day-button"
              data-selected={selected || undefined}
              data-today={isToday || undefined}
              key={date.iso}
              type="button"
              aria-label={`${date.month}月${date.day}日${date.fullName}${isToday ? '，今天' : ''}`}
              aria-pressed={selected}
              onClick={() => onSelect(date.iso)}
            >
              <span>{date.shortName}</span>
              <strong>{date.day}</strong>
              <small>{isToday ? '今天' : '\u00a0'}</small>
            </button>
          );
        })}
      </div>
    </section>
  );
}
