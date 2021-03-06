import React, {Component} from 'react';
import path from 'path';
import fs from 'fs-extra';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
// actions
import {showPopover} from '../actions/PopoverActions';
import {addComment} from '../actions/CommentsActions';
import {editTargetVerse} from '../actions/VerseEditActions';
import {toggleReminder} from '../actions/RemindersActions';
import {
  changeSelections,
  validateSelections,
  getSelectionsFromContextId
} from '../actions/SelectionsActions';
import {
  changeCurrentContextId,
  changeToNextContextId,
  changeToPreviousContextId,
  loadCurrentContextId
} from '../actions/ContextIdActions';
import {addGroupData} from '../actions/GroupsDataActions';
import { loadGroupsIndex, updateRefreshCount } from '../actions/GroupsIndexActions';
import {setToolSettings} from '../actions/SettingsActions';
import {
  closeAlertDialog,
  openAlertDialog,
  openOptionDialog
} from '../actions/AlertModalActions';
import {selectModalTab} from '../actions/ModalActions';
import * as ResourcesActions from '../actions/ResourcesActions';
import { expandSubMenu, setFilter, changeGroup } from '../actions/GroupMenuActions.js';
//helpers
import { getGLQuote, getAvailableScripturePaneSelections } from '../helpers/ResourcesHelpers';
import {VerseObjectUtils} from 'word-aligner';
import * as LexiconHelpers from '../helpers/LexiconHelpers';
import {
  getContext,
  getCurrentToolApi,
  getCurrentToolContainer,
  getProjectSaveLocation,
  getSelectedSourceChapter,
  getSelectedSourceVerse,
  getSelectedTargetChapter,
  getSelectedTargetVerse,
  getSupportingToolApis,
  getSourceBible,
  getTargetBible,
  getUsername
} from '../selectors';
import {getValidGatewayBiblesForTool} from "../helpers/gatewayLanguageHelpers";

class ToolContainer extends Component {

  constructor(props) {
    super(props);
    this.onWriteProjectData = this.onWriteProjectData.bind(this);
    this.onReadProjectData = this.onReadProjectData.bind(this);
    this.onShowDialog = this.onShowDialog.bind(this);
    this.onShowLoading = this.onShowLoading.bind(this);
    this.onCloseLoading = this.onCloseLoading.bind(this);
    this.makeToolProps = this.makeToolProps.bind(this);
    this.onReadProjectDataSync = this.onReadProjectDataSync.bind(this);
    this.onDeleteProjectFile = this.onDeleteProjectFile.bind(this);
    this.onProjectFileExistsSync = this.onProjectFileExistsSync.bind(this);
    this.onProjectDataPathExistsSync = this.onProjectDataPathExistsSync.bind(this);
    this.onProjectDataPathExists = this.onProjectDataPathExists.bind(this);
    this.onReadProjectDir = this.onReadProjectDir.bind(this);
    this.onReadProjectDirSync = this.onReadProjectDirSync.bind(this);
  }

  componentWillMount() {
    const {toolApi, supportingToolApis} = this.props;

    // connect to APIs
    const toolProps = this.makeToolProps();
    for (const key of Object.keys(supportingToolApis)) {
      supportingToolApis[key].triggerWillConnect(toolProps);
    }
    if (toolApi) {
      const activeToolProps = {
        ...toolProps,
        tools: supportingToolApis
      };
      toolApi.triggerWillConnect(activeToolProps);
    }
  }

  componentWillUnmount() {
    const {toolApi, supportingToolApis} = this.props;
    for (const key of Object.keys(supportingToolApis)) {
      supportingToolApis[key].triggerWillDisconnect();
    }
    if (toolApi) {
      toolApi.triggerWillDisconnect();
    }
  }

  componentWillReceiveProps(nextProps) {
    const {contextId: nextContext, toolApi, supportingToolApis} = nextProps;
    let {currentToolName} = nextProps.toolsReducer;
    // if contextId does not match current tool, then remove contextId
    if (nextContext && nextContext.tool !== currentToolName) {
      nextProps.actions.changeCurrentContextId(undefined);
    }

    // update api props
    const toolProps = this.makeToolProps(nextProps);
    for (const key of Object.keys(supportingToolApis)) {
      supportingToolApis[key].triggerWillReceiveProps(toolProps);
    }
    if (toolApi) {
      const activeToolProps = {
        ...toolProps,
        tools: supportingToolApis
      };
      toolApi.triggerWillReceiveProps(activeToolProps);
    }
  }

