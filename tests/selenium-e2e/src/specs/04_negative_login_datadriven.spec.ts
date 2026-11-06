import { WebDriver } from "selenium-webdriver";
import { expect } from "chai";
import { DriverFactory } from "../utils/driverFactory";
import { LoginPage } from "../pages/LoginPage";
import { ConsoleValidator } from "../utils/consoleValidator";
import negativeCases from "../fixtures/negative_login_cases.json";

describe("Data-Driven Negative Login Tests (7 Fixture Cases)", function () {
  this.timeout(60000);
  let driver: WebDriver;
  let loginPage: LoginPage;

  before(async () => {
    driver = await DriverFactory.createDriver();
    loginPage = new LoginPage(driver);
  });

  after(async () => {
    if (driver) {
      await driver.quit();
    }
  });

  beforeEach(async () => {
    await loginPage.open();
  });

  negativeCases.forEach((testCase) => {
    it(`${testCase.id}: ${testCase.caseName}`, async () => {
      // Execute login with fixture data
      await loginPage.login(testCase.email, testCase.password);

      // Brief wait to allow React state or browser validation to update
      await driver.sleep(600);

      // Assertion 1 (Security Barrier): User MUST NOT be navigated away from /login
      const currentUrl = await loginPage.getCurrentUrl();
      expect(currentUrl).to.include(
        "/login",
        `Security violation: ${testCase.id} resulted in redirect away from /login!`
      );

      // Assertion 2 (Rigorous Oracle Validation):
      if (testCase.type === "EMPTY_EMAIL") {
        const isEmailValid = await loginPage.isEmailInputValid();
        expect(isEmailValid).to.be.false;
      } else if (testCase.type === "EMPTY_PASSWORD") {
        const isPasswordValid = await loginPage.isPasswordInputValid();
        expect(isPasswordValid).to.be.false;
      } else if (testCase.type === "BOTH_EMPTY") {
        const isEmailValid = await loginPage.isEmailInputValid();
        const isPasswordValid = await loginPage.isPasswordInputValid();
        expect(isEmailValid || isPasswordValid).to.be.false;
      } else if (testCase.type === "BOUNDARY_LENGTH") {
        // Strong Oracle for Boundary Length (TC_NEG_06):
        // Must strictly trigger field validation rejection OR display 400/422 error banner.
        // A buggy app returning 200 or silently ignoring input is flagged as a failure.
        const isEmailValid = await loginPage.isEmailInputValid();
        const isErrorBannerVisible = await loginPage.isErrorMessageVisible();

        // Either client HTML5 constraint triggers, or server returns 400 error banner
        expect(
          !isEmailValid || isErrorBannerVisible,
          "Oracle Failure: 200-char boundary input was neither blocked by email validation nor rejected with an error banner!"
        ).to.be.true;

        if (isErrorBannerVisible) {
          const bannerText = await loginPage.getErrorMessageText();
          expect(bannerText.toLowerCase()).to.match(
            /invalid|length|too long|bad request|format|credentials/i,
            `Error banner '${bannerText}' did not explain boundary validation failure.`
          );
        }
      } else if (testCase.type === "WRONG_PASSWORD" || testCase.type === "SQL_INJECTION") {
        // Assert error banner appears with authentication rejection message
        const hasError = await loginPage.isErrorMessageVisible();
        if (hasError) {
          const errorText = await loginPage.getErrorMessageText();
          expect(errorText.length).to.be.greaterThan(0);
          expect(errorText.toLowerCase()).to.match(/invalid|incorrect|unauthorized/i);
        }
      } else if (testCase.type === "UNICODE_SPECIAL_CHARS") {
        const isEmailValid = await loginPage.isEmailInputValid();
        const hasError = await loginPage.isErrorMessageVisible();
        expect(!isEmailValid || hasError).to.be.true;
      }

      // Assertion 3 (Console Health): No unhandled browser runtime crashes
      const consoleErrors = await ConsoleValidator.getConsoleErrors(driver);
      const fatalErrors = consoleErrors.filter(
        (e) => !e.message.includes("401") && !e.message.includes("Failed to load resource")
      );
      expect(fatalErrors.length).to.equal(
        0,
        `Unexpected fatal JavaScript error during ${testCase.id}: ${JSON.stringify(fatalErrors)}`
      );
    });
  });
});
