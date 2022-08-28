import { ChildProcess, spawn } from "child_process";
import ProjectWorkspace from "./projectWorkspace";

/**
 * Spawns and returns Nightwatch process with specified args
 * 
 * @param projectWorkspace 
 * @param args 
 * @returns 
 */
export const createProcess = (projectWorkspace: ProjectWorkspace, args: string[]): ChildProcess => {
  const runtimeExecutable = [projectWorkspace.nightwatchCommandLine, ...args];

  if (projectWorkspace.pathToConfig) {
    args.push('--config');
    args.push(projectWorkspace.pathToConfig);
  }

  const env = { ...process.env, ...(projectWorkspace.nodeEnv ?? {}) };
  const command = runtimeExecutable.join(' ');

  const spawnOptions = {
    cwd: projectWorkspace.testPath,
    env,
    shell: typeof projectWorkspace.shell === 'string' && projectWorkspace.shell ? projectWorkspace.shell : true,
    detached: process.platform !== 'win32'
  };

  if (projectWorkspace.debug) {
    // TODO: Replace with common logger
    console.log(`spawning process using command=${command}\nOptions: ${spawnOptions}`);
  }

  return spawn(command, [], spawnOptions);
};
