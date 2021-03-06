/**
 * @module Actions/CSVExport
 */

import consts from './ActionTypes';
import fs from 'fs-extra';
import path from 'path-extra';
import ospath from 'ospath';
import zipFolder from 'zip-folder';
import { ipcRenderer } from 'electron';
import {getTranslate} from '../selectors';
// actions
import * as AlertModalActions from './AlertModalActions';
import * as BodyUIActions from './BodyUIActions';
import * as MergeConflictActions from '../actions/MergeConflictActions';
import * as ProjectImportStepperActions from '../actions/ProjectImportStepperActions';
// helpers
import * as csvHelpers from '../helpers/csvHelpers';
import * as LoadHelpers from '../helpers/LoadHelpers';
import * as groupsIndexHelpers from '../helpers/groupsIndexHelpers';

/**
 * @description - Wrapper function to handle exporting to CSV
 * @param {string} projectPath - Path to current project
 */
export function exportToCSV(projectPath) {
  return ((dispatch, getState) => {
    const translate = getTranslate(getState());
    let manifest = LoadHelpers.loadFile(projectPath, 'manifest.json');
    dispatch(MergeConflictActions.validate(projectPath, manifest));
    const { conflicts } = getState().mergeConflictReducer;
    if (conflicts) {
      dispatch(ProjectImportStepperActions.cancelProjectValidationStepper());
      return dispatch(AlertModalActions.openAlertDialog(translate('projects.merge_export_error')));
    }
    dispatch(BodyUIActions.dimScreen(true));
    setTimeout(() => {
      // generate default paths
      const csvSaveLocation = getState().settingsReducer.csvSaveLocation;
      const projectName = projectPath.split(path.sep).pop();
      let defaultPath = getDefaultPath(csvSaveLocation, projectName);
      // prompt user for save location
      const filters = [{ name: translate('projects.zip_files'), extensions: ['zip'] }];
      const title = translate('projects.save_as');
      const options = { defaultPath: defaultPath, filters: filters, title: title };
      let filePath = ipcRenderer.sendSync('save-as', { options: options });
      if (!filePath) {
        return dispatch(BodyUIActions.dimScreen(false));
      } else {
        dispatch({
          type: consts.SET_CSV_SAVE_LOCATION,
          csvSaveLocation: filePath.split(projectName)[0]
        });
      }
      dispatch(BodyUIActions.dimScreen(false));
      // show loading dialog
      let message = translate('projects.exporting_file_alert', {file_name: projectName});
      dispatch(AlertModalActions.openAlertDialog(message, true));
      // export the csv and zip it
      exportToCSVZip(projectPath, filePath)
        .then(() => {
          message = translate('projects.exported_alert', {project_name: projectName, file_path:filePath});
          dispatch(AlertModalActions.openAlertDialog(message, false));
        })
        .catch((err) => {
          message = translate('projects.export_failed_error', {error: err});
          dispatch(AlertModalActions.openAlertDialog(message, false));
        });
    }, 200);
  });
}
/**
 * @description - Get the default path for the OS
 * @param {string} csvSaveLocation - Path to CSV location
 * @param {string} projectName - Name of the current project
 */
export const getDefaultPath = (csvSaveLocation, projectName) => {
  let defaultPath;
  const OSX_DOCUMENTS_PATH = path.join(ospath.home(), 'Documents');
  const WIN_DOCUMENTS_PATH = path.join(ospath.home(), 'My Documents');
  if (csvSaveLocation) {
    defaultPath = path.join(csvSaveLocation, projectName + '.zip');
  }
  else if (fs.existsSync(OSX_DOCUMENTS_PATH)) {
    defaultPath = path.join(OSX_DOCUMENTS_PATH, projectName + '.zip');
  } else if (fs.existsSync(WIN_DOCUMENTS_PATH)) {
    defaultPath = path.join(WIN_DOCUMENTS_PATH, projectName + '.zip');
  }
  else {
    defaultPath = path.join(ospath.home(), projectName + '.zip');
  }
  return defaultPath;
};
/**
 * @description - Chain of saving csv data then zipping it up and saving
 * @param {string} projectPath - Path to current project
 * @param {string} filePath - Path to save the zip file
 */
