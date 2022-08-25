import * as VSCode from "./vscodeTypes";
import { NightwatchExt } from "../NightwatchExt";
import { ExtensionManager } from "../extensionManager";

export type GetNightwatchExtByURI = (uri: VSCode.Uri) => NightwatchExt | undefined;

export type RegisterCommand = {
  type: 'all-workspaces';
  name: string;
  callback: (extension: NightwatchExt, ...args: any[]) => any;
};

export type CommandType = RegisterCommand['type'];
