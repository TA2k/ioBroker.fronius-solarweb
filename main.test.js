'use strict';

const assert = require('assert');
const { getQueryTimeRanges } = require('./lib/queryTimeRanges');

describe('getQueryTimeRanges', () => {
  it('returns historyDate in YYYY-MM-DD format', () => {
    const now = new Date(2026, 4, 13, 14, 30, 0);
    const ranges = getQueryTimeRanges(now);
    assert.strictEqual(ranges.historyDate, '2026-05-13');
  });

  it('returns forecastTodayFrom as start of day in ISO local format', () => {
    const now = new Date(2026, 4, 13, 14, 30, 0);
    const ranges = getQueryTimeRanges(now);
    assert.strictEqual(ranges.forecastTodayFrom, '2026-05-13T00:00:00');
  });

  it('returns forecastTodayTo as end of day (23:59:59)', () => {
    const now = new Date(2026, 4, 13, 14, 30, 0);
    const ranges = getQueryTimeRanges(now);
    assert.strictEqual(ranges.forecastTodayTo, '2026-05-13T23:59:59');
  });

  it('returns forecastTomorrowFrom/To for the next calendar day', () => {
    const now = new Date(2026, 4, 13, 23, 55, 0);
    const ranges = getQueryTimeRanges(now);
    assert.strictEqual(ranges.forecastTomorrowFrom, '2026-05-14T00:00:00');
    assert.strictEqual(ranges.forecastTomorrowTo, '2026-05-14T23:59:59');
  });

  it('handles month boundary correctly', () => {
    const now = new Date(2026, 0, 31, 10, 0, 0);
    const ranges = getQueryTimeRanges(now);
    assert.strictEqual(ranges.historyDate, '2026-01-31');
    assert.strictEqual(ranges.forecastTomorrowFrom, '2026-02-01T00:00:00');
    assert.strictEqual(ranges.forecastTomorrowTo, '2026-02-01T23:59:59');
  });
});
