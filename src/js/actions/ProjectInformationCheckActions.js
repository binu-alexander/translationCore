/* eslint-disable no-console */
import consts from './ActionTypes';
import fs from 'fs-extra';
import path from 'path-extra';
// helpers
import * as ProjectInformationCheckHelpers from '../helpers/ProjectInformationCheckHelpers';
import * as manifestHelpers from '../helpers/manifestHelpers';
import * as ProjectDetailsHelpers from "../helpers/ProjectDetailsHelpers";

// actions
import * as ProjectDetailsActions from './ProjectDetailsActions';
import * as ProjectImportStepperActions from './ProjectImportStepperActions';
import * as ProjectLoadingActions from './MyProjects/ProjectLoadingActions';
import * as MyProjectsActions from './MyProjects/MyProjectsActions';
import * as MissingVersesActions from './MissingVersesActions';
import * as ProjectValidationActions from './Import/ProjectValidationActions';
import * as AlertModalActions from './AlertModalActions';

// constants
const PROJECT_INFORMATION_CHECK_NAMESPACE = 'projectInformationCheck';

/**
 * check if current project name matches spec
 * @param projectSaveLocation
 * @param manifest
 * @return {boolean}
 */
export function doesProjectNameMatchSpec(projectSaveLocation, manifest) {
  const projectName = path.basename(projectSaveLocation);
  const newFilename = ProjectDetailsHelpers.generateNewProjectName(manifest);
  return projectName === newFilename;
}

/**
 * adds the project information check into the stepper if not there, and then
 *   and then sorts to make sure steps are in right order
 * @return {Function}
 */
export function insertProjectInformationCheckToStepper() {
  return ((dispatch, getState) => {
    const { projectValidationStepsArray } = getState().projectValidationReducer;
    if (projectValidationStepsArray) {
      const pos = projectValidationStepsArray.findIndex(step => step.namespace === PROJECT_INFORMATION_CHECK_NAMESPACE);
      if (pos < 0) { // if not present
        dispatch(ProjectImportStepperActions.addProjectValidationStep(PROJECT_INFORMATION_CHECK_NAMESPACE));
        const {projectValidationStepsArray} = getState().projectValidationReducer;
        let newStepsArray = JSON.parse(JSON.stringify(projectValidationStepsArray)); // clone so we can modify
        newStepsArray.sort((a, b) => (a.index - b.index)); // sort
        dispatch({ // apply ordered list
          type: consts.REMOVE_PROJECT_VALIDATION_STEP,
          projectValidationStepsArray: newStepsArray
        });
      }
    }
  });
}

/**
 * if we are at the project information page in stepper, then set the initial state for the continue button.
 *    The default initial state for the stepper is for continue button to be disabled, but for the project information
 *    page, we want the continue button to reflect the validation state of the project details displayed unless we are
 *    only editing the project details
 * @return {Function}
 */
export function initializeProjectInformationCheckContinueButton() {
  return ((dispatch, getState) => {
    const {projectValidationReducer} = getState();
    const doingProjectInformationCheck = projectValidationReducer && projectValidationReducer.projectValidationStepsArray && projectValidationReducer.projectValidationStepsArray[0].namespace === PROJECT_INFORMATION_CHECK_NAMESPACE;
    if (doingProjectInformationCheck) {
      const editingProjectDetails = projectValidationReducer.onlyShowProjectInformationScreen;
      if (!editingProjectDetails) {
        dispatch(toggleProjectInformationCheckSaveButton()); // if not editing project details, then initialize continue button based on validation of project details, otherwise it defaults to disabled
      }
    }
  });
}

/**
 * validates if the project's manifest is missing required details.
 * @param {Object} results - object to return flag that project name matches spec.
 */
export function validate(results={}) {
  return ((dispatch, getState) => {
    results.projectNameMatchesSpec = false;
    const { projectSaveLocation } = getState().projectDetailsReducer;
    const projectManifestPath = path.join(projectSaveLocation, 'manifest.json');
    const manifest = fs.readJsonSync(projectManifestPath);
    dispatch(setProjectDetailsInProjectInformationReducer(manifest));
    results.projectNameMatchesSpec = doesProjectNameMatchSpec(projectSaveLocation, manifest);
    if (ProjectInformationCheckHelpers.checkProjectDetails(manifest) || ProjectInformationCheckHelpers.checkLanguageDetails(manifest)) {
      dispatch(ProjectImportStepperActions.addProjectValidationStep(PROJECT_INFORMATION_CHECK_NAMESPACE));
    }
  });
}

/**
 * If project information is valid, saves all the project details from the project information check reducer
 * to the project details reducer under the manifest property.
 */
