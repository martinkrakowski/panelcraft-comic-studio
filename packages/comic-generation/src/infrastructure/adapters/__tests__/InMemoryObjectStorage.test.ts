import { describe } from 'vitest';
import { InMemoryObjectStorage } from '../InMemoryObjectStorage';
import { objectStorageContractTests } from './objectStorageContract';

describe('InMemoryObjectStorage', () => {
  objectStorageContractTests('contract', () => new InMemoryObjectStorage(), {
    paginationCount: 3,
  });
});
