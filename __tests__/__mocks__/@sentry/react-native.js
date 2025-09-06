// Mock for @sentry/react-native
export const init = jest.fn();
export const captureException = jest.fn();
export const captureMessage = jest.fn();
export const addBreadcrumb = jest.fn();
export const setUser = jest.fn();
export const setTag = jest.fn();
export const setContext = jest.fn();
export const withScope = jest.fn((callback) => callback({
  setTag: jest.fn(),
  setContext: jest.fn(),
  setLevel: jest.fn()
}));

export default {
  init,
  captureException,
  captureMessage,
  addBreadcrumb,
  setUser,
  setTag,
  setContext,
  withScope
};