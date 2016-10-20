/**
 * @author Ian Hoegen
 * @description: This is the modal for the drag and drop upload feature.
 ******************************************************************************/
const React = require('react');
const Path = require('path');
const fs = require(window.__base + 'node_modules/fs-extra');

const Button = require('react-bootstrap/lib/Button.js');
const Nav = require('react-bootstrap/lib/Nav.js');
const NavItem = require('react-bootstrap/lib/NavItem.js');

const OnlineInput = require('./OnlineInput');
const DragDrop = require('./DragDrop');
const CoreStore = require('../../stores/CoreStore');
const ManifestGenerator = require('./create_project/ProjectManifest.js');
const CheckStore = require('../../stores/CheckStore');
const ImportUsfm = require('./Usfm/ImportUSFM');
const Recent = require('./RecentProjects.js');
const api = window.ModuleApi;
const books = require('./BooksOfBible.js');

const IMPORT_PROJECT = 'Import Translation Studio Project';
const IMPORT_LOCAL = 'Import From Local Project';
const IMPORT_ONLINE = 'Import From Online';
const IMPORT_USFM = 'Import From Local USFM File';
const IMPORT_D43 = 'Import From Door43';


const UploadModal = React.createClass({
  getInitialState: function () {
    return { active: 1, show: 'link', link: "" };
  },

  /**
   * @description - This toggles our view to change from importing from online to importing
   * from disk
   * @param {integer} eventKey - The 'key' that the tabs send their 'onSelect' event listener
   */
  handleSelect: function (eventKey) {
    this.setState({ active: eventKey });
    switch (eventKey) {
      case 1:
        this.setState({ show: 'link' });
        break;
      case 2:
        this.setState({ show: 'file' });
        break;
      case 3:
        this.setState({ show: 'usfm' });
        break;
      case 4:
        this.setState({ show: 'd43' });
        break;
      default:
        break;
    }
  },

  getLink() {
    return this.refs.Online.state.value;
  },

  /**
   * @description - Generates and saves a translationCore manifest file
   * @param {string} saveLocation - Filepath of where the translationCore manifest file will
   * be saved. This is an ABSOLUTE PATH
   * @param {object} data - The translationCore manifest data to be saved
   * @param {object} tsManifest - The translationStudio manifest data loaded from a translation
   * studio project
   */
  saveManifest: function (saveLocation, data, tsManifest, callback) {
    var manifest;
    try {
      var manifestLocation = Path.join(saveLocation, 'tc-manifest.json');
      if (tsManifest.package_version == '3') {
        manifest = this.fixManifestVerThree(tsManifest);
      } else {
        manifest = ManifestGenerator(data, tsManifest);
      }
      api.putDataInCommon('tcManifest', manifest);
      fs.outputJson(manifestLocation, manifest, function (err) {
        if (err) {
          const alert = {
            title: 'Error Saving Manifest',
            content: err.message,
            leftButtonText: 'Ok'
          }
          api.createAlert(alert);
          console.error(err);
        }
        callback();
      });
    }
    catch (err) {
      console.error(err);
      const alert = {
        title: 'Error Saving Translation Studio Manifest',
        content: err.message,
        leftButtonText: 'Ok'
      }
      api.createAlert(alert);
    }
  },

  fixManifestVerThree: function (oldManifest) {
    var newManifest = {};
    for (var oldElements in oldManifest) {
      newManifest[oldElements] = oldManifest[oldElements];
    }
    newManifest.finished_chunks = oldManifest.finished_frames;
    newManifest.ts_project = {};
    newManifest.ts_project.id = oldManifest.project_id;
    newManifest.ts_project.name = api.convertToFullBookName(oldManifest.project_id);
    for (var el in oldManifest.source_translations) {
      newManifest.source_translations = oldManifest.source_translations[el];
      var parameters = el.split("-");
      newManifest.source_translations.language_id = parameters[1];
      newManifest.source_translations.resource_id = parameters[2];
      break;
    }
    return newManifest;

  },

  /**
   * @description - grabs the translationCore manifest from the folder and returns it
   * @param {string} folderpath - Path to the folder where the translationStudio is located
   */
  getManifest: function (folderPath, callback) {
    fs.readJson(Path.join(folderPath, 'tc-manifest.json'), function () {
      if (callback) {
        callback();
      }
    });
  },

  /**
   * @desription - This generates the default params from the path and saves it in the CheckStore
   * @param {string} path - The path to the folder containing the translationStudio project
   * @param {object} translationStudioManifest - The parsed json object of the translationStudio
   * manifest
   */
  getParams: function (path, tsManifest) {
    isArray = function (a) {
      return (!!a) && (a.constructor === Array);
    };
    if (tsManifest.package_version == '3') {
      tsManifest = this.fixManifestVerThree(tsManifest);
    }
    var ogPath = Path.join(window.__base, 'static', 'tagged');
    var params = {
      'originalLanguagePath': ogPath
    }
    params.targetLanguagePath = path;
    try {
      if (tsManifest.ts_project) {
        params.bookAbbr = tsManifest.ts_project.id;
      }
      else if (tsManifest.project) {
        params.bookAbbr = tsManifest.project.id;
      }
      else {
        params.bookAbbr = tsManifest.project_id;
      }

      //not actually used right now because we're hard coded for english
      if (isArray(tsManifest.source_translations)) {
        params.gatewayLanguage = tsManifest.source_translations[0].language_id;
      } else {
        params.gatewayLanguage = tsManifest.source_translations.language_id;
      }
      params.direction = tsManifest.target_language.direction || tsManifest.target_language.direction;
      if (this.isOldTestament(params.bookAbbr)) {
        params.originalLanguage = "hebrew";
      } else {
        params.originalLanguage = "greek";
      }
    } catch (e) {
      console.log("MANIFEST FORMAT NOT STANDARD");
    }
    return params;
  },

  isOldTestament: function (projectBook) {
    var passedBook = false;
    for (var book in books) {
      if (book == projectBook) passedBook = true;
      if (books[book] == "Malachi" && passedBook) {
        return true;
      }
    }
    return false;
  },

  clearPreviousData: function () {
    CheckStore.WIPE_ALL_DATA();
    api.modules = {};
  },

  /**
   * @description - Sets the target language filepath and/or link, while also generatering a TC
   * manifest file and saving the params and saveLocation under the 'common' namespace in the
   * CheckStore
   * @param {string} path - The folder path that points to the directory that the translationStudio
   * project lives, which should include a manifest file
   * @param {string} link - URL that points to the location of a translationStudio project located on
   * the GOGS server
   */
  sendFilePath: function (path, link, callback) {
    var _this = this;
    this.clearPreviousData();
    if (path) {
      if (!_this.translationCoreManifestPresent(path)) {
        //This executes if there is no tCManifest in filesystem
        this.loadTranslationStudioManifest(path,
          function (err, translationStudioManifest) {
            if (err) {
              const alert = {
                title: 'Error Getting Transaltion Studio Manifest',
                content: err.message,
                leftButtonText: 'Ok'
              }
              api.createAlert(alert);
              console.error(err);
            }
            else {
              _this.saveManifest(path, {
                user: [CoreStore.getLoggedInUser()],
                repo: link || undefined
              }, translationStudioManifest, function () {
                try {
                  Recent.add(path);
                  api.putDataInCommon('saveLocation', path);
                  api.putDataInCommon('params', _this.getParams(path, api.getDataFromCommon('tcManifest')));
                }
                catch (error) {
                  console.error(error);
                }
                if (_this.props.success) {
                  _this.props.success();
                }
                // CheckDataGrabber.loadModuleAndDependencies();
                // CoreActions.startLoading();
                _this.loadProjectThatHasManifest(path, callback);
              });
            }
          });
      }
      else {
        //this executes if there is a tCManifest present
        _this.loadProjectThatHasManifest(path, callback);
      }
    }
  },


  loadProjectThatHasManifest: function (path, callback) {
    var Access = require('./AccessProject');
    try {
      var tcManifest = fs.readJsonSync(Path.join(path, 'tc-manifest.json'));
    } catch (e) {
      console.error(e);
    }
    try {
      Recent.add(path);
      api.putDataInCommon('tcManifest', tcManifest);
      api.putDataInCommon('saveLocation', path);
      api.putDataInCommon('params', this.getParams(path, tcManifest));
      Access.loadFromFilePath(path, callback);
    } catch (err) {
      //this executes if something fails, not sure how efficient this is
      ImportUsfm.loadProject(path);
    }
  },


  /**
   * @description - Loads in a translationStudio manifest
   */
  loadTranslationStudioManifest: function (path, callback) {
    var manifestLocation = Path.join(path, 'manifest.json');
    fs.readJson(manifestLocation, callback);
  },

  /**
   * @description - This checks to see if a valid translationCore manifest file is present.
   * @param {string} path - absolute path to a translationStudio project folder
   */
  translationCoreManifestPresent: function (path) {
    //this currently just uses 'require' and if it throws an error it will return false
    try {
      var hasManifest = fs.readJsonSync(Path.join(path, 'tc-manifest.json'));
      if (hasManifest) {
        return true;
      }
    }
    catch (e) {
      return false;
    }
    return false;
  },

  /**
   * @description - Renders the upload modal
   */
  render: function () {
    var mainContent;
    var ProjectViewer = require('./login/Projects.js');
    switch (this.state.show) {
      case 'file':
        mainContent = <DragDrop
          styles={this.props.styles}
          sendFilePath={this.sendFilePath}
          properties={['openDirectory']}
          isWelcome={this.props.isWelcome}
          />;
        break;
      case 'link':
      mainContent = (
        <div>
          <br />
          <OnlineInput ref={"Online"} pressedEnter={this.props.pressedEnter} sendFilePath={this.sendFilePath} />
        </div>
      );
        break;
      case 'usfm':
      mainContent = (
        <div>
          <ImportUsfm.component isWelcome={this.props.isWelcome} />
        </div>
      );
        break;
      case 'd43':
        mainContent = (
          <div>
          <ProjectViewer/>
          </div>
        )
        break;
      default:
        mainContent = (<div> </div>)
        break;

    }
    if (this.props.show !== false) {
      return (
        <div>
          <Nav bsStyle="tabs" activeKey={this.state.active} onSelect={this.handleSelect}>
            <NavItem eventKey={1}>{IMPORT_ONLINE}</NavItem>
            <NavItem eventKey={2}>{IMPORT_LOCAL}</NavItem>
            <NavItem eventKey={3}>{IMPORT_USFM}</NavItem>
            <NavItem eventKey={4}>{IMPORT_D43}</NavItem>

          </Nav>
          {mainContent}
        </div>
      );
    } else {
      return (<div> </div>)
    }
  }
});

module.exports = UploadModal;