export const exportToCSVZip = (projectPath, filePath) => {
  return new Promise((resolve, reject) => {
    Promise.resolve(true)
      .then(() => saveAllCSVData(projectPath))
      .then(() => zipCSVData(projectPath, filePath))
      .then(() => {
        csvHelpers.cleanupTmpPath(projectPath);
        resolve(true);
      })
      .catch((err) => {
        csvHelpers.cleanupTmpPath(projectPath);
        reject(err);
      });
  });
};
/**
 * @description - Zip all of the csv files and save ot filePath
 * @param {string} projectPath - path of the project
 * @param {string} filePath - Path to save the zip file
 */
export const zipCSVData = (projectPath, filePath) => {
  return new Promise((resolve, reject) => {
    const _tmpPath = csvHelpers.tmpPath(projectPath);
    zipFolder(_tmpPath, filePath, (err) => {
      if (err) {
        reject("Could not create zip file.");
      } else {
        resolve(true);
      }
    });
  });
};
/**
 * @description - Chain of saving all csv data
 * @param {string} projectPath - Path to current project
 */
export const saveAllCSVData = (projectPath) => {
  return new Promise((resolve, reject) => {
    const toolNames = csvHelpers.getToolFolderNames(projectPath);
    if (!toolNames || !toolNames.length) {
      throw 'No tools have loaded for this project.';
    }
    let iterablePromises = [];
    toolNames.forEach((toolName) => {
      const p = new Promise((_resolve) => {
        return saveToolDataToCSV(toolName, projectPath)
          .then(_resolve);
      });
      iterablePromises.push(p);
    });
    Promise.all(iterablePromises)
      .then(() => saveVerseEditsToCSV(projectPath))
      .then(() => saveRemindersToCSV(projectPath))
      .then(() => saveCommentsToCSV(projectPath))
      .then(() => saveSelectionsToCSV(projectPath))
      .then(resolve)
      .catch(reject);
  });
};
/**
 * @ description - Saves teh Tool data to csv
 * @param {string} toolName - current tool name
 * @param {string} projectPath - path of the project
 */
export const saveToolDataToCSV = (toolName, projectPath) => {
  return new Promise((resolve, reject) => {
    loadGroupsData(toolName, projectPath)
      .then((object) => saveGroupsToCSV(object, toolName, projectPath))
      .then(() => {
        resolve(true);
      })
      .catch(err => {
        const message = "Problem saving data for tool: " + toolName + "\n Error:" + err;
        reject(message);
      });
  });
};

/**
 * @description - Loads the Groups Data for a tool
 * @param {string} toolName - name of the tool being saved i.e. translationNotes
 * @param {string} projectPath - path of the project
 */
export function loadGroupsData(toolName, projectPath) {
  return new Promise((resolve) => {
    const dataPath = csvHelpers.dataPath(projectPath);
    const projectId = csvHelpers.getProjectId(projectPath);
    const groupsDataFolderPath = path.join(dataPath, 'index', toolName, projectId);
    if (fs.existsSync(groupsDataFolderPath)) {
      const groupDataFiles = fs.readdirSync(groupsDataFolderPath)
        .filter(file => { return path.extname(file) === '.json' });
      let groupsData = {};
      groupDataFiles.forEach(groupDataFile => {
        const groupId = groupDataFile.split('.')[0];
        const groupDataPath = path.join(groupsDataFolderPath, groupDataFile);
        const groupData = fs.readJsonSync(groupDataPath);
        groupsData[groupId] = groupData;
      });
      resolve(groupsData);
    } else {
      const err = 'Group Data path does not exist: ' + groupsDataFolderPath;
      console.warn(err);
      // In case of Autographa or testing tools, just move on...
      resolve(true);
    }
  });
}
/**
 * @description - Creates csv from object and saves it.
 * @param {object} obj - object to save to the filesystem
 * @param {string} projectPath - path of the project
 * @param {string} toolName - name of the tool being saved i.e. translationNotes
 */
