import {
  formatDate,
  getRelativeTime,
  isToday,
  isThisWeek,
  getDaysAgo,
  getStartOfDay,
  getEndOfDay,
} from '../../src/utils/dateUtils';

describe('DateUtils', () => {
  // Mock Date for consistent testing
  const mockDate = new Date('2023-06-15T10:30:00Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('formatDate', () => {
    const testDate = new Date('2023-06-15T14:30:00Z');

    it('should format date in short format by default', () => {
      const formatted = formatDate(testDate);
      expect(formatted).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    });

    it('should format date in short format explicitly', () => {
      const formatted = formatDate(testDate, 'short');
      expect(formatted).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    });

    it('should format date in long format', () => {
      const formatted = formatDate(testDate, 'long');
      expect(formatted).toContain('June');
      expect(formatted).toContain('2023');
      // Check for either 15 or 16 due to potential timezone differences
      expect(formatted).toMatch(/1[56]/);
    });

    it('should format time only', () => {
      const formatted = formatDate(testDate, 'time');
      expect(formatted).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/i);
    });

    it('should format datetime', () => {
      const formatted = formatDate(testDate, 'datetime');
      expect(formatted).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}\s\d{1,2}:\d{2}\s?(AM|PM)/i);
    });

    it('should format relative time', () => {
      const formatted = formatDate(testDate, 'relative');
      expect(typeof formatted).toBe('string');
    });

    it('should handle invalid format', () => {
      const formatted = formatDate(testDate, 'invalid');
      expect(formatted).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    });

    it('should handle string dates', () => {
      const formatted = formatDate('2023-06-15T14:30:00Z', 'short');
      expect(formatted).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    });
  });

  describe('getRelativeTime', () => {
    it('should return "Just now" for recent dates', () => {
      const recentDate = new Date(mockDate.getTime() - 30000); // 30 seconds ago
      expect(getRelativeTime(recentDate)).toBe('Just now');
    });

    it('should return minutes ago', () => {
      const minutesAgo = new Date(mockDate.getTime() - 5 * 60 * 1000); // 5 minutes ago
      expect(getRelativeTime(minutesAgo)).toBe('5m ago');
    });

    it('should return hours ago', () => {
      const hoursAgo = new Date(mockDate.getTime() - 3 * 60 * 60 * 1000); // 3 hours ago
      expect(getRelativeTime(hoursAgo)).toBe('3h ago');
    });

    it('should return days ago', () => {
      const daysAgo = new Date(mockDate.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
      expect(getRelativeTime(daysAgo)).toBe('2d ago');
    });

    it('should return formatted date for older dates', () => {
      const weekAgo = new Date(mockDate.getTime() - 8 * 24 * 60 * 60 * 1000); // 8 days ago
      const result = getRelativeTime(weekAgo);
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    });

    it('should handle string dates', () => {
      const dateString = new Date(mockDate.getTime() - 5 * 60 * 1000).toISOString();
      expect(getRelativeTime(dateString)).toBe('5m ago');
    });
  });

  describe('isToday', () => {
    it('should return true for today\'s date', () => {
      expect(isToday(mockDate)).toBe(true);
      expect(isToday(new Date())).toBe(true);
    });

    it('should return true for different times on same day', () => {
      const sameDay = new Date(mockDate);
      sameDay.setHours(23, 59, 59);
      expect(isToday(sameDay)).toBe(true);
    });

    it('should return false for yesterday', () => {
      const yesterday = new Date(mockDate);
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isToday(yesterday)).toBe(false);
    });

    it('should return false for tomorrow', () => {
      const tomorrow = new Date(mockDate);
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(isToday(tomorrow)).toBe(false);
    });

    it('should handle string dates', () => {
      // Use actual current date for this test instead of mocked date
      const actualToday = new Date();
      const localToday = new Date(actualToday.getTime() - actualToday.getTimezoneOffset() * 60000);
      const todayString = localToday.toISOString().split('T')[0] + 'T12:00:00Z';
      const yesterdayString = new Date(localToday.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 'T12:00:00Z';
      expect(isToday(todayString)).toBe(true);
      expect(isToday(yesterdayString)).toBe(false);
    });
  });

  describe('isThisWeek', () => {
    // June 15, 2023 is a Thursday
    it('should return true for dates in the same week', () => {
      // Use relative dates to the mocked date instead of hardcoded ones
      const today = new Date(mockDate);
      const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      // Calculate start of week (Sunday) and end of week (Saturday)
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - currentDay);
      
      const endOfWeek = new Date(today);
      endOfWeek.setDate(today.getDate() + (6 - currentDay));
      
      expect(isThisWeek(startOfWeek)).toBe(true);
      expect(isThisWeek(endOfWeek)).toBe(true);
      expect(isThisWeek(mockDate)).toBe(true);
    });

    it('should return false for dates in different weeks', () => {
      const lastWeek = new Date('2023-06-08T10:00:00Z');
      const nextWeek = new Date('2023-06-22T10:00:00Z');
      
      expect(isThisWeek(lastWeek)).toBe(false);
      expect(isThisWeek(nextWeek)).toBe(false);
    });

    it('should handle string dates', () => {
      expect(isThisWeek('2023-06-15T14:30:00Z')).toBe(true);
      expect(isThisWeek('2023-06-08T14:30:00Z')).toBe(false);
    });
  });

  describe('getDaysAgo', () => {
    it('should return date N days ago', () => {
      const threeDaysAgo = getDaysAgo(3);
      const expectedDate = new Date('2023-06-12T10:30:00Z');
      
      expect(threeDaysAgo.toDateString()).toBe(expectedDate.toDateString());
    });

    it('should handle zero days', () => {
      const today = getDaysAgo(0);
      expect(today.toDateString()).toBe(mockDate.toDateString());
    });

    it('should handle negative values (future dates)', () => {
      const future = getDaysAgo(-2);
      const expectedDate = new Date('2023-06-17T10:30:00Z');
      
      expect(future.toDateString()).toBe(expectedDate.toDateString());
    });
  });

  describe('getStartOfDay', () => {
    it('should return start of day for given date', () => {
      const start = getStartOfDay(mockDate);
      
      expect(start.getHours()).toBe(0);
      expect(start.getMinutes()).toBe(0);
      expect(start.getSeconds()).toBe(0);
      expect(start.getMilliseconds()).toBe(0);
      expect(start.toDateString()).toBe(mockDate.toDateString());
    });

    it('should return start of today when no date provided', () => {
      const start = getStartOfDay();
      const today = new Date();
      
      expect(start.getHours()).toBe(0);
      expect(start.getMinutes()).toBe(0);
      expect(start.getSeconds()).toBe(0);
      expect(start.getMilliseconds()).toBe(0);
      expect(start.toDateString()).toBe(today.toDateString());
    });

    it('should not modify the original date', () => {
      const originalDate = new Date('2023-06-15T14:30:45.123Z');
      const originalTime = originalDate.getTime();
      
      getStartOfDay(originalDate);
      
      expect(originalDate.getTime()).toBe(originalTime);
    });
  });

  describe('getEndOfDay', () => {
    it('should return end of day for given date', () => {
      const end = getEndOfDay(mockDate);
      
      expect(end.getHours()).toBe(23);
      expect(end.getMinutes()).toBe(59);
      expect(end.getSeconds()).toBe(59);
      expect(end.getMilliseconds()).toBe(999);
      expect(end.toDateString()).toBe(mockDate.toDateString());
    });

    it('should return end of today when no date provided', () => {
      const end = getEndOfDay();
      const today = new Date();
      
      expect(end.getHours()).toBe(23);
      expect(end.getMinutes()).toBe(59);
      expect(end.getSeconds()).toBe(59);
      expect(end.getMilliseconds()).toBe(999);
      expect(end.toDateString()).toBe(today.toDateString());
    });

    it('should not modify the original date', () => {
      const originalDate = new Date('2023-06-15T14:30:45.123Z');
      const originalTime = originalDate.getTime();
      
      getEndOfDay(originalDate);
      
      expect(originalDate.getTime()).toBe(originalTime);
    });
  });

  describe('edge cases', () => {
    it('should handle leap year dates', () => {
      const leapYear = new Date('2024-02-29T10:00:00Z');
      expect(formatDate(leapYear, 'short')).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
      expect(isToday(leapYear)).toBe(false);
    });

    it('should handle year boundaries', () => {
      const newYear = new Date('2024-01-01T12:00:00Z'); // Use noon to avoid timezone issues
      const oldYear = new Date('2023-12-31T12:00:00Z');
      
      expect(formatDate(newYear, 'short')).toMatch(/\d{1,2}\/\d{1,2}\/202[34]/); // Allow for both years due to timezone
      expect(formatDate(oldYear, 'short')).toMatch(/\d{1,2}\/\d{1,2}\/202[34]/);
    });

    it('should handle timezone differences', () => {
      const utcDate = new Date('2023-06-15T23:00:00Z');
      expect(typeof formatDate(utcDate, 'short')).toBe('string');
    });

    it('should handle invalid dates gracefully', () => {
      const invalidDate = new Date('invalid');
      expect(() => formatDate(invalidDate)).not.toThrow();
    });
  });
});