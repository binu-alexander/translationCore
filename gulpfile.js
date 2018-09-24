const gulp = require('gulp');
const mkdirp = require('mkdirp');
const argv = require('yargs').argv;
const fs = require('fs-extra');
const request = require('./scripts/request');
const packager = require('electron-packager');
const change = require('gulp-change');
const path = require('path');
const rimraf = require('rimraf');
const del = require('del');
const CrowdinApi = require('./scripts/CrowdinApi');
const ncp = require('ncp').ncp;
const exec = require('child_process').execSync;
const pexec = require('promised-exec');
const pkg = require('./package.json');
const devDeps = Object.keys(pkg.devDependencies);

const BUILD_DIR = './out/';
const RELEASE_DIR = './release/';
const iconPath = 'src/images/icon'; // without extension
const DEFAULT_OPTS = {
  dir: '.',
  // name: pkg.productName,
  // https://github.com/atom/electron/blob/master/docs/tutorial/application-packaging.md
  asar: true,
  quiet: true,
  ignore: [
    '.github',
    'coverage',
    '.idea',
    '__tests__',
    '__mocks__',
    'vendor',
    BUILD_DIR,
    RELEASE_DIR,
    'scripts',
    '\\.(?!env)' // TRICKY: exclude hidden files except for .env files
  ].concat(devDeps.map(name => `/node_modules/${name}($|/)`)),
  version: getElectronVersion(),
  'app-version': pkg.version
};

function copy (src, dest) {
  return new Promise((resolve, reject) => {
    console.log(`copying ${src} to ${dest}`);
    ncp(src, dest, (err) => {
      if (err) {
        console.log(`failed copying ${src}`);
        reject(err);
      } else {
        console.log(`finished copying ${src}`);
        resolve();
      }
    });
  });
}

const getBranchType = () => {
  if (process.env.TRAVIS && process.env.TRAVIS_BRANCH) {
    if (process.env.TRAVIS_BRANCH.startsWith('release-')) {
      return 'release';
    } else if (process.env.TRAVIS_BRANCH.startsWith('sandbox-')) {
      return 'sandbox';
    } else if (process.env.TRAVIS_BRANCH === 'develop') {
      return 'develop';
    }
  }
  return 'unknown';
};

function installNodeGit (target) {
  console.log(`Installing nodegit for ${target.platform}-${target.arch}`);
  return pexec(
    `npm i nodegit --target_arch=${target.arch} --target_platform=${target.platform}`);
}

gulp.task('crowdin', () => {
  if (process.env.CROWDIN_API_KEY && process.env.CROWDIN_PROJECT) {
    const api = new CrowdinApi({ apiKey: process.env.CROWDIN_API_KEY });
    const files = {
      'English-en_US.json': './src/locale/English-en_US.json'
    };
    return api.updateFile(process.env.CROWDIN_PROJECT, files)
      .then(function(result) {
        if (result.success) {
          console.log('Crowdin upload succeeded', result.files);
        } else {
          console.log(result);
        }
      })
      .catch(function(err) {
        console.log('Crowdin error', err);
      });
  } else {
    console.log('Missing Crowdin environment vars. Skipping locale upload.');
  }
});

/**
 * set developer build properties
 * TRICKY: this will modify package.json.
 * however, these changes should not be committed to git.
 * As a safety net this will only run on travis.
 */
