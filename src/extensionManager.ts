import * as vsCodeTypes from './types/vscodeTypes';

import { NightwatchExt } from './NightwatchExt';
import { CommandType, GetNightwatchExtByURI, RegisterCommand } from './types/extensionTypes';
import { extensionName } from './appGlobals';

const commandPrefix: Record<CommandType, string> = {
  'all-workspaces': `${extensionName}.nightwatchExt`,
};

export class ExtensionManager {
  private _vscode: vsCodeTypes.VSCode;
  private context: vsCodeTypes.ExtensionContext;

  private extByWorkspace: Map<string, NightwatchExt> = new Map();

  constructor(vscode: vsCodeTypes.VSCode, context: vsCodeTypes.ExtensionContext) {
    this._vscode = vscode;
    this.context = context;
    this.applyWorkspaces();
  }

  applyWorkspaces(): void {
    const vscode = this._vscode;
    vscode.workspace.workspaceFolders?.forEach((ws) => {
      if (!this.extByWorkspace.get(ws.name)) {
        this.register(ws);
      }
    });
  }

  register(workspaceFolder: vsCodeTypes.WorkspaceFolder): void {
    const nightwatchExt = new NightwatchExt(this.context);
    this.extByWorkspace.set(workspaceFolder.name, nightwatchExt);
  }

  getByExtName = (workspaceFolderName: string): NightwatchExt | undefined => {
    return this.extByWorkspace.get(workspaceFolderName);
  };

  getByDocumentUri: GetNightwatchExtByURI = (uri: vsCodeTypes.Uri) => {
    const vscode = this._vscode;
    const workspace = vscode.workspace.getWorkspaceFolder(uri);
    if (workspace) {
      return this.getByExtName(workspace.name);
    }
  };

  registerCommand(command: RegisterCommand): vsCodeTypes.Disposable {
    const vscode = this._vscode;
    const commandName = `${commandPrefix[command.type]}.${command.name}`;

    switch (command.type) {
      case 'all-workspaces':
        return vscode.commands.registerCommand(commandName, async (...args: any[]) => {
          vscode.workspace.workspaceFolders?.forEach((workspace) => {
            const extension = this.getByExtName(workspace.name);

            if (extension) {
              command.callback(extension, vscode, ...args);
            }
          });
        });
    }
  }

  activate(): void {
    const vscode = this._vscode;
    const vscodeActiveDocumentUri = vscode.window.activeTextEditor?.document.uri;

    if (vscodeActiveDocumentUri) {
      const extension = this.getByDocumentUri(vscodeActiveDocumentUri);
      console.log('**extension:', extension);

      // if (extension) {
      //   extension.installNightwatch();
      // }
    }
  }
}
