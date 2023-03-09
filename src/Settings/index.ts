import * as vsCodeTypes from '../types/vscodeTypes';

export class Settings {
  private _vscode: vsCodeTypes.VSCode;
  private _workspaceUri: vsCodeTypes.Uri;

  constructor(vscode: vsCodeTypes.VSCode, workspaceUri: vsCodeTypes.Uri) {
    this._vscode = vscode;
    this._workspaceUri = workspaceUri;
  }

  public get<T>(settingName: string): T {
    const config = this._vscode.workspace.getConfiguration(
      'nightwatch',
      this._workspaceUri,
    );
    return config.get(settingName) as T;
  }

  public async set<T>(settingName: string, value: T) {
    const config = this._vscode.workspace.getConfiguration(
      'nightwatch',
      this._workspaceUri,
    );
    await config.update(settingName, value, true);
  }

  public json(settingName: string) {
    const config = this._vscode.workspace.getConfiguration(
      'nightwatch',
      this._workspaceUri,
    );
    return JSON.parse(JSON.stringify(config.get(settingName)));
  }
}

export function isDefaultPathToNightwatch(path?: string | null): boolean {
  return path === null || path === '';
}

export function hasUserSetPathToNightwatch(path?: string | null): boolean {
  return !isDefaultPathToNightwatch(path);
}

export * from './types';
