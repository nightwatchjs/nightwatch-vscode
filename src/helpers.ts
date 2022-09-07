import { NightwatchExtContext } from './NightwatchExt/types';
import { existsSync } from 'fs';
import { platform } from 'os';
import { join, normalize } from 'path';
import * as vsCodeTypes from './types/vscodeTypes';
import which from 'which';

/**
 * File extension for npm binaries
 */
export const nodeBinExtension: string = platform() === 'win32' ? '.cmd' : '';

/**
 * Handles getting the Nightwatch runner
 * 
 * @param testPath 
 * @returns 
 */
export async function pathToNightwatchCommandLine(testPath: string): Promise<string | undefined> {
  const node = await which('node');

  const absolutePath = normalize(join(testPath, 'node_modules', '.bin', 'nightwatch' + nodeBinExtension));
  return existsSync(absolutePath) ? `${node} ${absolutePath}` : undefined;
}

pathToNightwatchCommandLine('/Users/vaibhavsingh/Dev/nightwatch-vscode/sandbox').then((res) => {
  console.log(res);
});

export const prefixWorkspace = (vscode: vsCodeTypes.VSCode, context: NightwatchExtContext, message: string): string => {
  if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 1) {
    return `(${context.workspace.name}) ${message}`;
  }
  return message;
};
