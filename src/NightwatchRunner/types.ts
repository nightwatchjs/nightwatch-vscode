export interface ProjectWorkspaceConfig {
  testPath: string;
  pathToConfig: string;
  nightwatchCommandLine: string;
  debug: boolean;
  nodeEnv: { [key: string]: string | undefined };
  shell: string;
}

export interface RunArgs {
  args: string[];
  replace?: boolean; // default is false
}

export type Options = {
  env?: string;
  args?: RunArgs
};

export type RunnerEvent = 'executableOutput' | 'executableStdErr' | 'processExit' | 'processClose' | 'terminalError';
