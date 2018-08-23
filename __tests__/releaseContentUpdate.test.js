jest.mock('fs-extra');
const fs = require('fs-extra');
const path = require('path');
const ospath = require('ospath');
//const scu = require('tc-source-content-updater');


let resourcesFolder;

describe("releaseContentUpdate", () => {
  beforeEach(() => {
    fs.__resetMockFS();
    resourcesFolder = path.join(ospath.home(), 'translationCore', 'resources'); 
    fs.ensureDirSync(resourcesFolder);             
  });
  
  test("", () => {  
        let haveLocalResources = [];
        //const haveLocalResources = scu.getLocalResouces(expectedLanguageCodes);
        //expect(scu .g etLatestResources(haveLocalResources)).toBeEmpty();
        console.log( haveLocalResources + " " + neededResources);
        const filesToConvert = scu.downloadResources(neededResources);
        const convertedFiles = scu.convert(filesToConvert);
      
        convertedFiles.foreach (function(file) {
          scu.moveResources(file);
        });
  });
});