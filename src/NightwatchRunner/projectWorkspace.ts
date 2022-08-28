import { ProjectWorkspaceConfig } from './types';

export default class ProjectWorkspace {
  /**
   * The path to the root of the test folder of Project's workspace.
   *
   * @type {string}
   */
  testPath: string;

  /**
   * Path to local Nightwatch Config file.
   *
   * @type {string}
   */
  pathToConfig: string;

  /**
   * The command to execute Nightwatch in the command line.
   * Typically, the file path looks like `node_modules/.bin/nightwatch`,
   * but you can also provide the file path of globally installed Nightwatch.
   *
   * @type {string}
   */
  nightwatchCommandLine: string;

  /**
   * Output information in the Debug Console for debugging purpose.
   *
   * @default false
   *
   * @type {boolean}
   */
  debug?: boolean;

  /**
   * Additional Node env variables (Optional)
   */
  nodeEnv?: { [key: string]: string | undefined };

  /**
   * Custom shell for node child_process.spawn() call.
   * By default, it uses '/bin/sh' on Unix, and process.env.ComSpec on Windows.
   * A different shell can be specified as a string.
   *
   * @see https://nodejs.org/api/child_process.html#child_process_child_process_spawn_command_args_options
   */
  shell?: string;

  constructor(
    testPath: string,
    pathToConfig: string,
    nightwatchCommandLine: string,
    debug?: boolean,
    nodeEnv?: { [key: string]: string | undefined },
    shell?: string
  ) {
    this.testPath = testPath;
    this.pathToConfig = pathToConfig;
    this.nightwatchCommandLine = nightwatchCommandLine;
    this.debug = debug;
    this.nodeEnv = nodeEnv;
    this.shell = shell;
  }
}

/**
 * A factory method to create ProjectWorkspace instance using ProjectWorkspaceConfig object.
 * 
 * @param config 
 * @returns {ProjectWorkspace}
 */
export const createProjectWorkspace = (config: ProjectWorkspaceConfig): ProjectWorkspace => {
  return new ProjectWorkspace(
    config.testPath,
    config.pathToConfig,
    config.nightwatchCommandLine,
    config.debug,
    config.nodeEnv,
    config.shell
  );
};
