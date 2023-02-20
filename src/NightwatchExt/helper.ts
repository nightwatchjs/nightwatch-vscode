import path from 'path';
import { nodeBinExtension, pathToNightwatchCommandLine } from '../helpers';
import { workspaceLogging } from '../Logging';
import ProjectWorkspace from '../NightwatchRunner/projectWorkspace';
import { NightwatchExtensionResourceSettings, NodeEnv } from '../Settings';
import * as vsCodeTypes from '../types/vscodeTypes';
import { NightwatchExtContext } from './types';

export const getExtensionResourceSettings = (
  vscode: vsCodeTypes.VSCode,
  uri: vsCodeTypes.Uri
): NightwatchExtensionResourceSettings => {
  const config = vscode.workspace.getConfiguration('nightwatch', uri);

  return {
    nightwatchCommandLine: config.get<string>('settings.nightwatchCommandLine'),
    shell: config.get<string>('settings.shell'),
    showTerminalOnLaunch: config.get<boolean>('settings.showTerminalOnLaunch'),
    testPath: path.join(uri.fsPath, config.get<string>('settings.testPath')!),
    nodeEnv: config.get<NodeEnv | null>('settings.nodeEnv') ?? undefined,
    debugMode: config.get<boolean>('settings.debugMode'),
    openReport: config.get<boolean>('quickSettings.openReport'),
    headlessMode: config.get<boolean>('quickSettings.headlessMode'),
    parallels: config.get<number>('quickSettings.parallels'),
    environments: config.get<string[]>('quickSettings.environments')
  };
};

export const createNightwatchExtContext = (
  vscode: vsCodeTypes.VSCode,
  workspaceFolder: vsCodeTypes.WorkspaceFolder,
  settings: NightwatchExtensionResourceSettings
): NightwatchExtContext => {
  const createRunnerWorkspace = async () => {
    const workspaceFolderName = workspaceFolder.name;
    const [nightwatchCommandLine, pathToConfig] = await getNightwatchCommandAndConfig(vscode, settings, workspaceFolder);
    return new ProjectWorkspace(
      settings.testPath ?? '',
      pathToConfig,
      nightwatchCommandLine,
      settings.debugMode,
      settings.nodeEnv,
      settings.shell,
      workspaceFolderName
    );
  };

  return {
    workspace: workspaceFolder,
    createRunnerWorkspace,
    loggingFactory: workspaceLogging(workspaceFolder.name, settings.debugMode ?? false),
    settings,
  };
};

const getNightwatchCommandAndConfig = async (
  vscode: vsCodeTypes.VSCode,
  settings: NightwatchExtensionResourceSettings,
  workspaceFolder: vsCodeTypes.WorkspaceFolder
): Promise<string[]> => {
  const nightwatchConfigFile = await findNightwatchConfigFile(vscode);

  if (settings.nightwatchCommandLine) {
    if (nightwatchConfigFile) {
      return [settings.nightwatchCommandLine, nightwatchConfigFile];
    }
    return [settings.nightwatchCommandLine, ''];
  }

  const possibleNightwatchCommandLine =
    (await pathToNightwatchCommandLine(workspaceFolder.uri.fsPath)) || 'nightwatch' + nodeBinExtension;
  return [possibleNightwatchCommandLine, nightwatchConfigFile ?? ''];
};

const findNightwatchConfigFile = async (vscode: vsCodeTypes.VSCode): Promise<string | undefined> => {
  const configFiles = await vscode.workspace.findFiles('**/*nightwatch*.conf.{js,ts,cjs}', undefined, 1);

  for (const configFileUri of configFiles) {
    return configFileUri.fsPath;
  }
};

/**
 * ANSI colors/characters cleaning based on http://stackoverflow.com/questions/25245716/remove-all-ansi-colors-styles-from-strings
 */
export function cleanAnsi(str: string): string {
  return str.replace(
    // eslint-disable-next-line no-control-regex
    /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
    ''
  );
}

export function getUniqueTestsList(obj: Record<string, string[]>): string[] {
  return [...new Set(Object.values(obj).flat(1))] as string[];
}
