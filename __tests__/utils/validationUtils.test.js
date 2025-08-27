import {
  validateEmail,
  validatePassword,
  getPasswordStrength,
  validateDisplayName,
} from '../../src/utils/validationUtils';

describe('Validation Utils', () => {
  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'firstname.lastname@company.com',
        'email@123.123.123.123', // IP address
      ];

      validEmails.forEach(email => {
        expect(validateEmail(email)).toBe(true);
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user..name@example.com',
        'user@.com',
        'user@com',
        '',
        null,
        undefined,
      ];

      invalidEmails.forEach(email => {
        expect(validateEmail(email)).toBe(false);
      });
    });
  });

  describe('validatePassword', () => {
    it('should validate strong passwords', () => {
      const validPasswords = [
        'Password123!',
        'MySecure@Pass1',
        'Complex#Password2023',
        'Str0ng!P@ssw0rd',
      ];

      validPasswords.forEach(password => {
        expect(validatePassword(password)).toBe(true);
      });
    });

    it('should reject weak passwords', () => {
      const invalidPasswords = [
        'short', // too short
        'password', // no uppercase, no numbers, no special chars
        'PASSWORD', // no lowercase, no numbers, no special chars
        '12345678', // no letters, no special chars
        'Password', // no numbers, no special chars
        'Password123', // no special chars
        '', // empty
        null,
        undefined,
      ];

      invalidPasswords.forEach(password => {
        expect(validatePassword(password)).toBe(false);
      });
    });
  });

  describe('getPasswordStrength', () => {
    it('should return weak for simple passwords', () => {
      const weakPasswords = [
        'password',
        '123456',
        'abc',
        'Password',
      ];

      weakPasswords.forEach(password => {
        expect(getPasswordStrength(password)).toBe('weak');
      });
    });

    it('should return medium for moderately complex passwords', () => {
      const mediumPasswords = [
        'Password123',
        'MyPassword1',
        'Test@123',
      ];

      mediumPasswords.forEach(password => {
        expect(getPasswordStrength(password)).toBe('medium');
      });
    });

    it('should return strong for complex passwords', () => {
      const strongPasswords = [
        'MyVerySecure@Password123',
        'Complex!Password2023#',
        'Str0ng@P@ssw0rd!2023',
      ];

      strongPasswords.forEach(password => {
        expect(getPasswordStrength(password)).toBe('strong');
      });
    });

    it('should handle edge cases', () => {
      expect(getPasswordStrength('')).toBe('weak');
      expect(getPasswordStrength(null)).toBe('weak');
      expect(getPasswordStrength(undefined)).toBe('weak');
    });
  });

  describe('validateDisplayName', () => {
    it('should validate correct display names', () => {
      const validNames = [
        'John Doe',
        'Alice',
        'Bob Smith Jr.',
        'María García',
        'Jean-Pierre',
        'O\'Connor',
        'User123',
      ];

      validNames.forEach(name => {
        expect(validateDisplayName(name)).toBe(true);
      });
    });

    it('should reject invalid display names', () => {
      const invalidNames = [
        '', // empty
        'A', // too short
        'A'.repeat(51), // too long
        '   ', // only spaces
        'User@Name', // invalid characters
        'User#Name',
        'User$Name',
        null,
        undefined,
      ];

      invalidNames.forEach(name => {
        expect(validateDisplayName(name)).toBe(false);
      });
    });
  });
});