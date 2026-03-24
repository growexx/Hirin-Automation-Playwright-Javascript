/**
 * Test Data Configuration
 * Centralized test data and URLs for all tests
 */

const testData = {
  // Login credentials
  credentials: {
    email: 'superadmin@yopmail.com',
    password: 'Test@1234',
    invalidEmail: 'invalid@example',
  },

  // User information
  user: {
    name: 'Super Admin',
  },

  // URLs
  urls: {
    //loginPage: 'https://devapp.hirin.ai/login', // Dev Url
    loginPage: 'https://stgapp.hirin.ai',
    dashboard: 'https://growexx-dev.hirin.ai/',
  },

  // Timeouts (in milliseconds)
  timeouts: {
    pageLoadWait: 3000,
    finalWait: 2000,
  },

  // Modal selectors and text
  modal: {
    congratulationsText: 'Congratulations !!!!',
    recruitmentSolutionText1: 'Your one stop solution for AI',
    recruitmentSolutionText: 'Your one stop solution for AI powered Recruitment !!!!',
    closeButtonName: 'Close Step',
  },
};

module.exports = testData;

