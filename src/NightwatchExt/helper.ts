import path from 'path';
import { nodeBinExtension, pathToNightwatchCommandLine } from '../helpers';
import ProjectWorkspace from '../NightwatchRunner/projectWorkspace';
import { NightwatchExtensionResourceSettings, NodeEnv } from '../Settings/types';
import { NightwatchExtContext } from '../types/extensionTypes';
import * as vsCodeTypes from '../types/vscodeTypes';

export const getExtensionResourceSettings = (
  vscode: vsCodeTypes.VSCode,
  uri: vsCodeTypes.Uri
): NightwatchExtensionResourceSettings => {
  const config = vscode.workspace.getConfiguration('nightwatch', uri);

  return {
    nightwatchCommandLine: config.get<string>('nightwatchCommandLine'),
    shell: config.get<string>('shell'),
    showTerminalOnLaunch: config.get<boolean>('showTerminalOnLaunch'),
    testPath: path.join(uri.fsPath, config.get<string>('testPath')!),
    nodeEnv: config.get<NodeEnv | null>('nodeEnv') ?? undefined,
    debugMode: config.get<boolean>('debugMode')
  };
};

export const createNightwatchExtContext = (
  vscode: vsCodeTypes.VSCode,
  workspaceFolder: vsCodeTypes.WorkspaceFolder,
  settings: NightwatchExtensionResourceSettings
): NightwatchExtContext => {
  const createRunnerWorkspace = async () => {
    const [nightwatchCommandLine, pathToConfig] = await getNightwatchCommandAndConfig(vscode, settings);
    return new ProjectWorkspace(
      settings.testPath ?? '',
      pathToConfig,
      nightwatchCommandLine,
      settings.debugMode,
      settings.nodeEnv,
      settings.shell
    );
  };

  return {
    workspace: workspaceFolder,
    createRunnerWorkspace,
    settings,
  };
};

const getNightwatchCommandAndConfig = async (
  vscode: vsCodeTypes.VSCode,
  settings: NightwatchExtensionResourceSettings
): Promise<string[]> => {
  const nightwatchConfigFile = await findNightwatchConfigFile(vscode);

  if (settings.nightwatchCommandLine) {
    if (nightwatchConfigFile) {
      return [settings.nightwatchCommandLine, nightwatchConfigFile];
    }
    return [settings.nightwatchCommandLine, ''];
  }
  const possibleNightwatchCommandLine =
    (await pathToNightwatchCommandLine(settings.testPath)) || 'nightwatch' + nodeBinExtension;
  return [possibleNightwatchCommandLine, nightwatchConfigFile ?? ''];
};

const findNightwatchConfigFile = async (vscode: vsCodeTypes.VSCode): Promise<string | undefined> => {
  const configFiles = await vscode.workspace.findFiles('**/*nightwatch*.conf.{js,ts,cjs}', undefined, 1);

  for (const configFileUri of configFiles) {
    return configFileUri.path;
  }
};
