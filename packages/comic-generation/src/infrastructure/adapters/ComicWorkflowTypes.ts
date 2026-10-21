import type { ImageGenerationPort } from '../../application/ports/out/image-generation.out-port.js';
import type { LLMClientPort } from '../../application/ports/out/llm-client.out-port.js';
import type { RelationalDbPort } from '../../application/ports/out/relational-db.out-port.js';
import type { MediaUrlPort } from '../../application/ports/out/media-url.out-port.js';
import type { ObjectStoragePort } from '../../application/ports/out/object-storage.out-port.js';
import type { LoggerPort } from '@panelcraft/shared';

export interface WorkflowDeps {
  imageGenPort: ImageGenerationPort;
  llmClient: LLMClientPort;
  projectRepo: RelationalDbPort;
  logger: LoggerPort;
  storage: ObjectStoragePort;
  mediaUrls: MediaUrlPort;
}

export interface Character {
  name: string;
  role?: string;
  visual: string;
  traits?: string;
  consistency: string;
}

export interface CharacterBibleData {
  characters: Character[];
}
