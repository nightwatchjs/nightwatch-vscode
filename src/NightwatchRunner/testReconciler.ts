import type { TestFileAssertionStatus, TestAssertionStatus, TestReconciliationStateType } from './types';
import { parse, StackFrame } from "stacktrace-parser";
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
  // TODO: update any with FormattedTestResults
  updateFileWithNightwatchStatus(results: any): TestFileAssertionStatus[] {
    // TODO: implement this method
    console.log(results);

    const statusList: TestFileAssertionStatus[] = [];
    Object.values(results.modules).forEach((file: any) => {
      // Module passed/Failed status
      const status = this.statusToReconciliationState(file.status);
      // Create our own simpler representation
      const fileStatus: TestFileAssertionStatus = {
        assertions: this.mapAssertions(file.modulePath, Object.entries(file.completed)),
        file: file.modulePath,
        message: (file.lastError && file.lastError.message) || '',
        status,
      };
      this.fileStatuses[file.modulePath] = fileStatus;
      statusList.push(fileStatus);
    });
    return statusList;
  }

  // A failed test also contains the stack trace for an `expect`
  // we don't get this as structured data, but what we get
  // is useful enough to make it for ourselves

  // TODO: replace any with Array<FormattedAssertionResult>
  mapAssertions(filename: string, assertions: any): Array<TestAssertionStatus> {
    // Change all failing assertions into structured data
    return assertions.map((assertionData: any) => {
      const title = assertionData[0];
      const assertion = assertionData[1];

      const stackErrorMessage = assertion.lastError && assertion.lastError.stack ;
      let short = null;
      let line = null;
      let message = null;
      if (stackErrorMessage) {
        const parsedStacks = parse(stackErrorMessage);
        const parsedStack = filename ? parsedStacks.find((o) => o.file === filename) : parsedStacks[0];
        
        short = (assertion.lastError && assertion.lastError.message) || '';
        line = parsedStack?.lineNumber;
        message = this.generateStackMessage(assertion.lastError, assertion.assertions);
      }
      return {
        title,
        message: message || '',
        shortMessage: short || '',
        status: this.statusToReconciliationState(assertion.status),
        line,
        location: null,
        fullName: title,
        ancestorTitles: [],
      };
    });
  }

  generateStackMessage(lastError: any, assertions: any[]) {
    const dataWithStackTrace = assertions.filter((assert: { stackTrace: string }) => assert.stackTrace !== '');
    const result = dataWithStackTrace.find((data: { message: any }) => data.message === lastError.message);
    return `Failure Message:\n\t${result.failure}\n\nStack Trace:\n\t${result.stackTrace}`;
  }

  /**
   * remove status of the test file from the cached results
   * @param {string} fileName
   */
  removeTestFile(fileName: string) {
    delete this.fileStatuses[fileName];
  }

  statusToReconciliationState(status: string): TestReconciliationStateType {
    switch (status) {
      case 'pass':
        return 'KnownSuccess';
      case 'fail':
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
    const assertion = results.assertions.find((a: { title: any }) => a.title === name);
    if (!assertion) {
      return null;
    }
    return assertion;
  }
}
