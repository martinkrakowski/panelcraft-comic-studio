import { afterEach, describe, expect, it, vi } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { trace } from '@opentelemetry/api';

// `nitropack/runtime` is only resolvable inside a built Nitro app (it
// references internal virtual modules). Replace it with an identity wrapper so
// the plugin can be exercised directly in isolation.
vi.mock('nitropack/runtime', () => ({
  defineNitroPlugin: (fn: unknown) => fn,
}));

import telemetryPlugin, {
  endpointOrigin,
  otlpTraceUrl,
} from '../server/plugins/telemetry.js';

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
    await telemetryPlugin(app as never);

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

  it('logs only the origin and exports to <endpoint>/v1/traces, keeping credentials for the exporter', async () => {
    // The raw URL helpers: credentials in the endpoint are kept for the
    // exporter itself (never logged) and trailing slashes are stripped
    // before `/v1/traces` is appended.
    expect(otlpTraceUrl('https://u:p@host:4318/')).toBe(
      'https://u:p@host:4318/v1/traces'
    );
    expect(endpointOrigin('https://u:p@host:4318/')).toBe('https://host:4318');

    // End-to-end against a local HTTP server standing in for the Alloy
    // endpoint: the startup log must carry only the origin, while the
    // export POST must land on `/v1/traces` with the endpoint's userinfo
    // credentials attached (Node turns URL userinfo into a basic-auth
    // header), proving credentials were kept for the exporter.
    const requests: Array<{ url?: string; authorization?: string }> = [];
    const server = http.createServer((req, res) => {
      requests.push({ url: req.url, authorization: req.headers.authorization });
      res.writeHead(200);
      res.end();
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = (server.address() as AddressInfo).port;

    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    try {
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT = `http://u:p@127.0.0.1:${port}/`;
      const app = makeNitroApp();
      await telemetryPlugin(app as never);

      const logged = infoSpy.mock.calls.map((call) => String(call[0])).join('\n');
      expect(logged).toContain(`Tracing enabled (OTLP exporter at http://127.0.0.1:${port})`);
      expect(logged).not.toContain('u:p');

      // One finished span; the close-hook shutdown force-flushes the batch
      // processor, sending a single export POST to the local server.
      const span = trace.getTracer('panelcraft').startSpan('probe');
      expect(span.isRecording()).toBe(true);
      span.end();
      await app.hooksRef.close[0]!();

      expect(requests).toHaveLength(1);
      expect(requests[0]!.url).toBe('/v1/traces');
      expect(requests[0]!.authorization).toBe(
        `Basic ${Buffer.from('u:p').toString('base64')}`
      );
    } finally {
      infoSpy.mockRestore();
      server.close();
      server.closeAllConnections();
    }
  });

  it('registers nothing when the endpoint does not parse as a URL', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    try {
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT = '::not-a-url::';
      const app = makeNitroApp();
      await telemetryPlugin(app as never);

      const logged = infoSpy.mock.calls.map((call) => String(call[0])).join('\n');
      expect(logged).toContain('(invalid endpoint)');

      expect(app.hooksRef.close).toHaveLength(0);
      const span = trace.getTracer('panelcraft').startSpan('probe');
      expect(span.isRecording()).toBe(false);
      span.end();
    } finally {
      infoSpy.mockRestore();
    }
  });
});
