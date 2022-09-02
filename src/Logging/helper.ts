import { inspect } from 'util';
import { UtilInspectColors } from './types';

export const colorizedOutput = <T>(style: UtilInspectColors, data: T): string => {
  const color: [number, number] = inspect.colors[style] ?? [0, 0];

  return `\u001b[${color[0]}m${data}\u001b[${color[1]}m`;
};

export const styleString = <T, S>(styleTypes: T | UtilInspectColors[], str: S | string): string => {
  return Object.values(styleTypes).reduce((resultStr: S, styleType: T) => {
    return colorizedOutput(styleType as unknown as UtilInspectColors, resultStr);
  }, str);
};

export const getDateAndTime = new Date().toUTCString();
