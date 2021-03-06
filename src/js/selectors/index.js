/**
 * This module contains the state selectors.
 * These selectors receive a slice of the state
 * applicable to the reducer in question.
 */
import * as fromSettingsReducer from '../reducers/settingsReducer';
import * as fromLocaleSettings from '../reducers/localeSettings';
import * as fromHomeScreenReducer from '../reducers/homeScreenReducer';
import * as fromLoginReducer from '../reducers/loginReducer';
import * as fromProjectDetailsReducer from '../reducers/projectDetailsReducer';
import * as fromSelectionsReducer from '../reducers/selectionsReducer';
import * as fromProjectValidationReducer
  from '../reducers/projectValidationReducer';
import * as fromVerseEditReducer from '../reducers/verseEditReducer';
import * as fromToolsReducer from '../reducers/toolsReducer';
import * as fromContextIdReducer from '../reducers/contextIdReducer';
import * as fromResourcesReducer from '../reducers/resourcesReducer';
import * as fromAlertModalReducer from '../reducers/alertModalReducer';
import * as fromProjectInformationCheckReducer from '../reducers/projectInformationCheckReducer';
import * as fromSourceContentUpdatesReducer from '../reducers/sourceContentUpdatesReducer';
import * as fromMyProjectsReducer from '../reducers/myProjectsReducer';

/**
 * Returns a list of the user's projects.
 * @param state
 * @return {object[]}
 */
export const getProjects = state =>
  fromMyProjectsReducer.getProjects(state.myProjectsReducer);

/**
 * Checks if the alert dialog is open
 * @param state
 * @return {boolean}
 */
export const getAlertIsOpen = state =>
  fromAlertModalReducer.getAlertIsOpen(state.alertModalReducer);

/**
 * Retrieves the edited verse object formatted for saving to the disk.
 * @param state
 * @param toolName
 * @return {*}
 */
export const getEditedVerse = (state, toolName) =>
  fromVerseEditReducer.getSaveStructure(state.verseEditReducer, toolName);

/**
 * Returns the title of the currently selected tool.
 * @param state
 * @return {string}
 */
export const getCurrentToolTitle = state =>
  fromToolsReducer.getCurrentTitle(state.toolsReducer);

/**
 * Retrieves an application setting
 * @param {object} state
 * @param key
 * @return {*}
 */
export const getSetting = (state, key) =>
  fromSettingsReducer.getSetting(state.settingsReducer, key);

/**
 * Returns a list of loaded languages available for the app locale.
 * This is a wrapper around react-localize-redux
 * @param {object} state
 * @return {Language[]}
 */
export const getLocaleLanguages = (state) =>
  fromLocaleSettings.getLanguages(state);

/**
 * Returns the currently active app locale.
 * This is a wrapper around react-localize-redux
 * @param {object} state
 * @return {Language}
 */
export const getActiveLocaleLanguage = (state) =>
  fromLocaleSettings.getActiveLanguage(state);

/**
 * Checks if the locale has finished loading
 * @param {object} state
 * @return {bool}
 */
export const getLocaleLoaded = (state) =>
  fromLocaleSettings.getLocaleLoaded(state.localeSettings);

/**
 * Retrieves the translate function.
 * This is a wrapper that encapsulates the translate reducer.
 *
 * @param {object} state
 * @return {*}
 */
export const getTranslate = (state) =>
  fromLocaleSettings.getTranslate(state);

/**
 * Returns the current step of the home screen
 * @param {object} state
 * @return {int}
 */
export const getHomeScreenStep = (state) =>
  fromHomeScreenReducer.getStep(state.homeScreenReducer);

/**
 * Checks if the next step of the home screen is disabled
 * @param {object} state
 * @return {boolean}
 */
export const getNextHomeScreenStepDisabled = (state) => {
  const loggedIn = getIsUserLoggedIn(state);
  const projectSaveLocation = getProjectSaveLocation(state);
  return fromHomeScreenReducer.getIsNextStepDisabled(state.homeScreenReducer,
    loggedIn, !!projectSaveLocation);
};

