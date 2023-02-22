import ProjectWorkspace from '../NightwatchRunner/projectWorkspace';

export type NodeEnv = ProjectWorkspace['nodeEnv'];
export interface NightwatchExtensionResourceSettings {
  shell?: string;
  showTerminalOnLaunch?: boolean;
  nightwatchCommandLine?: string;
  testPath: string;
  nodeEnv?: NodeEnv;
  debugMode?: boolean;
  headlessMode?: boolean;
  openReport?: boolean;
  parallels?: number;
  environments?: string;
}
