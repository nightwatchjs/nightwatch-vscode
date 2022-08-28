import { existsSync } from 'fs';
import { platform } from 'os';
import { join, normalize } from 'path';
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
