import { MockUser, MockEvent } from './setup';

declare global {
  var testUtils: {
    createMockUser: () => MockUser;
    createMockEvent: () => MockEvent;
  };
}

export { }; // Ensure this file is treated as a module
