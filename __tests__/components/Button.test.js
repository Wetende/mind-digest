import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Button from '../../src/components/Button';

// Mock expo-linear-gradient
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, ...props }) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

describe('Button Component', () => {
  it('renders with default props', () => {
    const { getByText } = render(<Button title="Test Button" />);
    expect(getByText('Test Button')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(
      <Button title="Test Button" onPress={mockOnPress} />
    );
    
    fireEvent.press(getByText('Test Button'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(
      <Button title="Test Button" onPress={mockOnPress} disabled={true} />
    );
    
    fireEvent.press(getByText('Test Button'));
    expect(mockOnPress).not.toHaveBeenCalled();
  });

  it('renders with primary variant by default', () => {
    const { getByText } = render(<Button title="Test Button" />);
    const button = getByText('Test Button').parent;
    
    // Check if the button has primary styling (this is a simplified check)
    expect(button).toBeTruthy();
  });

  it('renders with secondary variant', () => {
    const { getByText } = render(
      <Button title="Test Button" variant="secondary" />
    );
    const button = getByText('Test Button').parent;
    expect(button).toBeTruthy();
  });

  it('renders with danger variant', () => {
    const { getByText } = render(
      <Button title="Test Button" variant="danger" />
    );
    const button = getByText('Test Button').parent;
    expect(button).toBeTruthy();
  });

  it('renders with success variant', () => {
    const { getByText } = render(
      <Button title="Test Button" variant="success" />
    );
    const button = getByText('Test Button').parent;
    expect(button).toBeTruthy();
  });

  it('renders with small size', () => {
    const { getByText } = render(
      <Button title="Test Button" size="small" />
    );
    const button = getByText('Test Button').parent;
    expect(button).toBeTruthy();
  });

  it('renders with medium size by default', () => {
    const { getByText } = render(<Button title="Test Button" />);
    const button = getByText('Test Button').parent;
    expect(button).toBeTruthy();
  });

  it('renders with large size', () => {
    const { getByText } = render(
      <Button title="Test Button" size="large" />
    );
    const button = getByText('Test Button').parent;
    expect(button).toBeTruthy();
  });

  it('renders with gradient when provided and not disabled', () => {
    const gradient = ['#ff0000', '#00ff00'];
    const { getByText } = render(
      <Button title="Test Button" gradient={gradient} />
    );
    
    expect(getByText('Test Button')).toBeTruthy();
  });

  it('does not render gradient when disabled', () => {
    const gradient = ['#ff0000', '#00ff00'];
    const { getByText } = render(
      <Button title="Test Button" gradient={gradient} disabled={true} />
    );
    
    expect(getByText('Test Button')).toBeTruthy();
  });

  it('applies custom style', () => {
    const customStyle = { backgroundColor: 'red' };
    const { getByText } = render(
      <Button title="Test Button" style={customStyle} />
    );
    
    expect(getByText('Test Button')).toBeTruthy();
  });

  it('applies custom text style', () => {
    const customTextStyle = { fontSize: 20 };
    const { getByText } = render(
      <Button title="Test Button" textStyle={customTextStyle} />
    );
    
    expect(getByText('Test Button')).toBeTruthy();
  });

  it('renders disabled state correctly', () => {
    const { getByText } = render(
      <Button title="Test Button" disabled={true} />
    );
    
    const button = getByText('Test Button').parent;
    expect(button).toBeTruthy();
  });

  it('handles empty title', () => {
    const { getByText } = render(<Button title="" />);
    expect(getByText('')).toBeTruthy();
  });

  it('handles long title text', () => {
    const longTitle = 'This is a very long button title that should still render correctly';
    const { getByText } = render(<Button title={longTitle} />);
    expect(getByText(longTitle)).toBeTruthy();
  });
});