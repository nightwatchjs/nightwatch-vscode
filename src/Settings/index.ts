export function isDefaultPathToNightwatch(path?: string | null): boolean {
  return path === null || path === '';
}

export function hasUserSetPathToNightwatch(path?: string | null): boolean {
  return !isDefaultPathToNightwatch(path);
}

export * from './types';
