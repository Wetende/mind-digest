# Mind-Digest Testing Suite

This directory contains comprehensive tests for the Mind-Digest mental health application. The testing suite is designed to ensure code quality, reliability, and user experience across all features.

## 📁 Test Structure

```
__tests__/
├── components/          # Component unit tests
│   └── Button.test.js
├── contexts/           # Context provider tests
│   └── AuthContext.test.js
├── integration/        # End-to-end integration tests
│   └── userJourney.test.js
├── services/          # Service layer tests
│   ├── authService.test.js
│   └── moodService.test.js
├── utils/             # Utility function tests
│   ├── dateUtils.test.js
│   └── validationUtils.test.js
├── setup.js           # Test configuration and mocks
├── testRunner.js      # Custom test runner with reporting
└── README.md          # This file
```

## 🧪 Test Categories

### Unit Tests
- **Components**: UI component behavior and rendering
- **Services**: Business logic and API interactions
- **Utils**: Helper functions and utilities
- **Contexts**: State management and providers

### Integration Tests
- **User Journeys**: Complete user workflows
- **Authentication Flow**: Sign up, sign in, sign out
- **Data Flow**: End-to-end data operations
- **Error Handling**: Error scenarios and recovery

## 🚀 Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test Button.test.js

# Run tests matching pattern
npm test -- --testNamePattern="should handle sign in"
```

### Advanced Testing

```bash
# Run custom test runner with detailed reporting
node __tests__/testRunner.js

# Run only unit tests
npm test -- --testPathPattern="__tests__/(utils|services|components)"

# Run only integration tests
npm test -- --testPathPattern="__tests__/integration"

# Run tests with verbose output
npm test -- --verbose

# Update snapshots
npm test -- --updateSnapshot
```

## 📊 Coverage Goals

| Metric | Target | Current |
|--------|--------|---------|
| Statements | ≥ 80% | - |
| Branches | ≥ 70% | - |
| Functions | ≥ 80% | - |
| Lines | ≥ 80% | - |

## 🔧 Test Configuration

### Jest Configuration
Located in `package.json`:
- **Preset**: `jest-expo` for React Native compatibility
- **Setup**: Custom setup file with mocks and utilities
- **Transform**: Handles TypeScript and modern JavaScript
- **Coverage**: Excludes test files and index files

### Mocks
The test suite includes comprehensive mocks for:
- **Supabase**: Database and authentication operations
- **Expo modules**: Linear gradient, constants, etc.
- **React Navigation**: Navigation hooks and components
- **AsyncStorage**: Local storage operations

## 📝 Writing Tests

### Test File Naming
- Component tests: `ComponentName.test.js`
- Service tests: `serviceName.test.js`
- Utility tests: `utilityName.test.js`
- Integration tests: `featureName.test.js`

### Test Structure
```javascript
describe('ComponentName', () => {
  beforeEach(() => {
    // Setup before each test
  });

  describe('specific functionality', () => {
    it('should behave correctly', () => {
      // Test implementation
    });
  });
});
```

### Best Practices
1. **Descriptive Names**: Use clear, descriptive test names
2. **Arrange-Act-Assert**: Structure tests with clear phases
3. **Mock External Dependencies**: Isolate units under test
4. **Test Edge Cases**: Include error conditions and boundary cases
5. **Keep Tests Simple**: One assertion per test when possible

## 🛠️ Testing Utilities

### Custom Matchers
The suite extends Jest with React Native Testing Library matchers:
- `toBeOnTheScreen()`
- `toHaveTextContent()`
- `toBeDisabled()`
- `toHaveStyle()`

### Test Helpers
Common testing utilities are available in `setup.js`:
- Mock implementations for external services
- Test data factories
- Common test scenarios

## 🔍 Debugging Tests

### Common Issues
1. **Async Operations**: Use `waitFor()` for async assertions
2. **Mock Timing**: Ensure mocks are set up before imports
3. **State Updates**: Wrap state changes in `act()`
4. **Navigation**: Mock navigation properly for screen tests

### Debug Commands
```bash
# Run single test with debug info
npm test -- --testNamePattern="specific test" --verbose

# Run with Node debugger
node --inspect-brk node_modules/.bin/jest --runInBand

# Generate detailed coverage report
npm run test:coverage -- --verbose
```

## 📈 Continuous Integration

### Pre-commit Hooks
Tests should run automatically before commits:
```bash
# Add to package.json scripts
"pre-commit": "npm test"
```

### CI/CD Pipeline
Recommended CI configuration:
1. Install dependencies
2. Run linting
3. Run test suite
4. Generate coverage report
5. Upload coverage to reporting service

## 🎯 Mental Health Specific Testing

### Privacy Testing
- Ensure anonymization works correctly
- Validate data encryption and security
- Test privacy setting enforcement

### Crisis Detection Testing
- Test trigger word detection
- Validate emergency response flows
- Ensure crisis resources are accessible

### Content Moderation Testing
- Test AI content filtering
- Validate human moderation escalation
- Ensure community guidelines enforcement

## 📚 Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Mental Health App Testing Guidelines](https://www.who.int/publications/i/item/9789241515894)

## 🤝 Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure all tests pass
3. Maintain or improve coverage
4. Update this documentation if needed

For questions or issues with tests, please refer to the project documentation or create an issue in the repository.