export const saveGroupsToCSV = (obj, toolName, projectPath) => {
  return new Promise((resolve, reject) => {
    let objectArray = [];
    try {
      const groupNames = Object.keys(obj);
      groupNames.forEach(groupName => {
        obj[groupName].forEach(groupData => {
          const object = groupData;
          const data = {priority: object.priority};
          const flatContextId = csvHelpers.flattenContextId(object.contextId);
          const newObject = Object.assign({}, data, flatContextId);
          objectArray.push(newObject);
        });
      });
      const dataPath = csvHelpers.dataPath(projectPath);
      const filePath = path.join(dataPath, 'output', toolName +
        '_CheckInformation.csv');

      csvHelpers.generateCSVFile(objectArray, filePath)
        .then(() => {
          return resolve(true);
        })
        .catch((err) => {
          console.log('saveGroupsToCSV: ', err);
          reject(err);
        });
    } catch(e) {
      reject(e);
    }
  });
};
/**
 * Creates csv from object and saves it.
 * @param {String} projectPath - path of the project
 */
export const saveVerseEditsToCSV = (projectPath) => {
  return new Promise((resolve, reject) => {
    loadProjectDataByType(projectPath, 'verseEdits')
      .then((array) => {
        const objectArray = array.map(data => {
          const groupsIndex = csvHelpers.getGroupsIndexForCsvExport(data);
          const groupName = groupsIndexHelpers.getGroupFromGroupsIndex(groupsIndex, data.contextId.groupId) ?
            groupsIndexHelpers.getGroupFromGroupsIndex(groupsIndex, data.contextId.groupId).name : '';
          const gatewayLanguageQuote = data.gatewayLanguageQuote ? data.gatewayLanguageQuote : groupName;
          const _data = {
            after: data.verseAfter,
            before: data.verseBefore,
            tags: data.tags,
            activeBook: data.activeBook,
            activeChapter: data.activeChapter,
            activeVerse: data.activeVerse,
            'gateway Language Code': data.gatewayLanguageCode || 'en',
            'gateway Language Quote': gatewayLanguageQuote
          };
          return csvHelpers.combineData(_data, data.contextId, data.userName, data.modifiedTimestamp, true);
        });
        const dataPath = csvHelpers.dataPath(projectPath);
        const filePath = path.join(dataPath, 'output', 'VerseEdits.csv');
        csvHelpers.generateCSVFile(objectArray, filePath).then(() => {
          resolve(true);
        });
      })
      .catch(reject);
  });
};
/**
 * Creates csv from object and saves it.
 * @param {String} projectPath - path of the project
 */
export const saveCommentsToCSV = (projectPath) => {
  return new Promise((resolve) => {
    loadProjectDataByType(projectPath, 'comments')
      .then((array) => {
        const objectArray = array.map(data => {
          const groupsIndex = csvHelpers.getGroupsIndexForCsvExport(data);
          const groupName = groupsIndexHelpers.getGroupFromGroupsIndex(groupsIndex, data.contextId.groupId) ?
            groupsIndexHelpers.getGroupFromGroupsIndex(groupsIndex, data.contextId.groupId).name : '';
          const gatewayLanguageQuote = data.gatewayLanguageQuote ? data.gatewayLanguageQuote : groupName;
          const _data = {
            text: data.text,
            activeBook: data.activeBook,
            activeChapter: data.activeChapter,
            activeVerse: data.activeVerse,
            'gateway Language Code': data.gatewayLanguageCode || 'en',
            'gateway Language Quote': gatewayLanguageQuote
          };
          return csvHelpers.combineData(_data, data.contextId, data.userName, data.modifiedTimestamp);
        });
        const dataPath = csvHelpers.dataPath(projectPath);
        const filePath = path.join(dataPath, 'output', 'Comments.csv');
        csvHelpers.generateCSVFile(objectArray, filePath)
          .then(resolve);
      });
  });
};
/**
 * Creates csv from object and saves it.
 * @param {String} projectPath - path of the project
 */
