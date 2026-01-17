import 'fake-indexeddb/auto'
import {
  loadState,
  saveState,
  clearStorage,
  openDatabase,
  STATE_OBJECT_STORE_NAME,
} from '../../persistence/storage'
import { createInitialState } from '../../src/domain/state'
import type { PlanningBaseState } from '../../src/domain/types'
import { IDBPDatabase } from 'idb'

// Mock createInitialState
jest.mock('../../src/domain/state', () => ({
  createInitialState: jest.fn(() => ({
    representatives: [
      {
        id: 'rep-1',
        name: 'Ana García',
        baseSchedule: {
          0: 'OFF',
          1: 'WORKING',
          2: 'WORKING',
          3: 'WORKING',
          4: 'WORKING',
          5: 'WORKING',
          6: 'WORKING',
        },
        baseShift: 'DAY',
      },
      {
        id: 'rep-2',
        name: 'Carlos López',
        baseSchedule: {
          0: 'WORKING',
          1: 'OFF',
          2: 'WORKING',
          3: 'WORKING',
          4: 'WORKING',
          5: 'WORKING',
          6: 'WORKING',
        },
        baseShift: 'DAY',
      },
      {
        id: 'rep-3',
        name: 'Beatriz Martín',
        baseSchedule: {
          0: 'WORKING',
          1: 'WORKING',
          2: 'OFF',
          3: 'WORKING',
          4: 'WORKING',
          5: 'WORKING',
          6: 'WORKING',
        },
        baseShift: 'DAY',
      },
    ],
    incidents: [],
    swaps: [],
    auditLog: [],
    historyEvents: [],
    calendar: { specialDays: [] },
    coverageRules: [
      { id: 'global-day', scope: { type: 'SHIFT', shift: 'DAY' }, required: 10 },
      {
        id: 'global-night',
        scope: { type: 'SHIFT', shift: 'NIGHT' },
        required: 6,
      },
    ],
    version: 7,
  })),
}))

