import { WebDriver, By, until, WebElement } from "selenium-webdriver";
import { testConfig } from "../config/testConfig";

export class WaitHelpers {
  public static async waitForElement(
    driver: WebDriver,
    locator: By,
    timeoutMs: number = testConfig.defaultTimeoutMs
  ): Promise<WebElement> {
    const el = await driver.wait(until.elementLocated(locator), timeoutMs);
    await driver.wait(until.elementIsVisible(el), timeoutMs);
    return el;
  }

  public static async waitForUrlContains(
    driver: WebDriver,
    urlSubstring: string,
    timeoutMs: number = testConfig.defaultTimeoutMs
  ): Promise<boolean> {
    return await driver.wait(until.urlContains(urlSubstring), timeoutMs);
  }

  public static async waitForText(
    driver: WebDriver,
    locator: By,
    expectedText: string,
    timeoutMs: number = testConfig.defaultTimeoutMs
  ): Promise<boolean> {
    const el = await driver.wait(until.elementLocated(locator), timeoutMs);
    const result = await driver.wait(until.elementTextContains(el, expectedText), timeoutMs);
    return !!result;
  }
}

