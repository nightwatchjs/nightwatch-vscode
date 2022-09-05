import * as vsCodeTypes from '../types/vscodeTypes';

export async function installNightwatch(vscode: vsCodeTypes.VSCode): Promise<void> {
  const [workspaceFolder] = vscode.workspace.workspaceFolders || [];
  const quickPickItems: vsCodeTypes.QuickPickItem[] = [];

  if (!workspaceFolder) {
    return;
  }
  const quickPickSeparator: vsCodeTypes.QuickPickItem = {
    label: 'Select browsers to install',
    kind: vscode.QuickPickItemKind.Separator,
  };
  const googleChrome: vsCodeTypes.QuickPickItem = {
    label: 'Google Chrome',
    picked: false,
    detail: 'Google Chrome is a cross-platform web browser developed by Google.',
  };
  const mozillaFirefox: vsCodeTypes.QuickPickItem = {
    label: 'Mozilla Firefox',
    picked: true,
    detail: 'Mozilla Firefox is a free and open-source web browser developed by the Mozilla Foundation.',
  };
  const appleSafari: vsCodeTypes.QuickPickItem = {
    label: 'Apple Safari',
    picked: false,
    detail: 'Safari is a graphical web browser developed by Apple.',
  };
  const microsoftEdge: vsCodeTypes.QuickPickItem = {
    label: 'Microsoft Edge',
    picked: false,
    detail: 'Microsoft Edge is a cross-platform web browser created and developed by Microsoft.',
  };
  quickPickItems.push(quickPickSeparator, googleChrome, mozillaFirefox, appleSafari, microsoftEdge);

  const result = await vscode.window.showQuickPick(quickPickItems, {
    title: 'Install Nightwatch',
    canPickMany: true,
    matchOnDetail: true,
  });

  if (result?.length === 0) {
    vscode.window.showErrorMessage("You haven't selected any browsers");
    return;
  }

  const terminal = vscode.window.createTerminal({
    name: 'Install Nightwatch',
    cwd: workspaceFolder.uri.fsPath,
    env: process.env,
  });

  terminal.show();

  const args: string[] = [];
  if (result?.includes(googleChrome)) {
    args.push('--browser=chrome');
  }
  if (result?.includes(mozillaFirefox)) {
    args.push('--browser=firefox');
  }
  if (result?.includes(appleSafari)) {
    args.push('--browser=safari');
  }
  if (result?.includes(microsoftEdge)) {
    args.push('--browser=edge');
  }

  terminal.sendText(`npm init nightwatch -- --yes ${args.join(' ')}`, true);
}
