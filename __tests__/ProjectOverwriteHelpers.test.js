import fs from 'fs-extra';
import path from 'path-extra';
import ospath from 'ospath';
import * as ProjectOverwriteHelpers from '../src/js/helpers/ProjectOverwriteHelpers';

const BOOK_ID = 'tit';
const PROJECT_NAME = 'en_ulb_'+BOOK_ID+'_text';
const PROJECTS_PATH = path.join(ospath.home(), 'translationCore', 'projects');
const IMPORTS_PATH = path.join(ospath.home(), 'translationCore', 'imports');
const PROJECT_PATH = path.join(PROJECTS_PATH, PROJECT_NAME);
const IMPORT_PATH = path.join(IMPORTS_PATH, PROJECT_NAME);

const mockTranslate = key => key;

describe('ProjectOverwriteHelpers.mergeOldProjectToNewProject() tests', () => {

  beforeEach(() => {
    fs.__resetMockFS();
    fs.__setMockFS({}); // initialize to empty
  });

  it('mergeOldProjectToNewProject() test usfm2 import preserves all checks and alignments', () => {
    // given
    const projectFixturePath = path.join(__dirname, 'fixtures/projectReimport', 'project_'+PROJECT_NAME, PROJECT_NAME);
    const importFixturePath = path.join(__dirname, 'fixtures/projectReimport', 'import_'+PROJECT_NAME+'_usfm2', PROJECT_NAME);
    fs.__loadDirIntoMockFs(projectFixturePath, path.join(PROJECTS_PATH, PROJECT_NAME));
    fs.__loadDirIntoMockFs(importFixturePath, path.join(IMPORTS_PATH, PROJECT_NAME));
    // when
    ProjectOverwriteHelpers.mergeOldProjectToNewProject(PROJECT_PATH, IMPORT_PATH, mockTranslate);
    // then
    const projectSelectionsDir = path.join(PROJECT_PATH, '.apps/translationCore/checkData/selections', BOOK_ID);
    const importSelectionsDir = path.join(IMPORT_PATH, '.apps/translationCore/checkData/selections', BOOK_ID);
    const chapters = fs.readdirSync(projectSelectionsDir).filter(filename => parseInt(filename) > 0);
    chapters.forEach(chapter => {
      const verses = fs.readdirSync(path.join(projectSelectionsDir, chapter)).filter(filename => parseInt(filename) > 0);
      verses.forEach(verse => {
        const files = fs.readdirSync(path.join(projectSelectionsDir, chapter, verse)).filter(filename => path.extname(filename) == '.json');
        files.forEach(file => {
          const projectFilePath = path.join(projectSelectionsDir, chapter, verse, file);
          const importFilePath = path.join(importSelectionsDir, chapter, verse, file);
          expect(fs.existsSync(importFilePath)).toBeTruthy();
          expect(fs.readJsonSync(projectFilePath)).toEqual(fs.readJsonSync(importFilePath));
        });
      });
    });
  });

  it('mergeOldProjectToNewProject() test usfm3 import preserves all checks', () => {
    // given
    const projectFixturePath = path.join(__dirname, 'fixtures/projectReimport', 'project_'+PROJECT_NAME, PROJECT_NAME);
    const importFixturePath = path.join(__dirname, 'fixtures/projectReimport', 'import_'+PROJECT_NAME+'_usfm3', PROJECT_NAME);
    fs.__loadDirIntoMockFs(projectFixturePath, path.join(PROJECTS_PATH, PROJECT_NAME));
    fs.__loadDirIntoMockFs(importFixturePath, path.join(IMPORTS_PATH, PROJECT_NAME));
    // when
    ProjectOverwriteHelpers.mergeOldProjectToNewProject(PROJECT_PATH, IMPORT_PATH, mockTranslate);
    // then
    const projectSelectionsDir = path.join(PROJECT_PATH, '.apps/translationCore/checkData/selections', BOOK_ID);
    const importSelectionsDir = path.join(IMPORT_PATH, '.apps/translationCore/checkData/selections', BOOK_ID);
    const chapters = fs.readdirSync(projectSelectionsDir).filter(filename => parseInt(filename) > 0);
    chapters.forEach(chapter => {
      const verses = fs.readdirSync(path.join(projectSelectionsDir, chapter)).filter(filename => parseInt(filename) > 0);
      verses.forEach(verse => {
        const files = fs.readdirSync(path.join(projectSelectionsDir, chapter, verse)).filter(filename => path.extname(filename) == '.json');
        files.forEach(file => {
          const projectFilePath = path.join(projectSelectionsDir, chapter, verse, file);
          const importFilePath = path.join(importSelectionsDir, chapter, verse, file);
          expect(fs.existsSync(importFilePath)).toBeTruthy();
          expect(fs.readJsonSync(projectFilePath)).toEqual(fs.readJsonSync(importFilePath));
        });
      });
    });
  });
});