describe('persistence/storage', () => {
  let db: IDBPDatabase

  beforeEach(async () => {
    // Clear IndexedDB and localStorage before each test
    db = await openDatabase()
    if (db.objectStoreNames.contains(STATE_OBJECT_STORE_NAME)) {
      await db.clear(STATE_OBJECT_STORE_NAME)
    }

    localStorage.clear()
    jest.clearAllMocks()
  })

  afterEach(() => {
    db.close()
  })

  describe('loadState', () => {
    it('should return and persist createInitialState when database is empty', async () => {
      const state = await loadState()

      expect(createInitialState).toHaveBeenCalled()
      expect(state.representatives).toHaveLength(3)
      expect(
        state.coverageRules.find(
          r => r.scope.type === 'SHIFT' && r.scope.shift === 'DAY'
        )?.required
      ).toBe(10)

      // Verify it was persisted by loading again without mocking
      const reloadedState = await loadState()
      expect(createInitialState).toHaveBeenCalledTimes(1) // Should not be called again
      expect(reloadedState.representatives).toEqual(state.representatives)
    })

    it('should discard legacy localStorage data and create initial state', async () => {
      // Set up legacy localStorage data
      const legacyData = {
        representatives: [
          { id: 'rep-legacy', name: 'Legacy Rep', baseShift: 'DAY', fixedDayOff: 0 },
        ],
        incidents: [],
        version: 1,
      }

      localStorage.setItem(
        'control-puntos:v1',
        JSON.stringify({ version: 1, data: legacyData })
      )

      // Load state - should trigger migration (which now just discards)
      const state = await loadState()

      // Verify initial state was created
      expect(createInitialState).toHaveBeenCalled()
      expect(state.representatives[0].id).toBe('rep-1')

      // Verify localStorage key was removed
      expect(localStorage.getItem('control-puntos:v1')).toBeNull()

      // Verify next load uses the persisted initial state
      await jest.isolateModulesAsync(async () => {
        const nextLoad = await loadState()
        expect(createInitialState).toHaveBeenCalledTimes(1) // Not called again
        expect(nextLoad.representatives[0].id).toBe('rep-1')
      })
    })

    it('should add incidents array to state if it is missing', async () => {
      const stateWithoutIncidents: Omit<PlanningBaseState, 'incidents'> & {
        version: number
      } = {
        representatives: [],
        calendar: { specialDays: [] },
        coverageRules: [],
        version: 7,
        swaps: [],
        auditLog: [],
        historyEvents: [],
      }
      const db = await openDatabase()
      await db.put(
        STATE_OBJECT_STORE_NAME,
        stateWithoutIncidents,
        'singleton'
      )

      const loadedState = await loadState()
      expect(loadedState.incidents).toBeInstanceOf(Array)
      expect(loadedState.incidents).toHaveLength(0)
    })
  })

  describe('saveState and reload', () => {
    it('should persist state to IndexedDB and reload it', async () => {
      const testState: PlanningBaseState = {
        representatives: [
          {
            id: 'rep-test',
            name: 'Test Rep',
            baseSchedule: {
              0: 'OFF',
              1: 'WORKING',
              2: 'WORKING',
              3: 'WORKING',
              4: 'WORKING',
              5: 'WORKING',
              6: 'WORKING',
            },
            baseShift: 'NIGHT',
          },
        ],
        incidents: [
          {
            id: 'inc-test',
            representativeId: 'rep-test',
            startDate: '2024-12-28',
            type: 'LICENCIA',
            duration: 1,
            createdAt: '2024-12-28T09:00:00Z',
          },
        ],
        swaps: [],
        auditLog: [],
        historyEvents: [],
        calendar: {
          specialDays: [
            { date: '2024-12-25', kind: 'HOLIDAY', label: 'Navidad' },
          ],
        },
        coverageRules: [
          {
            id: 'global-day',
            scope: { type: 'SHIFT', shift: 'DAY' },
            required: 10,
          },
          {
            id: 'global-night',
            scope: { type: 'SHIFT', shift: 'NIGHT' },
            required: 5,
          },
        ],
        version: 7,
      }

      // Save state
      await saveState(testState)

      // Load it back
      const loadedState = await loadState()

      expect(loadedState.representatives).toHaveLength(1)
      expect(loadedState.representatives![0].id).toBe('rep-test')
      expect(loadedState.incidents).toHaveLength(1)
      expect(loadedState.incidents![0].id).toBe('inc-test')
      expect(loadedState.calendar.specialDays).toHaveLength(1)
      const nightRule = loadedState.coverageRules.find(
        r => r.scope.type === 'SHIFT' && r.scope.shift === 'NIGHT'
      )
      expect(nightRule?.required).toBe(5)
    })

    it('should not mutate the original state when saving', async () => {
      const originalState: PlanningBaseState = {
        representatives: [
          {
            id: 'rep-1',
            name: 'Rep One',
            baseSchedule: {
              0: 'OFF',
              1: 'WORKING',
              2: 'WORKING',
              3: 'WORKING',
              4: 'WORKING',
              5: 'WORKING',
              6: 'WORKING',
            },
            baseShift: 'DAY',
          },
        ],
        incidents: [],
        swaps: [],
        auditLog: [],
        historyEvents: [],
        calendar: { specialDays: [] },
        coverageRules: [],
        version: 7,
      }

      await saveState(originalState)

      // Modify the original
      originalState.representatives.push({
        id: 'rep-2',
        name: 'Rep Two',
        baseSchedule: {
          0: 'OFF',
          1: 'WORKING',
          2: 'WORKING',
          3: 'WORKING',
          4: 'WORKING',
          5: 'WORKING',
          6: 'WORKING',
        },
        baseShift: 'DAY',
      })

      // Load from storage
      const loadedState = await loadState()

      // Should not have the modification
      expect(loadedState.representatives).toHaveLength(1)
    })
  })

  describe('clearStorage', () => {
    it('should clear all data and return initial state on next load', async () => {
      // Save some data
      const testState: PlanningBaseState = {
        representatives: [
          {
            id: 'rep-1',
            name: 'Rep One',
            baseSchedule: {
              0: 'OFF',
              1: 'WORKING',
              2: 'WORKING',
              3: 'WORKING',
              4: 'WORKING',
              5: 'WORKING',
              6: 'WORKING',
            },
            baseShift: 'DAY',
          },
        ],
        incidents: [
          {
            id: 'inc-1',
            representativeId: 'rep-1',
            type: 'LICENCIA',
            startDate: '2024-12-28',
            duration: 1,
            createdAt: '2024-12-28T09:00:00Z',
          },
        ],
        swaps: [],
        auditLog: [],
        historyEvents: [],
        calendar: { specialDays: [] },
        coverageRules: [
          { id: 'test-rule', scope: { type: 'GLOBAL' }, required: 1 },
        ],
        version: 7,
      }

      await saveState(testState)

      // Clear storage
      await clearStorage()

      // Load again - should return initial state
      const state = await loadState()
      expect(state.incidents).toHaveLength(0) // Initial incidents are now empty in the mock
      const dayRule = state.coverageRules.find(
        r => r.scope.type === 'SHIFT' && r.scope.shift === 'DAY'
      )
      expect(dayRule?.required).toBe(10) // Back to default
      expect(createInitialState).toHaveBeenCalled()
    })
  })
})
