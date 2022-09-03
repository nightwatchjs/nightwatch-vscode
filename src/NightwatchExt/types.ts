// import * as vsCodeTypes from '../types/vscodeTypes';
import { NightwatchProcessInfo, NightwatchProcessRequestSimple } from '../NightwatchProcessManagement/types';
import * as vsCodeTypes from '../types/vscodeTypes';

// export interface NightwatchSessionEvents {
//   onRunEvent: vsCodeTypes.EventEmitter<NightwatchRunEvent>;
//   onTestSessionStarted: vsCodeTypes.EventEmitter<NightwatchExtSessionContext>;
//   onTestSessionStopped: vsCodeTypes.EventEmitter<void>;
// }

import { LoggingFactory } from '../Logging/types';
import { NightwatchExt } from '../NightwatchExt';
import ProjectWorkspace from '../NightwatchRunner/projectWorkspace';
import { NightwatchExtensionResourceSettings } from '../Settings/types';

export type GetNightwatchExtByURI = (uri: vsCodeTypes.Uri) => NightwatchExt | undefined;

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

export type NightwatchExtContext = {
  workspace: vsCodeTypes.WorkspaceFolder;
  settings: NightwatchExtensionResourceSettings;
  createRunnerWorkspace: () => Promise<ProjectWorkspace>;
  loggingFactory: LoggingFactory;
};

export type ListTestFilesCallback = (fileNames?: string[], error?: any) => void;

type InternalProcessType = 'list-test-files';

export type InternalRequest = {
  type: Extract<InternalProcessType, 'list-test-files'>;
  onResult: ListTestFilesCallback;
};

export type NightwatchExtRequestType = NightwatchProcessRequestSimple | InternalRequest;

export interface ProcessSession {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  scheduleProcess: <T extends NightwatchExtRequestType = NightwatchExtRequestType>(
    request: T
  ) => NightwatchProcessInfo | undefined;
}

export interface RunEventBase {
  process: NightwatchProcessInfo;
}

export type NightwatchRunEvent = RunEventBase &
  (
    | { type: 'scheduled' }
    | { type: 'data'; text: string; raw?: string; newLine?: boolean; isError?: boolean }
    | { type: 'start' }
    | { type: 'end' }
    | { type: 'exit'; error?: string }
  );

export interface NightwatchProcessContextRaw extends NightwatchExtContext {
  onRunEvent: vsCodeTypes.EventEmitter<NightwatchRunEvent>;
  // TODO: Remove data if not used
  // updateWithData: (data: unknown, process: NightwatchProcessInfo) => void;
}

export type NightwatchExtProcessContext = Readonly<NightwatchProcessContextRaw>;

export interface ListenerSession {
  context: NightwatchExtProcessContext;
  scheduleProcess: <T extends NightwatchExtRequestType = NightwatchExtRequestType>(
    request: T
  ) => NightwatchProcessInfo | undefined;
}

export interface NightwatchExtSessionContext extends NightwatchExtContext {
  session: ProcessSession;
}

export interface NightwatchSessionEvents {
  onRunEvent: vsCodeTypes.EventEmitter<NightwatchRunEvent>;
  onTestSessionStarted: vsCodeTypes.EventEmitter<NightwatchExtSessionContext>;
  onTestSessionStopped: vsCodeTypes.EventEmitter<void>;
}
