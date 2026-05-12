'use strict';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Returns the start of a local calendar day.
 *
 * @param {Date} date
 * @param {number} dayOffset
 */
function getLocalDayStart(date, dayOffset = 0) {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  dayStart.setDate(dayStart.getDate() + dayOffset);
  return dayStart.getTime();
}

/**
 * Builds the time windows used for Solar.web endpoints with from/to query
 * parameters.
 *
 * Historical data and the energy forecast use different windows:
 * - historical data looks into the past,
 * - energy forecast is requested per local calendar day.
 *
 * Solar.web rejects ranges larger than 24 hours, so today and tomorrow are
 * requested as separate windows.
 *
 * @param {Date} date
 */
function getQueryTimeRanges(date) {
  const now = date.getTime();
  const forecastTodayFrom = getLocalDayStart(date, 0);
  const forecastTomorrowFrom = getLocalDayStart(date, 1);

  return {
    now,
    historyFrom: now + 5000 - ONE_DAY_MS,
    forecastTodayFrom,
    forecastTodayTo: forecastTodayFrom + ONE_DAY_MS,
    forecastTomorrowFrom,
    forecastTomorrowTo: forecastTomorrowFrom + ONE_DAY_MS,
  };
}

module.exports = {
  getQueryTimeRanges,
};
