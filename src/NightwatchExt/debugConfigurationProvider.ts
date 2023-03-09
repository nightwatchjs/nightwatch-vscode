import { debugSessionName } from '../appGlobals';
import { toFilePath } from '../helpers';
import * as vsCodeTypes from '../types/vscodeTypes';

export class DebugConfigurationProvider
  implements vsCodeTypes.DebugConfigurationProvider
{
  private fileNameToRun = '';
  private testToRun = '';

  /**
   * Prepares injecting the name of the test, which has to be debugged, into the `DebugConfiguration`,
   * This function has to be called before `vscode.debug.startDebugging`.
   */
  public prepareTestRun(fileNameToRun: string, testToRun: string): void {
    this.fileNameToRun = fileNameToRun;
    this.testToRun = testToRun;
  }

  resolveDebugConfiguration(
    _folder: vsCodeTypes.WorkspaceFolder | undefined,
    debugConfiguration: vsCodeTypes.DebugConfiguration,
    _token?: vsCodeTypes.CancellationToken,
  ): vsCodeTypes.DebugConfiguration {
    if (!debugConfiguration.env) {
      debugConfiguration.env = {};
    }

    const args = debugConfiguration.args || [];

    if (this.fileNameToRun) {
      if (this.testToRun !== '') {
        args.unshift(
          '--testcase',
          this.testToRun,
          '--test',
          this.fileNameToRun,
        );
      }
      args.unshift(toFilePath(this.fileNameToRun));

      this.fileNameToRun = '';
      this.testToRun = '';
    }

    debugConfiguration.args = args;
    return debugConfiguration;
  }

  provideDebugConfigurations(
    _folder: vsCodeTypes.WorkspaceFolder | undefined,
    _token?: vsCodeTypes.CancellationToken,
  ): vsCodeTypes.DebugConfiguration[] {
    const debugConfiguration: vsCodeTypes.DebugConfiguration = {
      type: 'node',
      request: 'launch',
      name: debugSessionName,
      program: '${workspaceRoot}/node_modules/.bin/nightwatch',
      cwd: '${workspaceFolder}',
      args: ['--config', 'nightwatch.conf.js'],
      skipFiles: ['<node_internals>/**'],
      windows: {
        program: '${workspaceFolder}/node_modules/nightwatch/bin/nightwatch',
      },
    };
    this.resolveDebugConfiguration(_folder, debugConfiguration, _token);
    return [debugConfiguration];
  }
}
