// import { installNightwatch } from "./NightwatchExt/installer";
import * as vsCodeTypes from "./types/vscodeTypes";
import "./setupNLS";
import { NightwatchTest } from "./NightwatchTest";
import { ExtensionManager } from "./extensionManager";
import { NightwatchExt } from "./NightwatchExt";

let extensionManager: ExtensionManager;

const addSubscriptions = (context: vsCodeTypes.ExtensionContext): void => {
  const instNightwatch = (extension: NightwatchExt) => {
    // TODO: Refactor
    extension.installNightwatch(require('vscode'));
  };

  context.subscriptions.push(
    extensionManager.registerCommand({
      type: 'all-workspaces',
      name: 'install-nightwatch',
      callback: instNightwatch,
    })
  );
};


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
// TODO: issue is that require('vscode') is not passed in ExtensionManager and we are directly calling the types
export async function activate(context: vsCodeTypes.ExtensionContext): Promise<void> {  
  extensionManager = new ExtensionManager(require('vscode'), context);
  addSubscriptions(context);
  extensionManager.activate();
  new Extension(require('vscode')).activate(context);
}

// this method is called when your extension is deactivated
export function deactivate() {}

export class Extension {
  private _vscode: vsCodeTypes.VSCode;
  private _nightwatchTest: NightwatchTest;
  
  constructor(vscode: vsCodeTypes.VSCode) {
    this._vscode = vscode;
    this._nightwatchTest = new NightwatchTest(false);
  } 

  public async activate(context: vsCodeTypes.ExtensionContext): Promise<void> {
    // TODO: Remove console.log before MVP release
    console.log('extension "nightwatch-vscode" is now active!');

    // const vscode = this._vscode;

    // const disposable = [
    //   vscode.commands.registerCommand('nightwatch.installNightwatch', () => {
    //    installNightwatch(this._vscode);
    //   }),
    // ];

    // context.subscriptions.push(...disposable);
    
  }
}
