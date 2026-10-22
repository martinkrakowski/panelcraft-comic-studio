import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BasicTracerProvider,
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import { trace } from '@opentelemetry/api';
import { XaiLlmHttpClient } from '../server/adapters/XaiLlmHttpClient.js';

const SYSTEM_PROMPT = 'You are a secret system oracle (XAI_SYS).';
const USER_PROMPT = 'Please write the secret user story (XAI_USER).';
const MODEL = 'grok-test-model';

function makeLogger() {
  return {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  };
}

function chatCompletionBody(
  usage = { prompt_tokens: 12, completion_tokens: 7, total_tokens: 19 }
) {
  return JSON.stringify({
    choices: [{ message: { content: '{"ok":true}' } }],
    usage,
  });
}

describe('XaiLlmHttpClient telemetry', () => {
  let exporter: InMemorySpanExporter;
  let provider: BasicTracerProvider;

  beforeEach(() => {
    exporter = new InMemorySpanExporter();
    provider = new BasicTracerProvider({
      spanProcessors: [new SimpleSpanProcessor(exporter)],
    });
    trace.setGlobalTracerProvider(provider);
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(async () => {
    await provider.shutdown();
    trace.disable();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('emits one xai.chat span with model, provider, token counts and single attempt', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(chatCompletionBody(), { status: 200 })
    );
    vi.stubGlobal('fetch', fetchMock);

    const client = new XaiLlmHttpClient('test-key', makeLogger());
    const result = await client.call(SYSTEM_PROMPT, USER_PROMPT, MODEL);

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const spans = exporter.getFinishedSpans();
    expect(spans).toHaveLength(1);
    const span = spans[0]!;
    expect(span.name).toBe('xai.chat');
    expect(span.attributes['gen_ai.operation.name']).toBe('chat');
    expect(span.attributes['llm.provider']).toBe('xai');
    expect(span.attributes['llm.model_name']).toBe(MODEL);
    expect(span.attributes['llm.attempts']).toBe(1);
    expect(span.attributes['llm.token_count.prompt']).toBe(12);
    expect(span.attributes['llm.token_count.completion']).toBe(7);
    expect(span.attributes['llm.token_count.total']).toBe(19);
    expect(span.attributes['gen_ai.usage.input_tokens']).toBe(12);
    expect(span.attributes['gen_ai.usage.output_tokens']).toBe(7);

    for (const value of Object.values(span.attributes)) {
      expect(String(value)).not.toContain(SYSTEM_PROMPT);
      expect(String(value)).not.toContain(USER_PROMPT);
    }
  });

  it('counts attempts across retries', async () => {
    const fetchMock = vi.fn(async () => {
      if (fetchMock.mock.calls.length <= 2) {
        return new Response('upstream error', { status: 500 });
      }
      return new Response(chatCompletionBody(), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.useFakeTimers();

    const client = new XaiLlmHttpClient('test-key', makeLogger());
    const pending = client.call(SYSTEM_PROMPT, USER_PROMPT, MODEL);
    await vi.advanceTimersByTimeAsync(4000);
    const result = await pending;

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);

    const span = exporter.getFinishedSpans()[0]!;
    expect(span.name).toBe('xai.chat');
    expect(span.attributes['llm.attempts']).toBe(3);
  });
});
