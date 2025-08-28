import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function Button({ 
  title, 
  onPress, 
  variant = 'primary', 
  size = 'medium',
  disabled = false,
  gradient = null,
  style = {},
  textStyle = {},
  ...props
}) {
  const buttonStyles = [
    styles.button,
    styles[size],
    styles[variant],
    disabled && styles.disabled,
    style
  ];

  const textStyles = [
    styles.text,
    styles[`${variant}Text`],
    styles[`${size}Text`],
    disabled && styles.disabledText,
    textStyle
  ];

  const ButtonContent = () => (
    <Text style={textStyles}>{title}</Text>
  );

  const accessibilityProps = {
    accessible: true,
    accessibilityRole: 'button',
    accessibilityState: { disabled },
    ...props
  };

  if (gradient && !disabled) {
    return (
      <TouchableOpacity 
        onPress={onPress} 
        disabled={disabled} 
        style={style}
        {...accessibilityProps}
      >
        <LinearGradient
          colors={gradient}
          style={[styles.button, styles[size]]}
        >
          <ButtonContent />
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity 
      style={buttonStyles} 
      onPress={onPress} 
      disabled={disabled}
      {...accessibilityProps}
    >
      <ButtonContent />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  // Sizes
  small: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  medium: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  large: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  
  // Variants
  primary: {
    backgroundColor: '#6366f1',
  },
  secondary: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  danger: {
    backgroundColor: '#ef4444',
  },
  success: {
    backgroundColor: '#10b981',
  },
  
  // Disabled state
  disabled: {
    backgroundColor: '#d1d5db',
    shadowOpacity: 0,
    elevation: 0,
  },
  
  // Text styles
  text: {
    fontWeight: '600',
  },
  
  // Text variants
  primaryText: {
    color: 'white',
  },
  secondaryText: {
    color: '#374151',
  },
  dangerText: {
    color: 'white',
  },
  successText: {
    color: 'white',
  },
  
  // Text sizes
  smallText: {
    fontSize: 14,
  },
  mediumText: {
    fontSize: 16,
  },
  largeText: {
    fontSize: 18,
  },
  
  // Disabled text
  disabledText: {
    color: '#9ca3af',
  },
});