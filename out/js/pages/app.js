const React = require('react');
const bootstrap = require('react-bootstrap');

const NavMenu = require('./../components/core/navigation_menu/NavigationMenu.js');
const SideNavBar = require('../components/core/SideBar/SideNavBar');
const LoginModal = require('../components/core/login/LoginModal');
const SwitchCheckModal = require('../components/core/SwitchCheckModal');
const SettingsModal = require('../components/core/SettingsModal.js');
const ProjectModal = require('../components/core/create_project/ProjectModal');
const Loader = require('../components/core/Loader');
const RootStyles = require('./RootStyle');
const Grid = require('react-bootstrap/lib/Grid.js');
const Row = require('react-bootstrap/lib/Row.js');
const Col = require('react-bootstrap/lib/Col.js');
const ModuleProgress = require('../components/core/ModuleProgress/ModuleProgressBar');
const Toast = require('../NotificationApi/ToastComponent');

const Welcome = require('../components/core/welcome/welcome');
const AlertModal = require('../components/core/AlertModal');
const Access = require('../components/core/AccessProject.js');
const api = window.ModuleApi;
const CheckStore = require('../stores/CheckStore.js');
const ModuleWrapper = require('../components/core/ModuleWrapper');
const CoreActions = require('../actions/CoreActions.js');
const Popover = require('../components/core/Popover');

var Main = React.createClass({
  displayName: 'Main',

  getInitialState() {
    var tutorialState = localStorage.getItem('showTutorial');
    if (tutorialState == 'true' || tutorialState === null) {
      return {
        firstTime: true
      };
    } else {
      return {
        firstTime: false
      };
    }
  },

  componentDidMount: function () {
    var saveLocation = localStorage.getItem('lastProject');
    if (localStorage.getItem('showTutorial') != 'true' && saveLocation) {
      Access.loadFromFilePath(saveLocation);
    }
  },

  componentDidUpdate: function (prevProps, prevState) {
    if (this.showCheck == true) {
      CoreActions.updateCheckModal(true);
      this.showCheck = false;
    }
  },

  finishWelcome: function () {
    this.setState({
      firstTime: false
    });
    this.showCheck = true;
  },

  render: function () {
    var _this = this;
    if (this.state.firstTime) {
      return React.createElement(Welcome, { initialize: this.finishWelcome });
    } else {
      return React.createElement(
        'div',
        { className: 'fill-height' },
        React.createElement(SettingsModal, null),
        React.createElement(LoginModal, null),
        React.createElement(SideNavBar, null),
        React.createElement(SwitchCheckModal, null),
        React.createElement(Popover, null),
        React.createElement(Toast, null),
        React.createElement(
          Grid,
          { fluid: true, className: 'fill-height', style: { marginLeft: '85px' } },
          React.createElement(
            Row,
            { className: 'fill-height main-view' },
            React.createElement(
              Col,
              { className: 'fill-height', xs: 5, sm: 4, md: 3, lg: 2 },
              React.createElement(NavMenu, null),
              React.createElement(ProjectModal, null)
            ),
            React.createElement(
              Col,
              { style: RootStyles.ScrollableSection, xs: 7, sm: 8, md: 9, lg: 10 },
              React.createElement(Loader, null),
              React.createElement(AlertModal, null),
              React.createElement(ModuleWrapper, null),
              React.createElement(ModuleProgress, null)
            )
          )
        )
      );
    }
  }
});

module.exports = React.createElement(Main, null);