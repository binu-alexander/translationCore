import path from 'path-extra';

const CHECKDATA_DIRECTORY = path.join('.apps', 'translationCore', 'checkData');

export const getCheckDataFolderPath = (projectSaveLocation, bookAbbreviation, checkDataName) => {
  return path.join(projectSaveLocation, CHECKDATA_DIRECTORY, checkDataName, bookAbbreviation);
};