/**
 * Returns a list of home screen steps that are active
 * @param {object} state
 * @return {boolean[]}
 */
export const getActiveHomeScreenSteps = (state) => {
  const loggedIn = getIsUserLoggedIn(state);
  const projectSaveLocation = getProjectSaveLocation(state);
  return fromHomeScreenReducer.getActiveSteps(loggedIn, !!projectSaveLocation);
};

/**
 * gets the error message to attach to feedback dialog (also used as flag to show feedback dialog)
 * @param {object} state
 * @return {String}
 */
export const getErrorFeedbackMessage = (state) => {
  return fromHomeScreenReducer.getErrorFeedbackMessage(state.homeScreenReducer);
};

/**
 * gets the error message to attach to feedback dialog (also used as flag to show feedback dialog)
 * @param {object} state
 * @return {String}
 */
export const getErrorFeedbackExtraDetails = (state) => {
  return fromHomeScreenReducer.getErrorFeedbackExtraDetails(state.homeScreenReducer);
};

/**
 * gets the function to call when feedback dialog closes
 * @param {object} state
 * @return {String}
 */
export const getFeedbackCloseCallback = (state) => {
  return fromHomeScreenReducer.getFeedbackCloseCallback(state.homeScreenReducer);
};

/**
 * Checks if the user is logged in
 * @param {object} state
 * @return {bool}
 */
export const getIsUserLoggedIn = (state) =>
  fromLoginReducer.getIsLoggedIn(state.loginReducer);

/**
 * Returns the username of the user
 * @param {object} state
 * @return {string}
 */
export const getUsername = (state) =>
  fromLoginReducer.getUsername(state.loginReducer);

/**
 * Returns the email of the user
 * @param {object} state
 * @return {string}
 */
export const getUserEmail = (state) =>
  fromLoginReducer.getEmail(state.loginReducer);

/**
 * Returns the save location of the project
 * @param {object} state
 * @return {string}
 */
export const getProjectSaveLocation = (state) =>
  fromProjectDetailsReducer.getSaveLocation(state.projectDetailsReducer);

/**
 * Returns the nickname of the selected project
 * @param state
 * @return {string}
 */
export const getProjectNickname = state =>
  fromProjectDetailsReducer.getNickname(state.projectDetailsReducer);

/**
 * Returns the name of the selected project
 * @param state
 * @return {*}
 */
export const getProjectName = (state) =>
  fromProjectDetailsReducer.getName(state.projectDetailsReducer);

/**
 * Returns the manifest of the project
 * @param {object} state
 * @return {object}
 */
export const getProjectManifest = (state) =>
  fromProjectDetailsReducer.getManifest(state.projectDetailsReducer);

/**
 * Retrieves selections.
 * This needs better documentation. What are selections?
 * @param {object} state
 * @return {list}
 */
export const getSelections = (state) =>
  fromSelectionsReducer.getSelections(state.selectionsReducer);

/**
 * Returns the current step of the project validation screen
 * @param {object} state
 * @return {int}
 */
export const getProjectValidationStep = (state) =>
  fromProjectValidationReducer.getStep(state.projectValidationReducer);

/**
 * Checks if the next project validation step is disabled
 * @param {object} state
 * @return {boolean}
 */
export const getNextProjectValidationStepDisabled = (state) =>
  fromProjectValidationReducer.getIsNextStepDisabled(
    state.projectValidationReducer);

/**
 * Checks if only the project validation screen should be shown
 * @param {Object} state
 * @return {boolean}
 */
export const getShowProjectInformationScreen = (state) =>
  fromProjectValidationReducer.getShowProjectInformationScreen(
    state.projectValidationReducer);

/**
 * checks to see if we should show overwrite on save button
 * @param {Object} state
 * @return {boolean}
 */
export const getShowOverwriteWarning = (state) =>
  fromProjectValidationReducer.getShowOverwriteWarning(
    state.projectValidationReducer);

