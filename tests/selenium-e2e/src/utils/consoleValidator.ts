import { WebDriver, logging } from "selenium-webdriver";
import { expect } from "chai";

export interface ConsoleErrorEntry {
  level: string;
  message: string;
  timestamp: number;
}

export class ConsoleValidator {
  /**
   * Fetches browser console logs and filters for SEVERE / error-level entries.
   * Excludes benign noise (such as known 3rd-party favicon/font warnings or React hydration warnings in dev).
   */
  public static async getConsoleErrors(
    driver: WebDriver,
    ignorePatterns: RegExp[] = [
      /favicon\.ico/i,
      /react-devtools/i,
      /download the React DevTools/i,
    ]
  ): Promise<ConsoleErrorEntry[]> {
    try {
      const logs = await driver.manage().logs().get(logging.Type.BROWSER);
      const severeLogs = logs.filter((entry) => {
        const isSevere = entry.level.name === logging.Level.SEVERE.name;
        if (!isSevere) return false;

        // Check if message matches any ignored pattern
        return !ignorePatterns.some((pattern) => pattern.test(entry.message));
      });

      return severeLogs.map((entry) => ({
        level: entry.level.name,
        message: entry.message,
        timestamp: entry.timestamp,
      }));
    } catch (err: unknown) {
      // Some browsers (like Firefox in pure W3C mode) restrict log inspection.
      // Defensively log a notice rather than throwing driver-level failure.
      console.warn("Notice: Browser console log access unavailable on this driver:", err);
      return [];
    }
  }

  /**
   * Asserts that zero SEVERE JavaScript errors occurred on the active page.
   * Useful for validating clean page loads and UI transitions.
   */
  public static async assertNoConsoleErrors(
    driver: WebDriver,
    pageContext: string
  ): Promise<void> {
    const errors = await this.getConsoleErrors(driver);
    if (errors.length > 0) {
      const formattedErrors = errors
        .map((e) => `[${new Date(e.timestamp).toISOString()}] ${e.message}`)
        .join("\n");

      expect.fail(
        `Found ${errors.length} severe JavaScript error(s) on ${pageContext}:\n${formattedErrors}`
      );
    }
  }
}

