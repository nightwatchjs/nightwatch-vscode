import * as vsCodeTypes from '../types/vscodeTypes';
import path = require('path');
import { debugSessionName } from '../appGlobals';
import { NightwatchExtContext } from './types';
import { createProcess } from '../NightwatchRunner/process';

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

  async runAllTests(extContext: NightwatchExtContext, vscode: vsCodeTypes.VSCode) {
    if (vscode.workspace.workspaceFolders) {
      const runnerWorkspace = await extContext.createRunnerWorkspace();

      const childProcess = createProcess(
        runnerWorkspace,
        [`${vscode.workspace.workspaceFolders[0].uri.path}/ecosia.js`],
        extContext.loggingFactory.create('Runner')
      );

      childProcess.on('data', (data) => {
        console.log(data);
      });
    }
  }

  async debugAllTests(vscode: vsCodeTypes.VSCode) {
    if (vscode.workspace.workspaceFolders) {
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
