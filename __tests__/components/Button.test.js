import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Button from '../../src/components/Button';

// Mock expo-linear-gradient
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, style, colors }) => {
    const MockedLinearGradient = require('react-native').View;
    return (
      <MockedLinearGradient 
        style={style} 
        testID="linear-gradient"
        accessibilityLabel={`gradient-${colors?.join('-')}`}
      >
        {children}
      </MockedLinearGradient>
    );
  },
}));

describe('Button Component', () => {
  const defaultProps = {
    title: 'Test Button',
    onPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render button with title', () => {
      const { getByText } = render(<Button {...defaultProps} />);
      expect(getByText('Test Button')).toBeTruthy();
    });

    it('should render button with default props', () => {
      const { getByText, getByRole } = render(<Button {...defaultProps} />);
      
      const button = getByRole('button');
      const text = getByText('Test Button');
      
      expect(button).toBeTruthy();
      expect(text).toBeTruthy();
    });

    it('should apply custom style', () => {
      const customStyle = { marginTop: 10 };
      const { getByRole } = render(
        <Button {...defaultProps} style={customStyle} />
      );
      
      const button = getByRole('button');
      // Check that custom style is included in the button style
      expect(button.props.style).toEqual(
        expect.objectContaining(customStyle)
      );
    });

    it('should apply custom text style', () => {
      const customTextStyle = { fontSize: 20 };
      const { getByText } = render(
        <Button {...defaultProps} textStyle={customTextStyle} />
      );
      
      const text = getByText('Test Button');
      expect(text.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining(customTextStyle)])
      );
    });
  });

  describe('Variants', () => {
    it('should render primary variant by default', () => {
      const { getByRole } = render(<Button {...defaultProps} />);
      const button = getByRole('button');
      
      // Check if primary styles are applied (this is implicit in the styling)
      expect(button).toBeTruthy();
    });

    it('should render secondary variant', () => {
      const { getByRole } = render(
        <Button {...defaultProps} variant="secondary" />
      );
      const button = getByRole('button');
      expect(button).toBeTruthy();
    });

    it('should render danger variant', () => {
      const { getByRole } = render(
        <Button {...defaultProps} variant="danger" />
      );
      const button = getByRole('button');
      expect(button).toBeTruthy();
    });

    it('should render success variant', () => {
      const { getByRole } = render(
        <Button {...defaultProps} variant="success" />
      );
      const button = getByRole('button');
      expect(button).toBeTruthy();
    });
  });

  describe('Sizes', () => {
    it('should render medium size by default', () => {
      const { getByRole } = render(<Button {...defaultProps} />);
      const button = getByRole('button');
      expect(button).toBeTruthy();
    });

    it('should render small size', () => {
      const { getByRole } = render(
        <Button {...defaultProps} size="small" />
      );
      const button = getByRole('button');
      expect(button).toBeTruthy();
    });

    it('should render large size', () => {
      const { getByRole } = render(
        <Button {...defaultProps} size="large" />
      );
      const button = getByRole('button');
      expect(button).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    it('should call onPress when pressed', () => {
      const onPressMock = jest.fn();
      const { getByRole } = render(
        <Button {...defaultProps} onPress={onPressMock} />
      );
      
      const button = getByRole('button');
      fireEvent.press(button);
      
      expect(onPressMock).toHaveBeenCalledTimes(1);
    });

    it('should not call onPress when disabled', () => {
      const onPressMock = jest.fn();
      const { getByRole } = render(
        <Button {...defaultProps} onPress={onPressMock} disabled={true} />
      );
      
      const button = getByRole('button');
      fireEvent.press(button);
      
      expect(onPressMock).not.toHaveBeenCalled();
    });

    it('should be disabled when disabled prop is true', () => {
      const { getByRole } = render(
        <Button {...defaultProps} disabled={true} />
      );
      
      const button = getByRole('button');
      expect(button.props.accessibilityState.disabled).toBe(true);
    });
  });

  describe('Gradient Support', () => {
    it('should render linear gradient when gradient prop is provided', () => {
      const gradientColors = ['#ff0000', '#00ff00'];
      const { getByTestId } = render(
        <Button {...defaultProps} gradient={gradientColors} />
      );
      
      const gradient = getByTestId('linear-gradient');
      expect(gradient).toBeTruthy();
      expect(gradient.props.accessibilityLabel).toBe('gradient-#ff0000-#00ff00');
    });

    it('should not render gradient when disabled', () => {
      const gradientColors = ['#ff0000', '#00ff00'];
      const { queryByTestId } = render(
        <Button {...defaultProps} gradient={gradientColors} disabled={true} />
      );
      
      const gradient = queryByTestId('linear-gradient');
      expect(gradient).toBeFalsy();
    });

    it('should render regular button when no gradient provided', () => {
      const { getByRole, queryByTestId } = render(<Button {...defaultProps} />);
      
      const button = getByRole('button');
      const gradient = queryByTestId('linear-gradient');
      
      expect(button).toBeTruthy();
      expect(gradient).toBeFalsy();
    });
  });

  describe('Accessibility', () => {
    it('should be accessible', () => {
      const { getByRole } = render(<Button {...defaultProps} />);
      const button = getByRole('button');
      
      expect(button).toBeTruthy();
      expect(button.props.accessible).not.toBe(false);
    });

    it('should have correct accessibility state when disabled', () => {
      const { getByRole } = render(
        <Button {...defaultProps} disabled={true} />
      );
      
      const button = getByRole('button');
      expect(button.props.accessibilityState.disabled).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty title', () => {
      const { getByRole } = render(
        <Button {...defaultProps} title="" />
      );
      
      const button = getByRole('button');
      expect(button).toBeTruthy();
    });

    it('should handle undefined onPress', () => {
      const { getByRole } = render(
        <Button title="Test" onPress={undefined} />
      );
      
      const button = getByRole('button');
      expect(() => fireEvent.press(button)).not.toThrow();
    });

    it('should handle multiple rapid presses', () => {
      const onPressMock = jest.fn();
      const { getByRole } = render(
        <Button {...defaultProps} onPress={onPressMock} />
      );
      
      const button = getByRole('button');
      fireEvent.press(button);
      fireEvent.press(button);
      fireEvent.press(button);
      
      expect(onPressMock).toHaveBeenCalledTimes(3);
    });

    it('should handle null gradient gracefully', () => {
      const { getByRole } = render(
        <Button {...defaultProps} gradient={null} />
      );
      
      const button = getByRole('button');
      expect(button).toBeTruthy();
    });

    it('should handle empty gradient array', () => {
      const { getByRole } = render(
        <Button {...defaultProps} gradient={[]} />
      );
      
      const button = getByRole('button');
      expect(button).toBeTruthy();
    });
  });

  describe('Style Combinations', () => {
    it('should apply all variant and size combinations correctly', () => {
      const variants = ['primary', 'secondary', 'danger', 'success'];
      const sizes = ['small', 'medium', 'large'];
      
      variants.forEach(variant => {
        sizes.forEach(size => {
          const { getByRole } = render(
            <Button 
              {...defaultProps} 
              variant={variant} 
              size={size}
              key={`${variant}-${size}`}
            />
          );
          
          const button = getByRole('button');
          expect(button).toBeTruthy();
        });
      });
    });

    it('should handle disabled state with all variants', () => {
      const variants = ['primary', 'secondary', 'danger', 'success'];
      
      variants.forEach(variant => {
        const { getByRole } = render(
          <Button 
            {...defaultProps} 
            variant={variant} 
            disabled={true}
            key={`disabled-${variant}`}
          />
        );
        
        const button = getByRole('button');
        expect(button.props.accessibilityState.disabled).toBe(true);
      });
    });
  });
});