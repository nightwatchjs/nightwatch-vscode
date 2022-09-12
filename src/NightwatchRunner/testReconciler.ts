import path from 'path';
import type { TestFileAssertionStatus, TestAssertionStatus, TestReconciliationStateType } from './types';

import type { FormattedTestResults } from './types';

/**
 *
 *  This class represents the state between runs, keeping track of passes/fails
 *  at a file level, generating useful error messages and providing a nice API.
 */
export default class TestReconciler {
  fileStatuses: { [key: string]: TestFileAssertionStatus };

  constructor() {
    this.fileStatuses = {};
  }

  // the processed test results will be returned immediately instead of saved in
  // instance properties. This is 1) to prevent race condition 2) the data is already
  // stored in the this.fileStatuses, no dup is better 3) client will most likely need to process
  // all the results anyway.
  updateFileWithNightwatchStatus(results: FormattedTestResults): void{
    // TODO: implement this method
  }

  /**
   * remove status of the test file from the cached results
   * @param {string} fileName
   */
  removeTestFile(fileName: string) {
    delete this.fileStatuses[fileName];
  }

  // Pull the line out from the stack trace
  lineOfError(message: string, filePath: string): number | null {
    const filename = path.basename(filePath);
    const restOfTrace = message.split(filename, 2)[1];
    return restOfTrace ? parseInt(restOfTrace.split(':')[1], 10) : null;
  }

  statusToReconciliationState(status: string): TestReconciliationStateType {
    switch (status) {
      case 'passed':
        return 'KnownSuccess';
      case 'failed':
        return 'KnownFail';
      case 'pending':
        return 'KnownSkip';
      default:
        return 'Unknown';
    }
  }

  stateForTestFile(file: string): TestReconciliationStateType {
    const results = this.fileStatuses[file];
    if (!results) {
      return 'Unknown';
    }
    return results.status;
  }

  assertionsForTestFile(file: string): TestAssertionStatus[] | null {
    const results = this.fileStatuses[file];
    return results ? results.assertions : null;
  }

  stateForTestAssertion(file: string, name: string): TestAssertionStatus | null {
    const results = this.fileStatuses[file];
    if (!results || !results.assertions) {
      return null;
    }
    const assertion = results.assertions.find((a) => a.title === name);
    if (!assertion) {
      return null;
    }
    return assertion;
  }
}
