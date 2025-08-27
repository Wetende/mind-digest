// Validation utility functions

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password) => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

export const validateDisplayName = (name) => {
  // 2-50 characters, letters, numbers, spaces, hyphens, underscores
  const nameRegex = /^[a-zA-Z0-9\s\-_]{2,50}$/;
  return nameRegex.test(name);
};

export const validateMoodValue = (mood) => {
  return typeof mood === 'number' && mood >= 1 && mood <= 5;
};

export const validateJournalEntry = (entry) => {
  return typeof entry === 'string' && entry.trim().length >= 10 && entry.length <= 5000;
};

export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  // Remove potentially harmful characters
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim();
};

export const validatePhoneNumber = (phone) => {
  // Basic US phone number validation
  const phoneRegex = /^\+?1?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/;
  return phoneRegex.test(phone);
};

export const getPasswordStrength = (password) => {
  let strength = 0;
  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    numbers: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  Object.values(checks).forEach(check => {
    if (check) strength++;
  });

  if (strength < 2) return { level: 'weak', score: strength };
  if (strength < 4) return { level: 'medium', score: strength };
  return { level: 'strong', score: strength };
};

export const validateAge = (age) => {
  return typeof age === 'number' && age >= 13 && age <= 120;
};