import { NightwatchExtContext } from '../types/extensionTypes';
import * as vsCodeTypes from '../types/vscodeTypes';
import { createNightwatchExtContext, getExtensionResourceSettings } from './helper';
import { installNightwatch } from './installer';
import { NightwatchTest } from './nightwatchtest';

let vscode: vsCodeTypes.VSCode;
export class NightwatchExt {
  private extContext: NightwatchExtContext;

  constructor(
    private _vscode: vsCodeTypes.VSCode,
    private vscodeContext: vsCodeTypes.ExtensionContext,
    private workspaceFolder: vsCodeTypes.WorkspaceFolder,
    private _nightwatchTest: NightwatchTest
  ) {
    vscode = _vscode;
    this.vscodeContext = vscodeContext;
    this._nightwatchTest = _nightwatchTest;
    const getNightwatchExtensionSettings = getExtensionResourceSettings(vscode, workspaceFolder.uri);
    this.extContext = createNightwatchExtContext(vscode, workspaceFolder, getNightwatchExtensionSettings);
  }

  public async installNightwatch() {
    installNightwatch(vscode);
  }

  public activate(): void {
    if (
      vscode.window.activeTextEditor?.document.uri &&
      vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri) === this.extContext.workspace
    ) {
      this.onDidChangeActiveTextEditor(vscode.window.activeTextEditor);
    }
  }

  onDidChangeActiveTextEditor(editor: vsCodeTypes.TextEditor): void {
    // TODO: Add Update decorators function, and Diagnostics
    console.log('Editor', editor);
  }

  async runTests(): Promise<void> {
    await this._nightwatchTest.runAllTests(this.extContext, vscode);
  }

  async debugTests(): Promise<void> {
    await this._nightwatchTest.debugAllTests(vscode);
  }
}
