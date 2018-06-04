import React, { Component } from 'react';
import PropTypes from 'prop-types';
// components
import { Card } from 'material-ui/Card';
import BookDropdownMenu from './BookDropdownMenu';
import TextPrompt from './TextPrompt';
import LanguageIdTextBox from './LanguageIdTextBox';
import LanguageNameTextBox from './LanguageNameTextBox';
import LanguageDirectionDropdownMenu from './LanguageDirectionDropdownMenu';
import ContributorsArea from './ContributorsArea';
import CheckersArea from './CheckersArea';
import ProjectValidationContentWrapper from '../ProjectValidationContentWrapper';

class ProjectInformationCheck extends Component {
  constructor() {
    super();
    this.state = {
      contributorsRequiredFieldMessage: false,
      checkersRequiredFieldMessage: false
    };
  }

  addContributor() {
    let { contributors } = this.props.reducers.projectInformationCheckReducer;
    // if an empty text field has been created then dont add a new one until it is filled.
    if (contributors.includes('')) {
      this.setState({ contributorsRequiredFieldMessage: true });
    } else {
      contributors.unshift('');
      this.props.actions.setContributorsInProjectInformationReducer(contributors);
    }
  }

  addChecker() {
    let { checkers } = this.props.reducers.projectInformationCheckReducer;
    // if an empty text field has been created then dont add a new one until it is filled.
    if (checkers.includes('')) {
      this.setState({ checkersRequiredFieldMessage: true });
    } else {
      checkers.unshift('');
      this.props.actions.setCheckersInProjectInformationReducer(checkers);
    }
  }

  removeContributor(selectedIndex) {
    const { contributors } = this.props.reducers.projectInformationCheckReducer;
    const newContributorsArray = contributors.filter((element, index) => {
      return index !== selectedIndex;
    });
    this.setState({ contributorsRequiredFieldMessage: false });
    this.props.actions.setContributorsInProjectInformationReducer(newContributorsArray);
  }

  removeChecker(selectedIndex) {
    const { checkers } = this.props.reducers.projectInformationCheckReducer;
    const newCheckersArray = checkers.filter((element, index) => {
      return index !== selectedIndex;
    });
    this.setState({ checkersRequiredFieldMessage: false });
    this.props.actions.setCheckersInProjectInformationReducer(newCheckersArray);
  }

  shouldComponentUpdate(nextProps) {
    let changed = this.changed(nextProps,'bookId');
    changed = changed || this.changed(nextProps,'languageId');
    changed = changed || this.changed(nextProps,'languageName');
    changed = changed || this.changed(nextProps,'languageDirection');
    changed = changed || this.changed(nextProps,'contributors');
    changed = changed || this.changed(nextProps,'checkers');
    changed = changed || this.changed(nextProps,'resourceId');
    changed = changed || this.changed(nextProps,'nickname');
    return changed;
  }

  changed(nextProps, property) {
    let oldProp = this.props.reducers.projectInformationCheckReducer[property];
    let newProp = nextProps.reducers.projectInformationCheckReducer[property];
    if (property === 'checkers' || property === 'contributors') oldProp = false; newProp = true;
    return oldProp !== newProp;
  }

