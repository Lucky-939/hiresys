import { WebDriver, By, WebElement, until } from "selenium-webdriver";
import { testConfig } from "../config/testConfig";
import fs from "fs";
import path from "path";

export abstract class BasePage {
  protected driver: WebDriver;

  constructor(driver: WebDriver) {
    this.driver = driver;
  }

  public async navigateTo(pathUrl: string): Promise<void> {
    const fullUrl = pathUrl.startsWith("http")
      ? pathUrl
      : `${testConfig.baseUrl}${pathUrl}`;
    await this.driver.get(fullUrl);
  }

  public async getCurrentUrl(): Promise<string> {
    return await this.driver.getCurrentUrl();
  }

  public async getPageTitle(): Promise<string> {
    return await this.driver.getTitle();
  }

  protected async find(by: By, timeoutMs: number = testConfig.defaultTimeoutMs): Promise<WebElement> {
    const el = await this.driver.wait(until.elementLocated(by), timeoutMs);
    await this.driver.wait(until.elementIsVisible(el), timeoutMs);
    return el;
  }

  protected async click(by: By, timeoutMs?: number): Promise<void> {
    const el = await this.find(by, timeoutMs);
    await el.click();
  }

  protected async type(by: By, text: string, clearFirst: boolean = true): Promise<void> {
    const el = await this.find(by);
    if (clearFirst) {
      await el.clear();
    }
    await el.sendKeys(text);
  }

  public async takeScreenshot(filename: string): Promise<string> {
    const screenshotDir = path.resolve(__dirname, "../../screenshots");
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    const filepath = path.join(screenshotDir, `${filename}_${Date.now()}.png`);
    const image = await this.driver.takeScreenshot();
    fs.writeFileSync(filepath, image, "base64");
    return filepath;
  }
}

