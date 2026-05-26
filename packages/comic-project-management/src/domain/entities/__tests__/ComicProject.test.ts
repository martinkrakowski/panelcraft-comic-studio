import { describe, it, expect, beforeEach } from 'vitest';
import { ComicProject } from '../ComicProject';
import { Panel } from '../Panel';
import { ComicProjectId, ComicPrompt, ComicDisplayTitle, PanelCount, PanelId, PanelStatus, CharacterBible } from '../../value-objects/index.js';

describe('ComicProject', () => {
  let project: ComicProject;

  beforeEach(() => {
    const id = ComicProjectId.create('project-1').value!;
    const prompt = ComicPrompt.create('A comic about superheroes').value!;
    const panelCount = PanelCount.create(4).value!;

    project = new ComicProject(id, {
      prompt,
      panelCount,
      status: 'created',
      createdAt: new Date().toISOString(),
    });
  });

  describe('constructor', () => {
    it('should create a comic project with required props', () => {
      expect(project.getId().getValue()).toBe('project-1');
      expect(project.getPrompt().getValue()).toBe('A comic about superheroes');
      expect(project.getPanelCount().getValue()).toBe(4);
      expect(project.getPanels()).toEqual([]);
      expect(project.getCharacterBible()).toBeNull();
    });

    it('should create a comic project with all props', () => {
      const panelId = PanelId.create('p1').value!;
      const panelStatus = PanelStatus.create('pending').value!;
      const panels = [new Panel(panelId, { status: panelStatus }), new Panel(PanelId.create('p2').value!, { status: panelStatus })];

      const id = ComicProjectId.create('project-2').value!;
      const prompt = ComicPrompt.create('Full project with ten chars').value!;
      const panelCount = PanelCount.create(2).value!;
      const createdAt = new Date().toISOString();

      const displayTitle = ComicDisplayTitle.create('Full Project Title').value!;
      const fullProject = new ComicProject(id, {
        prompt,
        panelCount,
        panels,
        status: 'created',
        createdAt,
        displayTitle,
      });

      expect(fullProject.getPanels()).toEqual(panels);
      expect(fullProject.getCreatedAt()).toBe(createdAt);
      expect(fullProject.getDisplayTitle()?.getValue()).toBe('Full Project Title');
    });
  });

  describe('getId', () => {
    it('should return the project ID as ComicProjectId', () => {
      expect(project.getId().getValue()).toBe('project-1');
    });
  });

  describe('prompt management', () => {
    it('should get the prompt', () => {
      expect(project.getPrompt().getValue()).toBe('A comic about superheroes');
    });

    it('should set a new prompt', () => {
      const newPrompt = ComicPrompt.create('Updated prompt text here').value!;

      project.setPrompt(newPrompt);

      expect(project.getPrompt().equals(newPrompt)).toBe(true);
    });
  });

  describe('displayTitle management', () => {
    it('should return null for displayTitle when not provided', () => {
      expect(project.getDisplayTitle()).toBeNull();
    });

    it('should set and get a valid displayTitle', () => {
      const title = ComicDisplayTitle.create('The Shadow Protocol').value!;
      project.setDisplayTitle(title);
      expect(project.getDisplayTitle()).not.toBeNull();
      expect(project.getDisplayTitle()!.getValue()).toBe('The Shadow Protocol');
      expect(project.getDisplayTitle()!.equals(title)).toBe(true);
    });

    it('should allow clearing displayTitle by setting null', () => {
      const title = ComicDisplayTitle.create('Temporary Title').value!;
      project.setDisplayTitle(title);
      project.setDisplayTitle(null);
      expect(project.getDisplayTitle()).toBeNull();
    });

    it('should reject invalid displayTitle lengths via create', () => {
      expect(ComicDisplayTitle.create('ab').success).toBe(false);
      expect(ComicDisplayTitle.create('x'.repeat(121)).success).toBe(false);
      expect(ComicDisplayTitle.create(42 as any).success).toBe(false);
    });
  });

  describe('panel count management', () => {
    it('should get the panel count', () => {
      expect(project.getPanelCount().getValue()).toBe(4);
    });

    it('should set a valid panel count', () => {
      const newCount = PanelCount.create(6).value!;
      project.setPanelCount(newCount);

      expect(project.getPanelCount().getValue()).toBe(6);
    });
  });

  describe('panels management', () => {
    it('should get panels (initially empty)', () => {
      expect(project.getPanels()).toEqual([]);
    });

    it('should set panels', () => {
      const status = PanelStatus.create('pending').value!;
      const panels = [
        new Panel(PanelId.create('p1').value!, { prompt: 'Panel 1', status }),
        new Panel(PanelId.create('p2').value!, { prompt: 'Panel 2', status }),
      ];

      project.setPanels(panels);

      expect(project.getPanels()).toEqual(panels);
    });

    it('should allow replacing panels', () => {
      const status = PanelStatus.create('pending').value!;
      const firstPanels = [new Panel(PanelId.create('p1').value!, { status })];
      const secondPanels = [
        new Panel(PanelId.create('p2').value!, { status }),
        new Panel(PanelId.create('p3').value!, { status }),
      ];

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
      const bibleData = {
        characters: [
          { name: 'Hero', role: 'protagonist', visual: 'cape', consistency: 'brave' },
          { name: 'Villain', role: 'antagonist', visual: 'dark', consistency: 'evil' },
        ],
      };

      // Create CharacterBible value object
      const bibleResult = CharacterBible.create(bibleData);
      expect(bibleResult.success).toBe(true);

      project.setCharacterBible(bibleResult.value!);

      expect(project.getCharacterBible()).toBe(bibleResult.value!);
    });
  });

  describe('status management', () => {
    it('should get and set status', () => {
      expect(project.getStatus()).toBe('created');

      project.setStatus('pending_review');
      expect(project.getStatus()).toBe('pending_review');
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON correctly', () => {
      const status = PanelStatus.create('pending').value!;
      const panels = [new Panel(PanelId.create('p1').value!, { prompt: 'Scene 1', status })];

      project.setPanels(panels);

      const json = project.toJSON();

      expect(json.id).toBe('project-1');
      expect(json.prompt).toBe('A comic about superheroes');
      expect(json.displayTitle).toBeNull();
      expect(json.panelCount).toBe(4);
      expect(json.panels).toHaveLength(1);
      expect(json.status).toBe('created');
      expect(json.characterBible).toBeNull();
    });

    it('should serialize with empty panels array', () => {
      const json = project.toJSON();

      expect(json.panels).toEqual([]);
    });

    it('should deserialize from JSON correctly', () => {
      const json = {
        id: 'project-99',
        prompt: 'Deserialized comic is great',
        displayTitle: 'Great Comic',
        panelCount: 3,
        status: 'created',
        createdAt: new Date().toISOString(),
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
            generatedImageUrl: null,
          },
        ],
        characterBible: null,
      };

      const deserialized = ComicProject.fromJSON(json);

      expect(deserialized.getId().getValue()).toBe('project-99');
      expect(deserialized.getPrompt().getValue()).toBe('Deserialized comic is great');
      expect(deserialized.getDisplayTitle()?.getValue()).toBe('Great Comic');
      expect(deserialized.getPanelCount().getValue()).toBe(3);
      expect(deserialized.getPanels()).toHaveLength(2);
      expect(deserialized.getCharacterBible()).toBeNull();
    });

    it('should handle deserialization with missing optional fields', () => {
      const json = {
        id: 'project-minimal',
        prompt: 'Minimal data here please',
        panelCount: 1,
        status: 'created',
        createdAt: new Date().toISOString(),
      };

      const deserialized = ComicProject.fromJSON(json);

      expect(deserialized.getPanels()).toEqual([]);
      expect(deserialized.getCharacterBible()).toBeNull();
      expect(deserialized.getDisplayTitle()).toBeNull();
    });

    it('should handle round-trip serialization', () => {
      const status = PanelStatus.create('completed').value!;
      const panels = [
        new Panel(PanelId.create('p1').value!, { prompt: 'Test', status }),
      ];
      project.setPanels(panels);
      project.setStatus('pending_review');

      // Exercise displayTitle in roundtrip
      const titleVo = ComicDisplayTitle.create('Roundtrip Title').value!;
      project.setDisplayTitle(titleVo);

      const json = project.toJSON();
      const deserialized = ComicProject.fromJSON(json);
      const json2 = deserialized.toJSON();

      expect(json2).toEqual(json);
      expect(json2.displayTitle).toBe('Roundtrip Title');
    });
  });

  describe('project state integrity', () => {
    it('should maintain consistency across multiple operations', () => {
      const status = PanelStatus.create('pending').value!;
      const panel1 = new Panel(PanelId.create('p1').value!, { status });
      const panel2 = new Panel(PanelId.create('p2').value!, { status });

      project.setPanels([panel1]);
      expect(project.getPanels()).toHaveLength(1);

      const newPrompt = ComicPrompt.create('Updated prompt is here').value!;
      project.setPrompt(newPrompt);
      expect(project.getPrompt().equals(newPrompt)).toBe(true);
      expect(project.getPanels()).toHaveLength(1);

      project.setPanels([panel1, panel2]);
      project.setPanelCount(PanelCount.create(2).value!);

      expect(project.getPanels()).toHaveLength(2);
      expect(project.getPanelCount().getValue()).toBe(2);
      expect(project.getPrompt().equals(newPrompt)).toBe(true);
    });

    it('should not allow panel count modifications to affect stored panels', () => {
      const status = PanelStatus.create('pending').value!;
      const panels = [
        new Panel(PanelId.create('p1').value!, { status }),
        new Panel(PanelId.create('p2').value!, { status }),
      ];

      project.setPanels(panels);
      project.setPanelCount(PanelCount.create(5).value!);

      expect(project.getPanels()).toHaveLength(2);
      expect(project.getPanelCount().getValue()).toBe(5);
    });
  });
});
