import { IParseResults, parse } from 'jest-editor-support';
import { NightwatchSessionEvents } from '../NightwatchExt';
import { NightwatchProcessInfo } from '../NightwatchProcessManagement';
import { TestFileAssertionStatus, TestReconciliationStateType } from '../NightwatchRunner';
import TestReconciler from '../NightwatchRunner/testReconciler';
import * as vsCodeTypes from './../types/vscodeTypes';
import * as match from './matchByContext';
import { createTestResultEvents } from './testResultEvents';
import { SortedTestResults, TestResult, TestResultEvents, TestStats, TestSuiteResult } from './types';

// TODO: Move to types
export interface StatusInfo {
  precedence: number;
  desc: string;
}

export const TestResultStatusInfo: { [key in TestReconciliationStateType]: StatusInfo } = {
  KnownFail: { precedence: 1, desc: 'Failed' },
  Unknown: {
    precedence: 2,
    desc: 'Test has not run yet.',
  },
  KnownSkip: { precedence: 3, desc: 'Skipped' },
  KnownSuccess: { precedence: 4, desc: 'Passed' },
};

const sortByStatus = (a: TestResult, b: TestResult): number => {
  if (a.status === b.status) {
    return 0;
  }
  return TestResultStatusInfo[a.status].precedence - TestResultStatusInfo[b.status].precedence;
};

export class TestResultProvider {
  verbose: boolean;
  events: TestResultEvents;
  private reconciler: TestReconciler;
  private testSuites: Map<string, TestSuiteResult>;
  private testFiles?: string[];

  constructor(vscode: vsCodeTypes.VSCode, extEvents: NightwatchSessionEvents, verbose = false) {
    this.verbose = verbose;
    this.reconciler = new TestReconciler();
    this.events = createTestResultEvents(vscode);
    this.testSuites = new Map();
    extEvents.onTestSessionStarted.event(this.onSessionStart.bind(this));
  }

  dispose(): void {
    this.events.testListUpdated.dispose();
    this.events.testSuiteChanged.dispose();
  }

  private onSessionStart(): void {
    this.testSuites.clear();
  }

  private groupByRange(results: TestResult[]): TestResult[] {
    if (!results.length) {
      return results;
    }
    // build a range based map
    const byRange: Map<string, TestResult[]> = new Map();
    results.forEach((r) => {
      // Q: is there a better/efficient way to index the range?
      const key = `${r.start.line}-${r.start.column}-${r.end.line}-${r.end.column}`;
      const list = byRange.get(key);
      if (!list) {
        byRange.set(key, [r]);
      } else {
        list.push(r);
      }
    });
    // sort the test by status precedence
    byRange.forEach((list) => list.sort(sortByStatus));

    //merge multiResults under the primary (highest precedence)
    const consolidated: TestResult[] = [];
    byRange.forEach((list) => {
      if (list.length > 1) {
        list[0].multiResults = list.slice(1);
      }
      consolidated.push(list[0]);
    });
    return consolidated;
  }

  updateTestFileList(testFiles?: string[]): void {
    this.testFiles = testFiles;

    // clear the cache in case we have cached some non-test files prior
    this.testSuites.clear();

    this.events.testListUpdated.fire(testFiles);
  }

  getTestList(): string[] {
    if (this.testFiles && this.testFiles.length > 0) {
      return this.testFiles;
    }
    return Array.from(this.testSuites.keys());
  }

  parseTestFiles(): void {
    if (this.testFiles && this.testFiles?.length > 0) {
      this.testFiles.forEach((file) => {
        this.getSortedResults(file);
      });
    }
  }

  isTestFile(fileName: string): 'yes' | 'no' | 'unknown' {
    if (this.testFiles?.includes(fileName) || this.testSuites.get(fileName) != null) {
      return 'yes';
    }
    if (!this.testFiles) {
      return 'unknown';
    }
    return 'no';
  }

  public getTestSuiteResult(filePath: string): TestSuiteResult | undefined {
    const cache = this.testSuites.get(filePath);
    if (cache && !cache.assertionContainer) {
      const assertions = this.reconciler.assertionsForTestFile(filePath);
      if (assertions && assertions.length > 0) {
        cache.assertionContainer = match.buildAssertionContainer(assertions);
        this.testSuites.set(filePath, cache);
      }
    }
    return cache;
  }

