
export const getDateRangeForCalendarChart = (dateStrings) => {
  return {
    min: dateStrings.reduce((min, current) => (current < min ? current : min)),
    max: dateStrings.reduce((max, current) => (current > max ? current : max))
  }
};

export const getValueRangeForCalendarChart = (values) => {
  return { min: Math.min(...values), max: Math.max(...values) };
};

export const getCalendarChartMargin = (isPortrait) => {
  return isPortrait
    ? { top: 30, right: 0, bottom: 20, left: 20 }
    : { top: 30, right: 40, bottom: 20, left: 40 };
};

export const calculateValueRange = (data) => {
  const values = data.map((item) => item.value);
  return { min: Math.min(...values), max: Math.max(...values) };
};