  /**
   * Handles writing global project data
   *
   * @param {string} filePath - the relative path to be written
   * @param {string} data - the data to write
   * @return {Promise}
   */
  onWriteProjectData (filePath, data) {
    const {projectSaveLocation} = this.props;
    const writePath = path.join(projectSaveLocation,
      '.apps/translationCore/', filePath);
    return fs.outputFile(writePath, data);
  }

  /**
   * Handles reading a project directory
   * @param {string} dir - the relative path to read
   * @return {Promise<String[]>}
   */
  onReadProjectDir(dir) {
    const {projectSaveLocation} = this.props;
    const dirPath = path.join(projectSaveLocation,
      '.apps/translationCore/', dir);
    return fs.readdir(dirPath);
  }

  /**
   * Handles reading a project directory synchronously
   * @param {string} dir - the relative path to read
   * @return {*}
   */
  onReadProjectDirSync(dir) {
    const {projectSaveLocation} = this.props;
    const dirPath = path.join(projectSaveLocation,
      '.apps/translationCore/', dir);
    return fs.readdirSync(dirPath);
  }

  /**
   * Handles reading global project data
   *
   * @param {string} filePath - the relative path to read
   * @return {Promise<string>}
   */
  async onReadProjectData(filePath) {
    const {projectSaveLocation} = this.props;
    const readPath = path.join(projectSaveLocation,
      '.apps/translationCore/', filePath);
    const data = await fs.readFile(readPath);
    return data.toString();
  }

  /**
   * Handles reading global project data synchronously
   * @param {string} filePath - the relative path to read
   * @return {string}
   */
  onReadProjectDataSync(filePath) {
    const {projectSaveLocation} = this.props;
    const readPath = path.join(projectSaveLocation,
      '.apps/translationCore/', filePath);
    const data = fs.readFileSync(readPath);
    return data.toString();
  }

  /**
   * Synchronously checks if a file exists in the project data path.
   * @deprecated use {@link onProjectDataPathExistsSync} instead
   * @param {string} filePath - the relative path who's existence will be checked
   * @return {*}
   */
  onProjectFileExistsSync(filePath) {
    return this.onProjectDataPathExistsSync(filePath);
  }

  /**
   * Synchronously checks if a path exists in the project
   * @param {string} filePath - the relative path who's existence will be checked
   * @return {*}
   */
  onProjectDataPathExistsSync(filePath) {
    const {projectSaveLocation} = this.props;
    const readPath = path.join(projectSaveLocation,
      '.apps/translationCore/', filePath);
    return fs.pathExistsSync(readPath);
  }

  /**
   * Checks if the path exists in the project
   * @param {string} filePath - the relative path who's existence will be checked
   * @return {boolean}
   */
  onProjectDataPathExists(filePath) {
    const {projectSaveLocation} = this.props;
    const readPath = path.join(projectSaveLocation,
      '.apps/translationCore/', filePath);
    return fs.pathExists(readPath);
  }

  /**
   * Handles deleting global project data files
   *
   * @param {string} filePath - the relative path to delete
   * @return {Promise}
   */
  onDeleteProjectFile(filePath) {
    const {
      projectSaveLocation
    } = this.props;
    const fullPath = path.join(projectSaveLocation,
      '.apps/translationCore/', filePath);
    return fs.remove(fullPath);
  }

  /**
   * Displays an options dialog as a promise.
   *
   * @param {string} message - the message to display
   * @param {string} [confirmText] - the confirm button text
   * @param {string} [cancelText] - the cancel button text
   * @return {Promise} a promise that resolves when confirmed or rejects when canceled.
   */
  onShowDialog(message, confirmText = null, cancelText = null) {
    const {actions: {openOptionDialog, closeAlertDialog}, translate} = this.props;
    let confirmButtonText = confirmText;
    if (confirmButtonText === null) {
      confirmButtonText = translate('buttons.ok_button');
    }
    return new Promise((resolve, reject) => {
      openOptionDialog(message, (action) => {
        closeAlertDialog();
        if (action === confirmButtonText) {
          resolve();
        } else {
          reject();
        }
      }, confirmButtonText, cancelText);
    });
  }

