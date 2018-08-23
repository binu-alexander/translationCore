const fs = require('fs-extra');
const path = require('path');
const ospath = require('ospath');
const Updater = require('tc-source-content-updater').default;
const resourcesFolder = path.join(ospath.home(),
    'translationCore', 'resources-test'); 
 
const updateResources = async function() {
  const updater = new Updater();
  const expectedLanguageCodes = ['en', 'hi', 'grc'];
 
  fs.ensureDirSync(resourcesFolder);

  if (fs.emptyDir(resourcesFolder)) {
    // get defaults because resource folder is empty
    console.log("Empty local resources.");
    await updater.downloadResources(
        expectedLanguageCodes,
        resourcesFolder
    ).catch(err => {
      console.log("No resources: " + err);
      return err;
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
};

const res = updateResources();
console.log(res);