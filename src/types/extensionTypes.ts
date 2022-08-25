import * as VSCode from './vscodeTypes';
import { NightwatchExt } from '../NightwatchExt';

export type GetNightwatchExtByURI = (uri: VSCode.Uri) => NightwatchExt | undefined;

export type RegisterCommand =
  | {
      type: 'all-workspaces';
      name: string;
      callback: (extension: NightwatchExt, ...args: any[]) => any;
    }
  | {
      type: 'active-text-editor';
      name: string;
      callback: (extension: NightwatchExt, ...args: any[]) => any;
    };

export type CommandType = RegisterCommand['type'];

// TODO: Add Logging capability
export type NightwatchExtContext = {
  workspace: VSCode.WorkspaceFolder;
};