export const saveSelectionsToCSV = (projectPath) => {
  return new Promise((resolve, reject) => {
    loadProjectDataByType(projectPath, 'selections')
      .then((array) => {
        const objectArray = [];
        array.forEach(data => {
          const groupsIndex = csvHelpers.getGroupsIndexForCsvExport(data);
          const groupName = groupsIndexHelpers.getGroupFromGroupsIndex(groupsIndex, data.contextId.groupId) ?
            groupsIndexHelpers.getGroupFromGroupsIndex(groupsIndex, data.contextId.groupId).name : '';
          const gatewayLanguageQuote = data.gatewayLanguageQuote ? data.gatewayLanguageQuote : groupName;
          data.selections.forEach(selection => {
            const _data = {
              text: selection.text,
              'selection/occurrence': selection.occurrence,
              'selection/occurrences': selection.occurrences,
              'gateway Language Code': data.gatewayLanguageCode || 'en',
              'gateway Language Quote': gatewayLanguageQuote
            };
            const newObject = csvHelpers.combineData(_data, data.contextId, data.userName, data.modifiedTimestamp);
            objectArray.push(newObject);
          });
        });
        const dataPath = csvHelpers.dataPath(projectPath);
        const filePath = path.join(dataPath, 'output', 'Selections.csv');
        csvHelpers.generateCSVFile(objectArray, filePath).then(() => {
          resolve(true);
        });
      })
      .catch(reject);
  });
};
/**
 * Creates csv from object and saves it.
 * @param {String} projectPath - path of the project
 */
export const saveRemindersToCSV = (projectPath) => {
  return new Promise((resolve, reject) => {
    loadProjectDataByType(projectPath, 'reminders')
      .then((array) => {
        const objectArray = array.map(data => {
          const groupsIndex = csvHelpers.getGroupsIndexForCsvExport(data);
          const groupName = groupsIndexHelpers.getGroupFromGroupsIndex(groupsIndex, data.contextId.groupId) ?
            groupsIndexHelpers.getGroupFromGroupsIndex(groupsIndex, data.contextId.groupId).name : '';
          const gatewayLanguageQuote = data.gatewayLanguageQuote ? data.gatewayLanguageQuote : groupName;
          const _data = {
            enabled: data.enabled,
            'gateway Language Code': data.gatewayLanguageCode || 'en',
            'gateway Language Quote': gatewayLanguageQuote
          };
          return csvHelpers.combineData(_data, data.contextId, data.userName, data.modifiedTimestamp);
        });
        const dataPath = csvHelpers.dataPath(projectPath);
        const filePath = path.join(dataPath, 'output', 'Reminders.csv');
        csvHelpers.generateCSVFile(objectArray, filePath).then(() => {
          resolve(true);
        });
      })
      .catch(reject);
  });
};

export function loadProjectDataByType(projectPath, type) {
  return new Promise((resolve, reject) => {
    let checkDataArray = [];
    const dataPath = csvHelpers.dataPath(projectPath);
    const projectId = csvHelpers.getProjectId(projectPath);
    const chaptersPath = path.join(dataPath, 'checkData', type, projectId);
    if (fs.existsSync(chaptersPath)) {
      const chapters = fs.readdirSync(chaptersPath)
        .filter(file => { return fs.lstatSync(path.join(chaptersPath, file)).isDirectory() });
      chapters.forEach(chapter => {
        if (!parseInt(chapter)) return;
        const chapterPath = path.join(chaptersPath, chapter);
        const verses = fs.readdirSync(chapterPath)
          .filter(file => { return fs.lstatSync(path.join(chapterPath, file)).isDirectory() });
        verses.forEach(verse => {
          if (!parseInt(verse)) return;
          const versePath = path.join(chapterPath, verse);
          const dataFiles = fs.readdirSync(versePath)
            .filter(file => { return path.extname(file) == '.json' });
          dataFiles.forEach(dataFile => {
            const dataPath = path.join(versePath, dataFile);
            try {
              const data = fs.readJsonSync(dataPath);
              data.userName = data.userName || "Anonymous";
              checkDataArray.push(data);
            } catch (err) {
              console.log('loadProjectDataByType(projectPath, type) ', projectPath, type);
              console.log('Problem reading json file: ', dataPath);
              reject(err);
            }
          });
        });
      });
    }
    resolve(checkDataArray);
  });
}