  /**
   * Displays a loading dialog.
   * @param {string} message - the message to display while loading
   */
  onShowLoading(message) {
    const {actions: {openAlertDialog}} = this.props;
    openAlertDialog(message, true);
  }

  /**
   * Closes the loading dialog.
   * TRICKY: this actually closes all dialogs right now.
   * Ideally that could change in the future.
   */
  onCloseLoading() {
    const {actions: {closeAlertDialog}} = this.props;
    closeAlertDialog();
  }

  /**
   * Builds the tC api for use in the tool
   * @param {*} [nextProps] - the component props. If empty the current props will be used.
   * @return {*}
   */
  makeToolProps(nextProps = undefined) {
    if (!nextProps) {
      nextProps = this.props;
    }
    const {
      currentLanguage: {code},
      contextId,
      targetVerseText,
      targetBible,
      sourceBible,
      sourceVerse,
      targetChapter,
      sourceChapter
    } = nextProps;
    return {
      readProjectDir: this.onReadProjectDir,
      readProjectDirSync: this.onReadProjectDirSync,
      writeProjectData: this.onWriteProjectData,
      readProjectData: this.onReadProjectData,
      readProjectDataSync: this.onReadProjectDataSync,
      projectFileExistsSync: this.onProjectFileExistsSync,
      projectDataPathExists: this.onProjectDataPathExists,
      projectDataPathExistsSync: this.onProjectDataPathExistsSync,
      deleteProjectFile: this.onDeleteProjectFile,
      showDialog: this.onShowDialog,
      showLoading: this.onShowLoading,
      closeLoading: this.onCloseLoading,
      contextId,
      targetVerseText,
      sourceVerse,
      targetChapter,
      sourceChapter,
      targetBible, // TODO: deprecate
      targetBook: targetBible,
      sourceBible, // TODO: deprecate
      sourceBook: sourceBible,
      appLanguage: code
    };
  }

  render() {
    const {
      supportingToolApis,
      Tool
    } = this.props;
    let {currentToolViews} = this.props.toolsReducer;

    const props = {...this.props};
    delete props.translate;

    const activeToolProps = {
      ...this.makeToolProps(),
      tools: supportingToolApis
    };

    return (
      <div
        style={{display: 'flex', flex: 'auto', height: 'calc(100vh - 30px)'}}>
        <div style={{flex: 'auto', display: 'flex'}}>
          <Tool
            {...props}
            currentToolViews={currentToolViews}
            {...activeToolProps} />
        </div>
      </div>
    );
  }
}

ToolContainer.propTypes = {
  toolApi: PropTypes.any,
  supportingToolApis: PropTypes.object.isRequired,
  Tool: PropTypes.any,
  contextId: PropTypes.object,
  projectSaveLocation: PropTypes.string.isRequired,
  targetVerseText: PropTypes.string,
  sourceVerse: PropTypes.object,
  sourceChapter: PropTypes.object,
  targetChapter: PropTypes.object,
  toolsReducer: PropTypes.any.isRequired,
  actions: PropTypes.any.isRequired,
  contextIdReducer: PropTypes.any.isRequired,
  currentLanguage: PropTypes.object.isRequired,
  translate: PropTypes.func.isRequired
};

