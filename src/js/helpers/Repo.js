import NodeGit from 'nodegit';

/**
 * Generates credentials for communicating with the remote.
 * @param {object} user - the logged in user
 * @return {NodeGit.Cred} - A NodeGit Cred object.
 */
function generateCred (user) {
  return NodeGit.Cred.userpassPlaintextNew(user.username, user.token);
}

/**
 * Provides tools for manipulating a git repository.
 */
export class Repo {

  /**
   * @param {NodeGit.repository} repo - a repository opened by {@link NodeGit}
   */
  constructor (repo) {
    this.repo = repo;
  }

  /**
   * Opens an existing repository
   * @param {string} directory - the file path to the repository
   * @return {Promise<Repo>}
   */
  static async open (directory) {
    const repo = await NodeGit.Repository.open(directory);
    return new Repo(repo);
  }

  /**
   * Initializes a new repository
   * @param {string} directory - the file path to the repository
   * @param {boolean} isBare - indicates if the repo should be bare
   * @return {Promise<Repo>} an instance of the repo
   */
  static async init (directory, isBare) {
    const repo = await NodeGit.Repository.init(directory, isBare);
    return new Repo(repo);
  }

  /**
   * Clones a remote repository
   * @param {string} url - the remote repository to be cloned
   * @param {string} dest - the local destination of the repository
   * @return {Promise<Repo>} - an instance of the repo
   */
  static async clone (url, dest) {
    const config = {
      fetchOpts: {
        callbacks: {
          certificateCheck: () => {
            // github will fail cert check on some OSX machines
            // this overrides that check
            return 1;
          }
        }
      }
    };

    const repo = await NodeGit.Clone(url, dest, config);
    // TODO: clone recursively
    return new Repo(repo);
  }

  /**
   *
   * @param {string} remoteName - the name of the remote
   * @param {string} branch - the name of the branch to push
   * @param {object} user - the logged in user
   * @return {Promise<number>} - the error code if there is one
   */
  async push (remoteName, branch, user) {
    const remote = await NodeGit.Remote.lookup(this.repo, remoteName);
    return await remote.push(
      [`refs/heads/${branch}:refs/heads/${branch}`],
      {
        callbacks: {
          credentials: () => {
            return generateCred(user);
          }
        }
      }
    );
  }

  /**
   * Adds a new remote endpoint to this repo.
   * If the remote name already exists it will be overwritten.
   * @param {string} url - the remote repository url
   * @param {string} name - the local remote alias
   * @return {Promise<NodeGit.Remote>} - an instance of the remote
   */
  async addRemote (url, name) {
    await this.removeRemote(name);
    await NodeGit.Remote.create(this.repo, name, url);
  }

  /**
   * Removes a named remote from this repo.
   * @param {string} name - the locale remote alias
   * @return {Promise}
   */
  removeRemote (name) {
    return NodeGit.Remote.delete(this.repo, name);
  }

  /**
   * Performs an add and commit on all files in the repo
   * @param {object} user - the logged in user
   * @param {string} message - the commit message
   * @return {Promise<>}
   */
  async save (user, message) {
    const index = await this.repo.refreshIndex();
    await index.addAll('*');
    await index.write();
    const oid = await index.writeTree();
    const head = await NodeGit.Reference.nameToId(this.repo, 'HEAD');
    const parent = await this.repo.getCommit(head);

    let name = 'translationCore User';
    let email = 'Unknown';
    if (user) {
      name = user.full_name || user.username || name;
      email = user.email || email;
    }
    const author = NodeGit.Signature.now(name, email);

    await this.repo.createCommit('HEAD', author, author, message, oid,
      [parent]);
  }
}
