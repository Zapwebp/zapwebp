'use strict';

/**
 * Pure State Machine for Conversion Workflows
 * Eliminates invalid transition states and UI synchronization bugs.
 */

const initialState = Object.freeze({ status: 'idle' });

/**
 * Reducer function for conversion state machine.
 * @param {object} state - Current state
 * @param {object} event - Incoming event
 * @returns {object} Next immutable state
 */
function reduce(state = initialState, event) {
  if (!event || !event.type) return state;

  switch (event.type) {
    case 'ADD_FILES': {
      const files = Array.isArray(event.files) ? event.files : [];
      if (files.length === 0) return state;
      return {
        status: 'queued',
        files,
      };
    }

    case 'START': {
      if (state.status !== 'queued') return state;
      return {
        status: 'converting',
        files: state.files,
        done: 0,
        total: state.files.length,
        outputs: [],
      };
    }

    case 'PROGRESS': {
      if (state.status !== 'converting') return state;
      return {
        ...state,
        done: Math.min(state.total, Math.max(0, event.done ?? state.done)),
      };
    }

    case 'FILE_DONE': {
      if (state.status !== 'converting') return state;
      const outputs = [...(state.outputs || []), event.output];
      const done = (state.done || 0) + 1;
      if (done >= state.total) {
        return {
          status: 'done',
          outputs,
        };
      }
      return {
        ...state,
        done,
        outputs,
      };
    }

    case 'ALL_DONE': {
      return {
        status: 'done',
        outputs: Array.isArray(event.outputs) ? event.outputs : [],
      };
    }

    case 'FAIL': {
      return {
        status: 'error',
        error: String(event.error || 'Conversion failed.'),
        recoverable: Boolean(event.recoverable ?? true),
      };
    }

    case 'RESET': {
      return initialState;
    }

    default:
      return state;
  }
}

module.exports = {
  initialState,
  reduce,
};
