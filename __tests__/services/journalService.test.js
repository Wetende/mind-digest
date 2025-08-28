import journalService from '../../src/services/journalService';
import { supabase } from '../../src/config/supabase';
import aiService from '../../src/services/aiService';
import habitTrackingService from '../../src/services/habitTrackingService';

// Mock dependencies
jest.mock('../../src/config/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({ select: jest.fn() })),
      select: jest.fn(() => ({ eq: jest.fn() })),
      update: jest.fn(() => ({ eq: jest.fn() })),
      delete: jest.fn(() => ({ eq: jest.fn() })),
    })),
  },
  TABLES: {
    JOURNAL_ENTRIES: 'journal_entries',
  },
}));

jest.mock('../../src/services/aiService', () => ({
  analyzeJournalEntry: jest.fn(),
}));

jest.mock('../../src/services/habitTrackingService', () => ({
  awardPoints: jest.fn(),
}));

describe('JournalService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('createEntry', () => {
    const mockEntryData = {
      userId: 'user-123',
      content: 'Today was a good day. I felt happy and accomplished.',
      mood: 4,
      emotions: ['happy', 'accomplished'],
      triggers: ['work_success'],
    };

    it('should successfully create a journal entry with AI analysis', async () => {
      const mockAIAnalysis = {
        sentiment: 'positive',
        keyThemes: ['happiness', 'accomplishment'],
        suggestions: ['Continue celebrating small wins'],
      };

      aiService.analyzeJournalEntry.mockResolvedValue(mockAIAnalysis);

      const mockResponse = {
        data: [{ id: 'journal-123', ...mockEntryData, ai_insights: mockAIAnalysis }],
        error: null,
      };

      const mockChain = {
        select: jest.fn().mockResolvedValue(mockResponse),
      };
      const mockInsert = {
        insert: jest.fn().mockReturnValue(mockChain),
      };
      supabase.from.mockReturnValue(mockInsert);

      habitTrackingService.awardPoints.mockResolvedValue({ success: true });

      const result = await journalService.createEntry(mockEntryData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse.data[0]);
      expect(aiService.analyzeJournalEntry).toHaveBeenCalledWith(mockEntryData.content);
      expect(habitTrackingService.awardPoints).toHaveBeenCalledWith(
        mockEntryData.userId,
        'JOURNAL_ENTRY',
        {
          wordCount: mockEntryData.content.length,
          hasMood: true,
          hasEmotions: true,
          hasAIInsights: true,
        }
      );
    });

    it('should handle AI service failure gracefully', async () => {
      aiService.analyzeJournalEntry.mockRejectedValue(new Error('AI service down'));

      const mockResponse = {
        data: [{ id: 'journal-123', ...mockEntryData, ai_insights: null }],
        error: null,
      };

      const mockChain = {
        select: jest.fn().mockResolvedValue(mockResponse),
      };
      const mockInsert = {
        insert: jest.fn().mockReturnValue(mockChain),
      };
      supabase.from.mockReturnValue(mockInsert);

      habitTrackingService.awardPoints.mockResolvedValue({ success: true });

      const result = await journalService.createEntry(mockEntryData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('AI service down');
    });

    it('should create entry with minimal data', async () => {
      const minimalData = {
        userId: 'user-123',
        content: 'Short entry',
      };

      aiService.analyzeJournalEntry.mockResolvedValue(null);

      const mockResponse = {
        data: [{ id: 'journal-123', ...minimalData }],
        error: null,
      };

      const mockChain = {
        select: jest.fn().mockResolvedValue(mockResponse),
      };
      const mockInsert = {
        insert: jest.fn().mockReturnValue(mockChain),
      };
      supabase.from.mockReturnValue(mockInsert);

      habitTrackingService.awardPoints.mockResolvedValue({ success: true });

      const result = await journalService.createEntry(minimalData);

      expect(result.success).toBe(true);
      expect(habitTrackingService.awardPoints).toHaveBeenCalledWith(
        minimalData.userId,
        'JOURNAL_ENTRY',
        expect.objectContaining({
          wordCount: expect.any(Number),
        })
      );
    });
  });

  describe('getEntries', () => {
    it('should successfully retrieve journal entries', async () => {
      const mockEntries = [
        { id: 'journal-1', content: 'Entry 1', created_at: '2023-01-01' },
        { id: 'journal-2', content: 'Entry 2', created_at: '2023-01-02' },
      ];

      const mockChain = {
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: mockEntries,
          error: null,
        }),
      };
      const mockSelect = {
        select: jest.fn().mockReturnValue(mockChain),
      };
      supabase.from.mockReturnValue(mockSelect);

      const result = await journalService.getEntries('user-123', 10, 0);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockEntries);
      expect(mockChain.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(mockChain.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(mockChain.range).toHaveBeenCalledWith(0, 9);
    });

    it('should handle retrieval errors', async () => {
      const mockError = new Error('Database error');
      const mockChain = {
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: null,
          error: mockError,
        }),
      };
      const mockSelect = {
        select: jest.fn().mockReturnValue(mockChain),
      };
      supabase.from.mockReturnValue(mockSelect);

      const result = await journalService.getEntries('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('updateEntry', () => {
    it('should successfully update entry and re-analyze content', async () => {
      const updates = { content: 'Updated content', mood: 5 };
      const mockAIAnalysis = { sentiment: 'very_positive' };

      aiService.analyzeJournalEntry.mockResolvedValue(mockAIAnalysis);

      const mockResponse = {
        data: [{ id: 'journal-123', ...updates, ai_insights: mockAIAnalysis }],
        error: null,
      };

      const mockChain = {
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue(mockResponse),
      };
      const mockUpdate = {
        update: jest.fn().mockReturnValue(mockChain),
      };
      supabase.from.mockReturnValue(mockUpdate);

      const result = await journalService.updateEntry('journal-123', updates);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse.data[0]);
      expect(aiService.analyzeJournalEntry).toHaveBeenCalledWith(updates.content);
      expect(mockUpdate.update).toHaveBeenCalledWith({
        ...updates,
        ai_insights: mockAIAnalysis,
      });
    });

    it('should update entry without re-analyzing when content unchanged', async () => {
      const updates = { mood: 5 };

      const mockResponse = {
        data: [{ id: 'journal-123', ...updates }],
        error: null,
      };

      const mockChain = {
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue(mockResponse),
      };
      const mockUpdate = {
        update: jest.fn().mockReturnValue(mockChain),
      };
      supabase.from.mockReturnValue(mockUpdate);

      const result = await journalService.updateEntry('journal-123', updates);

      expect(result.success).toBe(true);
      expect(aiService.analyzeJournalEntry).not.toHaveBeenCalled();
      expect(mockUpdate.update).toHaveBeenCalledWith(updates);
    });
  });

  describe('deleteEntry', () => {
    it('should successfully delete an entry', async () => {
      const mockChain = {
        eq: jest.fn().mockResolvedValue({ error: null }),
      };
      const mockDelete = {
        delete: jest.fn().mockReturnValue(mockChain),
      };
      supabase.from.mockReturnValue(mockDelete);

      const result = await journalService.deleteEntry('journal-123');

      expect(result.success).toBe(true);
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'journal-123');
    });

    it('should handle deletion errors', async () => {
      const mockError = new Error('Deletion failed');
      const mockChain = {
        eq: jest.fn().mockResolvedValue({ error: mockError }),
      };
      const mockDelete = {
        delete: jest.fn().mockReturnValue(mockChain),
      };
      supabase.from.mockReturnValue(mockDelete);

      const result = await journalService.deleteEntry('journal-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Deletion failed');
    });
  });

  describe('processJournalInsights', () => {
    it('should process journal insights correctly', () => {
      const mockEntries = [
        {
          mood: 4,
          emotions: ['happy', 'calm'],
          triggers: ['work'],
          ai_insights: { keyThemes: ['positivity', 'success'] },
          created_at: '2023-01-01',
        },
        {
          mood: 3,
          emotions: ['neutral'],
          triggers: ['social'],
          ai_insights: { keyThemes: ['reflection'] },
          created_at: '2023-01-02',
        },
        {
          mood: 5,
          emotions: ['happy', 'excited'],
          triggers: ['work'],
          ai_insights: { keyThemes: ['positivity', 'growth'] },
          created_at: '2023-01-03',
        },
      ];

      const insights = journalService.processJournalInsights(mockEntries);

      expect(insights.averageMood).toBe(4.0);
      expect(insights.totalEntries).toBe(3);
      expect(insights.commonEmotions).toContainEqual({ emotion: 'happy', count: 2 });
      expect(insights.frequentTriggers).toContainEqual({ trigger: 'work', count: 2 });
      expect(insights.keyThemes).toContainEqual({ theme: 'positivity', count: 2 });
    });

    it('should handle empty entries array', () => {
      const insights = journalService.processJournalInsights([]);

      expect(insights).toEqual({
        averageMood: 0,
        moodTrend: 'stable',
        commonEmotions: [],
        frequentTriggers: [],
        keyThemes: [],
        totalEntries: 0,
      });
    });

    it('should calculate mood trend correctly', () => {
      const decliningEntries = [
        { mood: 5, created_at: '2023-01-01' },
        { mood: 4, created_at: '2023-01-02' },
        { mood: 3, created_at: '2023-01-03' },
        { mood: 2, created_at: '2023-01-04' },
        { mood: 1, created_at: '2023-01-05' },
        { mood: 1, created_at: '2023-01-06' },
        { mood: 1, created_at: '2023-01-07' },
        { mood: 1, created_at: '2023-01-08' },
      ];

      const insights = journalService.processJournalInsights(decliningEntries);
      expect(insights.moodTrend).toBe('declining');
    });
  });

  describe('exportData', () => {
    const mockEntries = [
      {
        id: 'journal-1',
        content: 'Test entry',
        mood: 4,
        emotions: ['happy'],
        triggers: ['work'],
        ai_insights: { sentiment: 'positive' },
        created_at: '2023-01-01T10:00:00Z',
      },
      {
        id: 'journal-2',
        content: 'Another entry',
        mood: 3,
        emotions: ['neutral'],
        triggers: ['social'],
        ai_insights: { sentiment: 'neutral' },
        created_at: '2023-01-02T10:00:00Z',
      },
    ];

    it('should export data in JSON format', async () => {
      const mockChain = {
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockEntries,
          error: null,
        }),
      };
      const mockSelect = {
        select: jest.fn().mockReturnValue(mockChain),
      };
      supabase.from.mockReturnValue(mockSelect);

      const result = await journalService.exportData('user-123', 'json');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockEntries);
    });

    it('should export data in CSV format', async () => {
      const mockChain = {
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockEntries,
          error: null,
        }),
      };
      const mockSelect = {
        select: jest.fn().mockReturnValue(mockChain),
      };
      supabase.from.mockReturnValue(mockSelect);

      const result = await journalService.exportData('user-123', 'csv');

      expect(result.success).toBe(true);
      expect(typeof result.data).toBe('string');
      expect(result.data).toContain('Date,Mood,Content,Emotions,Triggers,AI Sentiment');
    });
  });

  describe('convertToCSV', () => {
    it('should convert journal entries to CSV format', () => {
      const entries = [
        {
          content: 'Test entry with "quotes"',
          mood: 4,
          emotions: ['happy', 'calm'],
          triggers: ['work'],
          ai_insights: { sentiment: 'positive' },
          created_at: '2023-01-01T10:00:00Z',
        },
      ];

      const csv = journalService.convertToCSV(entries);

      expect(csv).toContain('Date,Mood,Content,Emotions,Triggers,AI Sentiment');
      expect(csv).toContain('"Test entry with ""quotes"""');
      expect(csv).toContain('happy; calm');
      expect(csv).toContain('positive');
    });

    it('should handle empty entries array', () => {
      const csv = journalService.convertToCSV([]);
      expect(csv).toBe('');
    });

    it('should handle entries with missing data', () => {
      const entries = [
        {
          content: 'Test entry',
          created_at: '2023-01-01T10:00:00Z',
        },
      ];

      const csv = journalService.convertToCSV(entries);

      expect(csv).toContain('Date,Mood,Content,Emotions,Triggers,AI Sentiment');
      expect(csv).toContain('01/01/2023,,"Test entry",,,');
    });
  });
});
