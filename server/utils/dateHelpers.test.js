const { parseUTCDate, getTodayString, getCurrentTimeString } = require('./dateHelpers');

describe('parseUTCDate', () => {
  test('parses YYYY-MM-DD string to UTC midnight Date', () => {
    const result = parseUTCDate('2025-03-15');
    expect(result).toBeInstanceOf(Date);
    expect(result.getUTCFullYear()).toBe(2025);
    expect(result.getUTCMonth()).toBe(2); // 0-indexed
    expect(result.getUTCDate()).toBe(15);
    expect(result.getUTCHours()).toBe(0);
    expect(result.getUTCMinutes()).toBe(0);
    expect(result.getUTCSeconds()).toBe(0);
  });

  test('handles start of year', () => {
    const result = parseUTCDate('2025-01-01');
    expect(result.getUTCFullYear()).toBe(2025);
    expect(result.getUTCMonth()).toBe(0);
    expect(result.getUTCDate()).toBe(1);
  });

  test('handles end of year', () => {
    const result = parseUTCDate('2025-12-31');
    expect(result.getUTCFullYear()).toBe(2025);
    expect(result.getUTCMonth()).toBe(11);
    expect(result.getUTCDate()).toBe(31);
  });

  test('does not shift date due to timezone', () => {
    // This verifies we don't get the classic off-by-one timezone bug
    const result = parseUTCDate('2025-11-06');
    expect(result.toISOString().startsWith('2025-11-06')).toBe(true);
  });
});

describe('getTodayString', () => {
  test('returns a YYYY-MM-DD formatted string', () => {
    const result = getTodayString();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('getCurrentTimeString', () => {
  test('returns an HH:MM formatted string', () => {
    const result = getCurrentTimeString();
    expect(result).toMatch(/^\d{2}:\d{2}$/);
  });
});
