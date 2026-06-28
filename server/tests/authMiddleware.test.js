export default {
  // Use 'node' environment
  testEnvironment: 'node',
  
  // Transform is required for modern ESM projects to allow Jest to process files
  // Using 'babel-jest' (if installed) or leaving empty if using native ESM support
  transform: {},
  
  // This tells Jest to treat .js files as ESM. 
  // Crucial for projects using "type": "module" in package.json
  extensionsToTreatAsEsm: ['.js'],
  
  // Ensure we don't accidentally ignore node_modules if you're mocking libraries inside it
  transformIgnorePatterns: ['/node_modules/'],
  
  // Clear mocks between tests so that one test doesn't leak into another
  clearMocks: true,
};
// ```

// ### Why this change is necessary:

// 1.  **`extensionsToTreatAsEsm`**: Since you are using ES modules (indicated by your error logs and the `import` usage in your project), this setting forces Jest to parse your files using the ESM engine instead of CommonJS. Without this, Jest often fails to find exports.
// 2.  **`clearMocks`**: This is best practice. It ensures that `jest.fn()` mocks (like your `next()` and `findById`) reset their call counts between every single `it()` test. This prevents a `toHaveBeenCalled()` check in one test from accidentally seeing a call that happened in a previous test.

// ### Important Follow-up for your test:
// In your `tests/authMiddleware.test.js`, ensure you are manually clearing your mocks in a `beforeEach` block to be absolutely sure:

// ```javascript
// Add this to your tests/authMiddleware.test.js
beforeEach(() => {
  jest.clearAllMocks();
});