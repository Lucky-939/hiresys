import { Builder, WebDriver, logging } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome";
import firefox from "selenium-webdriver/firefox";
import { testConfig } from "../config/testConfig";

export class DriverFactory {
  public static async createDriver(): Promise<WebDriver> {
    const builder = new Builder().forBrowser(testConfig.browser);

    // Setup logging preferences to capture browser console errors
    const logPrefs = new logging.Preferences();
    logPrefs.setLevel(logging.Type.BROWSER, logging.Level.ALL);
    builder.setLoggingPrefs(logPrefs);

    if (testConfig.browser === "chrome") {
      const options = new chrome.Options();
      options.addArguments("--window-size=1920,1080");
      options.addArguments("--disable-extensions");
      options.addArguments("--disable-gpu");
      options.addArguments("--no-sandbox");
      options.addArguments("--disable-dev-shm-usage");

      if (testConfig.headless) {
        options.addArguments("--headless=new");
      }

      builder.setChromeOptions(options);
    } else if (testConfig.browser === "firefox") {
      const options = new firefox.Options();
      options.addArguments("--width=1920");
      options.addArguments("--height=1080");

      if (testConfig.headless) {
        options.addArguments("-headless");
      }

      builder.setFirefoxOptions(options);
    }

    const driver = await builder.build();
    await driver.manage().setTimeouts({ implicit: 2000, pageLoad: 30000 });
    return driver;
  }
}
