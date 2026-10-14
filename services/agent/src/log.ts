type Level = 'info' | 'warn' | 'error';

function emit(level: Level, msg: string, fields?: Record<string, unknown>): void {
  const line = JSON.stringify({ t: new Date().toISOString(), level, msg, ...fields });
  (level === 'error' ? process.stderr : process.stdout).write(`${line}\n`);
}

export const log = {
  info: (msg: string, fields?: Record<string, unknown>): void => emit('info', msg, fields),
  warn: (msg: string, fields?: Record<string, unknown>): void => emit('warn', msg, fields),
  error: (msg: string, fields?: Record<string, unknown>): void => emit('error', msg, fields),
};
