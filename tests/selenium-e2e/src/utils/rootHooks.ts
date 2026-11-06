import fs from "fs";
import path from "path";

export const mochaHooks = {
  beforeAll() {
    const screenshotsDir = path.resolve(__dirname, "../../screenshots");
    const resultsDir = path.resolve(__dirname, "../../test-results");
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
  },
  afterAll() {
    const resultsDir = path.resolve(__dirname, "../../test-results");
    const summaryFile = path.join(resultsDir, "test-summary.json");
    fs.writeFileSync(
      summaryFile,
      JSON.stringify(
        {
          suite: "HireSys Selenium E2E Automation",
          executedAt: new Date().toISOString(),
          status: "COMPLETED",
          specs: [
            "01_auth.spec.ts",
            "02_rbac.spec.ts",
            "03_room.spec.ts",
            "04_negative_login_datadriven.spec.ts",
            "05_race_condition.spec.ts",
            "06_console_errors.spec.ts",
          ],
        },
        null,
        2
      )
    );
  },
};

