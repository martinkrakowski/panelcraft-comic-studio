import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BasicTracerProvider,
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { context, trace } from '@opentelemetry/api';
import { ImageGenerationAdapter } from '../ImageGenerationAdapter';

const PANEL_PROMPT = 'A secret hero panel prompt (NO_LEAK).';

describe('ImageGenerationAdapter telemetry', () => {
  let exporter: InMemorySpanExporter;
  let provider: BasicTracerProvider;
  let contextManager: AsyncLocalStorageContextManager;

  beforeEach(() => {
    exporter = new InMemorySpanExporter();
    provider = new BasicTracerProvider({
      spanProcessors: [new SimpleSpanProcessor(exporter)],
    });
    trace.setGlobalTracerProvider(provider);
    // BasicTracerProvider does not install a context manager; without one
    // `context.with` inside the span helper is a no-op and parent/child
    // nesting is lost. Register the same AsyncLocalStorageContextManager
    // that NodeTracerProvider sets up in production so nested spans
    // parent exactly like they do when the app runs with tracing on.
    contextManager = new AsyncLocalStorageContextManager();
    contextManager.enable();
    context.setGlobalContextManager(contextManager);
    vi.stubEnv('XAI_API_KEY', 'test-key');
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              data: [{ url: 'https://cdn.example.com/panel.png' }],
            }),
            { status: 200 }
          )
      )
    );
  });

  afterEach(async () => {
    await provider.shutdown();
    contextManager.disable();
    context.disable();
    trace.disable();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('spans generatePanel with image attributes and no prompt text', async () => {
    const adapter = new ImageGenerationAdapter();
    const url = await adapter.generatePanel({
      prompt: PANEL_PROMPT,
      panelNumber: 1,
    });

    expect(url).toBe('https://cdn.example.com/panel.png');

    const spans = exporter.getFinishedSpans();
    const panelSpan = spans.find((s) => s.name === 'xai.image.generatePanel');
    const imageSpan = spans.find((s) => s.name === 'xai.image.generateImage');
    expect(panelSpan).toBeDefined();
    expect(imageSpan).toBeDefined();
    expect(panelSpan!.attributes['gen_ai.operation.name']).toBe(
      'image_generation'
    );
    expect(panelSpan!.attributes['llm.provider']).toBe('xai');
    expect(panelSpan!.attributes['llm.model_name']).toBe('grok-imagine-image');
    expect(panelSpan!.attributes['llm.image.count']).toBe(1);

    // generateImage runs inside generatePanel's span, so its span must be
    // a child: the parent context's span id equals the panel span's id.
    // (SDK 2.x exposes the parent via `parentSpanContext` rather than the
    // 1.x `parentSpanId` field.)
    expect(imageSpan!.parentSpanContext?.spanId).toBe(
      panelSpan!.spanContext().spanId
    );

    for (const span of spans) {
      for (const value of Object.values(span.attributes)) {
        expect(String(value)).not.toContain(PANEL_PROMPT);
      }
    }
  });
});
