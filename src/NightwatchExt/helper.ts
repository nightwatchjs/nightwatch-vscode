import { NightwatchExtensionResourceSettings } from "../Settings/types";
import * as vsCodeTypes from "../types/vscodeTypes";

export const getExtensionResourceSettings = (vscode: vsCodeTypes.VSCode, uri: vsCodeTypes.Uri): NightwatchExtensionResourceSettings => {
  const config = vscode.workspace.getConfiguration('nightwatch', uri);

  return {
    nightwatchCommandLine: config.get<string>('nightwatchCommandLine'),
    shell: config.get<string>('shell'),
    showTerminalOnLaunch: config.get<boolean>('showTerminalOnLaunch'),
    testPath: config.get<string>('testPath')
  };
};
