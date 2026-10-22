import { defineNitroPlugin } from 'nitropack/runtime';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { createLogger } from '@panelcraft/shared';

const ENDPOINT_ENV = 'OTEL_EXPORTER_OTLP_ENDPOINT';
const DEPLOYMENT_ENV = 'OTEL_DEPLOYMENT_ENVIRONMENT';
const DEFAULT_DEPLOYMENT_ENVIRONMENT = 'unknown';

/**
 * Build the OTLP trace-export URL from the raw endpoint value: trailing
 * slashes are stripped first so `https://host:4318/` and `https://host:4318`
 * both export to `…/v1/traces`. Any userinfo credentials in the endpoint
 * are preserved here for the exporter itself — they must never be logged
 * (see {@link endpointOrigin}).
 *
 * @param endpoint - Raw `OTEL_EXPORTER_OTLP_ENDPOINT` value.
 * @returns The exporter URL with `/v1/traces` appended.
 */
export function otlpTraceUrl(endpoint: string): string {
  // Append to the PATH, keeping the query and any credentials (CodeRabbit on #55): a
  // query-authenticated endpoint `https://h/otlp?token=t` must become
  // `https://h/otlp/v1/traces?token=t`, not `...?token=t/v1/traces`.
  const url = new URL(endpoint);
  url.pathname = `${url.pathname.replace(/\/+$/, '')}/v1/traces`;
  return url.toString();
}

/**
 * Credential-safe form of the endpoint for logging: the URL's origin only
 * (`protocol//host`), with any userinfo removed.
 *
 * @param endpoint - Raw `OTEL_EXPORTER_OTLP_ENDPOINT` value.
 * @returns The origin, or null when the endpoint does not parse as a URL.
 */
export function endpointOrigin(endpoint: string): string | null {
  try {
    const url = new URL(endpoint);
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

/**
 * Nitro plugin that registers the OpenTelemetry tracer provider for the API
 * when an OTLP endpoint is configured.
 *
 * - Enabled only when `OTEL_EXPORTER_OTLP_ENDPOINT` is set (non-empty) and
 *   parses as a URL. When unset, no provider is registered, nothing is
 *   exported, and the API's tracer stays the `@opentelemetry/api` no-op —
 *   behaviour is exactly as today. An unparseable endpoint is logged as
 *   `(invalid endpoint)` and also registers nothing.
 * - The OpenTelemetry SDK is imported dynamically inside the enabled
 *   branch, so with tracing off none of the SDK modules are loaded at all.
 * - Spans are exported over OTLP/HTTP to `<endpoint>/v1/traces` (typically
 *   an Alloy sidecar that forwards to Phoenix); the endpoint value —
 *   including any userinfo credentials — is passed to the exporter.
 * - Resource attributes mark the service (`panelcraft-api`) and the Phoenix
 *   project (`panelcraft`); `deployment.environment` comes from
 *   `OTEL_DEPLOYMENT_ENVIRONMENT` (default `unknown`).
 * - On Nitro `close`, the provider is shut down, flushing any buffered spans.
 * - The startup log line never contains credentials; only the endpoint's
 *   origin (`protocol//host`, userinfo stripped) is logged.
 */
export default defineNitroPlugin(async (nitroApp) => {
  const logger = createLogger('Telemetry');
  const endpoint = process.env[ENDPOINT_ENV]?.trim();

  if (!endpoint) {
    logger.info(`Tracing disabled (${ENDPOINT_ENV} not set)`);
    return;
  }

  const origin = endpointOrigin(endpoint);
  if (!origin) {
    logger.info('Tracing disabled (invalid endpoint)');
    return;
  }

  const environment =
    process.env[DEPLOYMENT_ENV]?.trim() || DEFAULT_DEPLOYMENT_ENVIRONMENT;

  // Loaded dynamically, only once tracing is known to be enabled: with the
  // env var unset (or invalid) none of the SDK modules are ever loaded and
  // `@opentelemetry/api` stays a no-op.
  const [
    { NodeTracerProvider },
    { BatchSpanProcessor },
    { OTLPTraceExporter },
    { resourceFromAttributes },
  ] = await Promise.all([
    import('@opentelemetry/sdk-trace-node'),
    import('@opentelemetry/sdk-trace-base'),
    import('@opentelemetry/exporter-trace-otlp-http'),
    import('@opentelemetry/resources'),
  ]);

  const provider = new NodeTracerProvider({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: 'panelcraft-api',
      'openinference.project.name': 'panelcraft',
      'deployment.environment': environment,
    }),
    spanProcessors: [
      new BatchSpanProcessor(
        new OTLPTraceExporter({ url: otlpTraceUrl(endpoint) })
      ),
    ],
  });
  provider.register();

  logger.info(`Tracing enabled (OTLP exporter at ${origin})`);

  nitroApp.hooks.hook('close', async () => {
    await provider.shutdown().catch(() => undefined);
  });
});
