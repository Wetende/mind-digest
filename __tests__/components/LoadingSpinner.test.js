import React from 'react';
import { render } from '@testing-library/react-native';
import LoadingSpinner from '../../src/components/LoadingSpinner';

describe('LoadingSpinner Component', () => {
  describe('Rendering', () => {
    it('should render loading spinner with default props', () => {
      const { getByTestId, getByText } = render(<LoadingSpinner />);
      
      // Check for ActivityIndicator
      const spinner = getByTestId('activity-indicator');
      expect(spinner).toBeTruthy();
      
      // Check for default loading text
      expect(getByText('Loading...')).toBeTruthy();
    });

    it('should render spinner without text when text prop is null', () => {
      const { getByTestId, queryByText } = render(
        <LoadingSpinner text={null} />
      );
      
      const spinner = getByTestId('activity-indicator');
      expect(spinner).toBeTruthy();
      expect(queryByText('Loading...')).toBeFalsy();
    });

    it('should render spinner without text when text prop is empty string', () => {
      const { getByTestId, queryByText } = render(
        <LoadingSpinner text="" />
      );
      
      const spinner = getByTestId('activity-indicator');
      expect(spinner).toBeTruthy();
      expect(queryByText('Loading...')).toBeFalsy();
    });

    it('should render custom text', () => {
      const customText = 'Please wait...';
      const { getByText } = render(
        <LoadingSpinner text={customText} />
      );
      
      expect(getByText(customText)).toBeTruthy();
    });
  });

  describe('ActivityIndicator Props', () => {
    it('should apply default size (large)', () => {
      const { getByTestId } = render(<LoadingSpinner />);
      
      const spinner = getByTestId('activity-indicator');
      expect(spinner.props.size).toBe('large');
    });

    it('should apply custom size', () => {
      const { getByTestId } = render(<LoadingSpinner size="small" />);
      
      const spinner = getByTestId('activity-indicator');
      expect(spinner.props.size).toBe('small');
    });

    it('should apply default color', () => {
      const { getByTestId } = render(<LoadingSpinner />);
      
      const spinner = getByTestId('activity-indicator');
      expect(spinner.props.color).toBe('#6366f1');
    });

    it('should apply custom color', () => {
      const customColor = '#ff0000';
      const { getByTestId } = render(<LoadingSpinner color={customColor} />);
      
      const spinner = getByTestId('activity-indicator');
      expect(spinner.props.color).toBe(customColor);
    });

    it('should handle numeric size values', () => {
      const { getByTestId } = render(<LoadingSpinner size={50} />);
      
      const spinner = getByTestId('activity-indicator');
      expect(spinner.props.size).toBe(50);
    });
  });

  describe('Styling', () => {
    it('should apply default container styles', () => {
      const { getByTestId } = render(
        <LoadingSpinner testID="loading-container" />
      );
      
      const container = getByTestId('loading-container');
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20
          })
        ])
      );
    });

    it('should apply custom style', () => {
      const customStyle = { 
        backgroundColor: '#f0f0f0',
        margin: 10 
      };
      const { getByTestId } = render(
        <LoadingSpinner testID="loading-container" style={customStyle} />
      );
      
      const container = getByTestId('loading-container');
      expect(container.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining(customStyle)])
      );
    });

    it('should merge custom style with default styles', () => {
      const customStyle = { backgroundColor: 'red' };
      const { getByTestId } = render(
        <LoadingSpinner testID="loading-container" style={customStyle} />
      );
      
      const container = getByTestId('loading-container');
      const styles = container.props.style;
      
      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ flex: 1 }), // default
          expect.objectContaining(customStyle) // custom
        ])
      );
    });

    it('should handle empty style object', () => {
      const { getByTestId } = render(
        <LoadingSpinner testID="loading-container" style={{}} />
      );
      
      const container = getByTestId('loading-container');
      expect(container).toBeTruthy();
    });

    it('should handle undefined style', () => {
      const { getByTestId } = render(
        <LoadingSpinner testID="loading-container" style={undefined} />
      );
      
      const container = getByTestId('loading-container');
      expect(container).toBeTruthy();
    });
  });

  describe('Text Styling', () => {
    it('should apply default text styles', () => {
      const { getByText } = render(<LoadingSpinner text="Loading..." />);
      
      const text = getByText('Loading...');
      expect(text.props.style).toEqual(
        expect.objectContaining({
          marginTop: 12,
          fontSize: 16,
          color: '#6b7280',
          textAlign: 'center'
        })
      );
    });

    it('should render long text correctly', () => {
      const longText = 'This is a very long loading message that should still render correctly';
      const { getByText } = render(<LoadingSpinner text={longText} />);
      
      expect(getByText(longText)).toBeTruthy();
    });

    it('should handle text with special characters', () => {
      const specialText = 'Loading... 🔄 Please wait! @#$%^&*()';
      const { getByText } = render(<LoadingSpinner text={specialText} />);
      
      expect(getByText(specialText)).toBeTruthy();
    });
  });

  describe('Size Variants', () => {
    const sizes = ['small', 'large'];
    
    sizes.forEach(size => {
      it(`should render correctly with ${size} size`, () => {
        const { getByTestId } = render(<LoadingSpinner size={size} />);
        
        const spinner = getByTestId('activity-indicator');
        expect(spinner.props.size).toBe(size);
      });
    });

    it('should handle custom numeric sizes', () => {
      const customSizes = [20, 30, 40, 50];
      
      customSizes.forEach(size => {
        const { getByTestId } = render(
          <LoadingSpinner size={size} key={size} />
        );
        
        const spinner = getByTestId('activity-indicator');
        expect(spinner.props.size).toBe(size);
      });
    });
  });

  describe('Color Variants', () => {
    const colors = [
      '#ff0000', // red
      '#00ff00', // green
      '#0000ff', // blue
      'red',     // named color
      'transparent'
    ];
    
    colors.forEach(color => {
      it(`should render correctly with ${color} color`, () => {
        const { getByTestId } = render(<LoadingSpinner color={color} />);
        
        const spinner = getByTestId('activity-indicator');
        expect(spinner.props.color).toBe(color);
      });
    });
  });

  describe('Accessibility', () => {
    it('should be accessible', () => {
      const { getByTestId } = render(
        <LoadingSpinner testID="loading-container" />
      );
      
      const container = getByTestId('loading-container');
      expect(container.props.accessible).not.toBe(false);
    });

    it('should have accessible loading indicator', () => {
      const { getByTestId } = render(<LoadingSpinner />);
      
      const spinner = getByTestId('activity-indicator');
      expect(spinner).toBeTruthy();
    });

    it('should support accessibility labels', () => {
      const { getByLabelText } = render(
        <LoadingSpinner accessibilityLabel="Loading content" />
      );
      
      expect(getByLabelText('Loading content')).toBeTruthy();
    });

    it('should have descriptive text for screen readers', () => {
      const accessibleText = 'Loading your data, please wait';
      const { getByText } = render(
        <LoadingSpinner text={accessibleText} />
      );
      
      expect(getByText(accessibleText)).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero size gracefully', () => {
      const { getByTestId } = render(<LoadingSpinner size={0} />);
      
      const spinner = getByTestId('activity-indicator');
      expect(spinner.props.size).toBe(0);
    });

    it('should handle very large size values', () => {
      const { getByTestId } = render(<LoadingSpinner size={200} />);
      
      const spinner = getByTestId('activity-indicator');
      expect(spinner.props.size).toBe(200);
    });

    it('should handle invalid color values gracefully', () => {
      const { getByTestId } = render(<LoadingSpinner color="invalid-color" />);
      
      const spinner = getByTestId('activity-indicator');
      expect(spinner.props.color).toBe('invalid-color');
    });

    it('should handle boolean text values', () => {
      const { queryByText } = render(<LoadingSpinner text={false} />);
      
      expect(queryByText('Loading...')).toBeFalsy();
    });

    it('should handle numeric text values', () => {
      const { getByText } = render(<LoadingSpinner text={123} />);
      
      expect(getByText('123')).toBeTruthy();
    });
  });

  describe('Layout', () => {
    it('should center content properly', () => {
      const { getByTestId } = render(
        <LoadingSpinner testID="loading-container" />
      );
      
      const container = getByTestId('loading-container');
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            justifyContent: 'center',
            alignItems: 'center'
          })
        ])
      );
    });

    it('should take full available space by default', () => {
      const { getByTestId } = render(
        <LoadingSpinner testID="loading-container" />
      );
      
      const container = getByTestId('loading-container');
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ flex: 1 })
        ])
      );
    });

    it('should override flex with custom style', () => {
      const customStyle = { flex: 0 };
      const { getByTestId } = render(
        <LoadingSpinner testID="loading-container" style={customStyle} />
      );
      
      const container = getByTestId('loading-container');
      expect(container.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining(customStyle)])
      );
    });
  });
});
