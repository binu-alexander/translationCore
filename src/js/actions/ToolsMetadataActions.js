import consts from './ActionTypes';
import path from 'path-extra';
import fs from 'fs-extra';
// constant declarations
const PACKAGE_SUBMODULE_LOCATION = path.join(__dirname, '../../../tC_apps');

export function getToolsMetadatas() {
  return ((dispatch) => {
    getDefaultTools((moduleFolderPathList) => {
      fillDefaultTools(moduleFolderPathList, (metadatas) => {
        sortMetadatas(metadatas);
        dispatch({
          type: consts.SET_TOOLS_METADATA,
          val: metadatas
        });
      });
    });
  });
}

const getDefaultTools = (callback) => {
  let defaultTools = [];
  fs.ensureDirSync(PACKAGE_SUBMODULE_LOCATION);
  let moduleBasePath = PACKAGE_SUBMODULE_LOCATION;
  let folders = fs.readdirSync(moduleBasePath);
  folders = folders.filter(folder => { // filter the folder to not include .DS_Store.
    return folder !== '.DS_Store';
  });
  if (folders) {
    for (let folder of folders) {
      let manifestPath = path.join(moduleBasePath, folder, 'package.json');
      if(fs.pathExists(manifestPath)) {
        defaultTools.push(manifestPath);
      }
    }
  }
  callback(defaultTools);
};

const sortMetadatas = (metadatas) => {
  metadatas.sort((a, b) => {
    return a.title < b.title ? -1 : 1;
  });
};

const fillDefaultTools = (moduleFilePathList, callback) => {
  let tempMetadatas = [];
  // This makes sure we're done with all the files first before we call the callback
  let totalFiles = moduleFilePathList.length;
  let doneFiles = 0;
  function onComplete() {
    doneFiles++;
    if (doneFiles === totalFiles) {
      callback(tempMetadatas);
    }
  }
  for (let filePath of moduleFilePathList) {
    fs.readJson(filePath, (error, metadata) => {
      if (error) {
        console.error(error);
      }
      else {
        metadata.folderName = path.dirname(filePath);
        metadata.imagePath = path.resolve(filePath, '../icon.png');
        metadata.badgeImagePath = path.resolve(filePath, '../badge.png');
        tempMetadatas.push(metadata);
      }
      onComplete();
    });
  }
};
