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

/** convert the lower-case drive letter filePath (like vscode.URI.fsPath) to lower-case. If path does not contain lower-case drive letter, returns undefined. */
export function toUpperCaseDriveLetter(filePath: string): string | undefined {
  const match = filePath.match(/^([a-z]:\\)(.*)$/);
  if (match) {
    return `${match[1].toUpperCase()}${match[2]}`;
  }
}

/**
 * convert vscode.URI.fsPath to the actual file system file-path, i.e. convert drive letter to upper-case for windows
 * @param filePath
 */
export function toFilePath(filePath: string): string {
  return toUpperCaseDriveLetter(filePath) || filePath;
}
