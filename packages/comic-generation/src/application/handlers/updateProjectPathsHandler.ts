import {
  Character,
  CharacterBible,
} from '@panelcraft/comic-project-management';
import { NotFoundError } from '@panelcraft/shared';
import type { RelationalDbPort } from '../ports/out/relational-db.out-port.js';

interface UpdateProjectPathsDeps {
  projectRepo: RelationalDbPort;
}

export async function updateProjectPaths(
  projectId: string,
  paths: { referenceImagePaths?: string[]; moodBoardImagePaths?: string[] },
  deps: UpdateProjectPathsDeps
): Promise<void> {
  const { referenceImagePaths, moodBoardImagePaths } = paths;
  const project = await deps.projectRepo.load(projectId);
  if (!project) {
    throw new NotFoundError(`Project ${projectId} not found`, projectId);
  }

  if (referenceImagePaths) {
    const bible = project.getCharacterBible();
    if (bible) {
      const characters = bible.getCharacters();
      const updatedCharacters = characters.map((char, index) => {
        if (referenceImagePaths[index]) {
          const charValue = char.getValue();
          const updatedCharResult = Character.create({
            ...charValue,
            referenceImage: referenceImagePaths[index],
          });
          if (updatedCharResult.success) {
            return updatedCharResult.value!;
          }
        }
        return char;
      });

      const newBibleResult = CharacterBible.create({
        characters: updatedCharacters,
      });
      if (newBibleResult.success) {
        project.setCharacterBible(newBibleResult.value!);
      }
    }
  }

  if (moodBoardImagePaths) {
    const styleRefs = project.getStyleReferences();
    if (styleRefs) {
      project.setStyleReferences({
        ...styleRefs,
        moodBoardImages: moodBoardImagePaths,
      });
    }
  }

  await deps.projectRepo.save(project);
}
