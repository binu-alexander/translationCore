/**
 * @module Actions/GroupsData
 */
import { batchActions } from 'redux-batched-actions';
import consts from './ActionTypes';
import fs from 'fs-extra';
import path from 'path-extra';
import * as TargetLanguageActions from "./TargetLanguageActions";
import {showSelectionsInvalidatedWarning, validateAllSelectionsForVerse} from "./SelectionsActions";
// consts declaration
const CHECKDATA_DIRECTORY = path.join('.apps', 'translationCore', 'checkData');

/**
 * @description This action adds a groupId as a property to the
 *  groups object and assigns payload as its value.
 * @param {string} groupId - groupId of object ex. figs_metaphor.
 * @param {array} groupsData - array of objects containing group data.
 * @return {object} action object.
 */
export const addGroupData = (groupId, groupsData) => {
  return {
    type: consts.ADD_GROUP_DATA,
    groupId,
    groupsData
  };
};

/**
 * @description verifies that the data in the checkdata folder is reflected in the menu.
 * @return {object} action object.
 */
export function verifyGroupDataMatchesWithFs() {
  return ((dispatch, getState) => {
    let state = getState();
    const PROJECT_SAVE_LOCATION = state.projectDetailsReducer.projectSaveLocation;
    let checkDataPath;
    if (PROJECT_SAVE_LOCATION) {
      checkDataPath = path.join(
        PROJECT_SAVE_LOCATION,
        CHECKDATA_DIRECTORY
      );
    }
    // build the batch
    let actionsBatch = [];
    if (fs.existsSync(checkDataPath)) {
      let folders = fs.readdirSync(checkDataPath).filter(folder => {
        return folder !== ".DS_Store";
      });
      folders.forEach(folderName => {
        let dataPath = generatePathToDataItems(state, PROJECT_SAVE_LOCATION, folderName);
        if(!fs.existsSync(dataPath)) return;

        let chapters = fs.readdirSync(dataPath);
        chapters = filterAndSort(chapters);
        chapters.forEach(chapterFolder => {
          const chapterDir = path.join(dataPath, chapterFolder);
          if(!fs.existsSync(chapterDir)) return;

          let verses = fs.readdirSync(chapterDir);
          verses = filterAndSort(verses);
          verses.forEach(verseFolder => {
            let filePath = path.join(dataPath, chapterFolder, verseFolder);
            let latestObjects = getUniqueObjectsFromFolder(filePath);
            latestObjects.forEach(object => {
              if (object.contextId.tool === state.toolsReducer.currentToolName) {
                let action = toggleGroupDataItems(folderName, object);
                if (action) actionsBatch.push(action);
              }
            });
          });
        });
      });
      // run the batch
      dispatch(batchActions(actionsBatch));
      dispatch(validateBookSelections());
    }
  });
}

/**
 * verifies all the selections for current book to make sure they are still valid
 */
export function validateBookSelections() {
  return ((dispatch, getState) => {
    // iterate through target chapters and validate selections
    const results = {selectionsChanged: false};
    const {projectDetailsReducer} = getState();
    const targetBiblePath = path.join(projectDetailsReducer.projectSaveLocation, projectDetailsReducer.manifest.project.id);
    const files = fs.readdirSync(targetBiblePath);
    for (let file of files) {
      const chapter = parseInt(file); // get chapter number
      if (chapter) {
        dispatch(validateChapterSelections(chapter, results));
      }
    }
    if (results.selectionsChanged) {
      dispatch(showSelectionsInvalidatedWarning());
    }
  });
}

/**
 * verifies all the selections for chapter to make sure they are still valid
 * @param {String} chapter
 * @param {Object} results - for keeping track if any selections have been reset.
 */
function validateChapterSelections(chapter, results) {
  return ((dispatch, getState) => {
    let changed = results.selectionsChanged; // save initial state
    dispatch(TargetLanguageActions.loadTargetLanguageChapter(chapter));
    const state = getState();
    if (state.resourcesReducer && state.resourcesReducer.bibles && state.resourcesReducer.bibles.targetLanguage && state.resourcesReducer.bibles.targetLanguage.targetBible) {
      const bibleChapter = state.resourcesReducer.bibles.targetLanguage.targetBible[chapter];
      if (bibleChapter) {
        for (let verse of Object.keys(bibleChapter)) {
          const verseText = bibleChapter[verse];
          const contextId = {
            reference: {
              bookId: state.projectInformationCheckReducer.bookId,
              chapter: parseInt(chapter),
              verse: parseInt(verse)
            }
          };
          results.selectionsChanged = false;
          dispatch(validateAllSelectionsForVerse(verseText, results, false, contextId));
          changed = changed || results.selectionsChanged;
        }
      }
    }
    results.selectionsChanged = changed;
  });
}

