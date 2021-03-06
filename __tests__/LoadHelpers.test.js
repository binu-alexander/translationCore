/* eslint-disable no-console */
/* eslint-env jest */
jest.unmock('fs-extra');
import path from 'path-extra';
import * as bibleHelpers from '../src/js/helpers/bibleHelpers';

const workingProjectExpectedPath = path.join(__dirname, 'fixtures/project/missingVerses/no_missing_verses');
const missingVerseExpectedPath = path.join(__dirname, 'fixtures/project/missingVerses/some_missing_verses');

describe('Valid Project Actions', () => {

    test('should return project is missing verses', () => {
        const isMissing = bibleHelpers.isProjectMissingVerses(missingVerseExpectedPath, 'php', path.join(__dirname, 'fixtures/resources'));
        expect(isMissing).toBeTruthy();
    });

    test('should return project is not missing verses', () => {
        const isMissing = bibleHelpers.isProjectMissingVerses(workingProjectExpectedPath, 'tit', path.join(__dirname, 'fixtures/resources'));
        expect(isMissing).toBeFalsy();
    });
});