const mapStateToProps = state => {
  return {
    Tool: getCurrentToolContainer(state),
    supportingToolApis: getSupportingToolApis(state),
    toolApi: getCurrentToolApi(state),
    targetBible: getTargetBible(state),
    sourceBible: getSourceBible(state),
    sourceVerse: getSelectedSourceVerse(state),
    targetVerseText: getSelectedTargetVerse(state),
    sourceChapter: getSelectedSourceChapter(state),
    targetChapter: getSelectedTargetChapter(state),
    contextId: getContext(state),
    projectSaveLocation: getProjectSaveLocation(state),
    username: getUsername(state),
    toolsReducer: state.toolsReducer,
    loginReducer: state.loginReducer,
    settingsReducer: state.settingsReducer,
    loaderReducer: state.loaderReducer,
    resourcesReducer: state.resourcesReducer,
    commentsReducer: state.commentsReducer,
    remindersReducer: state.remindersReducer,
    invalidatedReducer: state.invalidatedReducer,
    contextIdReducer: state.contextIdReducer,
    projectDetailsReducer: state.projectDetailsReducer,
    selectionsReducer: state.selectionsReducer,
    verseEditReducer: state.verseEditReducer,
    groupsIndexReducer: state.groupsIndexReducer,
    groupsDataReducer: state.groupsDataReducer,
    groupMenuReducer: state.groupMenuReducer
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    actions: {
      goToNext: () => {
        dispatch(changeToNextContextId());
      },
      goToPrevious: () => {
        dispatch(changeToPreviousContextId());
      },
      showPopover: (title, bodyText, positionCoord) => {
        dispatch(showPopover(title, bodyText, positionCoord));
      },
      loadResourceArticle: (resourceType, articleId, languageId) => {
        dispatch(ResourcesActions.loadResourceArticle(resourceType, articleId,
          languageId));
      },
      loadLexiconEntry: (lexiconId, entryId) => {
        dispatch(ResourcesActions.loadLexiconEntry(lexiconId, entryId));
      },
      addComment: (text, userName) => {
        dispatch(addComment(text, userName));
      },
      changeSelections: (selections, userName) => {
        dispatch(changeSelections(selections, userName));
      },
      validateSelections: (targetVerse) => {
        dispatch(validateSelections(targetVerse));
      },
      toggleReminder: (userName) => {
        dispatch(toggleReminder(userName));
      },
      selectModalTab: (tab, section, vis) => {
        dispatch(selectModalTab(tab, section, vis));
      },
      editTargetVerse: (chapter, verse, before, after, tags, username) => {
        dispatch(
          editTargetVerse(chapter, verse, before, after, tags, username));
      },
      changeCurrentContextId: (contextId) => {
        dispatch(changeCurrentContextId(contextId));
      },
      loadCurrentContextId: () => {
        dispatch(loadCurrentContextId());
      },
      addGroupData: (groupId, groupData) => {
        dispatch(addGroupData(groupId, groupData));
      },
      setGroupsIndex: (groupsIndex) => {
        dispatch(loadGroupsIndex(groupsIndex));
      },
      updateRefreshCount: () => {
        dispatch(updateRefreshCount());
      },
      setToolSettings: (NAMESPACE, settingsPropertyName, toolSettingsData) => {
        dispatch(
          setToolSettings(NAMESPACE, settingsPropertyName, toolSettingsData));
      },
      openAlertDialog: (message) => {
        dispatch(openAlertDialog(message));
      },
      openOptionDialog: (alertMessage, callback, button1Text, button2Text) => {
        dispatch(
          openOptionDialog(alertMessage, callback, button1Text, button2Text));
      },
      closeAlertDialog: () => {
        dispatch(closeAlertDialog());
      },
      groupMenuChangeGroup: contextId => {
        dispatch(changeGroup(contextId));
      },
      groupMenuExpandSubMenu: isSubMenuExpanded => {
        dispatch(expandSubMenu(isSubMenuExpanded));
      },
      setFilter: (name, value) => {
        dispatch(setFilter(name, value));
      },
      getAvailableScripturePaneSelections: resourceList => {
        dispatch(getAvailableScripturePaneSelections(resourceList));
      },
      makeSureBiblesLoadedForTool: () => {
        dispatch(ResourcesActions.makeSureBiblesLoadedForTool());
      },
      // TODO: these are not actions and should be inserted directly into the tool
      getWordListForVerse: VerseObjectUtils.getWordListForVerse,
      getGLQuote: getGLQuote,
      getLexiconData: LexiconHelpers.getLexiconData,
      getSelectionsFromContextId: getSelectionsFromContextId,
      getValidGatewayBiblesForTool: getValidGatewayBiblesForTool
    }
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ToolContainer);
