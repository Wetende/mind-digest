import {
  formatDate,
  getRelativeTime,
  isToday,
  isThisWeek,
  getDaysAgo,
  getStartOfDay,
  getEndOfDay,
} from '../../src/utils/dateUtils';

// Mock Date for consistent testing
const mockDate = new Date('2024-01-15T12:00:00.000Z');

describe('dateUtils', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('formatDate', () => {
    const testDate = new Date('2024-01-15T14:30:00.000Z');

    it('should format date in short format by default', () => {
      const result = formatDate(testDate);
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/); // MM/DD/YYYY or similar
    });

    it('should format date in long format', () => {
      const result = formatDate(testDate, 'long');
      expect(result).toContain('Monday');
      expect(result).toContain('January');
      expect(result).toContain('15');
      expect(result).toContain('2024');
    });

    it('should format time only', () => {
      const result = formatDate(testDate, 'time');
      expect(result).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/);
    });

    it('should format datetime', () => {
      const result = formatDate(testDate, 'datetime');
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}\s\d{1,2}:\d{2}\s?(AM|PM)/);
    });

    it('should format relative time', () => {
      const result = formatDate(testDate, 'relative');
      expect(typeof result).toBe('string');
    });
  });

  describe('getRelativeTime', () => {
    it('should return "Just now" for recent times', () => {
      const recentDate = new Date(mockDate.getTime() - 30000); // 30 seconds ago
      expect(getRelativeTime(recentDate)).toBe('Just now');
    });

    it('should return minutes for times within an hour', () => {
      const minutesAgo = new Date(mockDate.getTime() - 5 * 60 * 1000); // 5 minutes ago
      expect(getRelativeTime(minutesAgo)).toBe('5m ago');
    });

    it('should return hours for times within a day', () => {
      const hoursAgo = new Date(mockDate.getTime() - 3 * 60 * 60 * 1000); // 3 hours ago
      expect(getRelativeTime(hoursAgo)).toBe('3h ago');
    });

    it('should return days for times within a week', () => {
      const daysAgo = new Date(mockDate.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
      expect(getRelativeTime(daysAgo)).toBe('2d ago');
    });

    it('should return formatted date for older times', () => {
      const weekAgo = new Date(mockDate.getTime() - 8 * 24 * 60 * 60 * 1000); // 8 days ago
      const result = getRelativeTime(weekAgo);
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    });
  });

  describe('isToday', () => {
    it('should return true for today\'s date', () => {
      expect(isToday(mockDate)).toBe(true);
      expect(isToday(new Date())).toBe(true);
    });

    it('should return false for yesterday', () => {
      const yesterday = new Date(mockDate.getTime() - 24 * 60 * 60 * 1000);
      expect(isToday(yesterday)).toBe(false);
    });

    it('should return false for tomorrow', () => {
      const tomorrow = new Date(mockDate.getTime() + 24 * 60 * 60 * 1000);
      expect(isToday(tomorrow)).toBe(false);
    });
  });

  describe('isThisWeek', () => {
    it('should return true for dates in current week', () => {
      // mockDate is Monday, Jan 15, 2024
      const sunday = new Date('2024-01-14T12:00:00.000Z'); // Sunday of same week
      const saturday = new Date('2024-01-20T12:00:00.000Z'); // Saturday of same week
      
      expect(isThisWeek(mockDate)).toBe(true);
      expect(isThisWeek(sunday)).toBe(true);
      expect(isThisWeek(saturday)).toBe(true);
    });

    it('should return false for dates outside current week', () => {
      const lastWeek = new Date('2024-01-07T12:00:00.000Z');
      const nextWeek = new Date('2024-01-22T12:00:00.000Z');
      
      expect(isThisWeek(lastWeek)).toBe(false);
      expect(isThisWeek(nextWeek)).toBe(false);
    });
  });

  describe('getDaysAgo', () => {
    it('should return date from specified days ago', () => {
      const threeDaysAgo = getDaysAgo(3);
      const expected = new Date('2024-01-12T12:00:00.000Z');
      
      expect(threeDaysAgo.toDateString()).toBe(expected.toDateString());
    });

    it('should handle zero days', () => {
      const today = getDaysAgo(0);
      expect(today.toDateString()).toBe(mockDate.toDateString());
    });
  });

  describe('getStartOfDay', () => {
    it('should return start of day for given date', () => {
      const start = getStartOfDay(mockDate);
      expect(start.getHours()).toBe(0);
      expect(start.getMinutes()).toBe(0);
      expect(start.getSeconds()).toBe(0);
      expect(start.getMilliseconds()).toBe(0);
    });

    it('should return start of today when no date provided', () => {
      const start = getStartOfDay();
      expect(start.getHours()).toBe(0);
      expect(start.getMinutes()).toBe(0);
      expect(start.getSeconds()).toBe(0);
      expect(start.getMilliseconds()).toBe(0);
    });
  });

  describe('getEndOfDay', () => {
    it('should return end of day for given date', () => {
      const end = getEndOfDay(mockDate);
      expect(end.getHours()).toBe(23);
      expect(end.getMinutes()).toBe(59);
      expect(end.getSeconds()).toBe(59);
      expect(end.getMilliseconds()).toBe(999);
    });

    it('should return end of today when no date provided', () => {
      const end = getEndOfDay();
      expect(end.getHours()).toBe(23);
      expect(end.getMinutes()).toBe(59);
      expect(end.getSeconds()).toBe(59);
      expect(end.getMilliseconds()).toBe(999);
    });
  });
});