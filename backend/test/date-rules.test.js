const test = require('node:test');
const assert = require('node:assert/strict');
const { workingDaysBetween, taxForAnnualGross, monthRange } = require('../src/utils/dates');
test('working day calculation excludes weekends and holidays', () => assert.equal(workingDaysBetween('2026-10-26', '2026-10-30', [0, 6], ['2026-10-28']), 4));
test('tax slab calculation follows the challenge brief', () => { assert.equal(taxForAnnualGross(600000), 0); assert.equal(taxForAnnualGross(1200000), 30000); assert.equal(taxForAnnualGross(2400000), 210000); });
test('month range returns a valid last day', () => assert.deepEqual(monthRange('2024-02'), { start: '2024-02-01', end: '2024-02-29', days: 29 }));
