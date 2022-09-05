export interface ProjectWorkspaceConfig {
  testPath: string;
  pathToConfig: string;
  nightwatchCommandLine: string;
  debug: boolean;
  nodeEnv: { [key: string]: string | undefined };
  shell: string;
}

export type Options = {
  env?: string;
};

export type RunnerEvent = 'executableOutput' | 'executableStdErr' | 'processExit' | 'processClose' | 'terminalError';
