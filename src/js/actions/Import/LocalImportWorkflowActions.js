import React from 'react';
import path from 'path-extra';
import ospath from 'ospath';
import {ipcRenderer} from 'electron';
import consts from '../ActionTypes';
// actions
import * as BodyUIActions from '../BodyUIActions';
import * as AlertModalActions from '../AlertModalActions';
import * as ProjectValidationActions from '../Import/ProjectValidationActions';
import * as ProjectImportFilesystemActions from './ProjectImportFilesystemActions';
import * as ProjectImportStepperActions from '../ProjectImportStepperActions';
import * as MyProjectsActions from '../MyProjects/MyProjectsActions';
import * as ProjectLoadingActions from '../MyProjects/ProjectLoadingActions';
import * as ProjectDetailsActions from "../ProjectDetailsActions";
import * as ProjectInformationCheckActions from "../ProjectInformationCheckActions";
// helpers
import * as TargetLanguageHelpers from '../../helpers/TargetLanguageHelpers';
import * as FileConversionHelpers from '../../helpers/FileConversionHelpers';
import {getTranslate, getProjectManifest, getProjectSaveLocation} from '../../selectors';
import * as ProjectDetailsHelpers from '../../helpers/ProjectDetailsHelpers';
import * as ProjectFilesystemHelpers from '../../helpers/Import/ProjectImportFilesystemHelpers';
import migrateProject from '../../helpers/ProjectMigration';

// constants
export const ALERT_MESSAGE = (
  <div>
    No file was selected. Please click on the
    <span style={{color: 'var(--accent-color-dark)', fontWeight: "bold"}}>
      &nbsp;Import Local Project&nbsp;
    </span>
    button again and select the project you want to load.
  </div>
);
const IMPORTS_PATH = path.join(ospath.home(), 'translationCore', 'imports');

/**
 * @description Action that dispatches other actions to wrap up local importing
 */
