import * as vsCodeTypes from './types/vscodeTypes';

import { NightwatchExt } from './NightwatchExt';
import { CommandType, GetNightwatchExtByURI, RegisterCommand } from './NightwatchExt/types';
import { extensionName } from './appGlobals';
import { NightwatchTest } from './NightwatchExt/nightwatchTest';

const commandPrefix: Record<CommandType, string> = {
  'all-workspaces': `${extensionName}`,
  'active-text-editor': `${extensionName}`,
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
    const nightwatchExt = new NightwatchExt(this._vscode, this.context, workspaceFolder, new NightwatchTest());
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

  registerCommand(command: RegisterCommand, thisArg?: any): vsCodeTypes.Disposable {
    const vscode = this._vscode;
    const commandName = `${commandPrefix[command.type]}.${command.name}`;

    switch (command.type) {
      case 'all-workspaces':
        return vscode.commands.registerCommand(commandName, async (...args: any[]) => {
          vscode.workspace.workspaceFolders?.forEach((workspace) => {
            const extension = this.getByExtName(workspace.name);

            if (extension) {
              command.callback(extension, ...args);
            }
          });
        });
      case 'active-text-editor':
        return vscode.commands.registerCommand(commandName, async (...args: any[]) => {
          const extension = await this.selectExtension();
          if (extension) {
            command.callback.call(thisArg, extension, ...args);
          }
        });
    }
  }

  async selectExtension(): Promise<NightwatchExt | undefined> {
    const vscode = this._vscode;
    const workspace =
      vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length <= 1
        ? vscode.workspace.workspaceFolders[0]
        : await vscode.window.showWorkspaceFolderPick();

    const instance = workspace && this.getByExtName(workspace.name);
    if (instance) {
      return instance;
    } else if (workspace) {
      throw new Error(`No Nightwatch instance in ${workspace.name} workspace`);
    }
  }

  unregisterByName(key: string): void {
    const extension = this.extByWorkspace.get(key);

    if (extension) {
      this.extByWorkspace.delete(key);
    }
  }

  activate(): void {
    const vscode = this._vscode;
    const vscodeActiveDocumentUri = vscode.window.activeTextEditor?.document.uri;

    if (vscodeActiveDocumentUri) {
      const extension = this.getByDocumentUri(vscodeActiveDocumentUri);

      if (extension) {
        extension.activate();
      }
    }
  }

  deactivate(): void {
    const keys = this.extByWorkspace.keys();
    for (const key of keys) {
      this.unregisterByName(key);
    }
  }
}
