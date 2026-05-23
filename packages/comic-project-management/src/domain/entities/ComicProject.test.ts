import { describe, it, expect, beforeEach } from 'vitest';
import { ComicProject } from './ComicProject';
import { Panel } from './Panel';

describe('ComicProject', () => {
  let project: ComicProject;

  beforeEach(() => {
    project = new ComicProject('project-1', {
      prompt: 'A comic about superheroes',
      panelCount: 4,
    });
  });

  describe('constructor', () => {
    it('should create a comic project with required props', () => {
      expect(project.getId()).toBe('project-1');
      expect(project.getPrompt()).toBe('A comic about superheroes');
      expect(project.getPanelCount()).toBe(4);
      expect(project.getPanels()).toEqual([]);
      expect(project.getCharacterBible()).toBeNull();
    });

    it('should create a comic project with all props', () => {
      const panels = [new Panel('p1'), new Panel('p2')];
      const bible = { heroes: ['Batman', 'Superman'] };

      const fullProject = new ComicProject('project-2', {
        prompt: 'Full project',
        panelCount: 2,
        panels,
        characterBible: bible,
      });

      expect(fullProject.getPanels()).toEqual(panels);
      expect(fullProject.getCharacterBible()).toEqual(bible);
    });

    it('should throw RangeError for panelCount < 1', () => {
      expect(() => {
        new ComicProject('project-3', {
          prompt: 'Invalid',
          panelCount: 0,
        });
      }).toThrow(RangeError);

      expect(() => {
        new ComicProject('project-4', {
          prompt: 'Negative',
          panelCount: -5,
        });
      }).toThrow(RangeError);
    });

    it('should throw RangeError for non-integer panelCount', () => {
      expect(() => {
        new ComicProject('project-5', {
          prompt: 'Decimal',
          panelCount: 3.5,
        });
      }).toThrow(RangeError);
    });
  });

  describe('getId', () => {
    it('should return the project ID', () => {
      expect(project.getId()).toBe('project-1');
    });
  });

  describe('prompt management', () => {
    it('should get the prompt', () => {
      expect(project.getPrompt()).toBe('A comic about superheroes');
    });

    it('should set a new prompt', () => {
      const newPrompt = 'Updated prompt';

      project.setPrompt(newPrompt);

      expect(project.getPrompt()).toBe(newPrompt);
    });
  });

  describe('panel count management', () => {
    it('should get the panel count', () => {
      expect(project.getPanelCount()).toBe(4);
    });

    it('should set a valid panel count', () => {
      project.setPanelCount(6);

      expect(project.getPanelCount()).toBe(6);
    });

    it('should throw RangeError when setting invalid panel count', () => {
      expect(() => project.setPanelCount(0)).toThrow(RangeError);
      expect(() => project.setPanelCount(-1)).toThrow(RangeError);
      expect(() => project.setPanelCount(2.5)).toThrow(RangeError);
    });

    it('should accept panelCount of 1', () => {
      expect(() => {
        project.setPanelCount(1);
      }).not.toThrow();

      expect(project.getPanelCount()).toBe(1);
    });
  });

  describe('panels management', () => {
    it('should get panels (initially empty)', () => {
      expect(project.getPanels()).toEqual([]);
    });

    it('should set panels', () => {
      const panels = [
        new Panel('p1', { prompt: 'Panel 1' }),
        new Panel('p2', { prompt: 'Panel 2' }),
      ];

      project.setPanels(panels);

      expect(project.getPanels()).toEqual(panels);
    });

    it('should allow replacing panels', () => {
      const firstPanels = [new Panel('p1')];
      const secondPanels = [new Panel('p2'), new Panel('p3')];

      project.setPanels(firstPanels);
      expect(project.getPanels()).toHaveLength(1);

      project.setPanels(secondPanels);
      expect(project.getPanels()).toHaveLength(2);
    });
  });

  describe('character bible management', () => {
    it('should get character bible (initially null)', () => {
      expect(project.getCharacterBible()).toBeNull();
    });

    it('should set character bible', () => {
      const bible = {
        characters: [
          { name: 'Hero', powers: ['flying', 'strength'] },
          { name: 'Villain', powers: ['mind-control'] },
        ],
      };

      project.setCharacterBible(bible);

      expect(project.getCharacterBible()).toEqual(bible);
    });

    it('should allow updating character bible', () => {
      const bible1 = { version: 1 };
      const bible2 = { version: 2 };

      project.setCharacterBible(bible1);
      expect(project.getCharacterBible()).toEqual(bible1);

      project.setCharacterBible(bible2);
      expect(project.getCharacterBible()).toEqual(bible2);
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON correctly', () => {
      const panels = [new Panel('p1', { prompt: 'Scene 1' })];
      const bible = { main: 'character' };

      project.setPanels(panels);
      project.setCharacterBible(bible);

      const json = project.toJSON();

      expect(json).toEqual({
        id: 'project-1',
        prompt: 'A comic about superheroes',
        panelCount: 4,
        panels: [
          {
            id: 'p1',
            prompt: 'Scene 1',
            status: 'pending',
            generatedImageUrl: '',
          },
        ],
        characterBible: { main: 'character' },
      });
    });

    it('should serialize with empty panels array', () => {
      const json = project.toJSON();

      expect(json.panels).toEqual([]);
    });

    it('should deserialize from JSON correctly', () => {
      const json = {
        id: 'project-99',
        prompt: 'Deserialized comic',
        panelCount: 3,
        panels: [
          {
            id: 'p1',
            prompt: 'Panel 1',
            status: 'completed',
            generatedImageUrl: 'url1',
          },
          {
            id: 'p2',
            prompt: 'Panel 2',
            status: 'pending',
            generatedImageUrl: '',
          },
        ],
        characterBible: { character1: 'data' },
      };

      const deserialized = ComicProject.fromJSON(json);

      expect(deserialized.getId()).toBe('project-99');
      expect(deserialized.getPrompt()).toBe('Deserialized comic');
      expect(deserialized.getPanelCount()).toBe(3);
      expect(deserialized.getPanels()).toHaveLength(2);
      expect(deserialized.getCharacterBible()).toEqual({ character1: 'data' });
    });

    it('should handle deserialization with missing optional fields', () => {
      const json = {
        id: 'project-minimal',
        prompt: 'Minimal data',
        panelCount: 1,
      };

      const deserialized = ComicProject.fromJSON(json);

      expect(deserialized.getPanels()).toEqual([]);
      expect(deserialized.getCharacterBible()).toBeNull();
    });

    it('should enforce panelCount invariants during deserialization', () => {
      const invalidJsons = [
        { id: 'p1', prompt: 'test', panelCount: 0 },
        { id: 'p2', prompt: 'test', panelCount: -5 },
        { id: 'p3', prompt: 'test', panelCount: 2.5 },
      ];

      invalidJsons.forEach((json) => {
        expect(() => ComicProject.fromJSON(json)).toThrow(RangeError);
      });
    });

    it('should handle round-trip serialization', () => {
      const panels = [
        new Panel('p1', { prompt: 'Test', status: 'completed' }),
      ];
      project.setPanels(panels);
      project.setCharacterBible({ test: 'data' });

      const json = project.toJSON();
      const deserialized = ComicProject.fromJSON(json);
      const json2 = deserialized.toJSON();

      expect(json2).toEqual(json);
    });
  });

  describe('project state integrity', () => {
    it('should maintain consistency across multiple operations', () => {
      const panel1 = new Panel('p1');
      const panel2 = new Panel('p2');

      project.setPanels([panel1]);
      expect(project.getPanels()).toHaveLength(1);

      project.setPrompt('Updated prompt');
      expect(project.getPrompt()).toBe('Updated prompt');
      expect(project.getPanels()).toHaveLength(1);

      project.setPanels([panel1, panel2]);
      project.setPanelCount(2);

      expect(project.getPanels()).toHaveLength(2);
      expect(project.getPanelCount()).toBe(2);
      expect(project.getPrompt()).toBe('Updated prompt');
    });

    it('should not allow panel count modifications to affect stored panels', () => {
      const panels = [new Panel('p1'), new Panel('p2')];

      project.setPanels(panels);
      project.setPanelCount(5);

      expect(project.getPanels()).toHaveLength(2);
      expect(project.getPanelCount()).toBe(5);
    });
  });
});
