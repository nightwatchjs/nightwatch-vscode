import {
  stringifyRequest,
  NightwatchProcessInfo,
  NightwatchProcessRequest,
  NightwatchProcessType,
  ScheduleStrategy,
  NightwatchProcessManager
} from '../NightwatchProcessManagement';
import { RunTestListener } from './processListener';
import { ListenerSession, NightwatchExtProcessContext, NightwatchExtRequestType, ProcessSession } from './types';

const ProcessScheduleStrategy: Record<NightwatchProcessType, ScheduleStrategy> = {
  'all-tests': {
    queue: 'blocking',
    dedup: {
      filterByStatus: ['pending'],
    },
  },
  'by-file': {
    queue: 'blocking',
    dedup: {
      filterByStatus: ['pending'],
    },
  },
  'by-file-test': {
    queue: 'blocking',
    dedup: {
      filterByStatus: ['pending'],
      filterByContent: true,
    },
  },
  'not-test': {
    queue: 'non-blocking',
    dedup: {
      filterByStatus: ['pending'],
    },
  },
};

export const createProcessSession = (context: NightwatchExtProcessContext): ProcessSession => {
  const nightwatchProcessManager = new NightwatchProcessManager(context);
  const logging = context.loggingFactory.create('ProcessSessionManager');

  const scheduleProcess = <T extends NightwatchExtRequestType = NightwatchExtRequestType>(
    request: T
  ): NightwatchProcessInfo | undefined => {
    logging('debug', `scheduling Nightwatch Process: ${request.type}`);
    try {
      const pRequest = createProcessRequest(request);

      const process = nightwatchProcessManager.scheduleNightwatchProcess(pRequest);

      if (!process) {
        logging('warn', `request scheduling failed: ${stringifyRequest(pRequest)}`);
        return;
      }

      context.onRunEvent.fire({ type: 'scheduled', process });

      return process;
    } catch (error) {
      logging('warn', `[scheduledProcess] failed to create/schedule process for`, request);
      return;
    }
  };

  const listenerSession: ListenerSession = { context, scheduleProcess };

  const createProcessRequest = (request: NightwatchExtRequestType): NightwatchProcessRequest => {
    const lSession = listenerSession;
    switch (request.type) {
      case 'all-tests':
      case 'by-file':
      case 'by-file-test':
        const schedule = ProcessScheduleStrategy[request.type];
        return {
          ...request,
          listener: new RunTestListener(lSession),
          schedule,
        };

      case 'list-test-files':
        // TODO: implement list test files
        break;
    }
    throw new Error(`Unexpected process type ${request.type}`);
  };

  /**
   * start NightwatchExt process session from clean state, find all test files and launch the "run.onSessionStart" processes
   */
  // TODO: Remove this method
  const start = async (): Promise<void> => {
    if (nightwatchProcessManager.numberOfProcesses() > 0) {
      logging('debug', `${nightwatchProcessManager.numberOfProcesses} queued, stoping all...`);
      await stop();
    }

    // if (context.autoRun.onStartup) {
    //   context.autoRun.onStartup.forEach((type) => scheduleProcess({ type }));
    // }
    // if (context.autoRun.isWatch) {
    //   scheduleProcess({ type: 'watch-tests' });
    // }
  };

  /**
   * stop NightwatchExt process session and remove all processes.
   */
  const stop = async (): Promise<void> => {
    return nightwatchProcessManager.stopAll();
  };

  return {
    start,
    stop,
    scheduleProcess,
  };
};
