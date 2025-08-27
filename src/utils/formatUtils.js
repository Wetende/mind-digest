// Format utility functions

export const formatName = (name) => {
  if (!name) return '';
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Format as (XXX) XXX-XXXX
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  
  return phone;
};

export const formatCurrency = (amount, currency = 'USD') => {
  if (typeof amount !== 'number') return '$0.00';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

export const formatPercentage = (value, decimals = 1) => {
  if (typeof value !== 'number') return '0%';
  return `${(value * 100).toFixed(decimals)}%`;
};

export const truncateText = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const capitalizeFirst = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const formatMoodLabel = (moodValue) => {
  const moodLabels = {
    1: 'Anxious',
    2: 'Low',
    3: 'Okay',
    4: 'Good',
    5: 'Great'
  };
  
  return moodLabels[moodValue] || 'Unknown';
};

export const getMoodIcon = (moodValue) => {
  const moodIcons = {
    1: { name: 'alert-circle', color: '#8b5cf6' },
    2: { name: 'sad-outline', color: '#ef4444' },
    3: { name: 'remove', color: '#f59e0b' },
    4: { name: 'happy-outline', color: '#3b82f6' },
    5: { name: 'happy', color: '#10b981' }
  };
  
  return moodIcons[moodValue] || { name: 'remove', color: '#f59e0b' };
};