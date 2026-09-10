const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function monthRange(month) {
  if (typeof month !== 'string' || !MONTH_PATTERN.test(month)) throw new Error('Invalid month');

  const year = Number(month.slice(0, 4));
  const monthNumber = Number(month.slice(5, 7));
  const endYear = monthNumber === 12 ? year + 1 : year;
  const endMonth = monthNumber === 12 ? 1 : monthNumber + 1;

  return {
    start: `${month}-01`,
    end: `${String(endYear).padStart(4, '0')}-${String(endMonth).padStart(2, '0')}-01`
  };
}

export function num(v) {
  return v === null || v === undefined ? 0 : Number(v);
}

export function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
