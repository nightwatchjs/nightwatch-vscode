export interface ProjectWorkspaceConfig {
  testPath: string;
  pathToConfig: string;
  nightwatchCommandLine: string;
  debug: boolean;
  nodeEnv: { [key: string]: string | undefined };
  shell: string;
  outputFileSuffix: string;
}

export interface RunArgs {
  args: string[];
  replace?: boolean; // default is false
}

export type Options = {
  reporter: string;
  parameters?: RunArgs;
};

export type RunnerEvent =
  | 'executableOutput'
  | 'executableJSON'
  | 'executableStdErr'
  | 'processExit'
  | 'processClose'
  | 'terminalError';

export type OutputType = number;

export type FormattedAssertions = {
  name: string;
  message: string;
  stackTrace: string;
  fullMsg: string;
  failure: boolean;
};

export type FormattedLastError = {
  name: string;
  message: string;
  showDiff: boolean;
  abortOnFailure: boolean;
  stack: string;
};

export interface FormattedReport {
  reportPrefix: string;
  assertionsCount: number;
  lastError: FormattedLastError;
  skipped: string[];
  time: string;
  completed: {
    [key: string]: {
      time: string;
      assertions: FormattedAssertions[];
      passed: number;
      errors: number;
      failed: number;
      skipped: number;
      tests: number;
      steps: string[];
      stackTrace: string;
      testcases: {
        [key: string]: {
          time: string;
          assertions: FormattedAssertions[];
          tests: number;
          passed: number;
          errors: number;
          failed: number;
          skipped: number;
          steps: string[];
          stackTrace: string;
          lastError: FormattedLastError;
          timeMs: number;
        };
      };
      lastError: FormattedLastError;
      timeMs: number;
    };
  };
  errmessages: never[];
  testsCount: number;
  skippedCount: number;
  failedCount: number;
  errorsCount: number;
  passedCount: number;
  group: string;
  modulePath: string;
  tests: number;
  failures: number;
  errors: number;
  httpOutput: string[][];
  globalErrorRegister: string[];
}

export interface FormattedTestResults {
  name: string;
  httpOutput: Array<string[]>;
  systemerr: string;
  report: FormattedReport;
}

/**
 *  Did the tests pass, fail or was it not run?
 */
export type TestReconciliationStateType =
  | 'Unknown'
  | 'KnownFail' // Definitely failed
  | 'KnownSuccess' // Definitely passed
  | 'KnownSkip'; // Definitely skipped (it.skip)

export type Location = {
  line: number;
  column: number;
};

// TODO: remove location
export type TestAssertionStatus = {
  title: string;
  fullName: string;
  ancestorTitles: string[];
  status: TestReconciliationStateType;
  message: string;
  shortMessage?: string;
  location?: Location;
  stackTrace?: string;
  line?: number;
};

export type TestFileAssertionStatus = {
  file: string;
  message: string;
  status: TestReconciliationStateType;
  assertions: TestAssertionStatus[] | null;
};