export const localImport = () => {
  return async (dispatch, getState) => {
    const translate = getTranslate(getState());
    // selectedProjectFilename and sourceProjectPath are populated by selectProjectMoveToImports()
    const {
      selectedProjectFilename,
      sourceProjectPath
    } = getState().localImportReducer;
    const importProjectPath = path.join(IMPORTS_PATH, selectedProjectFilename);

    ProjectFilesystemHelpers.deleteImportsFolder();
    try {
      // convert file to tC acceptable project format
      const projectInfo = await FileConversionHelpers.convert(sourceProjectPath, selectedProjectFilename);
      const initialBibleDataFolderName = ProjectDetailsHelpers.getInitialBibleDataFolderName(selectedProjectFilename, importProjectPath);
      migrateProject(importProjectPath);
      dispatch(ProjectValidationActions.initializeReducersForProjectImportValidation(true, projectInfo.usfmProject));
      await dispatch(ProjectValidationActions.validateProject(importProjectPath));
      const manifest = getProjectManifest(getState());
      const updatedImportPath = getProjectSaveLocation(getState());
      ProjectDetailsHelpers.fixBibleDataFolderName(manifest, initialBibleDataFolderName, updatedImportPath);
      if (!TargetLanguageHelpers.targetBibleExists(updatedImportPath, manifest)) {
        dispatch(AlertModalActions.openAlertDialog(translate("projects.loading_ellipsis"), true));
        TargetLanguageHelpers.generateTargetBibleFromTstudioProjectPath(updatedImportPath, manifest);
        dispatch(ProjectInformationCheckActions.setSkipProjectNameCheckInProjectInformationCheckReducer(true));
        await delay(200);
        dispatch(AlertModalActions.closeAlertDialog());
        await dispatch(ProjectValidationActions.validateProject(updatedImportPath));
      }
      await delay(200); // to make sure project details have been saved
      const renamingResults = {};
      await dispatch(ProjectDetailsActions.updateProjectNameIfNecessary(renamingResults));
      const { projectDetailsReducer: {projectSaveLocation} } = getState();
      if (renamingResults.repoRenamed) {
        dispatch({type: consts.UPDATE_SOURCE_PROJECT_PATH, sourceProjectPath: projectSaveLocation});
        dispatch({type: consts.UPDATE_SELECTED_PROJECT_FILENAME, selectedProjectFilename: renamingResults.newRepoName});
        await delay(200);
      }
      let success = false;
      if (ProjectDetailsHelpers.doesProjectAlreadyExist(renamingResults.newRepoName)) {
        success = await dispatch(ProjectDetailsActions.handleOverwriteWarning(projectSaveLocation, renamingResults.newRepoName));
        await delay(200);
      } else {
        await dispatch(ProjectImportFilesystemActions.move());
        if (renamingResults.repoRenamed) {
          await dispatch(ProjectDetailsActions.doRenamePrompting());
        }
        success = true;
      }
      if (success) {
        dispatch(MyProjectsActions.getMyProjects());
        await dispatch(ProjectLoadingActions.displayTools());
        return;
      }
    } catch (error) { // Catch all errors in nested functions above
      const errorMessage = FileConversionHelpers.getSafeErrorMessage(error, translate('projects.local_import_error', {fromPath: sourceProjectPath, toPath: importProjectPath}));
      dispatch(AlertModalActions.openAlertDialog(errorMessage));
    }
    // Either import was canceled or error occurred. We clean up here.
    // clear last project must be called before any other action.
    // to avoid triggering auto-saving.
    dispatch(ProjectLoadingActions.clearLastProject());
    dispatch(ProjectImportStepperActions.cancelProjectValidationStepper());
    // remove failed project import
    dispatch(ProjectImportFilesystemActions.deleteProjectFromImportsFolder());
    const { projectDetailsReducer: {projectSaveLocation} } = getState();
    dispatch(ProjectImportFilesystemActions.deleteProjectFromImportsFolder(projectSaveLocation));
  };
};

/**
 * @description selects a project from the filesystem and moves it to tC imports folder.
 * @param startLocalImport - optional parameter to specify new startLocalImport function (useful for testing).
 * Default is localImport()
 */
export function selectLocalProject(startLocalImport = localImport) {
  return (dispatch, getState) => {
    return new Promise(async (resolve) => {
      const translate = getTranslate(getState());
      dispatch(BodyUIActions.dimScreen(true));
      dispatch(BodyUIActions.closeProjectsFAB());
      // TODO: the filter name and dialog text should not be set here.
      // we should instead send generic data and load the text in the react component with localization
      // or at least we could insert the locale keys here.
      await delay(500);
      const options = {
        properties: ['openFile'],
        filters: [
          {name: translate('supported_file_types'), extensions: ['usfm', 'sfm', 'txt', 'tstudio', 'tcore']}
        ]
      };
      let filePaths = ipcRenderer.sendSync('load-local', {options: options});
      dispatch(BodyUIActions.dimScreen(false));
      // if import was cancel then show alert indicating that it was cancel
      if (filePaths && filePaths[0]) {
        dispatch(AlertModalActions.openAlertDialog(translate('projects.importing_local_alert'), true));
        const sourceProjectPath = filePaths[0];
        const selectedProjectFilename = path.parse(sourceProjectPath).base.split('.')[0] || '';
        await delay(100);
        dispatch({type: consts.UPDATE_SOURCE_PROJECT_PATH, sourceProjectPath});
        dispatch({type: consts.UPDATE_SELECTED_PROJECT_FILENAME, selectedProjectFilename});
        await dispatch(startLocalImport());
        resolve();
      } else {
        dispatch(AlertModalActions.closeAlertDialog());
        resolve();
      }
    });
  };
}

function delay(ms) {
  return new Promise((resolve) =>
    setTimeout(resolve, ms)
  );
}
