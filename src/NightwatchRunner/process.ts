import { ChildProcess, spawn } from 'child_process';
import { Logging } from '../Logging/types';
import ProjectWorkspace from './projectWorkspace';

/**
 * Spawns and returns Nightwatch process with specified args
 *
 * @param projectWorkspace
 * @param args
 * @returns
 */
export const createProcess = (projectWorkspace: ProjectWorkspace, args: string[], logging: Logging): ChildProcess => {
  const runtimeExecutable = projectWorkspace.nightwatchCommandLine;

  if (projectWorkspace.pathToConfig) {
    // args.push('--config');
    args.unshift('--config', projectWorkspace.pathToConfig);
  }

  const env = { ...process.env, ...(projectWorkspace.nodeEnv ?? {}) };
  const command = [runtimeExecutable, args.join(' ')].join(' ');

  const spawnOptions = {
    cwd: projectWorkspace.testPath,
    env,
    shell: typeof projectWorkspace.shell === 'string' && projectWorkspace.shell ? projectWorkspace.shell : true,
    detached: process.platform !== 'win32',
  };

  if (projectWorkspace.debug) {
    logging('debug', `spawning process using command=${command}\nOptions: ${JSON.stringify(spawnOptions)}`);
  }

  return spawn(command, [], spawnOptions);
};
