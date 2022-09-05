import { debugSessionName } from '../appGlobals';
import * as vsCodeTypes from '../types/vscodeTypes';

export class DebugConfigurationProvider implements vsCodeTypes.DebugConfigurationProvider {
  provideDebugConfigurations(
    _folder: vsCodeTypes.WorkspaceFolder | undefined,
    _token?: vsCodeTypes.CancellationToken
  ): vsCodeTypes.DebugConfiguration[] {
    const debugConfiguration: vsCodeTypes.DebugConfiguration = {
      type: 'node',
      request: 'launch',
      name: debugSessionName,
      program: '${workspaceRoot}/node_modules/.bin/nightwatch',
      cwd: '${workspaceFolder}',
      args: [`/Users/vaibhavsingh/Dev/nightwatch-vscode/sandbox/ecosia.js`, '--config', 'nightwatch.conf.js'],
      skipFiles: ['<node_internals>/**'],
      windows: {
        program: '${workspaceFolder}/node_modules/nightwatch/bin/nightwatch',
      },
    };
    return [debugConfiguration];
  }
}
