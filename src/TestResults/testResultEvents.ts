import { ItBlock } from 'jest-editor-support';
import { NightwatchProcessInfo } from './../NightwatchProcessManagement/types';
import * as vsCodeTypes from './../types/vscodeTypes';
import { ContainerNode } from './matchNode';

// TODO: delete 'assertions-updated' if not used
export type TestSuitChangeEvent =
  | {
      type: 'assertions-updated';
      process: NightwatchProcessInfo;
      files: string[];
    }
  | {
      type: 'result-matched';
      file: string;
    }
  | {
      type: 'test-parsed';
      file: string;
      testContainer: ContainerNode<ItBlock>;
    };

export const createTestResultEvents = (vscode: vsCodeTypes.VSCode) => ({
  testListUpdated: new vscode.EventEmitter<string[] | undefined>(),
  testSuiteChanged: new vscode.EventEmitter<TestSuitChangeEvent>(),
});
