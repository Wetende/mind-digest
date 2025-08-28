import React from 'react';
import { render } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import Card from '../../src/components/Card';

describe('Card Component', () => {
  describe('Rendering', () => {
    it('should render card with children', () => {
      const { getByText } = render(
        <Card>
          <Text>Card Content</Text>
        </Card>
      );
      
      expect(getByText('Card Content')).toBeTruthy();
    });

    it('should render card without children', () => {
      const { getByTestId } = render(
        <Card testID="empty-card" />
      );
      
      expect(getByTestId('empty-card')).toBeTruthy();
    });

    it('should render multiple children', () => {
      const { getByText } = render(
        <Card>
          <Text>First Child</Text>
          <Text>Second Child</Text>
          <View>
            <Text>Nested Child</Text>
          </View>
        </Card>
      );
      
      expect(getByText('First Child')).toBeTruthy();
      expect(getByText('Second Child')).toBeTruthy();
      expect(getByText('Nested Child')).toBeTruthy();
    });
  });

  describe('Styling', () => {
    it('should apply default padding', () => {
      const { getByTestId } = render(
        <Card testID="card">
          <Text>Content</Text>
        </Card>
      );
      
      const card = getByTestId('card');
      expect(card.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ padding: 16 })
        ])
      );
    });

    it('should apply custom padding', () => {
      const customPadding = 24;
      const { getByTestId } = render(
        <Card testID="card" padding={customPadding}>
          <Text>Content</Text>
        </Card>
      );
      
      const card = getByTestId('card');
      expect(card.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ padding: customPadding })
        ])
      );
    });

    it('should apply custom style', () => {
      const customStyle = { 
        marginTop: 10, 
        backgroundColor: '#f0f0f0',
        borderWidth: 2 
      };
      const { getByTestId } = render(
        <Card testID="card" style={customStyle}>
          <Text>Content</Text>
        </Card>
      );
      
      const card = getByTestId('card');
      expect(card.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining(customStyle)
        ])
      );
    });

    it('should merge custom style with default styles', () => {
      const customStyle = { backgroundColor: 'red' };
      const { getByTestId } = render(
        <Card testID="card" style={customStyle}>
          <Text>Content</Text>
        </Card>
      );
      
      const card = getByTestId('card');
      const styles = card.props.style;
      
      // Should contain both default card styles and custom style
      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: 'white' }), // default
          expect.objectContaining(customStyle) // custom
        ])
      );
    });

    it('should handle zero padding', () => {
      const { getByTestId } = render(
        <Card testID="card" padding={0}>
          <Text>Content</Text>
        </Card>
      );
      
      const card = getByTestId('card');
      expect(card.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ padding: 0 })
        ])
      );
    });
  });

  describe('Default Styles', () => {
    it('should have default card styles applied', () => {
      const { getByTestId } = render(
        <Card testID="card">
          <Text>Content</Text>
        </Card>
      );
      
      const card = getByTestId('card');
      const styles = card.props.style;
      
      // Check for presence of default card styles
      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: 'white',
            borderRadius: 12
          })
        ])
      );
    });

    it('should have shadow properties', () => {
      const { getByTestId } = render(
        <Card testID="card">
          <Text>Content</Text>
        </Card>
      );
      
      const card = getByTestId('card');
      const styles = card.props.style;
      
      // Check for shadow properties (these are platform-specific)
      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            shadowColor: '#000',
            elevation: 3
          })
        ])
      );
    });
  });

  describe('Props Validation', () => {
    it('should handle undefined style prop', () => {
      const { getByTestId } = render(
        <Card testID="card" style={undefined}>
          <Text>Content</Text>
        </Card>
      );
      
      const card = getByTestId('card');
      expect(card).toBeTruthy();
    });

    it('should handle null style prop', () => {
      const { getByTestId } = render(
        <Card testID="card" style={null}>
          <Text>Content</Text>
        </Card>
      );
      
      const card = getByTestId('card');
      expect(card).toBeTruthy();
    });

    it('should handle empty style object', () => {
      const { getByTestId } = render(
        <Card testID="card" style={{}}>
          <Text>Content</Text>
        </Card>
      );
      
      const card = getByTestId('card');
      expect(card).toBeTruthy();
    });

    it('should handle negative padding', () => {
      const { getByTestId } = render(
        <Card testID="card" padding={-5}>
          <Text>Content</Text>
        </Card>
      );
      
      const card = getByTestId('card');
      expect(card.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ padding: -5 })
        ])
      );
    });
  });

  describe('Complex Children', () => {
    it('should render complex nested structure', () => {
      const ComplexChild = () => (
        <View>
          <Text>Header</Text>
          <View>
            <Text>Subheader</Text>
            <Text>Body</Text>
          </View>
          <Text>Footer</Text>
        </View>
      );

      const { getByText } = render(
        <Card>
          <ComplexChild />
        </Card>
      );
      
      expect(getByText('Header')).toBeTruthy();
      expect(getByText('Subheader')).toBeTruthy();
      expect(getByText('Body')).toBeTruthy();
      expect(getByText('Footer')).toBeTruthy();
    });

    it('should handle dynamic children', () => {
      const items = ['Item 1', 'Item 2', 'Item 3'];
      
      const { getByText } = render(
        <Card>
          {items.map((item, index) => (
            <Text key={index}>{item}</Text>
          ))}
        </Card>
      );
      
      items.forEach(item => {
        expect(getByText(item)).toBeTruthy();
      });
    });

    it('should handle conditional children', () => {
      const showOptional = true;
      
      const { getByText, queryByText } = render(
        <Card>
          <Text>Always Visible</Text>
          {showOptional && <Text>Conditionally Visible</Text>}
          {!showOptional && <Text>Hidden Content</Text>}
        </Card>
      );
      
      expect(getByText('Always Visible')).toBeTruthy();
      expect(getByText('Conditionally Visible')).toBeTruthy();
      expect(queryByText('Hidden Content')).toBeFalsy();
    });
  });

  describe('Accessibility', () => {
    it('should be accessible', () => {
      const { getByTestId } = render(
        <Card testID="card">
          <Text>Content</Text>
        </Card>
      );
      
      const card = getByTestId('card');
      expect(card.props.accessible).not.toBe(false);
    });

    it('should maintain accessibility of children', () => {
      const { getByLabelText } = render(
        <Card>
          <Text accessibilityLabel="accessible-text">Content</Text>
        </Card>
      );
      
      expect(getByLabelText('accessible-text')).toBeTruthy();
    });

    it('should support accessibility props', () => {
      const { getByLabelText } = render(
        <Card accessibilityLabel="card-container">
          <Text>Content</Text>
        </Card>
      );
      
      expect(getByLabelText('card-container')).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('should render efficiently with many children', () => {
      const manyChildren = Array.from({ length: 100 }, (_, i) => (
        <Text key={i}>Item {i}</Text>
      ));
      
      const { getByText } = render(
        <Card>
          {manyChildren}
        </Card>
      );
      
      // Test first and last items to ensure all rendered
      expect(getByText('Item 0')).toBeTruthy();
      expect(getByText('Item 99')).toBeTruthy();
    });
  });
});
