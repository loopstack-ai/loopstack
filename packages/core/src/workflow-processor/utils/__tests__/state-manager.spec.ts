import { StateManager } from '../state/state-manager';

describe('StateManager - Data Isolation', () => {
  describe('getData returns copies', () => {
    it('should return a copy of object values', () => {
      const manager = new StateManager(undefined, { tools: { transition1: { data: 'result' } } }, null);

      const tools1 = manager.getData('tools');
      const tools2 = manager.getData('tools');

      expect(tools1).toEqual(tools2);
      expect(tools1).not.toBe(tools2);
    });

    it('should return a copy of array values', () => {
      const manager = new StateManager(undefined, { documents: [{ id: '1' }, { id: '2' }] }, null);

      const docs1 = manager.getData('documents');
      const docs2 = manager.getData('documents');

      expect(docs1).toEqual(docs2);
      expect(docs1).not.toBe(docs2);
    });

    it('should not allow mutation of internal state via returned reference', () => {
      const manager = new StateManager(undefined, { tools: { transition1: { data: 'original' } } }, null);

      const tools = manager.getData('tools') as Record<string, any>;
      tools.transition1.data = 'mutated';

      expect(manager.getData('tools')).toEqual({
        transition1: { data: 'original' },
      });
    });

    it('should not allow mutation of internal arrays via returned reference', () => {
      const manager = new StateManager(undefined, { documents: [{ id: '1' }] }, null);

      const docs = manager.getData('documents') as any[];
      docs.push({ id: '2' });

      expect(manager.getData('documents')).toEqual([{ id: '1' }]);
    });

    it('should return primitives directly', () => {
      const manager = new StateManager(undefined, { place: 'start', hasError: false, count: 42 }, null);

      expect(manager.getData('place')).toBe('start');
      expect(manager.getData('hasError')).toBe(false);
      expect(manager.getData('count')).toBe(42);
    });

    it('should return null directly', () => {
      const manager = new StateManager(undefined, { result: null }, null);

      expect(manager.getData('result')).toBeNull();
    });
  });

  describe('setData persists correctly', () => {
    it('should persist changes via setData after getting a copy', () => {
      const manager = new StateManager(undefined, { tools: {} }, null);

      const tools = manager.getData('tools') as Record<string, any>;
      tools.newTransition = { data: 'result' };
      manager.setData('tools', tools);

      expect(manager.getData('tools')).toEqual({
        newTransition: { data: 'result' },
      });
    });
  });

  describe('concurrent state managers are independent', () => {
    it('should not share state between two StateManager instances', () => {
      const managerA = new StateManager(undefined, { tools: {}, place: 'start' }, null);
      const managerB = new StateManager(undefined, { tools: {}, place: 'start' }, null);

      managerA.setData('place', 'end');
      managerA.setData('tools', { t1: { data: 'A' } });

      managerB.setData('place', 'middle');
      managerB.setData('tools', { t1: { data: 'B' } });

      expect(managerA.getData('place')).toBe('end');
      expect(managerA.getData('tools')).toEqual({ t1: { data: 'A' } });

      expect(managerB.getData('place')).toBe('middle');
      expect(managerB.getData('tools')).toEqual({ t1: { data: 'B' } });
    });
  });
});
