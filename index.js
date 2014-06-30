var fs = require('fs')
var Writer = require('broccoli-writer')
var mapSeries = require('promise-map-series')
var helpers = require('broccoli-kitchen-sink-helpers')

var isWindows = /^win/.test(process.platform);
var pathSep   = require('path').sep;

module.exports = TreeMerger
TreeMerger.prototype = Object.create(Writer.prototype)
TreeMerger.prototype.constructor = TreeMerger
function TreeMerger (inputTrees, options) {
  if (!(this instanceof TreeMerger)) return new TreeMerger(inputTrees, options)
  if (!Array.isArray(inputTrees)) {
    throw new Error('Expected array, got ' + inputTrees)
  }
  this.inputTrees = inputTrees
  this.options    = options || {}
  this.rootPath   = this.options.rootPath || process.cwd();
}

TreeMerger.prototype.processDirectory = function(baseDir, relativePath) {
  var directoryTreePath, fileTreePath;
  // Inside this function, prefer string concatenation to the slower path.join
  // https://github.com/joyent/node/pull/6929
  if (relativePath == null) {
    relativePath = ''
  } else if (relativePath.slice(-1) !== pathSep) {
    relativePath += pathSep
  }

  var entries  = fs.readdirSync(baseDir +  pathSep + relativePath).sort()

  for (var i = 0; i < entries.length; i++) {
    var entryRelativePath      = relativePath + entries[i];
    var lowerEntryRelativePath = entryRelativePath.toLowerCase()
    var sourcePath             = baseDir + pathSep + entryRelativePath;
    var destPath               = this.destDir + pathSep + entryRelativePath;
    var stats                  = fs.statSync(sourcePath)

    if (stats.isDirectory()) {
      fileTreePath = this.files[lowerEntryRelativePath]
      if (fileTreePath != null) {
        this.throwFileAndDirectoryCollision(entryRelativePath, fileTreePath, baseDir)
      }
      directoryTreePath = this.directories[lowerEntryRelativePath]
      if (directoryTreePath == null) {
        this.directories[lowerEntryRelativePath] = baseDir

        // on windows we still need to traverse subdirs (for copying):
        if (isWindows) {
          fs.mkdirSync(destPath)
          this.processDirectory(baseDir, entryRelativePath)
        } else {
          helpers.symlinkOrCopyPreserveSync(sourcePath, destPath);
          this.linkedDirectories[lowerEntryRelativePath] = baseDir;
        }
      } else {
        if (this.linkedDirectories[lowerEntryRelativePath]) {
          // a prior symlinked directory was found
          fs.unlinkSync(destPath);
          fs.mkdirSync(destPath);
          delete this.linkedDirectories[lowerEntryRelativePath];

          // re-process the original tree's version of this entryRelativePath
          this.processDirectory(directoryTreePath, entryRelativePath)
        }

        this.processDirectory(baseDir, entryRelativePath)
      }
    } else {
      directoryTreePath = this.directories[entryRelativePath]
      if (directoryTreePath != null) {
        this.throwFileAndDirectoryCollision(entryRelativePath, baseDir, directoryTreePath)
      }
      fileTreePath = this.files[lowerEntryRelativePath]
      if (fileTreePath != null) {
        if (!this.options.overwrite) {
          throw new Error('Merge error: ' +
                          'file "' + entryRelativePath + '" exists in ' +
                          baseDir + ' and ' + fileTreePath + ' - ' +
                          'pass option { overwrite: true } to mergeTrees in order ' +
                          'to have the latter file win')
        }
      } else {
        this.files[lowerEntryRelativePath] = baseDir

        // if this is a relative path, append the rootPath (which defaults to process.cwd)
        if (isWindows) {
          helpers.copyPreserveSync(sourcePath, destPath)
        } else {
          helpers.symlinkOrCopyPreserveSync(sourcePath, destPath);
        }
      }
    }
  }
}

TreeMerger.prototype.write = function (readTree, destDir) {
  this.destDir = destDir
  this.files = {}
  this.linkedDirectories = {}
  this.directories = {}

  return mapSeries(this.inputTrees, readTree).then(function (treePaths) {
    this.treePaths = treePaths

    for (var i = treePaths.length - 1; i >= 0; i--) {
      this.processDirectory(treePaths[i])
    }
  }.bind(this))
}

TreeMerger.prototype.throwFileAndDirectoryCollision = function (relativePath, fileTreePath, directoryTreePath) {
  throw new Error('Merge error: "' + relativePath +
                  '" exists as a file in ' + fileTreePath +
                  ' but as a directory in ' + directoryTreePath)
}