  render() {
    const {
      bookId,
      resourceId,
      nickname,
      languageId,
      languageName,
      languageDirection,
      contributors,
      checkers
    } = this.props.reducers.projectInformationCheckReducer;
    const {translate} = this.props;
    const instructions = (
      <div>
        <p>
          {translate('project_validation.project_information_missing')}
        </p><br /><br />
        <h4>{translate('project_validation.attention')}</h4>
        <p>
          {translate('project_validation.publicly_available')}
        </p>
      </div>
    );

    /**
     * checks resourceId for warnings, if there is a warning it will be translated
     * @param text
     * @return {*}
     */
    function getResourceIdWarning(text) {
      let warning = this.props.actions.getResourceIdWarning(text);
      if (warning) {
        warning = translate(warning);
      }
      return warning;
    }

    return (
      <ProjectValidationContentWrapper translate={translate}
                                       instructions={instructions}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {translate('project_information')}
          <Card
            id="project-information-card"
            style={{ width: '100%', height: '100%' }}
            containerStyle={{ overflowY: 'auto', overflowX: 'hidden', height: '100%' }}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <span style={{ color: '#cd0033', margin: '10px 10px 0px' }}>* {translate('required')}</span>
            </div>
            <table style={{ display: 'flex', justifyContent: 'center', marginLeft: '-15px' }}>
              <tbody>
              <tr>
                <td>
                  <LanguageNameTextBox
                    translate={translate}
                    languageName={languageName}
                    languageId={languageId}
                    updateLanguageName={(languageName) => this.props.actions.setLanguageNameInProjectInformationReducer(languageName)}
                    updateLanguageId={(languageId) => this.props.actions.setLanguageIdInProjectInformationReducer(languageId)}
                    updateLanguageSettings={(languageId, languageName, languageDirection) => this.props.actions.setAllLanguageInfoInProjectInformationReducer(languageId, languageName, languageDirection)}
                  />
                </td>
                <td style={{ padding: '0px 0px 0px 120px' }}>
                  <TextPrompt
                    getErrorMessage={(text) => getResourceIdWarning.call(this, text)}
                    text={resourceId}
                    title={translate('projects.resource_id')}
                    updateText={(resourceId) => this.props.actions.setResourceIDInProjectInformationReducer(resourceId)}
                    required={true}
                    infoText={translate('project_validation.resource_id.info')}
                  />
                </td>
              </tr>
              <tr>
                <td>
                  <LanguageIdTextBox
                    translate={translate}
                    languageId={languageId}
                    updateLanguageName={(languageName) => this.props.actions.setLanguageNameInProjectInformationReducer(languageName)}
                    updateLanguageId={(languageId) => this.props.actions.setLanguageIdInProjectInformationReducer(languageId)}
                    updateLanguageSettings={(languageId, languageName, languageDirection) => this.props.actions.setAllLanguageInfoInProjectInformationReducer(languageId, languageName, languageDirection)}
                  />
                </td>
                <td style={{ padding: '0px 0px 0px 120px' }}>
                  <TextPrompt
                    getErrorMessage={() => null}
                    text={nickname}
                    title={translate('projects.nickname')}
                    updateText={(nickname) => this.props.actions.setNicknameInProjectInformationReducer(nickname)}
                    required={false}
                    infoText={''}
                  />
                </td>
              </tr>
              <tr>
                <td>
                  <LanguageDirectionDropdownMenu
                    translate={translate}
                    languageDirection={languageDirection}
                    updateLanguageDirection={(languageDirection) => this.props.actions.setLanguageDirectionInProjectInformationReducer(languageDirection)}
                  />
                </td>
                <td style={{ padding: '0px 0px 0px 120px' }}>
                  <BookDropdownMenu
                    translate={translate}
                    bookId={bookId}
                    updateBookId={(bookId) => this.props.actions.setBookIDInProjectInformationReducer(bookId)}
                  />
                </td>
              </tr>
              </tbody>
            </table>
            <div style={{ display: 'flex', marginLeft: '-40px' }}>
              <ContributorsArea
                translate={translate}
                contributors={contributors}
                addContributor={this.addContributor.bind(this)}
                removeContributor={this.removeContributor.bind(this)}
                contributorsRequiredFieldMessage={this.state.contributorsRequiredFieldMessage}
                updateContributorName={(contributorName, index) => {
                    this.setState({ contributorsRequiredFieldMessage: false });
                    this.props.actions.updateContributorName(contributorName, index);
                }}
              />
              <CheckersArea
                translate={translate}
                checkers={checkers}
                addChecker={this.addChecker.bind(this)}
                removeChecker={this.removeChecker.bind(this)}
                checkersRequiredFieldMessage={this.state.checkersRequiredFieldMessage}
                updateCheckerName={(checkerName, index) => {
                  this.setState({ checkersRequiredFieldMessage: false });
                  this.props.actions.updateCheckerName(checkerName, index);
                }}
              />
            </div>
          </Card>
        </div>
      </ProjectValidationContentWrapper>
    );
  }
}

ProjectInformationCheck.propTypes = {
  translate: PropTypes.func.isRequired,
  actions: PropTypes.object.isRequired,
  reducers: PropTypes.object.isRequired
};

export default ProjectInformationCheck;
