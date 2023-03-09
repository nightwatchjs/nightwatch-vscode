import * as vsCodeTypes from './types/vscodeTypes';

export interface MessageAction {
  title: string;
  action: () => void;
}

const doNothing = () => {};

export function _handleMessageActions(
  actions?: MessageAction[],
): (action?: string) => void {
  if (!actions || actions.length <= 0) {
    return doNothing;
  }

  return (action?: string) => {
    if (!action) {
      return;
    }

    const found = actions.filter((act) => act.title === action);
    if (found.length === 1) {
      found[0].action();
    } else {
      throw new Error(
        `expect only one matched action '${action}' but found ${found.length} matches.`,
      );
    }
  };
}

export function _extractActionTitles(actions?: MessageAction[]): string[] {
  return actions ? actions.map((action) => action.title) : [];
}

export function systemErrorMessage(
  vscode: vsCodeTypes.VSCode,
  message: string,
  ...actions: MessageAction[]
): void {
  vscode.window
    .showErrorMessage(message, ..._extractActionTitles(actions))
    .then(_handleMessageActions(actions));
}

export function systemWarningMessage(
  vscode: vsCodeTypes.VSCode,
  message: string,
  ...actions: MessageAction[]
): void {
  vscode.window
    .showWarningMessage(message, ..._extractActionTitles(actions))
    .then(_handleMessageActions(actions));
}
