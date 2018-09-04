
const fs = require('fs-extra');
const path = require('path');
const ospath = require('ospath');
const Updater = require('tc-source-content-updater').default;
const resourcesFolder = path.join(ospath.home(),
    'translationCore', 'resources-test'); 
 
const updateResources = async function() {
  const updater = new Updater();
  const expectedLanguageCodes = ['en', 'hi'];
 
  fs.ensureDirSync(resourcesFolder);

  if (fs.emptyDir(resourcesFolder)) {
    // get defaults because resource folder is empty
    console.log("Looking for resources for: " + 
        expectedLanguageCodes + " to go in: " + resourcesFolder);
    await updater.downloadResources(
        expectedLanguageCodes,
        resourcesFolder )
    .then( result => {
      console.log("Resources: ", result);
    })
    .catch( err => {
      console.log("No resources: " + err);
    });
    
  } else {

    let haveLocalResources = updater.getLocalResources();
    let neededResources = await Updater.getLatestResources(haveLocalResources);
    
    Updater.getLatestResources(haveLocalResources, function(res, err) {
      if(err) {
        return(err);
      } else {
        neededResources = res;
      }
    });
  }
  console.log( "updateResources Done.");
};

const res = updateResources();
console.log(res);
