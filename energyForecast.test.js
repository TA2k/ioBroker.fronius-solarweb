// @ts-nocheck
'use strict';

const assert = require('assert');
const { calculateTodayRemainingFromSlots, getForecastRowValidityUpdates, normalizeEnergyForecast } = require('./lib/energyForecast');

function record(logDateTime, logDuration, value) {
  return {
    logDateTime,
    logDuration,
    channels: [
      {
        channelName: 'EnergyExpected',
        value,
      },
    ],
  };
}

describe('energy forecast normalization', () => {
  it('aggregates tomorrow 15-minute and hourly records into stable hourly slots', () => {
    const now = new Date(2026, 4, 13, 12, 0, 0);
    const normalized = normalizeEnergyForecast(
      [],
      [
        record('2026-05-14T00:00:00', 900, 10),
        record('2026-05-14T00:15:00', 900, 20),
        record('2026-05-14T00:30:00', 900, 30),
        record('2026-05-14T00:45:00', 900, 40),
        record('2026-05-14T01:00:00', 3600, 200),
      ],
      now,
    );

    assert.strictEqual(normalized.tomorrowHourly.find((slot) => slot.label === '00').value, 100);
    assert.strictEqual(normalized.tomorrowHourly.find((slot) => slot.label === '01').value, 200);
    assert.strictEqual(normalized.summary.tomorrowWh, 300);
    assert.strictEqual(normalized.summary.recordCount, 5);
  });

  it('splits hourly today records into stable 15-minute slots', () => {
    const now = new Date(2026, 4, 13, 0, 0, 0);
    const normalized = normalizeEnergyForecast(
      [record('2026-05-13T01:00:00', 3600, 60)],
      [],
      now,
    );

    for (const label of ['01_00', '01_15', '01_30', '01_45']) {
      assert.strictEqual(normalized.today15m.find((slot) => slot.label === label).value, 15);
    }
    assert.strictEqual(normalized.summary.todayWh, 60);
  });

  it('keeps only the overlapping part of records at day boundaries', () => {
    const now = new Date(2026, 4, 13, 0, 0, 0);
    const normalized = normalizeEnergyForecast(
      [record('2026-05-12T23:45:00', 3600, 40)],
      [],
      now,
    );

    assert.strictEqual(normalized.today15m.find((slot) => slot.label === '00_00').value, 10);
    assert.strictEqual(normalized.today15m.find((slot) => slot.label === '00_15').value, 10);
    assert.strictEqual(normalized.today15m.find((slot) => slot.label === '00_30').value, 10);
    assert.strictEqual(normalized.summary.todayWh, 30);
  });

  it('calculates the remaining part of the current slot proportionally', () => {
    const day = new Date(2026, 4, 13, 0, 0, 0);
    const now = new Date(2026, 4, 13, 1, 5, 0);
    const slots = [
      {
        start: new Date(day.getTime() + 60 * 60 * 1000),
        end: new Date(day.getTime() + 75 * 60 * 1000),
        value: 15,
      },
      {
        start: new Date(day.getTime() + 75 * 60 * 1000),
        end: new Date(day.getTime() + 90 * 60 * 1000),
        value: 30,
      },
    ];

    assert.strictEqual(calculateTodayRemainingFromSlots(slots, now), 40);
  });

  it('marks raw forecast rows outside the latest response as stale without deleting them', () => {
    const updates = getForecastRowValidityUpdates(
      [
        'fronius-solarweb.0.plant.energyforecast.01.logDateTime',
        'fronius-solarweb.0.plant.energyforecast.01.channels01.value',
        'fronius-solarweb.0.plant.energyforecast.02.logDateTime',
        'fronius-solarweb.0.plant.energyforecast.03.logDateTime',
        'fronius-solarweb.0.plant.energyforecastSummary.todayWh',
      ],
      'plant.energyforecast',
      'fronius-solarweb.0',
      2,
    );

    assert.deepStrictEqual(updates, [
      {
        root: 'plant.energyforecast.01',
        rowIndex: 1,
        valid: true,
      },
      {
        root: 'plant.energyforecast.02',
        rowIndex: 2,
        valid: true,
      },
      {
        root: 'plant.energyforecast.03',
        rowIndex: 3,
        valid: false,
      },
    ]);
  });
});
