import { inspect } from 'util';
import { UtilInspectColors } from './types';

export const colorizedOutput = <T>(
  style: UtilInspectColors,
  data: T,
): string => {
  const color: [number, number] = inspect.colors[style] ?? [0, 0];

  return `\u001b[${color[0]}m${data}\u001b[${color[1]}m`;
};

export const styleString = <T extends UtilInspectColors | string, S>(
  styleTypes: T[],
  str: S | string,
): string => {
  return styleTypes.reduce((resultStr: string, styleType: T) => {
    return colorizedOutput(styleType as UtilInspectColors, resultStr);
  }, str as string) as string;
};

export const getDateAndTime = new Date().toUTCString();
