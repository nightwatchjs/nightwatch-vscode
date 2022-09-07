import * as vsCodeTypes from "./types/vscodeTypes";

export function systemErrorMessage(vscode: vsCodeTypes.VSCode, message: string) {
  vscode.window.showErrorMessage(message);
}

export function systemWarningMessage(vscode: vsCodeTypes.VSCode, message: string) {
  vscode.window.showWarningMessage(message);
}
