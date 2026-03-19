/**
 * Parse a YYYY-MM-DD string to a UTC Date at midnight
 * This is the canonical way to convert date strings in this project.
 * @param {string} dateString - date in YYYY-MM-DD format
 * @returns {Date} UTC Date at midnight
 */
function parseUTCDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

/**
 * Get today's date string in YYYY-MM-DD format (UTC)
 * @returns {string}
 */
function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get current time in HH:MM format
 * @returns {string}
 */
function getCurrentTimeString() {
  return new Date().toTimeString().split(' ')[0].substring(0, 5);
}

module.exports = { parseUTCDate, getTodayString, getCurrentTimeString };
