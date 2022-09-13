import { ItBlock } from 'jest-editor-support';
import { TestAssertionStatus } from '../NightwatchRunner';
import { DataNode } from '../TestResults/matchNode';
import { TestResultProvider } from '../TestResults/testResultProvider';
import { TestIdentifier } from '../TestResults/types';
import * as vsCodeTypes from '../types/vscodeTypes';
import {
  NightwatchExtRequestType,
  NightwatchExtSessionContext,
  NightwatchSessionEvents,
} from './../NightwatchExt/types';
import { NightwatchTestProviderContext } from './testProviderContext';

// TODO: Move to DebugCodelens file
export type DebugTestIdentifier = string | TestIdentifier;

type DebugFunction = (document: vsCodeTypes.TextDocument | string, ...ids: DebugTestIdentifier[]) => Promise<void>;

export interface NightwatchExtExplorerContext extends NightwatchExtSessionContext {
  readonly testResolveProvider: TestResultProvider;
  readonly sessionEvents: NightwatchSessionEvents;
  debugTests: DebugFunction;
}

export interface TestItemData {
  readonly item: vsCodeTypes.TestItem;
  readonly uri: vsCodeTypes.Uri;
  context: NightwatchTestProviderContext;
  discoverTest?: (run: vsCodeTypes.TestRun) => void;
  scheduleTest: (run: vsCodeTypes.TestRun, end: (code: Number) => void) => void;
}

export interface NightwatchRunnable {
  getNightwatchRunRequest: () => NightwatchExtRequestType;
}

export interface WithUri {
  uri: vsCodeTypes.Uri;
}

export interface TestItemRun {
  item: vsCodeTypes.TestItem;
  run: vsCodeTypes.TestRun;
  end: (code: Number) => void;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export type OUTPUT_COLOR = 'red' | 'green' | 'yellow';

export type TagIdType = 'run' | 'debug';

export type ItemDataNodeType = DataNode<ItBlock | TestAssertionStatus>;

export interface Debuggable {
  getDebugInfo: () => { fileName: string; testNamePattern?: string };
}

export type TestItemRunRequest = NightwatchExtRequestType & { itemRun: TestItemRun };
