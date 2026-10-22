import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BasicTracerProvider,
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import { trace } from '@opentelemetry/api';
import { ImageGenerationAdapter } from '../ImageGenerationAdapter';

const PANEL_PROMPT = 'A secret hero panel prompt (NO_LEAK).';

describe('ImageGenerationAdapter telemetry', () => {
  let exporter: InMemorySpanExporter;
  let provider: BasicTracerProvider;

  beforeEach(() => {
    exporter = new InMemorySpanExporter();
    provider = new BasicTracerProvider({
      spanProcessors: [new SimpleSpanProcessor(exporter)],
    });
    trace.setGlobalTracerProvider(provider);
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

    for (const span of spans) {
      for (const value of Object.values(span.attributes)) {
        expect(String(value)).not.toContain(PANEL_PROMPT);
      }
    }
  });
});
