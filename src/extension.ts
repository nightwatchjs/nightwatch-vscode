import * as vsCodeTypes from './types/vscodeTypes';
import './setupNLS';
import { ExtensionManager } from './extensionManager';
import { NightwatchExt } from './NightwatchExt';

let extensionManager: ExtensionManager;

const addSubscriptions = (context: vsCodeTypes.ExtensionContext): void => {
  const installNightwatch = (extension: NightwatchExt) => {
    extension.installNightwatch();
  };

  const runAllTests = (extension: NightwatchExt) => {
    extension.runTests();
  };

  const debugAllTests = (extension: NightwatchExt) => {
    extension.debugTests();
  };

  context.subscriptions.push(
    extensionManager.registerCommand({
      type: 'all-workspaces',
      name: 'install-nightwatch',
      callback: installNightwatch,
    }),
    extensionManager.registerCommand({
      type: 'active-text-editor',
      name: 'run-test',
      callback: runAllTests,
    }),
    extensionManager.registerCommand({
      type: 'active-text-editor',
      name: 'debug-test',
      callback: debugAllTests,
    })
  );
};

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vsCodeTypes.ExtensionContext): Promise<void> {
  // TODO: Remove console.log before MVP release
  console.log('extension "nightwatch-vscode" is now active!');
  // TODO: Activate only if nightwatch is present in Package.json
  extensionManager = new ExtensionManager(require('vscode'), context);
  addSubscriptions(context);
  extensionManager.activate();
}

// this method is called when your extension is deactivated
export function deactivate() {
  extensionManager.deactivate();
}
