import { spawnSync } from 'child_process';
import * as vsCodeTypes from '../types/vscodeTypes';
import which from 'which';
import path = require('path');
import { debugSessionName } from '../appGlobals';

/**
 * TODO: List if items need to take care of
 * 
 * Config discovery
 * Matching workspace with config in directory
 * Add Process queue
 * Run/Debug single test file
 * Run/Debug all tests together
 */
export class NightwatchTest {
  constructor() {}

  async runAllTests(vscode: vsCodeTypes.VSCode) {
    if (vscode.workspace.workspaceFolders) {
      console.log('**************', vscode.workspace.workspaceFolders[0].uri.path);
      const node = await which('node');
      const nightwatchCLI = path.join(
        vscode.workspace.workspaceFolders[0].uri.path,
        'node_modules',
        '.bin',
        'nightwatch'
      );
      const command = `${node} ${nightwatchCLI} ${vscode.workspace.workspaceFolders[0].uri.path}/ecosia.js -e chrome`;
      console.log('command used>>>>>>>>>>>>>', command);

      try {
        const child = spawnSync(`${command}`, [], { shell: true, encoding: 'utf-8' });
        if (child.status === 0) {
          console.log('Test run successfull');
        } else {
          console.error(child.stderr);
        }
      } catch (error) {
        console.error(error);
      }
    }
  }

  async debugAllTests(vscode: vsCodeTypes.VSCode) {
    if (vscode.workspace.workspaceFolders) {
      const node = await which('node');
      const nightwatchCLI = path.join(
        vscode.workspace.workspaceFolders[0].uri.path,
        'node_modules',
        '.bin',
        'nightwatch'
      );
      const args = [`${vscode.workspace.workspaceFolders[0].uri.path}/ecosia.js`, '-e', 'chrome'];

      await vscode.debug.startDebugging(undefined, {
        type: 'pwa-node',
        name: debugSessionName,
        request: 'launch',
        cwd: vscode.workspace.workspaceFolders[0].uri.path,
        env: {
          ...process.env,
        },
        program: nightwatchCLI,
        args,
      });
    }
  }
}
