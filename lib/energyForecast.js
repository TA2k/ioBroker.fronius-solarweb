'use strict';

const QUARTER_HOUR_MINUTES = 15;
const HOUR_MINUTES = 60;
const MS_PER_MINUTE = 60 * 1000;

function pad(n) {
  return n.toString().padStart(2, '0');
}

function formatLocalDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getLocalDayStart(date, dayOffset = 0) {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  dayStart.setDate(dayStart.getDate() + dayOffset);
  return dayStart;
}

function createSlots(dayStart, slotMinutes) {
  const slots = [];
  const slotsPerDay = (24 * HOUR_MINUTES) / slotMinutes;
  for (let index = 0; index < slotsPerDay; index += 1) {
    const start = new Date(dayStart.getTime() + index * slotMinutes * MS_PER_MINUTE);
    const end = new Date(start.getTime() + slotMinutes * MS_PER_MINUTE);
    const label = slotMinutes === HOUR_MINUTES ? pad(start.getHours()) : `${pad(start.getHours())}_${pad(start.getMinutes())}`;
    slots.push({
      label,
      start,
      end,
      durationSeconds: slotMinutes * 60,
      value: 0,
    });
  }
  return slots;
}

function getEnergyExpected(record) {
  if (!record || !Array.isArray(record.channels)) {
    return null;
  }

  const channel = record.channels.find((item) => {
    const name = item && item.channelName ? String(item.channelName) : '';
    return /EnergyExpected|Expected|EnergyProduction|EnergyPV|PvEnergy|PV|Production/i.test(name);
  });
  const value = Number(channel && channel.value);
  return Number.isFinite(value) ? value : null;
}

function addRecordToSlots(record, slots) {
  const value = getEnergyExpected(record);
  const durationSeconds = Number(record && record.logDuration);
  const start = new Date(record && record.logDateTime);

  if (value === null || !Number.isFinite(durationSeconds) || durationSeconds <= 0 || Number.isNaN(start.getTime())) {
    return;
  }

  const end = new Date(start.getTime() + durationSeconds * 1000);

  if (slots.length === 0 || end.getTime() <= slots[0].start.getTime() || start.getTime() >= slots[slots.length - 1].end.getTime()) {
    return;
  }

  const durationMs = end.getTime() - start.getTime();
  for (const slot of slots) {
    const overlapStart = Math.max(start.getTime(), slot.start.getTime());
    const overlapEnd = Math.min(end.getTime(), slot.end.getTime());
    const overlapMs = overlapEnd - overlapStart;
    if (overlapMs > 0) {
      slot.value += value * (overlapMs / durationMs);
    }
  }
}

function roundEnergy(value) {
  return Math.round(value * 1000) / 1000;
}

function calculateTodayRemainingFromSlots(todaySlots, now = new Date()) {
  let remaining = 0;
  for (const slot of todaySlots) {
    if (slot.end.getTime() <= now.getTime()) {
      continue;
    }
    if (slot.start.getTime() >= now.getTime()) {
      remaining += slot.value;
      continue;
    }

    const remainingMs = slot.end.getTime() - now.getTime();
    const durationMs = slot.end.getTime() - slot.start.getTime();
    if (remainingMs > 0 && durationMs > 0) {
      remaining += slot.value * (remainingMs / durationMs);
    }
  }
  return roundEnergy(remaining);
}

function normalizeEnergyForecast(todayRecords = [], tomorrowRecords = [], now = new Date()) {
  const todayStart = getLocalDayStart(now, 0);
  const tomorrowStart = getLocalDayStart(now, 1);
  const todayDate = formatLocalDate(todayStart);
  const tomorrowDate = formatLocalDate(tomorrowStart);
  const today15m = createSlots(todayStart, QUARTER_HOUR_MINUTES);
  const tomorrowHourly = createSlots(tomorrowStart, HOUR_MINUTES);

  for (const record of Array.isArray(todayRecords) ? todayRecords : []) {
    addRecordToSlots(record, today15m);
  }
  for (const record of Array.isArray(tomorrowRecords) ? tomorrowRecords : []) {
    addRecordToSlots(record, tomorrowHourly);
  }

  for (const slot of today15m) {
    slot.value = roundEnergy(slot.value);
  }
  for (const slot of tomorrowHourly) {
    slot.value = roundEnergy(slot.value);
  }

  const todayWh = roundEnergy(today15m.reduce((sum, slot) => sum + slot.value, 0));
  const tomorrowWh = roundEnergy(tomorrowHourly.reduce((sum, slot) => sum + slot.value, 0));

  return {
    todayDate,
    tomorrowDate,
    today15m,
    tomorrowHourly,
    summary: {
      todayWh,
      todayRemainingWh: calculateTodayRemainingFromSlots(today15m, now),
      tomorrowWh,
      recordCount: (Array.isArray(todayRecords) ? todayRecords.length : 0) + (Array.isArray(tomorrowRecords) ? tomorrowRecords.length : 0),
      updatedAt: now.toISOString(),
      remainingUpdatedAt: now.toISOString(),
    },
  };
}

function getForecastRowValidityUpdates(objectIds = [], basePath, namespace, currentLength) {
  const indexedRows = new Map();
  const namespacePrefix = namespace ? `${namespace}.` : '';

  for (const objectId of Array.isArray(objectIds) ? objectIds : []) {
    const relativeObjectId = namespacePrefix && objectId.startsWith(namespacePrefix) ? objectId.slice(namespacePrefix.length) : objectId;
    if (!relativeObjectId || !relativeObjectId.startsWith(`${basePath}.`)) {
      continue;
    }

    const match = relativeObjectId.slice(basePath.length + 1).match(/^(\d+)(?:\.|$)/);
    if (!match) {
      continue;
    }

    const rowIndex = Number(match[1]);
    if (!Number.isFinite(rowIndex)) {
      continue;
    }

    indexedRows.set(rowIndex, match[1]);
  }

  return Array.from(indexedRows.entries())
    .sort(([leftIndex], [rightIndex]) => leftIndex - rightIndex)
    .map(([rowIndex, rowKey]) => ({
      root: `${basePath}.${rowKey}`,
      rowIndex,
      valid: rowIndex <= currentLength,
    }));
}

module.exports = {
  calculateTodayRemainingFromSlots,
  formatLocalDate,
  getForecastRowValidityUpdates,
  getLocalDayStart,
  normalizeEnergyForecast,
};
