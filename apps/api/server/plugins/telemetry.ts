import { defineNitroPlugin } from 'nitropack/runtime';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { createLogger } from '@panelcraft/shared';

const ENDPOINT_ENV = 'OTEL_EXPORTER_OTLP_ENDPOINT';
const DEPLOYMENT_ENV = 'OTEL_DEPLOYMENT_ENVIRONMENT';
const DEFAULT_DEPLOYMENT_ENVIRONMENT = 'unknown';

/**
 * Nitro plugin that registers the OpenTelemetry tracer provider for the API
 * when an OTLP endpoint is configured.
 *
 * - Enabled only when `OTEL_EXPORTER_OTLP_ENDPOINT` is set (non-empty).
 *   When unset, no provider is registered, nothing is exported, and the API's
 *   tracer stays the `@opentelemetry/api` no-op — behaviour is exactly as
 *   today.
 * - Spans are exported over OTLP/HTTP to `<endpoint>/v1/traces` (typically an
 *   Alloy sidecar that forwards to Phoenix).
 * - Resource attributes mark the service (`panelcraft-api`) and the Phoenix
 *   project (`panelcraft`); `deployment.environment` comes from
 *   `OTEL_DEPLOYMENT_ENVIRONMENT` (default `unknown`).
 * - On Nitro `close`, the provider is shut down, flushing any buffered spans.
 * - The startup log line never contains credentials; only the endpoint URL is
 *   logged.
 */
export default defineNitroPlugin((nitroApp) => {
  const logger = createLogger('Telemetry');
  const endpoint = process.env[ENDPOINT_ENV]?.trim();

  if (!endpoint) {
    logger.info(
      `Tracing disabled (${ENDPOINT_ENV} not set)`
    );
    return;
  }

  const environment =
    process.env[DEPLOYMENT_ENV]?.trim() || DEFAULT_DEPLOYMENT_ENVIRONMENT;

  const provider = new NodeTracerProvider({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: 'panelcraft-api',
      'openinference.project.name': 'panelcraft',
      'deployment.environment': environment,
    }),
    spanProcessors: [
      new BatchSpanProcessor(
        new OTLPTraceExporter({ url: `${endpoint}/v1/traces` })
      ),
    ],
  });
  provider.register();

  logger.info(`Tracing enabled (OTLP exporter at ${endpoint})`);

  nitroApp.hooks.hook('close', async () => {
    await provider.shutdown().catch(() => undefined);
  });
});
