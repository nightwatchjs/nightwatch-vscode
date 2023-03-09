import { Task, TaskQueue } from './types';

/**
 * First in First out Queue
 * @param name
 * @param maxWorker
 * @returns TaskQueue
 */
export const createTaskQueue = <T>(
  name: string,
  maxWorker: number,
): TaskQueue<T> => {
  if (maxWorker <= 0) {
    throw new Error('invalid maxWorker, it should be > 0');
  }

  let queue: Task<T>[] = [];

  const toQueueTask = (data: T): Task<T> => ({ data, status: 'pending' });

  const add = (...data: T[]): void => {
    queue.push(...data.map(toQueueTask));
  };

  const getRunnableTask = () => {
    const pendingTaskIdx = queue.findIndex((task) => task.status === 'pending');

    if (pendingTaskIdx < 0 || pendingTaskIdx >= maxWorker) {
      return;
    }

    queue[pendingTaskIdx].status = 'running';

    return queue[pendingTaskIdx];
  };

  const remove = (...tasks: Task<T>[]): void => {
    if (tasks.length) {
      queue = queue.filter((task) => !tasks.includes(task));
    } else {
      queue = queue.slice(1);
    }
  };

  const map = <M>(f: (task: Task<T>) => M) => queue.map((t) => f(t));
  const filter = (f: (task: Task<T>) => boolean) => queue.filter((t) => f(t));
  const find = (f: (task: Task<T>) => boolean) => queue.find((t) => f(t));
  const reset = (): number => (queue.length = 0);
  const size = (): number => queue.length;

  return {
    name,
    add,
    remove,
    size,
    reset,
    getRunnableTask,
    map,
    filter,
    find,
  };
};
