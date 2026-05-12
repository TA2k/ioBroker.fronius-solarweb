'use strict';

const assert = require('assert');
const { getQueryTimeRanges } = require('./lib/queryTimeRanges');

describe('Solar.web query time ranges', () => {
  it('uses the past 24 hours for historical data', () => {
    const now = new Date('2026-05-13T10:00:00.000Z');
    const ranges = getQueryTimeRanges(now);

    assert.equal(ranges.now, now.getTime());
    assert.equal(ranges.historyFrom, now.getTime() + 5000 - 24 * 60 * 60 * 1000);
    assert.ok(ranges.historyFrom < ranges.now);
  });

  it('uses separate local calendar-day windows for today and tomorrow forecasts', () => {
    const now = new Date('2026-05-13T10:00:00.000Z');
    const ranges = getQueryTimeRanges(now);

    const expectedTodayStart = new Date(now);
    expectedTodayStart.setHours(0, 0, 0, 0);
    const expectedTomorrowStart = new Date(expectedTodayStart);
    expectedTomorrowStart.setDate(expectedTomorrowStart.getDate() + 1);

    assert.equal(ranges.forecastTodayFrom, expectedTodayStart.getTime());
    assert.equal(ranges.forecastTodayTo, expectedTodayStart.getTime() + 24 * 60 * 60 * 1000);
    assert.equal(ranges.forecastTomorrowFrom, expectedTomorrowStart.getTime());
    assert.equal(ranges.forecastTomorrowTo, expectedTomorrowStart.getTime() + 24 * 60 * 60 * 1000);
  });
});
