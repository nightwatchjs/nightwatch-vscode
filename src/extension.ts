import { installNightwatch } from "./installer";
import * as vsCodeTypes from "./types/vscodeTypes";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vsCodeTypes.ExtensionContext): Promise<void> {
  new Extension(require('vscode')).activate(context);
}

// this method is called when your extension is deactivated
export function deactivate() {}

export class Extension {
  private _vscode: vsCodeTypes.VSCode;
  
  constructor(vscode: vsCodeTypes.VSCode) {
    this._vscode = vscode;
  }

  public async activate(context: vsCodeTypes.ExtensionContext): Promise<void> {
    // TODO: Remove console.log before MVP release
    console.log('extension "nightwatch-vscode" is now active!');

    const vscode = this._vscode;

    const disposable = [
      vscode.commands.registerCommand('nightwatch.installNightwatch', () => {
       installNightwatch(this._vscode);
      }),
    ];

    context.subscriptions.push(...disposable);
  }
}
