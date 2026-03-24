import { expect } from '@playwright/test';

class DashboardPage {
  /**
   * Initialize DashboardPage with Playwright page object
   * @param {Page} page - Playwright page instance
   */
  constructor(page) {
    this.page = page;
  }

  /**
   * Navigate to the dashboard
   */
  async navigateToDashboard(url) {
    await this.page.goto(url);
  }

  /**
   * Wait for page to load completely
   * @param {number} timeout - Timeout in milliseconds (default: 6000)
   */
  async waitForPageLoad(timeout = 6000) {
    await this.page.waitForTimeout(timeout);
  }

  /**
   * Verify welcome message is visible
   * @param {string} userName - Expected user name in welcome message
   */
  async verifyWelcomeMessage(userName) {
    const welcomeText = this.page.getByText(`Welcome, ${userName} !!`);
    await expect(welcomeText).toBeVisible();
  }

  /**
   * Wait for additional time (utility method)
   * @param {number} timeout - Timeout in milliseconds
   */
  async waitForTimeout(timeout) {
    await this.page.waitForTimeout(timeout);
  }
}

module.exports = DashboardPage;

