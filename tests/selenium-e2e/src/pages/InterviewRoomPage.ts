import { By } from "selenium-webdriver";
import { BasePage } from "./BasePage";
import { WaitHelpers } from "../utils/waitHelpers";

export class InterviewRoomPage extends BasePage {
  private monacoEditorContainer = By.css(".monaco-editor");
  private runCodeButton = By.xpath("//button[contains(., 'Run') or contains(., 'Execute')]");
  private languageDropdown = By.css("select");
  private problemStatementPanel = By.xpath("//div[contains(@class, 'problem') or contains(., 'Problem')]");

  public async openRoom(roomId: string): Promise<void> {
    await this.navigateTo(`/room/${roomId}`);
  }

  public async isEditorLoaded(): Promise<boolean> {
    try {
      const editorEl = await WaitHelpers.waitForElement(
        this.driver,
        this.monacoEditorContainer,
        15000
      );
      return await editorEl.isDisplayed();
    } catch {
      return false;
    }
  }

  public async isRunButtonVisible(): Promise<boolean> {
    try {
      const btn = await this.find(this.runCodeButton, 5000);
      return await btn.isDisplayed();
    } catch {
      return false;
    }
  }

  public async selectLanguage(language: string): Promise<void> {
    const selectEl = await this.find(this.languageDropdown);
    await selectEl.sendKeys(language);
  }
}

