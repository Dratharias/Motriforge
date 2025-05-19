import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import { cleanup } from '@solidjs/testing-library';

// Clean up after each test
afterEach(() => {
  cleanup();
});