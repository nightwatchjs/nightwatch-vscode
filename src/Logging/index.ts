import { error, log, warn } from 'console';
import { getDateAndTime, styleString } from './helper';
import { Logging, LoggingFactory, LoggingType } from './types';

export const workspaceLogging = (workspaceName: string, verbose: boolean): LoggingFactory => {
  const create =
    (id: string): Logging =>
    (type: LoggingType, ...args: unknown[]): void => {
      const name = `[${workspaceName}] [${styleString(['whiteBright'], id)}]`;

      switch (type) {
        case 'debug':
          if (verbose) {
            log(`[${getDateAndTime}] [${styleString(['greenBright', 'bold'], type.toUpperCase())}]`, name, ...args);
          }
          break;
        case 'warn':
          warn(`[${getDateAndTime}] [${styleString(['yellowBright', 'bold'], type.toUpperCase())}]`, name, ...args);
          break;

        default:
          error(`[${getDateAndTime}] [${styleString(['redBright', 'bold'], type.toUpperCase())}]`, name, ...args);
          break;
      }
    };

  return { create };
};

export * from './types';