/**
 * @description generates a path to a check data item.
 * @param {object} state - redux store state.
 * @param {string} PROJECT_SAVE_LOCATION - project path/directory.
 * @param {string} checkDataName - comments, reminders, selections and verseEdits folders.
 * @return {string} path/directory to be use to load a file.
 */
function generatePathToDataItems(state, PROJECT_SAVE_LOCATION, checkDataName) {
  if (PROJECT_SAVE_LOCATION && state) {
    let bookAbbreviation = state.projectDetailsReducer.manifest.project.id;
    let loadPath = path.join(
      PROJECT_SAVE_LOCATION,
      CHECKDATA_DIRECTORY,
      checkDataName,
      bookAbbreviation
    );
    return loadPath;
  }
}
/**
 * @description filters and sorts an array.
 * @param {array} array - array to be filtered and sorted.
 * @return {array} filtered and sorted array.
 */
function filterAndSort(array) {
  let filteredArray = array.filter(folder => {
    return folder !== ".DS_Store";
  }).sort((a, b) => {
    a = parseInt(a, 10);
    b = parseInt(b, 10);
    return a - b;
  });
  return filteredArray;
}
/**
 * @description gets the objects with the latest timestamp and a unique groupID.
 * @param {string} loadPath - path or directory where check data is saved.
 * @return {array} array of check data objects with latest timestamp and a unique groupID.
 */
function getUniqueObjectsFromFolder(loadPath) {
  if(!fs.existsSync(loadPath)) return [];
  let files = fs.readdirSync(loadPath);
  let uniqueCheckDataObjects = [];

  files = files.filter(file => { // filter the filenames to only use .json
    return path.extname(file) === '.json';
  });

  let sorted = files.sort().reverse(); // sort the files to use latest
  let checkDataObjects = sorted.map(file => {
    // get the json of all files
    try {
      let readPath = path.join(loadPath, file);
      let _checkDataObject = fs.readJsonSync(readPath);
      return _checkDataObject;
    } catch (err) {
      console.warn('File exists but could not be loaded \n', err);
      return undefined;
    }
  });

  checkDataObjects.forEach(element => {
    let checkDataObjectsWithSameGroupId = checkDataObjects.filter(_checkDataObject => {
      // filter the checkDataObjects to unique grouId array
      let keep = _checkDataObject.contextId.groupId === element.contextId.groupId && !contains(_checkDataObject, uniqueCheckDataObjects);
      return keep;
    });
    if (checkDataObjectsWithSameGroupId[0]) {
      // return the first one since it is the latest modified one
      uniqueCheckDataObjects.push(checkDataObjectsWithSameGroupId[0]);
    }
    // filter out all checkDataObjects that are already in checkDataObjectsWithSameGroupId.
    checkDataObjects = checkDataObjects.filter(_checkDataObject => {
      return _checkDataObject.contextId.groupId !== element.contextId.groupId;
    });
    // clearing checkDataObjectsWithSameGroupId in order to reuse it for next checkdata object
    checkDataObjectsWithSameGroupId = [];
  });
  return uniqueCheckDataObjects;
}
/**
 * @description returns boolean indicating if object was found in the array (arrayToBeChecked).
 * @param {object} object - obect to check if is included in array.
 * @param {array} arrayToBeChecked - array compare against if object is included.
 * @return {boolean} - true/false: is it included or not.
 */
function contains(object, arrayToBeChecked) {
  let included = arrayToBeChecked.indexOf(object);
  return included >= 0 ? true : false;
}

/**
 * @description dispatches appropiate action based on label string.
 * @param {string} label - string to be use to determine which action to dispatch.
 * @param {object} fileObject - checkdata object.
 * @param {function} dispatch - redux action dispatcher.
 */
function toggleGroupDataItems(label, fileObject) {
  let action;
  switch (label) {
    case "comments":
      action = {
        type: consts.TOGGLE_COMMENTS_IN_GROUPDATA,
        contextId: fileObject.contextId,
        text: fileObject.text
      };
      break;
    case "reminders":
      action = {
        type: consts.SET_REMINDERS_IN_GROUPDATA,
        contextId: fileObject.contextId,
        boolean: fileObject.enabled
      };
      break;
    case "selections":
      action = {
        type: consts.TOGGLE_SELECTIONS_IN_GROUPDATA,
        contextId: fileObject.contextId,
        selections: fileObject.selections
      };
      break;
    case "verseEdits":
      action = {
        type: consts.TOGGLE_VERSE_EDITS_IN_GROUPDATA,
        contextId: fileObject.contextId
      };
      break;
    case "invalidated":
      action = {
        type: consts.SET_INVALIDATION_IN_GROUPDATA,
        contextId: fileObject.contextId,
        boolean: fileObject.invalidated
      };
      break;
    default:
      action = null;
      console.warn("Undefined label in toggleGroupDataItems switch");
      break;
  }
  return action;
}
