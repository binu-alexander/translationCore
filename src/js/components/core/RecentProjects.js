const React = require('react');
const path = require('path');
const Button = require('react-bootstrap/lib/Button.js');
const api = window.ModuleApi;
const CheckStore = require('../../stores/CheckStore');
const Upload = require('./UploadMethods');
const {shell} = require('electron')

function addToRecent(path) {
  var previousProjects = localStorage.getItem('previousProjects');
  previousProjects = previousProjects ? JSON.parse(previousProjects) : [];
  if (previousProjects.includes(path)) {
    var indexOfProject = previousProjects.indexOf(path);
      previousProjects.splice(indexOfProject, 1);
  }
  previousProjects.push(path);
  localStorage.setItem('previousProjects', JSON.stringify(previousProjects));
}

module.exports = class RecentProjects extends React.Component {
    constructor(){
    super();
    this.state = {
      working:"true"
    }
  }
  getProjects() {
    var projects = JSON.parse(localStorage.getItem('previousProjects'));
    if (projects) return projects.reverse();
    return [];
  }

  loadProject(filePath) {
    Upload.sendFilePath(filePath, null, this.props.onLoad(this));
    api.putDataInCommon('saveLocation', filePath);
  }

  generateDisplay() {
    var projectPaths = this.getProjects();
    var projects = [];
    var i = 0;
    for (var project in projectPaths) {
      var projectPath = projectPaths[project];
      var projectName = path.basename(projectPath);
      projects.push(
        <div key={i++}>
          <span className={'pull-right'}>
            <Button onClick={this.loadProject.bind(this, projectPath)}>Load Project</Button>
          </span>
          <h3>{projectName}</h3>
          <p> Location:
            <a onClick={shell.showItemInFolder.bind(shell, projectPath)}
               style={{cursor: 'pointer'}}>
              {' ' + projectPaths[project]}
            </a>
          </p>
        </div>
      );
    }
    if (projects.length === 0) return (<p>Click the load button to start checking</p>);
    return projects;
  }

  render() {
    return (
      <div>
      {this.generateDisplay()}
      </div>
    );
  }
}
