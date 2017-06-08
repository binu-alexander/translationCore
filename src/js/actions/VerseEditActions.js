import consts from './ActionTypes';
// helpers
import {generateTimestamp} from '../helpers/index';
import {editTargetVerseSource} from '../helpers/editTargetVerseSource';

/**
 * @description This action updates or adds the data needed to
 * @param {string} before - Previous text version of the verse.
 * @param {string} after - New edited text version of the verse.
 * @param {array} tags - Array of tags used for verse Edit check boxes.
 * @param {string} userName - Alias name.
 * @return {object} New state for verse Edit reducer.
 */
export const addVerseEdit = (before, after, tags, userName) => {
  return ((dispatch, getState) => {
    let state = getState()
    let contextId = state.contextIdReducer.contextId
    dispatch({
      type: consts.ADD_VERSE_EDIT,
      before,
      after,
      tags,
      userName,
      modifiedTimestamp: generateTimestamp()
    });
    editTargetVerseSource(state, after);
    dispatch(editTargetVerseInBiblesReducer(after));
    dispatch({
      type: consts.TOGGLE_VERSE_EDITS_IN_GROUPDATA,
      contextId
    });
  });
};

/**
 * @description dispatches an action that updates the a verse for the target
 * language bible in  the reosurces reducer.
 * @param {string} editedText - new edited version of the verse.
 * @return {object} action object to be handle by the reducer.
 */
export function editTargetVerseInBiblesReducer(editedText) {
  return ((dispatch, getState) => {
    let {contextIdReducer} = getState()
    let {chapter, verse} = contextIdReducer.contextId.reference
    dispatch({
      type: consts.UPDATE_EDITED_TARGET_VERSE,
      editedText,
      chapter,
      verse
    });
  });
}
