import '@testing-library/jest-native/extend-expect';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock expo-linear-gradient  
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'View'
}));

// Mock Expo vector icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Text',
  MaterialIcons: 'Text',
  FontAwesome: 'Text',
  AntDesign: 'Text',
  Feather: 'Text'
}));

// Mock expo-linking
jest.mock('expo-linking', () => ({
  Linking: {
    openURL: jest.fn(),
    canOpenURL: jest.fn(() => Promise.resolve(true)),
    getInitialURL: jest.fn(() => Promise.resolve(null)),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  }
}));

// Mock React Native components
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  
  // Mock TurboModuleRegistry to prevent SettingsManager errors
  const mockTurboModuleRegistry = {
    getEnforcing: jest.fn(() => ({
      getConstants: jest.fn(() => ({})),
      get: jest.fn(),
      set: jest.fn()
    })),
    get: jest.fn()
  };

  return {
    ...RN,
    View: 'View',
    Text: 'Text',
    TouchableOpacity: 'TouchableOpacity',
    TextInput: 'TextInput',
    ScrollView: 'ScrollView',
    Alert: {
      alert: jest.fn()
    },
    TurboModuleRegistry: mockTurboModuleRegistry,
    Settings: {
      get: jest.fn(),
      set: jest.fn(),
      watchKeys: jest.fn(),
      clearWatch: jest.fn()
    },
    NativeModules: {
      SettingsManager: {
        getConstants: jest.fn(() => ({})),
        get: jest.fn(),
        set: jest.fn()
      }
    }
  };
});

// Mock TensorFlow.js
jest.mock('@tensorflow/tfjs', () => ({
  ready: jest.fn(() => Promise.resolve()),
  setBackend: jest.fn(),
  getBackend: jest.fn(() => 'cpu')
}));

jest.mock('@tensorflow/tfjs-react-native', () => ({
  platform: jest.fn()
}));

// Mock Sentry
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
  setUser: jest.fn(),
  setTag: jest.fn(),
  setContext: jest.fn(),
  withScope: jest.fn((callback) => callback({
    setTag: jest.fn(),
    setContext: jest.fn(),
    setLevel: jest.fn()
  }))
}));

// Mock Supabase client without data
jest.mock('../src/config/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn()
    },
    from: jest.fn()
  }
}));

// Global test timeout
jest.setTimeout(10000);

// Suppress common React warnings during tests
const originalWarn = console.warn;
const originalError = console.error;

beforeAll(() => {
  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is no longer supported') ||
       args[0].includes('Warning: componentWillReceiveProps has been renamed') ||
       args[0].includes('validateDOMNesting') ||
       args[0].includes('VirtualizedLists should never be nested'))
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };

  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is no longer supported') ||
       args[0].includes('Warning: componentWillReceiveProps has been renamed') ||
       args[0].includes('validateDOMNesting'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.warn = originalWarn;
  console.error = originalError;
});