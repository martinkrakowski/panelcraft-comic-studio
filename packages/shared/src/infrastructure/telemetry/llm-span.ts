import {
  context,
  trace,
  SpanStatusCode,
  type Span,
} from '@opentelemetry/api';

/**
 * Token usage reported by an LLM provider, normalized to the fields the
 * spans care about. Only numeric values are recorded; absent counts are
 * skipped.
 */
export interface LlmUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

/**
 * Attributes applied to a span created by `withLlmSpan`.
 *
 * The structured fields map onto the OpenInference / GenAI semantic
 * conventions used by Phoenix. `kind` selects the span kind (LLM by
 * default, CHAIN for workflow-level spans that wrap nested LLM calls).
 *
 * Any extra keys are copied verbatim onto the span — callers must only
 * pass ids (project/page/panel ids, model names, provider names), never
 * prompt, response, image, character or user text.
 */
export interface LlmSpanAttrs {
  /** `openinference.span.kind` — `LLM` by default, `CHAIN` for workflows. */
  kind?: 'LLM' | 'CHAIN';
  /** `llm.provider` (e.g. `xai`, `google`). */
  provider?: string;
  /** `llm.system` and `gen_ai.system`. */
  system?: string;
  /** `llm.model_name` and `gen_ai.request.model`. */
  model?: string;
  /** `gen_ai.operation.name` (e.g. `chat`, `image_generation`). */
  operation?: string;
  /** Additional attributes (ids only, never user text). */
  [key: string]: unknown;
}

/**
 * Options for {@link withLlmSpan}.
 */
export interface WithLlmSpanOptions {
  /**
   * Predicate recognising thrown errors that are an expected part of the
   * workflow rather than failures (e.g. LangGraph's HITL interrupts).
   *
   * When it returns `true` for a thrown error, the span is set to OK with
   * the boolean attribute `span.interrupted=true` instead of ERROR, and
   * the error is rethrown unchanged so the caller keeps handling it the
   * same way.
   */
  expected?: (err: unknown) => boolean;
}

/**
 * Record LLM token usage on a span when the provider returned `usage`.
 * Sets `llm.token_count.prompt|completion|total` and
 * `gen_ai.usage.input_tokens|output_tokens` for numeric counts only.
 *
 * @param span - The span to annotate.
 * @param usage - Normalized usage; skipped entirely when absent.
 */
export function recordLlmUsage(span: Span, usage?: LlmUsage | null): void {
  if (!usage) return;

  if (typeof usage.promptTokens === 'number') {
    span.setAttribute('llm.token_count.prompt', usage.promptTokens);
    span.setAttribute('gen_ai.usage.input_tokens', usage.promptTokens);
  }
  if (typeof usage.completionTokens === 'number') {
    span.setAttribute('llm.token_count.completion', usage.completionTokens);
    span.setAttribute('gen_ai.usage.output_tokens', usage.completionTokens);
  }
  if (typeof usage.totalTokens === 'number') {
    span.setAttribute('llm.token_count.total', usage.totalTokens);
  }
}

/**
 * Run `fn` inside an OpenTelemetry span.
 *
 * The span is started via the `panelcraft` tracer, made the active span
 * for the duration of `fn` (so nested LLM spans parent correctly), set to
 * OK on success or ERROR (message = the error class name only) on
 * failure, and always ended. Thrown errors are rethrown unchanged —
 * including "expected" ones recognised by `options.expected`, which are
 * marked OK with `span.interrupted=true` instead of ERROR.
 *
 * When no tracer provider is registered (OTEL_EXPORTER_OTLP_ENDPOINT
 * unset), `@opentelemetry/api` returns no-op tracer/span instances and
 * this behaves exactly like calling `fn` directly.
 *
 * @param name - Span name (e.g. `xai.chat`, `comic.graph.run`).
 * @param attrs - Attributes; see {@link LlmSpanAttrs}.
 * @param fn - Work to wrap; receives the started span.
 * @param options - Optional behaviour; see {@link WithLlmSpanOptions}.
 * @returns The value returned by `fn`.
 */
export async function withLlmSpan<T>(
  name: string,
  attrs: LlmSpanAttrs,
  fn: (span: Span) => Promise<T> | T,
  options?: WithLlmSpanOptions
): Promise<T> {
  const tracer = trace.getTracer('panelcraft');
  const span = tracer.startSpan(name);

  span.setAttribute('openinference.span.kind', attrs.kind ?? 'LLM');

  if (attrs.provider !== undefined) {
    span.setAttribute('llm.provider', attrs.provider);
  }
  if (attrs.system !== undefined) {
    span.setAttribute('llm.system', attrs.system);
    span.setAttribute('gen_ai.system', attrs.system);
  }
  if (attrs.model !== undefined) {
    span.setAttribute('llm.model_name', attrs.model);
    span.setAttribute('gen_ai.request.model', attrs.model);
  }
  if (attrs.operation !== undefined) {
    span.setAttribute('gen_ai.operation.name', attrs.operation);
  }

  for (const [key, value] of Object.entries(attrs)) {
    if (
      key === 'kind' ||
      key === 'provider' ||
      key === 'system' ||
      key === 'model' ||
      key === 'operation' ||
      value === undefined
    ) {
      continue;
    }
    // Only primitive attribute values are allowed; objects (which could
    // embed user text) are intentionally dropped.
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      span.setAttribute(key, value);
    }
  }

  try {
    const result = await context.with(
      trace.setSpan(context.active(), span),
      () => fn(span)
    );
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (err) {
    if (options?.expected?.(err)) {
      // Expected control-flow error (e.g. a HITL interrupt): the span
      // describes a deliberate pause, not a failure. Still rethrow so
      // the caller's existing handling is unchanged.
      span.setAttribute('span.interrupted', true);
      span.setStatus({ code: SpanStatusCode.OK });
    } else {
      const errorName = err instanceof Error && err.name ? err.name : 'Error';
      span.setStatus({ code: SpanStatusCode.ERROR, message: errorName });
    }
    throw err;
  } finally {
    span.end();
  }
}