export function finalize() {
  return (async (dispatch, getState) => {
    if (ProjectInformationCheckHelpers.verifyAllRequiredFieldsAreCompleted(getState())) { // protect against race conditions on slower PCs
      try {
        dispatch(ProjectDetailsActions.updateProjectTargetLanguageBookFolderName());
        dispatch(saveCheckingDetailsToProjectInformationReducer());
        dispatch(ProjectImportStepperActions.removeProjectValidationStep(PROJECT_INFORMATION_CHECK_NAMESPACE));
        dispatch(ProjectImportStepperActions.updateStepperIndex());
        dispatch(MissingVersesActions.validate());
      } catch (error) {
        dispatch(AlertModalActions.openAlertDialog(error));
        dispatch(ProjectImportStepperActions.cancelProjectValidationStepper());
        dispatch(ProjectLoadingActions.clearLastProject());
      }
    }
  });
}

/**
 * shared call for saving checking details to Project info reducer and manifest.  Then clears the
 *   project information reducer.
 */
function saveCheckingDetailsToProjectInformationReducer() {
  return ((dispatch) => {
    dispatch(ProjectDetailsActions.setProjectBookIdAndBookName());
    dispatch(ProjectDetailsActions.setProjectResourceId());
    dispatch(ProjectDetailsActions.setProjectNickname());
    dispatch(ProjectDetailsActions.setLanguageDetails());
    dispatch(ProjectDetailsActions.updateContributors());
    dispatch(ProjectDetailsActions.updateCheckers());
    dispatch(clearProjectInformationReducer());
  });
}

/**
 * shared call to load project information check reducer from manifest
 * @param {Object} manifest
 */
function setProjectDetailsInProjectInformationReducer(manifest) {
  return ((dispatch) => {
    const targetLanguage = manifest.target_language || {};
    dispatch(setLanguageNameInProjectInformationReducer(targetLanguage.name || ''));
    dispatch(setLanguageIdInProjectInformationReducer(targetLanguage.id || ''));
    dispatch(setLanguageDirectionInProjectInformationReducer(targetLanguage.direction || ''));
    const project = manifest.project || {};
    const resource = manifest.resource || {};
    dispatch(setBookIDInProjectInformationReducer(project.id || ''));
    dispatch(setResourceIDInProjectInformationReducer(resource.id || ''));
    dispatch(setNicknameInProjectInformationReducer(resource.name || ''));
    dispatch(setContributorsInProjectInformationReducer(manifest.translators));
    dispatch(setCheckersInProjectInformationReducer(manifest.checkers));
  });
}

/**
 * Sets the book id and book name in the project information check reducer.
 * @param {String} bookId - book abbreviation.
 */
export function setBookIDInProjectInformationReducer(bookId) {
  return ((dispatch) => {
    dispatch({
      type: consts.SET_BOOK_ID_IN_PROJECT_INFORMATION_REDUCER,
      bookId
    });
    dispatch(toggleProjectInformationCheckSaveButton());
  });
}

/**
 * Sets the resource id in the project information check reducer.
 * @param {String} resourceId - resource abbreviation.
 */
export function setResourceIDInProjectInformationReducer(resourceId) {
  return ((dispatch) => {
    dispatch({
      type: consts.SET_RESOURCE_ID_IN_PROJECT_INFORMATION_REDUCER,
      resourceId
    });
    dispatch(toggleProjectInformationCheckSaveButton());
  });
}

/**
 * Sets the nickname in the project information check reducer.
 * @param {String} nickname - project title
 */
export function setNicknameInProjectInformationReducer(nickname) {
  return ((dispatch) => {
    dispatch({
      type: consts.SET_NICKNAME_IN_PROJECT_INFORMATION_REDUCER,
      nickname
    });
    dispatch(toggleProjectInformationCheckSaveButton());
  });
}

/**
 * Sets the language Id in the project information check reducer.
 * @param {String} languageId - language id e.g. en (english), es (spanish).
 */
export function setLanguageIdInProjectInformationReducer(languageId) {
  return ((dispatch) => {
    dispatch({
      type: consts.SET_LANGUAGE_ID_IN_PROJECT_INFORMATION_REDUCER,
      languageId
    });
    dispatch(toggleProjectInformationCheckSaveButton());
  });
}

/**
 * Sets the language name in the project information check reducer.
 * @param {String} languageName - language name e.g. english, spanish.
 */
export function setLanguageNameInProjectInformationReducer(languageName) {
  return ((dispatch) => {
    dispatch({
      type: consts.SET_LANGUAGE_NAME_IN_PROJECT_INFORMATION_REDUCER,
      languageName
    });
    dispatch(toggleProjectInformationCheckSaveButton());
  });
}

/**
 * Sets the language direction in the project information check reducer.
 * @param {String} languageDirection - language direction
 * e.g. ltr (left to right) or rtl (right to left)
 */