  private matchResults(filePath: string, { root, itBlocks }: IParseResults): TestSuiteResult {
    let error: string | undefined;
    try {
      const cache = this.getTestSuiteResult(filePath);
      if (cache?.assertionContainer) {
        cache.results = this.groupByRange(
          match.matchTestAssertions(filePath, root, cache.assertionContainer, this.verbose)
        );
        this.events.testSuiteChanged.fire({
          type: 'result-matched',
          file: filePath,
        });
        return cache;
      }
      error = 'no assertion generated for file';
    } catch (e) {
      console.warn(`failed to match test results for ${filePath}:`, e);
      error = `encountered internal match error: ${e}`;
    }

    this.events.testSuiteChanged.fire({
      type: 'test-parsed',
      file: filePath,
      testContainer: match.buildSourceContainer(root),
    });

    // no need to do groupByRange as the source block will not have blocks under the same location
    return {
      status: 'Unknown',
      message: error,
      results: itBlocks.map((t) => match.toMatchResult(t, 'no assertion found', 'match-failed')),
    };
  }

  /**
   * returns matched test results for the given file
   * @param filePath
   * @returns valid test result list or undefined if the file is not a test.
   *  In the case when file can not be parsed or match error, empty results will be returned.
   * @throws if parsing or matching internal error
   */
  getResults(filePath: string): TestResult[] | undefined {
    const results = this.testSuites.get(filePath)?.results;
    if (results) {
      return results;
    }

    if (this.isTestFile(filePath) === 'no') {
      return;
    }

    try {
      const parseResult = parse(filePath);
      this.testSuites.set(filePath, this.matchResults(filePath, parseResult));
      return this.testSuites.get(filePath)?.results;
    } catch (e) {
      const message = `failed to get test results for ${filePath}`;
      console.warn(message, e);
      this.testSuites.set(filePath, { status: 'KnownFail', message, results: [] });
      throw e;
    }
  }

  /**
   * returns sorted test results for the given file
   * @param filePath
   * @returns valid sorted test result or undefined if the file is not a test.
   * @throws if encountered internal error for test files
   */

  getSortedResults(filePath: string): SortedTestResults | undefined {
    const cached = this.testSuites.get(filePath)?.sorted;
    if (cached) {
      return cached;
    }

    if (this.isTestFile(filePath) === 'no') {
      return;
    }

    const result: SortedTestResults = {
      fail: [],
      skip: [],
      success: [],
      unknown: [],
    };

    try {
      const testResults = this.getResults(filePath);
      if (!testResults) {
        return;
      }

      for (const test of testResults) {
        if (test.status === match.TestReconciliationState.KnownFail) {
          result.fail.push(test);
        } else if (test.status === match.TestReconciliationState.KnownSkip) {
          result.skip.push(test);
        } else if (test.status === match.TestReconciliationState.KnownSuccess) {
          result.success.push(test);
        } else {
          result.unknown.push(test);
        }
      }
    } finally {
      const cached = this.testSuites.get(filePath);
      if (cached) {
        cached.sorted = result;
      }
    }
    return result;
  }

  // TODO: replace any with NightwatchTotalResults
  // TestFileAssertionStatus[]
  updateTestResults(data: any, process: NightwatchProcessInfo): TestFileAssertionStatus[] {
    const results = this.reconciler.updateFileWithNightwatchStatus(data);
    results?.forEach((r) => {
      this.testSuites.set(r.file, {
        status: r.status,
        message: r.message,
        assertionContainer: r.assertions ? match.buildAssertionContainer(r.assertions) : undefined,
      });
    });
    this.events.testSuiteChanged.fire({
      type: 'assertions-updated',
      files: results.map((r) => r.file),
      process,
    });
    return results;
  }

  removeCachedResults(filePath: string): void {
    this.testSuites.delete(filePath);
  }
  invalidateTestResults(filePath: string): void {
    this.removeCachedResults(filePath);
    this.reconciler.removeTestFile(filePath);
  }

  // TestStats
  emptyTestStats = (): TestStats => {
    return { success: 0, fail: 0, unknown: 0 };
  };
  // test stats
  getTestSuiteStats(): TestStats {
    const stats = this.emptyTestStats();
    this.testSuites.forEach((suite) => {
      if (suite.status === 'KnownSuccess') {
        stats.success += 1;
      } else if (suite.status === 'KnownFail') {
        stats.fail += 1;
      } else {
        stats.unknown += 1;
      }
    });

    if (this.testFiles) {
      if (this.testFiles.length > stats.fail + stats.success + stats.unknown) {
        return {
          ...stats,
          unknown: this.testFiles.length - stats.fail - stats.success,
        };
      }
    }
    return stats;
  }
}
