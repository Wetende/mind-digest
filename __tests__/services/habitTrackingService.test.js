import habitTrackingService from '../../src/services/habitTrackingService';

// Mock Supabase
jest.mock('../../src/config/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: { id: 'test-id', user_id: 'test-user', points_earned: 10 },
            error: null
          }))
        }))
      })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: { total_points: 100, level: 2, current_streak: 5 },
            error: null
          })),
          order: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve({
              data: [{ completed_at: new Date().toISOString() }],
              error: null
            }))
          }))
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ error: null }))
      }))
    }))
  }
}));

// Mock notification service
jest.mock('../../src/services/notificationService', () => ({
  default: {
    sendNotification: jest.fn(() => Promise.resolve())
  }
}));

describe('HabitTrackingService', () => {
  const mockUserId = 'test-user-id';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('awardPoints', () => {
    it('should award points for completing an activity', async () => {
      const result = await habitTrackingService.awardPoints(
        mockUserId, 
        'MOOD_LOG', 
        { mood: 4 }
      );

      expect(result.success).toBe(true);
      expect(result.data.pointsEarned).toBeGreaterThan(0);
    });

    it('should calculate correct points for different activity types', () => {
      expect(habitTrackingService.pointValues.MOOD_LOG).toBe(10);
      expect(habitTrackingService.pointValues.JOURNAL_ENTRY).toBe(15);
      expect(habitTrackingService.pointValues.BREATHING_EXERCISE).toBe(12);
      expect(habitTrackingService.pointValues.SOCIAL_INTERACTION).toBe(18);
    });
  });

  describe('calculateLevel', () => {
    it('should calculate correct level based on points', () => {
      expect(habitTrackingService.calculateLevel(50)).toBe(1);
      expect(habitTrackingService.calculateLevel(100)).toBe(2);
      expect(habitTrackingService.calculateLevel(150)).toBe(3);
      expect(habitTrackingService.calculateLevel(200)).toBe(4);
    });
  });

  describe('getAvailableChallenges', () => {
    it('should return beginner challenges for level 1', () => {
      const challenges = habitTrackingService.getAvailableChallenges(1);
      expect(challenges.length).toBeGreaterThan(0);
      expect(challenges.some(c => c.id === 'daily_mood_week')).toBe(true);
    });

    it('should return more challenges for higher levels', () => {
      const level1Challenges = habitTrackingService.getAvailableChallenges(1);
      const level5Challenges = habitTrackingService.getAvailableChallenges(5);
      expect(level5Challenges.length).toBeGreaterThan(level1Challenges.length);
    });
  });

  describe('badges', () => {
    it('should have defined badge structure', () => {
      const badges = habitTrackingService.badges;
      expect(badges.FIRST_STEPS).toBeDefined();
      expect(badges.FIRST_STEPS.name).toBe('First Steps');
      expect(badges.FIRST_STEPS.points).toBe(25);
      expect(badges.FIRST_STEPS.icon).toBe('footsteps-outline');
    });

    it('should have all required badge properties', () => {
      Object.values(habitTrackingService.badges).forEach(badge => {
        expect(badge.name).toBeDefined();
        expect(badge.description).toBeDefined();
        expect(badge.icon).toBeDefined();
        expect(badge.points).toBeDefined();
        expect(typeof badge.points).toBe('number');
      });
    });
  });

  describe('challenges', () => {
    it('should have challenges for different difficulty levels', () => {
      const challenges = habitTrackingService.challenges;
      expect(challenges.BEGINNER).toBeDefined();
      expect(challenges.INTERMEDIATE).toBeDefined();
      expect(challenges.ADVANCED).toBeDefined();
    });

    it('should have valid challenge structure', () => {
      const beginnerChallenges = habitTrackingService.challenges.BEGINNER;
      beginnerChallenges.forEach(challenge => {
        expect(challenge.id).toBeDefined();
        expect(challenge.title).toBeDefined();
        expect(challenge.description).toBeDefined();
        expect(challenge.duration).toBeDefined();
        expect(challenge.target).toBeDefined();
        expect(challenge.activity).toBeDefined();
        expect(challenge.points).toBeDefined();
        expect(typeof challenge.points).toBe('number');
      });
    });
  });
});