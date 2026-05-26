import { describe, it, expect } from 'vitest';
import { Panel } from '../Panel';
import { PanelId, PanelStatus } from '../../value-objects/index.js';

describe('Panel', () => {
  describe('constructor', () => {
    it('should create a panel with provided properties', () => {
      const id = PanelId.create('panel-1').value!;
      const status = PanelStatus.create('pending').value!;
      const panel = new Panel(id, {
        prompt: '',
        status,
        generatedImageUrl: null,
      });

      expect(panel.getId().equals(id)).toBe(true);
      expect(panel.getPrompt()).toBe('');
      expect(panel.getStatus().equals(status)).toBe(true);
      expect(panel.getGeneratedImageUrl()).toBeNull();
    });

    it('should create a panel with custom prompt and status', () => {
      const id = PanelId.create('panel-2').value!;
      const status = PanelStatus.create('completed').value!;
      const panel = new Panel(id, {
        prompt: 'A sunny day',
        status,
        generatedImageUrl: 'https://example.com/image.png',
      });

      expect(panel.getId().equals(id)).toBe(true);
      expect(panel.getPrompt()).toBe('A sunny day');
      expect(panel.getStatus().equals(status)).toBe(true);
      expect(panel.getGeneratedImageUrl()).toBe('https://example.com/image.png');
    });
  });

  describe('getId', () => {
    it('should return the panel ID as a PanelId value object', () => {
      const id = PanelId.create('unique-panel-id').value!;
      const panel = new Panel(id, {
        status: PanelStatus.create('pending').value!,
      });

      expect(panel.getId().equals(id)).toBe(true);
    });
  });

  describe('setPrompt', () => {
    it('should update the prompt', () => {
      const id = PanelId.create('panel-1').value!;
      const status = PanelStatus.create('pending').value!;
      const panel = new Panel(id, { status });

      panel.setPrompt('New prompt text');

      expect(panel.getPrompt()).toBe('New prompt text');
    });

    it('should allow empty string prompts', () => {
      const id = PanelId.create('panel-1').value!;
      const status = PanelStatus.create('pending').value!;
      const panel = new Panel(id, { prompt: 'Original', status });

      panel.setPrompt('');

      expect(panel.getPrompt()).toBe('');
    });
  });

  describe('setStatus', () => {
    it('should update the status', () => {
      const id = PanelId.create('panel-1').value!;
      const status = PanelStatus.create('pending').value!;
      const panel = new Panel(id, { status });

      const newStatus = PanelStatus.create('completed').value!;
      panel.setStatus(newStatus);

      expect(panel.getStatus().equals(newStatus)).toBe(true);
    });

    it('should support different status values', () => {
      const id = PanelId.create('panel-1').value!;
      const status = PanelStatus.create('pending').value!;
      const panel = new Panel(id, { status });

      const statuses = ['pending', 'generated', 'completed', 'failed'];
      statuses.forEach((statusStr) => {
        const newStatus = PanelStatus.create(statusStr).value!;
        panel.setStatus(newStatus);
        expect(panel.getStatus().getValue()).toBe(statusStr);
      });
    });
  });

  describe('setGeneratedImageUrl', () => {
    it('should update the image URL', () => {
      const id = PanelId.create('panel-1').value!;
      const status = PanelStatus.create('pending').value!;
      const panel = new Panel(id, { status });
      const url = 'https://example.com/image.png';

      panel.setGeneratedImageUrl(url);

      expect(panel.getGeneratedImageUrl()).toBe(url);
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON correctly', () => {
      const id = PanelId.create('panel-1').value!;
      const status = PanelStatus.create('completed').value!;
      const panel = new Panel(id, {
        prompt: 'Test prompt',
        status,
        generatedImageUrl: 'https://example.com/img.png',
      });

      const json = panel.toJSON();

      expect(json).toEqual({
        id: 'panel-1',
        prompt: 'Test prompt',
        status: 'completed',
        generatedImageUrl: 'https://example.com/img.png',
        dialogue: [],
        captions: [],
      });
    });

    it('should deserialize from JSON correctly', () => {
      const json = {
        id: 'panel-2',
        prompt: 'Deserialized prompt',
        status: 'completed',
        generatedImageUrl: 'https://example.com/other.png',
      };

      const panel = Panel.fromJSON(json);

      expect(panel.getId().getValue()).toBe('panel-2');
      expect(panel.getPrompt()).toBe('Deserialized prompt');
      expect(panel.getStatus().getValue()).toBe('completed');
      expect(panel.getGeneratedImageUrl()).toBe('https://example.com/other.png');
    });

    it('should handle round-trip serialization', () => {
      const id = PanelId.create('panel-3').value!;
      const status = PanelStatus.create('failed').value!;
      const original = new Panel(id, {
        prompt: 'Round trip test',
        status,
        generatedImageUrl: 'https://example.com/round-trip.png',
      });

      const json = original.toJSON();
      const deserialized = Panel.fromJSON(json);

      expect(deserialized.toJSON()).toEqual(json);
    });

    it('should preserve dialogue/captions through regen-like updates and roundtrips (cover-title safety)', () => {
      const id = PanelId.create('panel-overlay-1').value!;
      const status = PanelStatus.create('completed').value!;
      const panel = new Panel(id, {
        prompt: 'Overlay test',
        status,
        generatedImageUrl: 'https://example.com/ov.png',
        dialogue: [{ id: 'd1', text: 'Hello!', speaker: 'A', variant: 'speech', position: { x: 0.5, y: 0.5 }, tailTarget: { x: 0.2, y: 0.7 } }],
        captions: [{ id: 'c1', text: 'NARRATION', variant: 'caption', position: { x: 0.5, y: 0.1 } }],
      });

      // Simulate regen spread (as in graph node)
      const json = panel.toJSON();
      const updated = { ...json, generatedImageUrl: 'https://new.png', status: 'generated' };
      const afterRegen = Panel.fromJSON(updated as any);

      expect(afterRegen.getDialogue().length).toBe(1);
      expect(afterRegen.getDialogue()[0].text).toBe('Hello!');
      expect(afterRegen.getCaptions().length).toBe(1);
      expect(afterRegen.getCaptions()[0].text).toBe('NARRATION');

      // set again (as in worker/entity path)
      afterRegen.setDialogue([{ id: 'd2', text: 'Updated!', speaker: 'B', variant: 'thought', position: { x: 0.6, y: 0.6 } } as any]);
      const finalJson = afterRegen.toJSON();
      expect(finalJson.dialogue?.[0].text).toBe('Updated!');
    });
  });
});
