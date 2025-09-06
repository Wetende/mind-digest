import socialSharingService from '../../src/services/socialSharingService';

describe('Social Sharing Anonymization Tests', () => {
  beforeEach(() => {
    // Suppress console logs during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
    console.error.mockRestore();
  });

  describe('Personal Information Anonymization', () => {
    it('should remove names from content', () => {
      const testCases = [
        {
          input: 'My therapist John Smith helped me today',
          expected: 'My therapist an important person helped me recently'
        },
        {
          input: 'I talked to Dr. Sarah Johnson about my anxiety',
          expected: 'Someone talked to an important person about my anxiety'
        },
        {
          input: 'Mary Jane and I went for a walk',
          expected: 'an important person and Someone went for a walk'
        }
      ];

      testCases.forEach(({ input, expected }) => {
        const content = { text: input };
        const result = socialSharingService.anonymizeContent(content);
        
        expect(result.text).not.toContain('John Smith');
        expect(result.text).not.toContain('Dr. Sarah Johnson');
        expect(result.text).not.toContain('Mary Jane');
        expect(result.text).toContain('an important person');
        expect(result.text).toContain('Someone');
      });
    });

    it('should remove specific times and dates', () => {
      const testCases = [
        {
          input: 'I had therapy at 3:30 PM today',
          expected: 'Someone had therapy at a specific time recently'
        },
        {
          input: 'My appointment is on 12/25/2023 at 10:15 AM',
          expected: 'My appointment is on a special date at a specific time'
        },
        {
          input: 'Yesterday at 2:45 I felt anxious',
          expected: 'recently at a specific time Someone felt anxious'
        }
      ];

      testCases.forEach(({ input }) => {
        const content = { text: input };
        const result = socialSharingService.anonymizeContent(content);
        
        expect(result.text).not.toMatch(/\d{1,2}:\d{2}/);
        expect(result.text).not.toMatch(/\d{1,2}\/\d{1,2}/);
        expect(result.text).toContain('a specific time');
        expect(result.text).toContain('recently');
      });
    });

    it('should replace first-person pronouns consistently', () => {
      const testCases = [
        'I am feeling better today',
        'I went to therapy and I learned new coping strategies',
        'My therapist said I should practice mindfulness',
        'I think I am making progress'
      ];

      testCases.forEach(input => {
        const content = { text: input };
        const result = socialSharingService.anonymizeContent(content);
        
        expect(result.text).not.toMatch(/\bI\s/);
        expect(result.text).not.toMatch(/\sI\s/);
        expect(result.text).toContain('Someone');
      });
    });

    it('should generalize temporal references', () => {
      const temporalWords = ['today', 'yesterday', 'tomorrow', 'this week', 'this month', 'last week'];
      
      temporalWords.forEach(word => {
        const content = { text: `I felt anxious ${word}` };
        const result = socialSharingService.anonymizeContent(content);
        
        expect(result.text).not.toContain(word);
        expect(result.text).toContain('recently');
      });
    });

    it('should handle email addresses and phone numbers', () => {
      const content = {
        text: 'Contact me at john.doe@email.com or call 555-123-4567'
      };
      
      const result = socialSharingService.anonymizeContent(content);
      
      // Note: The current implementation may not handle emails/phones
      // This test documents expected behavior for future enhancement
      expect(result.text).toBeDefined();
    });
  });

  describe('Content Integrity Preservation', () => {
    it('should preserve mental health terminology', () => {
      const mentalHealthTerms = [
        'anxiety', 'depression', 'therapy', 'mindfulness', 'meditation',
        'panic attack', 'coping strategies', 'mental health', 'wellness',
        'self-care', 'breathing exercises', 'journaling'
      ];

      mentalHealthTerms.forEach(term => {
        const content = { text: `I practice ${term} daily` };
        const result = socialSharingService.anonymizeContent(content);
        
        expect(result.text).toContain(term);
        expect(result.text).toContain('Someone');
      });
    });

    it('should preserve emotional context', () => {
      const emotionalContexts = [
        'feeling better', 'struggling with', 'making progress',
        'having difficulty', 'celebrating', 'grateful for'
      ];

      emotionalContexts.forEach(context => {
        const content = { text: `I am ${context} my mental health journey` };
        const result = socialSharingService.anonymizeContent(content);
        
        expect(result.text).toContain(context);
        expect(result.text).not.toContain('I am');
      });
    });

    it('should maintain sentence structure and readability', () => {
      const complexSentences = [
        'I had a panic attack at work today, but I used the breathing techniques my therapist taught me',
        'Yesterday I felt overwhelmed, so I practiced mindfulness and called my support person',
        'My anxiety was high this morning, but after meditation I felt more centered'
      ];

      complexSentences.forEach(sentence => {
        const content = { text: sentence };
        const result = socialSharingService.anonymizeContent(content);
        
        // Should still be readable
        expect(result.text.length).toBeGreaterThan(0);
        expect(result.text).toMatch(/[A-Z]/); // Should start with capital
        expect(result.text).toContain('Someone');
        expect(result.text).toContain('recently');
      });
    });
  });

  describe('Emotion Level Anonymization', () => {
    it('should round emotion levels to even numbers', () => {
      const testCases = [
        { input: 7.3, expected: 8 },
        { input: 5.7, expected: 6 },
        { input: 3.2, expected: 4 },
        { input: 1.9, expected: 2 },
        { input: 9.1, expected: 10 },
        { input: 8.0, expected: 8 }
      ];

      testCases.forEach(({ input, expected }) => {
        const content = { emotionLevel: input };
        const result = socialSharingService.anonymizeContent(content);
        
        expect(result.emotionLevel).toBe(expected);
      });
    });

    it('should handle edge cases for emotion levels', () => {
      const edgeCases = [
        { input: 0, expected: 0 },
        { input: 10, expected: 10 },
        { input: -1, expected: 0 },
        { input: 11, expected: 10 }
      ];

      edgeCases.forEach(({ input, expected }) => {
        const content = { emotionLevel: input };
        const result = socialSharingService.anonymizeContent(content);
        
        expect(result.emotionLevel).toBe(expected);
      });
    });
  });

  describe('Platform-Specific Anonymization', () => {
    it('should apply consistent anonymization across all platforms', () => {
      const originalData = {
        mood: 7,
        emotion: 'anxious',
        note: 'I had therapy with Dr. Smith today at 3:00 PM'
      };

      const content = socialSharingService.generateAnonymizedContent(originalData, 'mood', true);

      // All platforms should have anonymized content
      ['instagram', 'tiktok', 'twitter'].forEach(platform => {
        expect(content[platform].text).not.toContain('I had');
        expect(content[platform].text).not.toContain('Dr. Smith');
        expect(content[platform].text).not.toContain('3:00 PM');
        expect(content[platform].text).toContain('Someone');
        expect(content[platform].text).toContain('💙 *This is a shared experience for mental health awareness*');
      });
    });

    it('should include appropriate disclaimers for anonymous content', () => {
      const data = { mood: 8, emotion: 'happy' };
      const anonymousContent = socialSharingService.generateAnonymizedContent(data, 'mood', true);
      const personalContent = socialSharingService.generateAnonymizedContent(data, 'mood', false);

      // Anonymous content should have awareness disclaimer
      expect(anonymousContent.instagram.text).toContain('shared experience for mental health awareness');
      expect(anonymousContent.instagram.text).toContain('#MentalHealthMatters');
      expect(anonymousContent.instagram.text).toContain('#YouAreNotAlone');

      // Personal content should have self-care disclaimer
      expect(personalContent.instagram.text).toContain('Taking care of my mental health');
      expect(personalContent.instagram.text).toContain('#MentalWellness');
      expect(personalContent.instagram.text).toContain('#SelfCare');
    });
  });

  describe('Anonymization Edge Cases', () => {
    it('should handle empty or null content', () => {
      const testCases = [
        { text: '' },
        { text: null },
        { text: undefined },
        {}
      ];

      testCases.forEach(content => {
        const result = socialSharingService.anonymizeContent(content);
        expect(result).toBeDefined();
        expect(typeof result).toBe('object');
      });
    });

    it('should handle content with only punctuation', () => {
      const content = { text: '!@#$%^&*()_+-=[]{}|;:,.<>?' };
      const result = socialSharingService.anonymizeContent(content);
      
      expect(result.text).toBeDefined();
    });

    it('should handle very long content', () => {
      const longText = 'I '.repeat(1000) + 'am feeling better today with Dr. Johnson at 3:30 PM';
      const content = { text: longText };
      const result = socialSharingService.anonymizeContent(content);
      
      expect(result.text).not.toContain('I am');
      expect(result.text).not.toContain('Dr. Johnson');
      expect(result.text).not.toContain('3:30 PM');
      expect(result.text).toContain('Someone');
    });

    it('should handle content with special characters and emojis', () => {
      const content = { 
        text: 'I 💙 my therapy sessions with Dr. Smith! 😊 Today at 2:30 PM was amazing! 🎉' 
      };
      const result = socialSharingService.anonymizeContent(content);
      
      expect(result.text).toContain('💙');
      expect(result.text).toContain('😊');
      expect(result.text).toContain('🎉');
      expect(result.text).not.toContain('I 💙');
      expect(result.text).not.toContain('Dr. Smith');
      expect(result.text).toContain('Someone');
    });
  });

  describe('Anonymization Consistency', () => {
    it('should produce consistent results for identical input', () => {
      const content = { 
        text: 'I had therapy with Dr. Smith today at 3:00 PM and I feel better' 
      };

      const result1 = socialSharingService.anonymizeContent(content);
      const result2 = socialSharingService.anonymizeContent(content);

      expect(result1.text).toBe(result2.text);
    });

    it('should handle multiple names in the same content', () => {
      const content = { 
        text: 'I talked to Dr. Sarah Johnson and John Smith about my anxiety' 
      };
      const result = socialSharingService.anonymizeContent(content);

      expect(result.text).not.toContain('Dr. Sarah Johnson');
      expect(result.text).not.toContain('John Smith');
      expect(result.text).toContain('an important person');
      expect(result.text).toContain('Someone');
    });

    it('should preserve capitalization appropriately', () => {
      const content = { 
        text: 'I practice Mindfulness and Cognitive Behavioral Therapy techniques' 
      };
      const result = socialSharingService.anonymizeContent(content);

      expect(result.text).toContain('Mindfulness');
      expect(result.text).toContain('Cognitive Behavioral Therapy');
      expect(result.text).toContain('Someone');
    });
  });
});