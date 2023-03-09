import { Logging } from '../Logging';
import { NightwatchExtContext } from '../NightwatchExt';
import { isDup, stringifyRequest } from './helpers';
import { NightwatchProcess } from './nightwatchProcess';
import { createTaskQueue } from './taskQueue';
import {
  NightwatchProcessInfo,
  NightwatchProcessRequest,
  QueueType,
  Task,
  TaskArrayFunctions,
  TaskQueue,
} from './types';

export class NightwatchProcessManager
  implements TaskArrayFunctions<NightwatchProcess>
{
  private extContext: NightwatchExtContext;
  private queues: Map<QueueType, TaskQueue<NightwatchProcess>>;
  private logging: Logging;

  constructor(extContext: NightwatchExtContext) {
    this.extContext = extContext;
    this.logging = extContext.loggingFactory.create('NightwatchProcessManager');
    this.queues = new Map([
      ['blocking', createTaskQueue('blocking-queue', 1)],
      ['non-blocking', createTaskQueue('non-blocking-queue', 1)],
    ]);
  }

  public scheduleNightwatchProcess(
    request: NightwatchProcessRequest,
  ): NightwatchProcessInfo | undefined {
    if (this.foundDup(request)) {
      this.logging(
        'debug',
        `duplicate request found, process is not scheduled: ${stringifyRequest(
          request,
        )}`,
      );
      return;
    }

    const queue = this.getQueue(request.schedule.queue);
    const process = new NightwatchProcess(this.extContext, request);
    queue.add(process);
    this.run(queue);
    return process;
  }

  private async run(queue: TaskQueue<NightwatchProcess>): Promise<void> {
    const task = queue.getRunnableTask();
    if (!task) {
      this.logging('debug', 'no task found');
      return;
    }

    const process = task.data;

    try {
      this.logging('debug', `starting process: ${process}`);
      await process.start();
      this.logging('debug', `Process ended: ${process}`);
    } catch (error) {
      this.logging(
        'error',
        `${queue.name}: process failed: ${process} ${error}`,
      );
    } finally {
      queue.remove(task);
    }

    return this.run(queue);
  }

  public numberOfProcesses(queueType?: QueueType): number {
    if (queueType) {
      return this.getQueue(queueType).size();
    }
    return Array.from(this.queues.values()).reduce((pCount, q) => {
      pCount += q.size();
      return pCount;
    }, 0);
  }

  public async stopAll(queueType?: QueueType): Promise<void> {
    let promises: Promise<void>[];
    if (!queueType) {
      promises = Array.from(this.queues.keys()).map((queue) =>
        this.stopAll(queue),
      );
    } else {
      const queue = this.getQueue(queueType);
      promises = queue.map((task) => task.data.stop());
      queue.reset();
    }
    await Promise.allSettled(promises);
    return;
  }

  private getQueue(type: QueueType): TaskQueue<NightwatchProcess> {
    return this.queues.get(type)!;
  }

  private foundDup(request: NightwatchProcessRequest): boolean {
    if (!request.schedule.dedup) {
      return false;
    }

    const queue = this.getQueue(request.schedule.queue);
    const dupTasks = queue.filter((task) => isDup(task, request));
    if (dupTasks.length > 0) {
      this.logging(
        'debug',
        `found ${dupTasks.length} duplicate processes, will not schedule request:`,
        request,
      );
      return true;
    }
    return false;
  }

  private getQueues(queueType?: QueueType): TaskQueue<NightwatchProcess>[] {
    return queueType
      ? [this.getQueue(queueType)]
      : Array.from(this.queues.values());
  }

  public map<M>(
    f: (task: Task<NightwatchProcess>) => M,
    queueType?: QueueType,
  ): M[] {
    const queues = this.getQueues(queueType);

    return queues.reduce((list, queue) => {
      list.push(...queue.map(f));
      return list;
    }, [] as M[]);
  }

  public filter(
    f: (task: Task<NightwatchProcess>) => boolean,
    queueType?: QueueType,
  ): Task<NightwatchProcess>[] {
    const queues = this.getQueues(queueType);

    return queues.reduce((list, queue) => {
      list.push(...queue.filter(f));
      return list;
    }, [] as Task<NightwatchProcess>[]);
  }

  public find(
    f: (task: Task<NightwatchProcess>) => boolean,
    queueType?: QueueType,
  ): Task<NightwatchProcess> | undefined {
    const queues = this.getQueues(queueType);

    for (const queue of queues) {
      const task = queue.find(f);
      if (task) {
        return task;
      }
    }
  }
}
