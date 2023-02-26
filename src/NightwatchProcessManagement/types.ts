import * as vsCodeTypes from '../types/vscodeTypes';
import Runner from '../NightwatchRunner/runner';
import { RunnerEvent } from '../NightwatchRunner/types';
import { NightwatchProcess } from './nightwatchProcess';

export type TaskStatus = 'running' | 'pending';

export interface Task<T> {
  data: T;
  status: TaskStatus;
}

export interface TaskArrayFunctions<T> {
  map: <M>(f: (task: Task<T>) => M) => M[];
  filter: (f: (task: Task<T>) => boolean) => Task<T>[];
  find: (f: (task: Task<T>) => boolean) => Task<T> | undefined;
}

export interface TaskQueue<T> extends TaskArrayFunctions<T> {
  name: string;
  add: (...tasks: T[]) => void;
  remove: (...tasks: Task<T>[]) => void;
  size: () => number;
  reset: () => void;
  getRunnableTask: () => Task<T> | undefined;
}

export type QueueType = 'blocking' | 'non-blocking';

/**
 * Predicate to Match Task
 * @param filterByStatus filter by task status. If omitted, default is matching any status
 * @param filterByContent filter by all the property of a process request. If omitted, default is true
 */
export interface TaskPredicate {
  filterByStatus?: TaskStatus[];
  filterByContent?: boolean;
}

export interface ScheduleStrategy {
  queue: QueueType;
  dedup?: TaskPredicate;
}

export type NightwatchProcessEvent = RunnerEvent | 'processStarting';

export interface NightwatchProcessListener {
  onEvent: (process: NightwatchProcess, event: NightwatchProcessEvent, ...args: any[]) => any;
}

export interface NightwatchProcessRequestCommon {
  schedule: ScheduleStrategy;
  listener: NightwatchProcessListener;
}

export type NightwatchProcessType = 'all-tests' | 'by-file' | 'by-file-test' | 'not-test';

export type NightwatchProcessRequestSimple =
  | {
      type: Extract<NightwatchProcessType, 'all-tests'>;
    }
  | {
      type: Extract<NightwatchProcessType, 'by-file'>;
      testFileName: string;
    }
  | {
      type: Extract<NightwatchProcessType, 'by-file-test'>;
      testFileName: string;
      testName: string;
    }
  | {
    type: Extract<NightwatchProcessType, 'not-test'>,
    args: string[]
  };

export type VsCodeItemRun = {
  itemRun: {
    run: {
      token: vsCodeTypes.CancellationToken;
    };
  };
};

export type NightwatchProcessRequest = NightwatchProcessRequestSimple & NightwatchProcessRequestCommon & VsCodeItemRun;

export interface NightwatchProcessInfo {
  readonly id: string;
  readonly request: NightwatchProcessRequest;
}

// TODO: look at this
export type StopReason = 'process-end' | 'on-demand';

export interface RunnerTask {
  promise: Promise<void>;
  resolve: () => unknown;
  reject: (reason: unknown) => unknown;
  runner: Runner;
}
