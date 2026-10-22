import { afterEach, describe, expect, it, vi } from 'vitest';
import { trace } from '@opentelemetry/api';

// `nitropack/runtime` is only resolvable inside a built Nitro app (it
// references internal virtual modules). Replace it with an identity wrapper so
// the plugin can be exercised directly in isolation.
vi.mock('nitropack/runtime', () => ({
  defineNitroPlugin: (fn: unknown) => fn,
}));

import telemetryPlugin from '../server/plugins/telemetry.js';

interface FakeNitroApp {
  hooksRef: { close: Array<() => unknown | Promise<unknown>> };
  hooks: {
    hook: (name: string, cb: () => unknown | Promise<unknown>) => void;
  };
}

function makeNitroApp(): FakeNitroApp {
  const hooksRef: { close: Array<() => unknown | Promise<unknown>> } = {
    close: [],
  };
  return {
    hooksRef,
    hooks: {
      hook: (name: string, cb: () => unknown | Promise<unknown>) => {
        if (name === 'close') {
          hooksRef.close.push(cb);
        }
      },
    },
  };
}

describe('telemetry plugin', () => {
  afterEach(() => {
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    delete process.env.OTEL_DEPLOYMENT_ENVIRONMENT;
    trace.disable();
  });

  it('does not register a global provider when OTEL_EXPORTER_OTLP_ENDPOINT is unset', () => {
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

    const app = makeNitroApp();
    telemetryPlugin(app as never);

    expect(app.hooksRef.close).toHaveLength(0);
    const span = trace.getTracer('panelcraft').startSpan('probe');
    expect(span.isRecording()).toBe(false);
    span.end();
  });

  it('registers a global provider and a close hook when the endpoint is set', async () => {
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://127.0.0.1:4318';
    process.env.OTEL_DEPLOYMENT_ENVIRONMENT = 'test';

    const app = makeNitroApp();
    telemetryPlugin(app as never);

    expect(app.hooksRef.close).toHaveLength(1);

    // Starting a span proves the global provider is registered (recording).
    // We intentionally do NOT end it: ending would queue an export to the
    // fake OTLP endpoint and make the close-hook shutdown wait on a refused
    // connection.
    const span = trace.getTracer('panelcraft').startSpan('probe');
    expect(span.isRecording()).toBe(true);

    // The close hook flushes and shuts down the provider without exporting
    // anything (no finished spans are buffered).
    await app.hooksRef.close[0]!();
    trace.disable();
  });
});
