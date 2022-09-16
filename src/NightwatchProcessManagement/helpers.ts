import { NightwatchProcess } from './nightwatchProcess';
import { NightwatchProcessRequest, Task, TaskPredicate } from './types';

export const stringifyRequest = (request: NightwatchProcessRequest): string => {
  const replacer = (key: string, value: unknown) => {
    if (key === 'listener') {
      return typeof value;
    }
    return value;
  };

  return JSON.stringify(request, replacer);
};

export const isDup = (task: Task<NightwatchProcess>, request: NightwatchProcessRequest): boolean => {
  if (!request.schedule.dedup) {
    return false;
  }
  const process = task.data;
  const predicate: TaskPredicate = request.schedule.dedup;

  if (predicate.filterByStatus && !predicate.filterByStatus.includes(task.status)) {
    return false;
  }

  if (predicate.filterByContent !== false && !isRequestEqual(process.request, request)) {
    return false;
  }

  return true;
};

export const isRequestEqual = (request1: NightwatchProcessRequest, request2: NightwatchProcessRequest): boolean => {
  switch (request1.type) {
    case 'by-file':
      return request1.type === request2.type && request1.testFileName === request2.testFileName;
    case 'by-file-test':
      return (
        request1.type === request2.type &&
        request1.testFileName === request2.testFileName &&
        request1.testName === request2.testName
      );
    case 'not-test':
      return request1.type === request2.type && request1.args === request2.args;
    default:
      return request1.type === request2.type;
  }
};
