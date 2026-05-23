import { describe, it, expect } from 'vitest';
import { Panel } from './Panel';

describe('Panel', () => {
  describe('constructor', () => {
    it('should create a panel with default properties', () => {
      const panel = new Panel('panel-1');

      expect(panel.getId()).toBe('panel-1');
      expect(panel.getPrompt()).toBe('');
      expect(panel.getStatus()).toBe('pending');
      expect(panel.getGeneratedImageUrl()).toBe('');
    });

    it('should create a panel with provided properties', () => {
      const panel = new Panel('panel-2', {
        prompt: 'A sunny day',
        status: 'processing',
        generatedImageUrl: 'https://example.com/image.png',
      });

      expect(panel.getId()).toBe('panel-2');
      expect(panel.getPrompt()).toBe('A sunny day');
      expect(panel.getStatus()).toBe('processing');
      expect(panel.getGeneratedImageUrl()).toBe('https://example.com/image.png');
    });

    it('should handle partial properties gracefully', () => {
      const panel = new Panel('panel-3', {
        prompt: 'Partial panel',
      });

      expect(panel.getPrompt()).toBe('Partial panel');
      expect(panel.getStatus()).toBe('pending');
      expect(panel.getGeneratedImageUrl()).toBe('');
    });
  });

  describe('getId', () => {
    it('should return the panel ID', () => {
      const panel = new Panel('unique-panel-id');

      expect(panel.getId()).toBe('unique-panel-id');
    });
  });

  describe('setPrompt', () => {
    it('should update the prompt', () => {
      const panel = new Panel('panel-1');

      panel.setPrompt('New prompt text');

      expect(panel.getPrompt()).toBe('New prompt text');
    });

    it('should allow empty string prompts', () => {
      const panel = new Panel('panel-1', { prompt: 'Original' });

      panel.setPrompt('');

      expect(panel.getPrompt()).toBe('');
    });
  });

  describe('setStatus', () => {
    it('should update the status', () => {
      const panel = new Panel('panel-1');

      panel.setStatus('completed');

      expect(panel.getStatus()).toBe('completed');
    });

    it('should support different status values', () => {
      const panel = new Panel('panel-1');
      const statuses = ['pending', 'processing', 'completed', 'failed'];

      statuses.forEach((status) => {
        panel.setStatus(status);
        expect(panel.getStatus()).toBe(status);
      });
    });
  });

  describe('setGeneratedImageUrl', () => {
    it('should update the image URL', () => {
      const panel = new Panel('panel-1');
      const url = 'https://example.com/image.png';

      panel.setGeneratedImageUrl(url);

      expect(panel.getGeneratedImageUrl()).toBe(url);
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON correctly', () => {
      const panel = new Panel('panel-1', {
        prompt: 'Test prompt',
        status: 'completed',
        generatedImageUrl: 'https://example.com/img.png',
      });

      const json = panel.toJSON();

      expect(json).toEqual({
        id: 'panel-1',
        prompt: 'Test prompt',
        status: 'completed',
        generatedImageUrl: 'https://example.com/img.png',
      });
    });

    it('should deserialize from JSON correctly', () => {
      const json = {
        id: 'panel-2',
        prompt: 'Deserialized prompt',
        status: 'processing',
        generatedImageUrl: 'https://example.com/other.png',
      };

      const panel = Panel.fromJSON(json);

      expect(panel.getId()).toBe('panel-2');
      expect(panel.getPrompt()).toBe('Deserialized prompt');
      expect(panel.getStatus()).toBe('processing');
      expect(panel.getGeneratedImageUrl()).toBe('https://example.com/other.png');
    });

    it('should handle round-trip serialization', () => {
      const original = new Panel('panel-3', {
        prompt: 'Round trip test',
        status: 'failed',
        generatedImageUrl: 'https://example.com/round-trip.png',
      });

      const json = original.toJSON();
      const deserialized = Panel.fromJSON(json);

      expect(deserialized.toJSON()).toEqual(json);
    });
  });
});
