import * as vsCodeTypes from './types/vscodeTypes';

import { NightwatchExt } from './NightwatchExt';
import { CommandType, GetNightwatchExtByURI, RegisterCommand } from './NightwatchExt/types';
import { extensionName } from './appGlobals';
import { DebugConfigurationProvider } from './NightwatchExt/debugConfigurationProvider';

const commandPrefix: Record<CommandType, string> = {
  'all-workspaces': `${extensionName}`,
  'active-text-editor': `${extensionName}`,
};

export class ExtensionManager {
  private _vscode: vsCodeTypes.VSCode;
  private context: vsCodeTypes.ExtensionContext;
  private debugConfigurationProvider: DebugConfigurationProvider;

  private extByWorkspace: Map<string, NightwatchExt> = new Map();

  constructor(vscode: vsCodeTypes.VSCode, context: vsCodeTypes.ExtensionContext) {
    this._vscode = vscode;
    this.context = context;
    this.debugConfigurationProvider = new DebugConfigurationProvider();
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
    const nightwatchExt = new NightwatchExt(
      this._vscode,
      this.context,
      workspaceFolder,
      this.debugConfigurationProvider
    );
    this.extByWorkspace.set(workspaceFolder.name, nightwatchExt);
    nightwatchExt.startSession();
  }

  unregister(workspaceFolder: vsCodeTypes.WorkspaceFolder): void {
    this.unregisterByName(workspaceFolder.name);
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
      extension.deactivate();
      this.extByWorkspace.delete(key);
    }
  }

  onDidChangeConfiguration(event: vsCodeTypes.ConfigurationChangeEvent): void {
    const vscode = this._vscode;

    if (event.affectsConfiguration('nightwatch')) {
      vscode.workspace.workspaceFolders?.forEach((workspaceFolder) => {
        const nightwatchExt = this.getByExtName(workspaceFolder.name);
        if (nightwatchExt && event.affectsConfiguration('nightwatch', workspaceFolder.uri)) {
          nightwatchExt.triggerUpdateSettings();
        }
      });
    }
  }

  onDidChangeWorkspaceFolders(e: vsCodeTypes.WorkspaceFoldersChangeEvent): void {
    e.added.forEach(this.register, this);
    e.removed.forEach(this.unregister, this);
  }
  onDidCloseTextDocument(document: vsCodeTypes.TextDocument): void {
    const ext = this.getByDocumentUri(document.uri);
    if (ext) {
      ext.onDidCloseTextDocument(document);
    }
  }
  onDidChangeActiveTextEditor(editor?: vsCodeTypes.TextEditor): void {
    if (editor && editor.document) {
      const ext = this.getByDocumentUri(editor.document.uri);
      if (ext) {
        ext.onDidChangeActiveTextEditor(editor);
      }
    }
  }
  onDidChangeTextDocument(event: vsCodeTypes.TextDocumentChangeEvent): void {
    const ext = this.getByDocumentUri(event.document.uri);
    if (ext) {
      ext.onDidChangeTextDocument(event);
    }
  }

  onWillSaveTextDocument(event: vsCodeTypes.TextDocumentWillSaveEvent): void {
    const ext = this.getByDocumentUri(event.document.uri);
    if (ext) {
      ext.onWillSaveTextDocument(event);
    }
  }
  onDidSaveTextDocument(document: vsCodeTypes.TextDocument): void {
    const ext = this.getByDocumentUri(document.uri);
    if (ext) {
      ext.onDidSaveTextDocument(document);
    }
  }
  private onFilesChange(files: readonly vsCodeTypes.Uri[], handler: (ext: NightwatchExt) => void) {
    const exts = files.map((f) => this.getByDocumentUri(f)).filter((ext) => ext != null) as NightwatchExt[];
    const set = new Set<NightwatchExt>(exts);
    set.forEach(handler);
  }

  onDidCreateFiles(event: vsCodeTypes.FileCreateEvent): void {
    this.onFilesChange(event.files, (ext) => ext.onDidCreateFiles(event));
  }

  onDidDeleteFiles(event: vsCodeTypes.FileDeleteEvent): void {
    this.onFilesChange(event.files, (ext) => ext.onDidDeleteFiles(event));
  }

  onDidRenameFiles(event: vsCodeTypes.FileRenameEvent): void {
    const files = event.files.reduce((list, f) => {
      list.push(f.newUri, f.oldUri);
      return list;
    }, [] as vsCodeTypes.Uri[]);
    this.onFilesChange(files, (ext) => ext.onDidRenameFiles(event));
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