gulp.task('set_mode', () => {
  let p = require('./package');
  if (!process.env.TRAVIS) {
    console.log('Skipping build mode. On non-travis environment');
    return Promise.resolve();
  }

  if (process.env.TRAVIS_TAG) {
    console.log('Tag mode');
    if (!process.env.TRAVIS_TAG.startsWith('v')) {
      return Promise.reject(`The tag must be prefixed with a "v".`);
    }
    if (process.env.TRAVIS_TAG !== `v${p.version}`) {
      return Promise.reject(
        `The package version does not match the tag name. Expected ${process.env.TRAVIS_TAG} but found ${p.version}`);
    }
  } else if (process.env.TRAVIS_BRANCH &&
    process.env.TRAVIS_BRANCH.startsWith('release-')) {
    console.log('Release mode');
    let branchVersion = process.env.TRAVIS_BRANCH.replace(/^release-/, '');
    if (!branchVersion.startsWith('v')) {
      return Promise.reject(
        `The release branch version must be prefixed with a "v".`);
    }
    if (branchVersion !== `v${p.version}`) {
      return Promise.reject(
        `The package version does not match the release branch version. Expected ${branchVersion} but found ${p.version}`);
    }
    return Promise.resolve();
  } else {
    console.log('Develop mode');
    p.developer_mode = true;
    if (process.env.TRAVIS_COMMIT) {
      p.version = p.version + '-' + process.env.TRAVIS_COMMIT.substring(0, 7);
    } else {
      p.version = p.version + '-dev';
    }

    // write modifications to package
    return gulp.src(['package.json'])
      .pipe(change(() => {
        return JSON.stringify(p);
      }))
      .pipe(gulp.dest('./'));
  }
});

gulp.task('clean', done => {
  rimraf.sync(BUILD_DIR);
  rimraf.sync(RELEASE_DIR);
  rimraf.sync('node_modules');
  done();
});

function build (target) {
  return clean(target)
    .then(() => installNodeGit(target))
    .then(() => packageApp(target));
}

gulp.task('build_binaries', () => {
  // let platforms = [];

  // if (argv.win) platforms.push('win32');
  // if (argv.osx) platforms.push('darwin'); // legacy
  // if (argv.macos) platforms.push('darwin');
  // if (argv.linux) platforms.push('linux');
  // if (!platforms.length) platforms.push('win32', 'darwin', 'linux');

  if(!argv.platform) {
    throw new Error('You must specify a platform. --platform (win32|darwin|linux)');
  }
  if(!argv.arch) {
    throw new Error('You must specify an architecture. --arch (x64|ia32)');
  }

  const target = {
    platform: argv.platform,
    arch: argv.arch
  };

  return build(target)
    .then(() => {
      console.log('All done');
    })
    .catch(err => {
      console.error('Error during the build:');
      console.error(err);
    });
  //
  // let p = require('./package');
  //
  // let ignored = Object.keys(p['devDependencies']).concat([
  //   '.github',
  //   'coverage',
  //   '.idea',
  //   '__tests__',
  //   '__mocks__',
  //   'vendor',
  //   BUILD_DIR,
  //   RELEASE_DIR,
  //   'scripts',
  //   '\\.(?!env)' // TRICKY: exclude hidden files except for .env files
  // ]).map(name => {
  //   return new RegExp('(^/' + name + '|' + '^/node_modules/' + name + ')');
  // });

  // packager({
  //   'asar': true,
  //   'quiet': true,
  //   'arch': argv.win ? 'all' : 'x64',
  //   'platform': platforms,
  //   'dir': '.',
  //   'ignore': function(name) {
  //     for (let i = 0, len = ignored.length; i < len; ++i) {
  //       if (ignored[i].test(name)) {
  //         console.log('\t(Ignoring)\t', name);
  //         return true;
  //       }
  //     }
  //
  //     return false;
  //   },
  //   'out': BUILD_DIR,
  //   'app-version': p.version,
  //   'icon': './src/images/icon'
  // }, (err) => {
  //   if (err) {
  //     throw new Error(err);
  //   }
  //   console.log('Done building...');
  //   done();
  // });
});

/**
 * Releases a linux build
 * @param out - the path to which the release will be saved
 */
gulp.task('release-linux', () => {
  const p = require('./package');
  const archiver = require('archiver');

  const outPath = argv.out;
  if (!outPath || typeof outPath !== 'string') {
    throw new Error('The --out argument is required.');
  }

  mkdirp.sync('release');
  const buildPath = BUILD_DIR + p.name + '-linux-x64/';
  if (!fs.existsSync(buildPath)) {
    throw new Error(`The build path "${buildPath}" does not exist`);
  }

  return new Promise((resolve, reject) => {
    const dest = path.normalize(outPath);
    mkdirp.sync(path.dirname(dest));
    try {
      let output = fs.createWriteStream(dest);
      output.on('close', resolve);
      let archive = archiver.create('zip');
      archive.on('error', reject);
      archive.pipe(output);
      archive.directory(buildPath, p.name);
      archive.finalize();
    } catch (e) {
      reject(e);
    }
  });
});