export function setLanguageDirectionInProjectInformationReducer(languageDirection) {
  return ((dispatch) => {
    dispatch({
      type: consts.SET_LANGUAGE_DIRECTION_IN_PROJECT_INFORMATION_REDUCER,
      languageDirection
    });
    dispatch(toggleProjectInformationCheckSaveButton());
  });
}

/**
 * Sets the language settings in the project information check reducer.
 * @param {String} languageId - language id e.g. en (english), es (spanish).
 * @param {String} languageName - language name e.g. english, spanish.
 * @param {String} languageDirection - language direction
 * e.g. ltr (left to right) or rtl (right to left)
 */
export function setAllLanguageInfoInProjectInformationReducer(languageId, languageName, languageDirection) {
  return ((dispatch) => {
    dispatch({
      type: consts.SET_ALL_LANGUAGE_INFO_IN_PROJECT_INFORMATION_REDUCER,
      languageId,
      languageName,
      languageDirection
    });
    dispatch(toggleProjectInformationCheckSaveButton());
  });
}

/**
 * Sets the list of contributors in the project information check reducer.
 * @param {array} contributors - array of contributor names.
 */
export function setContributorsInProjectInformationReducer(contributors) {
  return ((dispatch) => {
    dispatch({
      type: consts.SET_CONTRIBUTORS_IN_PROJECT_INFORMATION_REDUCER,
      contributors
    });
    dispatch(toggleProjectInformationCheckSaveButton());
  });
}

/**
 * Sets the list of checkers in the project information check reducer.
 * @param {array} checkers - array of checker names.
 */
export function setCheckersInProjectInformationReducer(checkers) {
  return ((dispatch) => {
    dispatch({
      type: consts.SET_CHECKERS_IN_PROJECT_INFORMATION_REDUCER,
      checkers
    });
    dispatch(toggleProjectInformationCheckSaveButton());
  });
}

/**
 * Sets the flag that we are checking an already existing project (versus doing an import).
 * @param {Boolean} alreadyImported - true if we are opening an existing project.
 */
export function setAlreadyImportedInProjectInformationCheckReducer(alreadyImported) {
  return ((dispatch) => {
    dispatch({
      type: consts.SET_ALREADY_IMPORTED_IN_PROJECT_INFORMATION_CHECK_REDUCER,
      alreadyImported
    });
  });
}

/**
 * Sets the flag that we are importing a usfm project.
 * @param {Boolean} usfmProject - true if an usfm project
 */
export function setUsfmProjectInProjectInformationCheckReducer(usfmProject) {
  return ((dispatch) => {
    dispatch({
      type: consts.SET_USFM_PROJECT_IN_PROJECT_INFORMATION_CHECK_REDUCER,
      usfmProject
    });
    dispatch(upfdateOverwritePermittedInProjectInformationCheckReducer());
  });
}

/**
 * Sets the flag that we are importing a local project (vs. online project).
 * @param {Boolean} localImport
 */
export function setLocalImportInProjectInformationCheckReducer(localImport) {
  return ((dispatch) => {
    dispatch({
      type: consts.SET_LOCAL_IMPORT_IN_PROJECT_INFORMATION_CHECK_REDUCER,
      localImport
    });
  });
}

/**
 * updates the flag that we are allowing overwrite.
 * @param {Boolean} overwritePermitted
 */
export function setOverwritePermittedInProjectInformationCheckReducer(overwritePermitted) {
  return ((dispatch) => {
    dispatch({
      type: consts.SET_OVERWRITE_PERMITTED_IN_PROJECT_INFORMATION_CHECK_REDUCER,
      overwritePermitted
    });
  });
}

/**
 * updates the flag to ignore project name validation checking for project details prompt.  Needed for case where
 *    imports may call validation twice.
 * @param {Boolean} skipProjectNameCheck
 */
export function setSkipProjectNameCheckInProjectInformationCheckReducer(skipProjectNameCheck) {
  return ((dispatch) => {
    dispatch({
      type: consts.SET_SKIP_PROJECT_NAME_CHECK_IN_PROJECT_INFORMATION_CHECK_REDUCER,
      skipProjectNameCheck
    });
  });
}

/**
 * updates the flag that we are allowing overwrite based on project action (e.g. import, local, usfm, edit details).
 */
export function upfdateOverwritePermittedInProjectInformationCheckReducer() {
  return ((dispatch, getState) => {
    const { localImport, usfmProject, overwritePermitted } = getState().projectInformationCheckReducer;
    const permitted = ProjectInformationCheckHelpers.isOverwritePermitted(localImport, usfmProject);
    if (!overwritePermitted !== !permitted) { // update if boolean value is different
      dispatch(setOverwritePermittedInProjectInformationCheckReducer(permitted));
    }
  });
}

