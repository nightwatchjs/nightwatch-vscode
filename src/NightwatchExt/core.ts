import { NightwatchExtContext } from '../types/extensionTypes';
import * as vsCodeTypes from '../types/vscodeTypes';
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
    this.vscodeContext = vscodeContext;
    this.extContext = this.createNightwatchExtContext(workspaceFolder);
    this._nightwatchTest = _nightwatchTest;
    vscode = _vscode;
  }

  createNightwatchExtContext(workspaceFolder: vsCodeTypes.WorkspaceFolder): NightwatchExtContext {
    return {
      workspace: workspaceFolder,
    };
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
    await this._nightwatchTest.runAllTests(vscode);
  }

  async debugTests(): Promise<void> {
    await this._nightwatchTest.debugAllTests(vscode);
  }
}
