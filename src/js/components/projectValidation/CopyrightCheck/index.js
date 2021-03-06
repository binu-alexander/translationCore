import React, { Component } from 'react';
import PropTypes from 'prop-types';
// components
import LicenseMarkdown from './LicenseMarkdown';
import CopyrightCard from './CopyrightCard';
import { Card } from 'material-ui/Card';
import ProjectValidationContentWrapper from '../ProjectValidationContentWrapper';

class CopyrightCheck extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showLicenseFile: false,
      currentID: null
    };
  }

  toggleShowLicenseFile(licenseId) {
    if (licenseId) {
      this.props.loadProjectLicenseMarkdownFile(licenseId);
    }
    this.setState({
      showLicenseFile: !this.state.showLicenseFile,
      currentID:licenseId
    });
  }

  render() {
    const { selectedLicenseId, projectLicenseMarkdown } = this.props.reducers.copyrightCheckReducer;
    const {translate} = this.props;
    const licenses = [
      {
        title: 'CC0 / Public Domain',
        id: 'CC0 1.0 Public Domain',
        imageName: 'publicDomain.png'
      },
      {
        title: 'Creative Commons Attribution (CC BY)',
        id: 'CC BY 4.0',
        imageName: 'ccBy.png'
      },
      {
        title: 'Creative Commons Attribution-ShareAlike (CC BY-SA)',
        id: 'CC BY-SA 4.0',
        imageName: 'ccBySa.png'
      },
      {
        title: translate('project_validation.none_of_above'),
        id: 'none',
        imageName: 'noCircle.png'
      }
    ];
    const instructions = (
      <div>
        <span>{translate('project_validation.select_copyright')}</span>
      </div>
    );

    return (
      <ProjectValidationContentWrapper translate={translate}
                                       instructions={instructions}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {translate('licenses')}
          <Card
            style={{ width: '100%', height: '100%' }}
            containerStyle={{ overflowY: 'auto', overflowX: 'hidden', height: '100%' }}
          >
            {
              this.state.showLicenseFile ?
                <LicenseMarkdown
                  id={this.state.currentID}
                  translate={translate}
                  markdownFile={projectLicenseMarkdown}
                  toggleShowLicenseFile={(licenseId) => this.toggleShowLicenseFile(licenseId)}
                />
                : (
                  licenses.map((license, index) => {
                    return (
                      <CopyrightCard
                        translate={translate}
                        key={index}
                        index={index}
                        id={license.id}
                        title={license.title}
                        selectProjectLicense={this.props.selectProjectLicense}
                        imageName={license.imageName}
                        selectedLicenseId={selectedLicenseId}
                        toggleShowLicenseFile={(licenseId) => this.toggleShowLicenseFile(licenseId)}
                      />
                    );
                  })
                )
            }
          </Card>
        </div>
      </ProjectValidationContentWrapper>
    );
  }
}

CopyrightCheck.propTypes = {
  selectProjectLicense: PropTypes.func.isRequired,
  loadProjectLicenseMarkdownFile: PropTypes.func.isRequired,
  translate: PropTypes.func.isRequired,
  reducers: PropTypes.object.isRequired
};

export default CopyrightCheck;
