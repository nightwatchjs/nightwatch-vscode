import * as vsCodeTypes from './types/vscodeTypes';
import './setupNLS';
import { ExtensionManager } from './extensionManager';
import { NightwatchExt } from './NightwatchExt';
import * as vscode from 'vscode';

let extensionManager: ExtensionManager;

const addSubscriptions = (context: vsCodeTypes.ExtensionContext): void => {
  const installNightwatch = (extension: NightwatchExt) => {
    extension.installNightwatch();
  };
  const runAllTests = (extension: NightwatchExt) => extension.runAllTests();

  context.subscriptions.push(
    extensionManager.registerCommand({
      type: 'all-workspaces',
      name: 'install-nightwatch',
      callback: installNightwatch,
    }),
    extensionManager.registerCommand({
      type: 'all-workspaces',
      name: 'run-all-test',
      callback: runAllTests,
    }),
    extensionManager.registerCommand({
      type: 'active-text-editor',
      name: 'run-test',
      callback: (extension) => {
        if (vscode.window.activeTextEditor) {
          extension.runAllTests(vscode.window.activeTextEditor);
        }
      },
    }),
    extensionManager.registerCommand({
      type: 'active-text-editor',
      name: 'debug-test',
      callback: (extension) => {
        if (vscode.window.activeTextEditor) {
          extension.debugTests(vscode.window.activeTextEditor?.document, ...[]);
        }
      },
    }),
    vscode.workspace.onDidChangeConfiguration(extensionManager.onDidChangeConfiguration, extensionManager),
    vscode.workspace.onDidChangeWorkspaceFolders(extensionManager.onDidChangeWorkspaceFolders, extensionManager),
    vscode.workspace.onDidCloseTextDocument(extensionManager.onDidCloseTextDocument, extensionManager),
    vscode.window.onDidChangeActiveTextEditor(extensionManager.onDidChangeActiveTextEditor, extensionManager),
    vscode.workspace.onDidChangeTextDocument(extensionManager.onDidChangeTextDocument, extensionManager),
    vscode.workspace.onDidCreateFiles(extensionManager.onDidCreateFiles, extensionManager),
    vscode.workspace.onDidRenameFiles(extensionManager.onDidRenameFiles, extensionManager),
    vscode.workspace.onDidDeleteFiles(extensionManager.onDidDeleteFiles, extensionManager),
    vscode.workspace.onDidSaveTextDocument(extensionManager.onDidSaveTextDocument, extensionManager),
    vscode.workspace.onWillSaveTextDocument(extensionManager.onWillSaveTextDocument, extensionManager)
  );
};

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vsCodeTypes.ExtensionContext): Promise<void> {
  // TODO: Remove console.log before MVP release
  console.log('extension "nightwatch-vscode" is now active!');
  // TODO: Activate only if nightwatch is present in Package.json
  extensionManager = new ExtensionManager(vscode, context);
  addSubscriptions(context);
  extensionManager.activate();
}

// this method is called when your extension is deactivated
export function deactivate() {
  extensionManager.deactivate();
}
