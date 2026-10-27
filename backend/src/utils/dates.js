function dateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function workingDaysBetween(
  startDate,
  endDate,
  weekendDays = [0, 6],
  holidays = [],
) {
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    start > end
  )
    return 0;
  const holidaySet = new Set(holidays);
  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const key = dateKey(current);
    if (!weekendDays.includes(current.getDay()) && !holidaySet.has(key))
      count += 1;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

function monthRange(month) {
  const [year, number] = month.split("-").map(Number);
  const lastDay = new Date(year, number, 0).getDate();
  return {
    start: `${month}-01`,
    end: `${month}-${String(lastDay).padStart(2, "0")}`,
    days: lastDay,
  };
}

function taxForAnnualGross(annualGross) {
  if (annualGross <= 600000) return 0;
  if (annualGross <= 1200000) return (annualGross - 600000) * 0.05;
  if (annualGross <= 2400000) return 30000 + (annualGross - 1200000) * 0.15;
  if (annualGross <= 3600000) return 210000 + (annualGross - 2400000) * 0.25;
  return 510000 + (annualGross - 3600000) * 0.35;
}

module.exports = { dateKey, workingDaysBetween, monthRange, taxForAnnualGross };
