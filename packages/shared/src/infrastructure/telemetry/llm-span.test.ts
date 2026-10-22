import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  BasicTracerProvider,
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { recordLlmUsage, withLlmSpan } from './llm-span.js';

describe('withLlmSpan', () => {
  let exporter: InMemorySpanExporter;
  let provider: BasicTracerProvider;

  beforeEach(() => {
    exporter = new InMemorySpanExporter();
    provider = new BasicTracerProvider({
      spanProcessors: [new SimpleSpanProcessor(exporter)],
    });
    trace.setGlobalTracerProvider(provider);
  });

  afterEach(async () => {
    await provider.shutdown();
    trace.disable();
  });

  it('sets LLM attributes and OK status, returns the fn result', async () => {
    const result = await withLlmSpan(
      'test.chat',
      {
        provider: 'xai',
        system: 'xai',
        model: 'grok-4',
        operation: 'chat',
        projectId: 'proj-1',
      },
      async (span) => {
        span.setAttribute('panelId', 'panel-0');
        return 'ok';
      }
    );

    expect(result).toBe('ok');

    const spans = exporter.getFinishedSpans();
    expect(spans).toHaveLength(1);
    const span = spans[0]!;
    expect(span.name).toBe('test.chat');
    expect(span.status.code).toBe(SpanStatusCode.OK);
    expect(span.attributes['openinference.span.kind']).toBe('LLM');
    expect(span.attributes['llm.provider']).toBe('xai');
    expect(span.attributes['llm.system']).toBe('xai');
    expect(span.attributes['llm.model_name']).toBe('grok-4');
    expect(span.attributes['gen_ai.system']).toBe('xai');
    expect(span.attributes['gen_ai.request.model']).toBe('grok-4');
    expect(span.attributes['gen_ai.operation.name']).toBe('chat');
    expect(span.attributes['projectId']).toBe('proj-1');
    expect(span.attributes['panelId']).toBe('panel-0');
  });

  it('records ERROR with the error class name only and rethrows', async () => {
    const boom = new TypeError('confidential provider body');

    let caught: unknown;
    try {
      await withLlmSpan(
        'test.fail',
        { kind: 'CHAIN' },
        async () => {
          throw boom;
        }
      );
    } catch (err) {
      caught = err;
    }

    expect(caught).toBe(boom);

    const spans = exporter.getFinishedSpans();
    expect(spans).toHaveLength(1);
    const span = spans[0]!;
    expect(span.name).toBe('test.fail');
    expect(span.status.code).toBe(SpanStatusCode.ERROR);
    expect(span.status.message).toBe('TypeError');
    expect(span.status.message).not.toContain('confidential');
    expect(span.attributes['openinference.span.kind']).toBe('CHAIN');
  });

  it('always ends the span even when fn throws', async () => {
    await expect(
      withLlmSpan('test.throw', { operation: 'chat' }, async () => {
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');

    const spans = exporter.getFinishedSpans();
    expect(spans).toHaveLength(1);
    expect(spans[0]!.name).toBe('test.throw');
  });

  it('records usage only when numeric counts are present', async () => {
    await withLlmSpan(
      'test.usage',
      { provider: 'xai', system: 'xai', model: 'm', operation: 'chat' },
      async (span) => {
        recordLlmUsage(span, {
          promptTokens: 10,
          completionTokens: 5,
          totalTokens: 15,
        });
        recordLlmUsage(span, {});
        return null;
      }
    );

    const span = exporter.getFinishedSpans()[0]!;
    expect(span.attributes['llm.token_count.prompt']).toBe(10);
    expect(span.attributes['llm.token_count.completion']).toBe(5);
    expect(span.attributes['llm.token_count.total']).toBe(15);
    expect(span.attributes['gen_ai.usage.input_tokens']).toBe(10);
    expect(span.attributes['gen_ai.usage.output_tokens']).toBe(5);
  });

  it('skips usage entirely when absent', async () => {
    await withLlmSpan(
      'test.nousage',
      { operation: 'chat' },
      async (span) => {
        recordLlmUsage(span, undefined);
        return null;
      }
    );

    const span = exporter.getFinishedSpans()[0]!;
    expect(span.attributes['llm.token_count.prompt']).toBeUndefined();
    expect(span.attributes['llm.token_count.completion']).toBeUndefined();
    expect(span.attributes['llm.token_count.total']).toBeUndefined();
    expect(span.attributes['gen_ai.usage.input_tokens']).toBeUndefined();
    expect(span.attributes['gen_ai.usage.output_tokens']).toBeUndefined();
  });
});
