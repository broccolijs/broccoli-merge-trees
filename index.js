const Plugin = require('broccoli-plugin')
const loggerGen = require('heimdalljs-logger');
const FSTree = require('fs-tree-diff');
const Entry = require('fs-tree-diff/lib/entry');
const isDirectory = Entry.isDirectory;
const heimdall = require('heimdalljs');

function ApplyPatchesSchema() {
  this.mkdir = 0;
  this.rmdir = 0;
  this.unlink = 0;
  this.change = 0;
  this.create = 0;
  this.other = 0;
  this.processed = 0;
  this.linked = 0;
}

module.exports = BroccoliMergeTrees
BroccoliMergeTrees.prototype = Object.create(Plugin.prototype)
BroccoliMergeTrees.prototype.constructor = BroccoliMergeTrees
function BroccoliMergeTrees(inputNodes, options) {
  if (!(this instanceof BroccoliMergeTrees)) return new BroccoliMergeTrees(inputNodes, options)
  options = options || {}
  var name = 'broccoli-merge-trees:' + (options.annotation || '')
  if (!Array.isArray(inputNodes)) {
    throw new TypeError(name + ': Expected array, got: [' + inputNodes +']')
  }
  Plugin.call(this, inputNodes, {
    persistentOutput: true,
    needsCache: false,
    fsFacade: true,
    annotation: options.annotation
  })

  this._logger = loggerGen(name);

  this.options = options
  this._buildCount = 0;
  this._currentTree = FSTree.fromPaths([]);
}

BroccoliMergeTrees.prototype.debug = function(message, args) {
  this._logger.info(message, args);
}

BroccoliMergeTrees.prototype.build = function() {
  this._logger.debug('deriving patches');
  let instrumentation = heimdall.start('derivePatches - broccoli-merge-trees');
  const patches = this.in.changes(this.options);


  console.log(`----------------patches from ${this._name + (this._annotation != null ? ' (' + this._annotation + ')' : '')}`);
  patches.forEach(patch => {
    console.log(patch[0] + ' ' + chompPathSep(patch[1]));
  });

  if (patches.some(change => change[1].endsWith("engines-dist/jobs-ext/assets/img"))) debugger;


  instrumentation.stats.patches = patches.length;
  instrumentation.stop();
  instrumentation = heimdall.start('applyPatches - broccoli-merge-trees', ApplyPatchesSchema);

  try {
    this._logger.debug('applying patches');
    this._applyPatch(patches, instrumentation.stats);
  } catch(e) {
    this._logger.warn('patch application failed, starting from scratch');
    // Whatever the failure, start again and do a complete build next time
    this._currentTree = FSTree.fromPaths([]);
    this.out.emptySync('');
    throw e;
  }

  instrumentation.stop();
}

function chompPathSep(path) {
  // strip trailing path.sep (but both seps on posix and win32);
  return path.replace(/(\/|\\)$/, '');
}


BroccoliMergeTrees.prototype._applyPatch = function(patch, instrumentation) {
  patch.forEach(function(change) {
    patch;
    var operation = change[0];
    var relativePath = change[1];
    var entry = change[2];

    switch(operation) {
      case 'mkdir':     {
        instrumentation.mkdir++;
        return this._applyMkdir(entry, relativePath);
      }
      case 'rmdir':   {
        instrumentation.rmdir++;
        return this._applyRmdir(entry, relativePath);
      }
      case 'unlink':  {
        instrumentation.unlink++;
        return this.out.unlinkSync(relativePath);
      }
      case 'create':    {
        instrumentation.create++;
        return this.out.symlinkSyncFromEntry(entry.tree, entry.relativePath, relativePath);
      }
      case 'change':    {
        instrumentation.change++;
        return this._applyChange(entry, relativePath);
      }
    }
  }, this);
};

BroccoliMergeTrees.prototype._applyMkdir = function (entry, relativePath) {
  if (entry.linkDir) {
    return this.out.symlinkSyncFromEntry(entry.tree, relativePath, relativePath);
  } else {
    return this.out.mkdirSync(relativePath);
  }
}

BroccoliMergeTrees.prototype._applyRmdir = function (entry, relativePath) {
  if (entry.linkDir) {
    return this.out.unlinkSync(relativePath);
  } else {
    return this.out.rmdirSync(relativePath);
  }
}

BroccoliMergeTrees.prototype._applyChange = function (entry, outputRelativePath) {
  if (isDirectory(entry)) {
    if (entry.linkDir) {
      // directory copied -> link
      this.out.rmdirSync(outputRelativePath);
      this.out.symlinkSyncFromEntry(entry.tree, entry.relativePath, outputRelativePath);
    } else {
      // directory link -> copied
      this.out.unlinkSync(outputRelativePath);
      this.out.mkdirSync(outputRelativePath);
    }
  } else {
    // file changed
    this.out.unlinkSync(outputRelativePath);
    return this.out.symlinkSyncFromEntry(entry.tree, entry.relativePath, outputRelativePath);
  }
}
