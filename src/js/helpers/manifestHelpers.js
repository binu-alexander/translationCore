/* eslint-disable no-console */
import path from 'path-extra';
import fs from 'fs-extra';
//helpers
import * as usfmHelpers from './usfmHelpers';
import * as LoadHelpers from './LoadHelpers';
//common
import BooksOfTheBible from '../common/BooksOfTheBible';

// constants
const template = {
  generator: {
    name: 'tc-desktop',
    build: ''
  },
  target_language: {
    id: '',
    name: '',
    direction: '',
    book: {
      name: undefined
    }
  },
  project: {
    id: '',
    name: ''
  },
  type: {
    id: '',
    name: ''
  },
  source_translations: [],
  translators: [],
  checkers: [],
  time_created: '',
  tools: [],
  repo: '',
  tcInitialized: true
};

/**
 * Retrieves tC manifest and returns it or if not available looks for tS manifest.
 * If neither are available tC has no way to load the project, unless its a usfm project.
 * @param {string} projectPath - path location in the filesystem for the project.
 */
export function getProjectManifest(projectPath) {
  let manifest = LoadHelpers.loadFile(projectPath, 'manifest.json');
  let tCManifest = LoadHelpers.loadFile(projectPath, 'tc-manifest.json');
  manifest = manifest || tCManifest;
  if (!manifest || !manifest.tcInitialized) {
    manifest = setUpManifest(projectPath, manifest);
  }
  return manifest;
}

/**
 * try to find nickname and resourceId in tStudio manifest
 * @param manifest
 */
export function findResourceIdAndNickname(manifest) {
  let nickname = '';
  let resourceId = '';
  if (manifest.resource) {
    nickname = manifest.resource.slug || nickname;
    resourceId = manifest.resource.name || resourceId;
  }

  if (manifest.dublin_core) {
    nickname = manifest.dublin_core.identifier || nickname;
    resourceId = manifest.dublin_core.title || resourceId;
  }

  if (nickname || resourceId) {
    if (!manifest.project) {
      manifest.project = {};
    }
    manifest.project.resourceId = resourceId || '';
    manifest.project.nickname = nickname || '';
  }
}

/**
 * @description Generates and saves a translationCore manifest file
 * @param {String} projectSaveLocation - absolute path where the translationCore manifest file will be saved.
 * @param {object} oldManifest - The translationStudio manifest data loaded from a translation
 * studio project
 */
export function setUpManifest(projectSaveLocation, oldManifest) {
  let manifest;
  try {
    let manifestLocation = path.join(projectSaveLocation, 'manifest.json');
    if (oldManifest && oldManifest.package_version == '3') {
      //some older versions of ts-manifest have to be tweaked to work
      manifest = fixManifestVerThree(oldManifest);
    } else if (oldManifest) {
      manifest = oldManifest;
    } else {
      manifest = template;
    }
    findResourceIdAndNickname(manifest);
    fs.outputJsonSync(manifestLocation, manifest);
  } catch (err) {
    console.error(err);
  }
  return manifest;
}

/**
 * @desription - Uses the tc-standard format for projects to make package_version 3 compatible
 * @param {object} oldManifest - The name of an employee.
 */
export function fixManifestVerThree(oldManifest) {
  let newManifest = {};
  try {
    for (let oldElements in oldManifest) {
      newManifest[oldElements] = oldManifest[oldElements];
    }
    newManifest.finished_chunks = oldManifest.finished_frames;
    newManifest.project = {};
    newManifest.project.id = oldManifest.project_id;
    newManifest.project.name = this.convertToFullBookName(oldManifest.project_id);
    for (let el in oldManifest.source_translations) {
      newManifest.source_translations = oldManifest.source_translations[el];
      let parameters = el.split("-");
      newManifest.source_translations.language_id = parameters[1];
      newManifest.source_translations.resource_id = parameters[2];
      break;
    }
  } catch (e) {
    console.error(e);
  }
  return newManifest;
}

/**
 * @description Check if project is titus, or if user is in developer mode.
 * @param {object} manifest - Manifest specified for tC load, already formatted.
 */
export function checkIfValidBetaProject(manifest) {
  if (manifest && manifest.project) return (BooksOfTheBible.newTestament[manifest.project.id]?true:false);
  else return false;
}


/**
 * @description Sets up a USFM project manifest according to tC standards.
 * @param {object} parsedUSFM - The object containing usfm parsed by chapters
 */
export function generateManifestForUsfmProject(parsedUSFM) {
  let usfmDetails = usfmHelpers.getUSFMDetails(parsedUSFM);
  return {
    generator: {
      name: 'tc-desktop',
      build: ''
    },
    target_language: {
      id: usfmDetails.language.id || '',
      name: usfmDetails.language.name || '',
      direction: usfmDetails.language.direction || '',
      book: {
        name: usfmDetails.target_languge.book.name || ''
      }
    },
    ts_project: {
      id: usfmDetails.book.id || '',
      name: usfmDetails.book.name || ''
    },
    project: {
      id: usfmDetails.book.id || '',
      name: usfmDetails.book.name || ''
    },
    type: {
      id: 'text',
      name: 'Text'
    },
    source_translations: [
      {
        language_id: 'en',
        resource_id: 'ult',
        checking_level: '',
        date_modified: new Date(),
        version: ''
      }
    ],
    resource: {
      id: '',
      name: ''
    },
    translators: [],
    checkers: [],
    time_created: new Date(),
    tools: [],
    repo: '',
    tcInitialized: true
  };
}
