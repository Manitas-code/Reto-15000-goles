export interface ServerConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  timeoutMs: number;
  webOrigins: string[];
  serveWeb: boolean;
  webBasePath: string;
  logLevel?: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';
}

export function readConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseAnonKey = env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required');
  }
  const parsed = new URL(supabaseUrl);
  if (
    parsed.protocol !== 'https:' ||
    parsed.pathname !== '/' ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error('SUPABASE_URL must be an HTTPS origin');
  }
  const timeoutMs = Number(env.SUPABASE_TIMEOUT_MS ?? 10_000);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60_000) {
    throw new Error('SUPABASE_TIMEOUT_MS must be between 1 and 60000');
  }
  const webBasePath = env.WEB_BASE_PATH ?? '/';
  if (!webBasePath.startsWith('/') || !webBasePath.endsWith('/')) {
    throw new Error('WEB_BASE_PATH must start and end with /');
  }
  const logLevel = env.LOG_LEVEL ?? 'info';
  if (
    !['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'].includes(
      logLevel,
    )
  )
    throw new Error('LOG_LEVEL must be a valid Pino log level');
  return {
    supabaseUrl: parsed.origin,
    supabaseAnonKey,
    timeoutMs,
    webOrigins: (env.WEB_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    serveWeb: env.SERVE_WEB === 'true',
    webBasePath,
    logLevel: logLevel as ServerConfig['logLevel'],
  };
}
