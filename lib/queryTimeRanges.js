'use strict';

function pad(n) {
  return n.toString().padStart(2, '0');
}

function formatIsoLocal(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function formatDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getQueryTimeRanges(date) {
  const todayStart = new Date(date);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(date);
  todayEnd.setHours(23, 59, 59, 0);

  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setHours(23, 59, 59, 0);

  return {
    historyDate: formatDate(date),
    forecastTodayFrom: formatIsoLocal(todayStart),
    forecastTodayTo: formatIsoLocal(todayEnd),
    forecastTomorrowFrom: formatIsoLocal(tomorrowStart),
    forecastTomorrowTo: formatIsoLocal(tomorrowEnd),
  };
}

module.exports = { getQueryTimeRanges };