/**
 * Compiles a .deb package
 * @param out - the path to which the release will be saved
 */
gulp.task('release-linux-deb', () => {
  const p = require('./package');

  const outPath = argv.out;
  if (!outPath || typeof outPath !== 'string') {
    throw new Error('The --out argument is required.');
  }

  mkdirp.sync('release');
  const buildPath = BUILD_DIR + p.name + '-linux-x64/';
  if (!fs.existsSync(buildPath)) {
    throw new Error(`The build path "${buildPath}" does not exist`);
  }

  // build .deb
  const tmp = buildPath.replace(/\/+$/, '') + '.deb.stage';
  const optDir = path.join(tmp, 'opt/translationcore');
  mkdirp.sync(tmp);

  return copy('./scripts/deb', tmp)
    .then(() => {
      return copy(buildPath, optDir);
    }).then(() => {
      console.log('compiling');
      // compile
      return new Promise((resolve, reject) => {
        const exec = require('child_process').exec;
        const dest = path.normalize(outPath);
        mkdirp.sync(path.dirname(dest));
        let cmd = `dpkg-deb --build ${tmp} ${dest}`;
        exec(cmd, function(err) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    });
});

/**
 * Releases a macOS build
 * @param out - the path to which the release will be saved.
 */
gulp.task('release-macos', () => {
  const p = require('./package');
  const exec = require('child_process').exec;
  const isLinux = /^linux/.test(process.platform);
  const isMacOS = /^darwin/.test(process.platform);

  const outPath = argv.out;
  if (!outPath || typeof outPath !== 'string') {
    throw new Error('The --out argument is required.');
  }

  if (!isLinux && !isMacOS) {
    throw new Error('You must be on Linux or macOS to create macOS releases');
  }

  mkdirp.sync('release');
  const buildPath = BUILD_DIR + p.name + '-darwin-x64/';
  if (!fs.existsSync(buildPath)) {
    throw new Error(`The build path "${buildPath}" does not exist`);
  }

  return new Promise((resolve, reject) => {
    const dest = path.normalize(outPath);
    mkdirp.sync(path.dirname(dest));
    let cmd = `scripts/osx/makedmg.sh "${p.name}" ${buildPath} ${dest}`;
    console.log(cmd);
    exec(cmd, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
});

/**
 * Releases a Windows x64 build
 */
gulp.task('release-win64', () => {
  const p = require('./package');

  const outPath = argv.out;
  if (!outPath || typeof outPath !== 'string') {
    throw new Error('The --out argument is required.');
  }

  const buildPath = BUILD_DIR + p.name + '-win32-x64/';
  if (!fs.existsSync(buildPath)) {
    throw new Error(`The build path "${buildPath}" does not exist`);
  }

  return releaseWindows('64', buildPath, path.normalize(outPath));
});

/**
 * Releases a Windows x32 build
 */
gulp.task('release-win32', () => {
  const p = require('./package');

  const outPath = argv.out;
  if (!outPath || typeof outPath !== 'string') {
    throw new Error('The --out argument is required.');
  }

  const buildPath = BUILD_DIR + p.name + '-win32-ia32/';
  if (!fs.existsSync(buildPath)) {
    throw new Error(`The build path "${buildPath}" does not exist`);
  }

  return releaseWindows('32', buildPath, path.normalize(outPath));
});

/**
 * Releases a windows build
 * @param {string} arch - the os architecture (e.g. 64 or 32)
 * @param {string} src - the build directory
 * @param {string} dest - the release file path
 * @return {Promise<never>}
 */
const releaseWindows = (arch, src, dest) => {
  const p = require('./package');
  const exec = require('child_process').exec;

  const gitVersion = '2.9.2';
  const isLinux = /^linux/.test(process.platform);
  const isWindows = /^win/.test(process.platform);

  // locate Inno Setup
  let isccPath;
  if (isLinux) {
    isccPath = './scripts/innosetup/iscc';
  } else if (isWindows) {
    isccPath = `"${process.env['ProgramFiles(x86)']}/Inno Setup 5/ISCC.exe"`;
  } else {
    return Promise.reject(
      'Windows builds can only be released on linux and windows');
  }

  // on windows you can manually install Inno Setup
  // on linux you can execute ./scripts/innosetup/setup.sh
  if (!fs.existsSync(isccPath.replace(/"/g, ''))) {
    return Promise.reject(
      'Inno Setup is not installed. Please install Inno Setup and try again.');
  }

  const destDir = path.dirname(dest);
  mkdirp.sync(destDir);
  // TRICKY: the iss script cannot take the .exe extension on the file name
  const file = path.basename(dest, '.exe');
  let cmd = `${isccPath} scripts/win_installer.iss /DArch=${arch === '64'
    ? 'x64'
    : 'x86'} /DRootPath=../ /DVersion=${p.version} /DGitVersion=${gitVersion} /DDestFile=${file} /DDestDir=${destDir} /DBuildDir=${BUILD_DIR} /q`;

  return downloadWinGit(gitVersion, arch).then(() => {
    return new Promise(function(resolve, reject) {
      console.log(`Generating ${arch} bit windows installer`);
      console.log(`executing: \n${cmd}\n`);
      exec(cmd, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });
};

/**
 * Downloads git for windows
 * @param version
 * @param arch
 * @return {*}
 */
const downloadWinGit = function(version, arch) {
  let url = `https://github.com/git-for-windows/git/releases/download/v${version}.windows.1/Git-${version}-${arch}-bit.exe`;
  let dir = './vendor';
  let dest = dir + `/Git-${version}-${arch}-bit.exe`;
  mkdirp.sync(dir);
  if (!fs.existsSync(dest)) {
    console.log(`Downloading git ${version} for ${arch} bit from ${url}`);
    return request.download(url, dest);
  } else {
    console.log(`Cache hit: ${dest}`);
    return Promise.resolve();
  }
};

gulp.task('release', done => {
  const p = require('./package');
  const archiver = require('archiver');
  const exec = require('child_process').exec;
  const isLinux = /^linux/.test(process.platform);
  const isMacOS = /^darwin/.test(process.platform);

  let promises = [];
  let platforms = [];
  const gitVersion = '2.9.2';

  if (argv.win) platforms.push('win32', 'win64');
  if (argv.win32) platforms.push('win32');
  if (argv.win64) platforms.push('win64');
  if (argv.osx) platforms.push('darwin'); // legacy
  if (argv.macos) platforms.push('darwin');
  if (argv.linux) platforms.push('linux');
  if (!platforms.length) platforms.push('win32', 'win64', 'darwin', 'linux');

  /**
   *
   * @param version 2.9.2
   * @param arch 64|32
   * @returns {Promise}
   */
  const downloadGit = function(version, arch) {
    let url = `https://github.com/git-for-windows/git/releases/download/v${version}.windows.1/Git-${version}-${arch}-bit.exe`;
    let dir = './vendor';
    let dest = dir + `/Git-${version}-${arch}-bit.exe`;
    mkdirp.sync(dir);
    if (!fs.existsSync(dest)) {
      console.log(`Downloading git ${version} for ${arch} bit from ${url}`);
      return request.download(url, dest);
    } else {
      console.log('Using cached git installer');
      return Promise.resolve();
    }
  };

  /**
   * This depends on first installing InnoSetup. On linux run ./scripts/innosetup/setup.sh
   * On windows download and install from http://www.jrsoftware.org/isinfo.php
   *
   * @param arch 64|32
   * @param os
   * @returns {Promise}
   */
  const releaseWin = function(arch, os) {
    let isccPath;
    if (isLinux) {
      isccPath = './scripts/innosetup/iscc';
    } else if (/^win/.test(process.platform)) {
      isccPath = `"${process.env['ProgramFiles(x86)']}/Inno Setup 5/ISCC.exe"`;
    } else {
      return Promise.reject(
        'Windows builds can only be released on linux and windows');
    }

    // on windows you can manually install Inno Setup
    // on linux you can execute ./scripts/innosetup/setup.sh
    if (!fs.existsSync(isccPath.replace(/"/g, ''))) {
      return Promise.reject(
        'Inno Setup is not installed. Please install Inno Setup and try again.');
    }

    // TRICKY: the iss script cannot take the .exe extension on the file name
    let file = `translationCore-win-x${arch}-${p.version}.setup`;
    let destDir = `${RELEASE_DIR}win-x${arch}/`;
    mkdirp(destDir);
    let cmd = `${isccPath} scripts/win_installer.iss /DArch=${arch === '64'
      ? 'x64'
      : 'x86'} /DRootPath=../ /DVersion=${p.version} /DGitVersion=${gitVersion} /DDestFile=${file} /DDestDir=${destDir} /DBuildDir=${BUILD_DIR} /q`;
    return new Promise(function(resolve, reject) {
      console.log(`Generating ${arch} bit windows installer`);
      console.log(`executing: \n${cmd}\n`);
      exec(cmd, function(err, stdout, stderr) {
        if (err) {
          console.error(err);
          resolve({
            os: os,
            status: 'error',
            path: null
          });
        } else {
          resolve({
            os: 'win' + arch,
            status: 'ok',
            path: destDir + file + '.exe',
            link: `http://win${arch}.tc-${getBranchType()}.unfoldingword.surge.sh/${file}.exe`
          });
        }
      });
    });
  };

  mkdirp('release', function() {
    for (let os of platforms) {
      switch (os) {
        case 'win32':
          if (fs.existsSync(BUILD_DIR + p.name + '-win32-ia32/')) {
            promises.push(downloadGit(gitVersion, '32')
              .then(releaseWin.bind(undefined, '32', os)));
          } else {
            promises.push(Promise.resolve({
              os: os,
              status: 'missing',
              path: null
            }));
          }
          break;
        case 'win64':
          if (fs.existsSync(BUILD_DIR + p.name + '-win32-x64/')) {
            promises.push(downloadGit(gitVersion, '64')
              .then(releaseWin.bind(undefined, '64', os)));
          } else {
            promises.push(Promise.resolve({
              os: os,
              status: 'missing',
              path: null
            }));
          }
          break;
        case 'darwin':
          if ((isLinux || isMacOS) &&
            fs.existsSync(BUILD_DIR + p.name + '-darwin-x64/')) {
            promises.push(new Promise(function(os, resolve, reject) {
              let src = `out/${p.name}-darwin-x64`;
              let name = `translationCore-macos-x64-${p.version}.dmg`;
              let dest = `${RELEASE_DIR}macos-x64/${name}`;
              mkdirp(path.dirname(dest));
              let cmd = `scripts/osx/makedmg.sh "${p.name}" ${src} ${dest}`;
              console.log(cmd);
              exec(cmd, function(err, stdout, stderr) {
                if (err) {
                  console.log(err);
                  resolve({
                    os: os,
                    status: 'error',
                    path: null
                  });
                } else {
                  resolve({
                    os: os,
                    status: 'ok',
                    path: dest,
                    link: `http://macos.tc-${getBranchType()}.unfoldingword.surge.sh/${name}`
                  });
                }
              });
            }.bind(undefined, os)));
          } else {
            if (!isLinux && !isMacOS) console.log(
              'You must be on linux or macOS to create macOS releases');
            promises.push(Promise.resolve({
              os: os,
              status: 'missing',
              path: null
            }));
          }
          break;
        case 'linux':
          if (isLinux && fs.existsSync(BUILD_DIR + p.name + '-linux-x64/')) {
            promises.push(new Promise(function(os, resolve, reject) {
              let name = `translationCore-linux-x64-${p.version}.zip`;
              let dest = `${RELEASE_DIR}linux-x64/${name}`;
              mkdirp.sync(path.dirname(dest));
              try {
                let output = fs.createWriteStream(dest);
                output.on('close', function() {
                  resolve({
                    os: os,
                    status: 'ok',
                    path: dest,
                    link: `http://linux.tc-${getBranchType()}.unfoldingword.surge.sh/${name}`
                  });
                });
                let archive = archiver.create('zip');
                archive.on('error', reject);
                archive.pipe(output);
                archive.directory(BUILD_DIR + p.name + '-linux-x64/', p.name);
                archive.finalize();
              } catch (e) {
                console.error(e);
                resolve({
                  os: os,
                  status: 'error',
                  path: null
                });
              }
            }.bind(undefined, os)));
          } else {
            if (!isLinux) console.log(
              'You must be on linux to create linux releases');
            promises.push(Promise.resolve({
              os: os,
              status: 'missing',
              path: null
            }));
          }
          break;
        default:
          console.warn('No release procedure has been defined for ' + os);
      }
    }
    return Promise.all(promises).then(function(values) {
      mkdirp(RELEASE_DIR + 'overview');
      var releaseNotes = fs.createWriteStream(RELEASE_DIR +
        'overview/index.html');
      releaseNotes.on('error', function(e) {
        console.error(e);
      });
      releaseNotes.write('<link rel="stylesheet" href="build.css">');
      releaseNotes.write(
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">');
      fs.createReadStream('scripts/releases/builds/build.css')
        .pipe(fs.createWriteStream('release/overview/build.css'));
      releaseNotes.write(
        `<h1>${p.name} <span id="build-num">${p.version}</span></h1><ul>`);
      if (process.env.TRAVIS_COMMIT) {
        var branch = process.env.TRAVIS_BRANCH;
        var commit = process.env.TRAVIS_COMMIT;
        var buildNumber = process.env.TRAVIS_BUILD_NUMBER;
        var buildId = process.env.TRAVIS_BUILD_ID;
        var repoSlug = process.env.TRAVIS_REPO_SLUG;
        releaseNotes.write(
          `<h2><a href="https://github.com/${repoSlug}/commit/${commit}" target="_blank">Commit ${commit.substring(
            0, 7)} on ${branch}</a></h2>`);
        releaseNotes.write(
          `<h2><a href="https://travis-ci.org/${repoSlug}/builds/${buildId}" target="_blank">Travis build #${buildNumber}</a></h2>`);
      }
      for (var release of values) {
        if (release.status === 'ok') {
          release.path = release.path.substring(release.path.indexOf('/') + 1);
          releaseNotes.write(
            `<li class="ok">${release.os} <span class="status">${release.status}</span> <a href="${release.link}" class="build-link" data-os="${release.os}">Download</a></li>`);
        } else {
          releaseNotes.write(
            `<li class="${release.status}">${release.os} <span class="status">${release.status}</span>`);
        }
        console.log(`${release.os}: ${release.status} : ${release.path}`);
      }
      releaseNotes.write('</ul>');
      releaseNotes.end();
      done();
    }).catch(done);
  });
});

gulp.task('build', gulp.series('set_mode', 'build_binaries'));

// utils

function clean(target) {
  console.log(`Removing ${BUILD_DIR}/${target.platform}-${target.arch}`);
  return del(`${BUILD_DIR}/${target.platform}-${target.arch}`);
}

function packageApp (target) {
  console.log(`building: ${target.platform}-${target.arch}`);
  const opts = Object.assign({}, DEFAULT_OPTS, target, {
    icon: './src/images/icon',//getIcon(target.platform),
    // prune: true,
    out: `${BUILD_DIR}/${target.platform}-${target.arch}`
  });
  return doPackage(opts);
}

function doPackage (opts) {
  return new Promise((resolve, reject) => {
    packager(opts, function(err, appPath) {
      if (err) {
        reject(err);
      } else {
        resolve(appPath);
      }
    });
  });
}

function getElectronVersion () {
  try {
    const out = exec('npm list electron-prebuilt').toString();
    return out.split('electron-prebuilt@')[1].replace(/\s/g, '');
  } catch (err) {
    return '2.0.10';
  }
}

function getIcon (platform) {
  const iconExt = platform === 'darwin' ? '.icns' : platform === 'win32'
    ? '.ico'
    : '.png';
  return iconPath + iconExt;
}