/**
 * checks to see if we should show overwrite on save button
 * @param {Object} state
 * @return {boolean}
 */
export const getIsOverwritePermitted = (state) =>
  fromProjectInformationCheckReducer.getIsOverwritePermitted(
    state.projectInformationCheckReducer);

/**
 * Gets the currently selected tool
 * @param {Object} state
 * @return {String | undefined}
 */
export const getCurrentToolName = state =>
  fromToolsReducer.getCurrentName(state.toolsReducer);

/**
 * Returns an api for the current tool if it has one.
 * @param state
 * @return {ApiController|null}
 */
export const getCurrentToolApi = state =>
  fromToolsReducer.getCurrentApi(state.toolsReducer);

/**
 * Returns supporting tool apis.
 * This will not include the api for the current tool.
 * For the current tool's api use {@link getCurrentToolApi}
 * @param state
 * @return {ApiController[]}
 */
export const getSupportingToolApis = state =>
  fromToolsReducer.getSupportingToolApis(state.toolsReducer);

/**
 * Returns an array of metadata for the tools
 * @param state
 * @return {object[]}
 */
export const getToolsMeta = state =>
  fromToolsReducer.getToolsMeta(state.toolsReducer);

/**
 * Return the selected tool's view
 * @param state
 * @return {*}
 */
export const getCurrentToolContainer = state =>
  fromToolsReducer.getCurrentContainer(state.toolsReducer);

/**
 * Returns the current context id.
 * This is an object with the current Bible reference.
 * @param state
 * @return {object}
 */
export const getContext = state =>
  fromContextIdReducer.getContext(state.contextIdReducer);

/**
 * Returns the currently selected verse in the target language bible
 * @param state
 * @return {*}
 */
export const getSelectedTargetVerse = (state) => {
  const context = getContext(state);
  if (context) {
    const {reference: {chapter, verse}} = context;
    return fromResourcesReducer.getTargetVerse(state.resourcesReducer, chapter,
      verse);
  } else {
    return null;
  }
};

/**
 * Return the currently selected chapter in the target language bible
 * @param state
 * @return {*}
 */
export const getSelectedTargetChapter = (state) => {
  const context = getContext(state);
  if (context) {
    const {reference: {chapter}} = context;
    return fromResourcesReducer.getTargetChapter(state.resourcesReducer,
      chapter);
  }
};

/**
 * Returns the target language bible
 * @param state
 * @return {*}
 */
export const getTargetBible = state =>
  fromResourcesReducer.getTargetBible(state.resourcesReducer);

/**
 * Returns the source language bible
 * @param state
 * @return {*}
 */
export const getSourceBible = state =>
  fromResourcesReducer.getSourceBible(state.resourcesReducer);

/**
 * Returns the currently selected verse in the original language bible
 * @param state
 * @return {*}
 */
export const getSelectedSourceVerse = (state) => {
  const context = getContext(state);
  if (context) {
    const {reference: {chapter, verse}} = context;
    return fromResourcesReducer.getOriginalVerse(state.resourcesReducer,
      chapter, verse);
  } else {
    return null;
  }
};

/**
 * Return the currently selected chapter in the original language bible
 * @param state
 * @return {*}
 */
export const getSelectedSourceChapter = (state) => {
  const context = getContext(state);
  if (context) {
    const {reference: {chapter}} = context;
    return fromResourcesReducer.getOriginalChapter(state.resourcesReducer,
      chapter);
  }
};

/**
 * Checks if the home screen is visible
 * @param state
 * @return {boolean}
 */
export const getIsHomeVisible = state =>
  fromHomeScreenReducer.getIsHomeVisible(state.homeScreenReducer);

/**
 * Retrieves selections.
 * This needs better documentation. What are selections?
 * @param {object} state
 * @return {list}
 */
export const getListOfOutdatedSourceContent = (state) =>
  fromSourceContentUpdatesReducer.getListOfOutdatedSourceContent(state.sourceContentUpdatesReducer);
