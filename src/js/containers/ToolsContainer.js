import React, {Component} from 'react';
import path from 'path';
import fs from 'fs-extra';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
// actions
import { showPopover } from '../actions/PopoverActions';
import { addComment } from '../actions/CommentsActions';
import { editTargetVerse } from '../actions/VerseEditActions';
import { toggleReminder } from '../actions/RemindersActions';
import {
  changeSelections,
  validateSelections
} from '../actions/SelectionsActions';
import {
  changeCurrentContextId,
  changeToNextContextId,
  changeToPreviousContextId,
  loadCurrentContextId
} from '../actions/ContextIdActions';
import { addGroupData } from '../actions/GroupsDataActions';
import { setGroupsIndex } from '../actions/GroupsIndexActions';
import { setToolSettings } from '../actions/SettingsActions';
import {
  closeAlertDialog,
  openAlertDialog,
  openOptionDialog
} from '../actions/AlertModalActions';
import { selectModalTab } from '../actions/ModalActions';
import * as ResourcesActions from '../actions/ResourcesActions';
import * as WordAlignmentActions from '../actions/WordAlignmentActions';
//helpers
import * as ResourcesHelpers from '../helpers/ResourcesHelpers';
import { VerseObjectUtils } from 'word-aligner';
import * as LexiconHelpers from '../helpers/LexiconHelpers';
import {
  getContext,
  getProjectSaveLocation,
  getSelectedSourceChapter,
  getSelectedSourceVerse,
  getSelectedTargetChapter,
  getSelectedTargetVerse,
  getCurrentToolContainer,
  getCurrentToolApi

} from '../selectors';
import {ToolApi} from 'tc-tool';

class ToolsContainer extends React.Component {

  constructor (props) {
    super(props);
    this.onWriteGlobalToolData = this.onWriteGlobalToolData.bind(this);
    this.onReadGlobalToolData = this.onReadGlobalToolData.bind(this);
    this.onShowDialog = this.onShowDialog.bind(this);
    this.onShowLoading = this.onShowLoading.bind(this);
    this.onCloseLoading = this.onCloseLoading.bind(this);
  }

  componentDidMount () {
    let {contextId} = this.props.contextIdReducer;
    if (!contextId) this.props.actions.loadCurrentContextId();
  }

  componentWillReceiveProps (nextProps) {
    let {contextId} = nextProps.contextIdReducer;
    let {currentToolName} = nextProps.toolsReducer;
    // if contextId does not match current tool, then remove contextId
    if (contextId && contextId.tool !== currentToolName) {
      nextProps.actions.changeCurrentContextId(undefined);
    }
  }

  /**
   * Handles writing global project data
   *
   * @param {string} filePath - the relative path to be written
   * @param {string} data - the data to write
   * @return {Promise}
   */
  onWriteGlobalToolData (filePath, data) {
    const {projectSaveLocation} = this.props;
    const writePath = path.join(projectSaveLocation,
      '.apps/translationCore/', filePath);
    return fs.outputFile(writePath, data);
  }

  /**
   * Handles reading global project data
   *
   * @param {string} filePath - the relative path to read
   * @return {Promise<string>}
   */
  async onReadGlobalToolData (filePath) {
    const {projectSaveLocation} = this.props;
    const readPath = path.join(projectSaveLocation,
      '.apps/translationCore/', filePath);
    const exists = await fs.pathExists(readPath);
    if (!exists) {
      return Promise.reject();
    }
    try {
      const data = await fs.readFile(readPath);
      return data.toString();
    } catch (e) {
      Promise.reject(e);
    }
  }

  /**
   * Displays an options dialog as a promise.
   *
   * @param {string} message - the message to display
   * @param {string} [confirmText] - the confirm button text
   * @param {string} [cancelText] - the cancel button text
   * @return {Promise} a promise that resolves when confirmed or rejects when canceled.
   */
  onShowDialog (message, confirmText = null, cancelText = null) {
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
  onShowLoading (message) {
    const {actions: {openAlertDialog}} = this.props;
    openAlertDialog(message, true);
  }

  /**
   * Closes the loading dialog.
   * TRICKY: this actually closes all dialogs right now.
   * Ideally that could change in the future.
   */
  onCloseLoading () {
    const {actions: {closeAlertDialog}} = this.props;
    closeAlertDialog();
  }

  render () {
    const {
      currentLanguage,
      contextId,
      targetVerseText,
      sourceVerse,
      targetChapter,
      sourceChapter,
      ToolContainer,
      toolApi
    } = this.props;
    let {currentToolViews} = this.props.toolsReducer;
    // let Tool = currentToolViews[currentToolName];

    const {code} = currentLanguage;

    const props = {...this.props};
    delete props.translate;

    console.error('tool api', toolApi);

    const tcApi = {
      writeGlobalToolData: this.onWriteGlobalToolData,
      readGlobalToolData: this.onReadGlobalToolData,
      showDialog: this.onShowDialog,
      showLoading: this.onShowLoading,
      closeLoading: this.onCloseLoading,
      contextId: contextId,
      targetVerseText: targetVerseText,
      sourceVerse: sourceVerse,
      targetChapter: targetChapter,
      sourceChapter: sourceChapter,
      appLanguage: code
    };

    return (
      <ToolContainer
        {...props}
        api={tcApi}
        appLanguage={code}
        currentToolViews={currentToolViews}/>
    );
  }
}

ToolsContainer.propTypes = {
  toolApi: PropTypes.instanceOf(ToolApi),
  ToolContainer: PropTypes.any,
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
    ToolContainer: getCurrentToolContainer(state),
    toolApi: getCurrentToolApi(state),
    sourceVerse: getSelectedSourceVerse(state),
    targetVerseText: getSelectedTargetVerse(state),
    sourceChapter: getSelectedSourceChapter(state),
    targetChapter: getSelectedTargetChapter(state),
    contextId: getContext(state),
    projectSaveLocation: getProjectSaveLocation(state),
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
    wordAlignmentReducer: state.wordAlignmentReducer
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
      addNewBible: (bibleName, bibleData) => {
        dispatch(ResourcesActions.addNewBible(bibleName, bibleData));
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
        dispatch(setGroupsIndex(groupsIndex));
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
      moveWordBankItemToAlignment: (DropBoxItemIndex, WordBankItem) => {
        dispatch(
          WordAlignmentActions.moveWordBankItemToAlignment(DropBoxItemIndex,
            WordBankItem));
      },
      moveTopWordItemToAlignment: (topWordItem, fromAlignmentIndex, toAlignmentIndex) => {
        dispatch(WordAlignmentActions.moveTopWordItemToAlignment(topWordItem,
          fromAlignmentIndex, toAlignmentIndex));
      },
      moveBackToWordBank: (wordBankItem) => {
        dispatch(WordAlignmentActions.moveBackToWordBank(wordBankItem));
      },
      getWordListForVerse: VerseObjectUtils.getWordListForVerse,
      getGLQuote: ResourcesHelpers.getGLQuote,
      getLexiconData: LexiconHelpers.getLexiconData
    }
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ToolsContainer);