/**
 * enables or disables the next button in the project information check
 * based on all required fields being completed.
 */
export function toggleProjectInformationCheckSaveButton() {
  return ((dispatch, getState) => {
    if (ProjectInformationCheckHelpers.verifyAllRequiredFieldsAreCompleted(getState())) {
      dispatch(ProjectImportStepperActions.toggleNextButton(false));
    } else {
      dispatch(ProjectImportStepperActions.toggleNextButton(true));
    }
  });
}

/**
 * Updates a checker string name in the checkers array.
 * @param {String} newCheckerName - new name for the checker name.
 * @param {Number} selectedIndex - index of checker name text to be updated.
 */
export function updateCheckerName(newCheckerName, selectedIndex) {
  return ((dispatch, getState) => {
    const { checkers } = getState().projectInformationCheckReducer;

    let newCheckersArray = checkers.map((checkerName, index) => {
      if (selectedIndex === index) {
        return newCheckerName;
      } else {
        return checkerName;
      }
    });

    dispatch(setCheckersInProjectInformationReducer(newCheckersArray));
  });
}

/**
 * Updates a contributor string name in the checkers array.
 * @param {String} newContributorName - new name for the contributor name.
 * @param {Number} selectedIndex - index of contributor name text to be updated.
 */
export function updateContributorName(newContributorName, selectedIndex) {
  return ((dispatch, getState) => {
    const { contributors } = getState().projectInformationCheckReducer;

    let newContributorsArray = contributors.map((contributorName, index) => {
      if (selectedIndex === index) {
        return newContributorName;
      } else {
        return contributorName;
      }
    });

    dispatch(setContributorsInProjectInformationReducer(newContributorsArray));
  });
}

/**
 * Resets / clears the project information check reducer
 */
export function clearProjectInformationReducer() {
  return ((dispatch) => {
    dispatch({ type: consts.CLEAR_PROJECT_INFORMATION_REDUCER });
  });
}

/**
 * only opens the project infomation/details screen in the project validation stepper.
 * @param {String} projectPath
 * @param {Boolean} initiallyEnableSaveIfValid - if true then initial save button will be set enabled when
 *                        project details screen is shown.  But default the save button starts of disabled
 *                        and will only be enabled after an input change to make details valide.
 */
export function openOnlyProjectDetailsScreen(projectPath, initiallyEnableSaveIfValid) {
  return ((dispatch) => {
    const manifest = manifestHelpers.getProjectManifest(projectPath);
    dispatch(ProjectLoadingActions.loadProjectDetails(projectPath, manifest));
    dispatch(ProjectValidationActions.initializeReducersForProjectOpenValidation());
    dispatch(setProjectDetailsInProjectInformationReducer(manifest));
    dispatch(ProjectImportStepperActions.addProjectValidationStep(PROJECT_INFORMATION_CHECK_NAMESPACE));
    dispatch({ type: consts.ONLY_SHOW_PROJECT_INFORMATION_SCREEN, value: true });
    dispatch(ProjectImportStepperActions.updateStepperIndex());
    if (initiallyEnableSaveIfValid) {
      dispatch(toggleProjectInformationCheckSaveButton());
    }
  });
}

/**
 * If program information is valid, saves and closes the project information check when in project information/detail mode.
 * to the project details reducer under the manifest property.
 */
export function saveAndCloseProjectInformationCheckIfValid() {
  return ((dispatch, getState) => {
    if (ProjectInformationCheckHelpers.verifyAllRequiredFieldsAreCompleted(getState())) { // protect against race conditions on slower PCs
      dispatch(saveCheckingDetailsToProjectInformationReducer());
      dispatch(ProjectImportStepperActions.removeProjectValidationStep(PROJECT_INFORMATION_CHECK_NAMESPACE));
      dispatch(ProjectImportStepperActions.toggleProjectValidationStepper(false));
      dispatch({ type: consts.ONLY_SHOW_PROJECT_INFORMATION_SCREEN, value: false });
      dispatch(ProjectDetailsActions.updateProjectNameIfNecessaryAndDoPrompting()).then(() => {
        dispatch(MyProjectsActions.getMyProjects());
      });
    }
  });
}

/**
  * cancels and closes the project information check when in project information/detail mode.
 */
export function cancelAndCloseProjectInformationCheck() {
  return ((dispatch) => {
    dispatch(ProjectImportStepperActions.removeProjectValidationStep(PROJECT_INFORMATION_CHECK_NAMESPACE));
    dispatch(ProjectImportStepperActions.toggleProjectValidationStepper(false));
    dispatch({ type: consts.CLEAR_PROJECT_INFORMATION_REDUCER });
  });
}
