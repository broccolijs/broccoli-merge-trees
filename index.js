var fs = require('fs')
var Writer = require('broccoli-writer')
var mapSeries = require('promise-map-series')

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
  var basePath = baseDir[0] === pathSep ? baseDir : this.rootPath + pathSep + baseDir

  for (var i = 0; i < entries.length; i++) {
    var entryRelativePath = relativePath + entries[i];
    var sourcePath        = basePath + pathSep + entryRelativePath;
    var destPath          = this.destDir + pathSep + entryRelativePath;
    var stats             = fs.statSync(sourcePath)

    if (stats.isDirectory()) {
      fileTreePath = this.files[entryRelativePath]
      if (fileTreePath != null) {
        this.throwFileAndDirectoryCollision(entryRelativePath, fileTreePath, baseDir)
      }
      directoryTreePath = this.directories[entryRelativePath]
      if (directoryTreePath == null) {
        this.directories[entryRelativePath] = baseDir

        // on windows we still need to traverse subdirs (for hard-linking):
        if (isWindows) {
          fs.mkdirSync(destPath)
          this.processDirectory(baseDir, entryRelativePath)
        } else {
          fs.symlinkSync(sourcePath, destPath);
          this.linkedDirectories[entryRelativePath] = baseDir;
        }
      } else {
        if (this.linkedDirectories[entryRelativePath]) {
          // a prior symlinked directory was found
          fs.unlinkSync(destPath);
          fs.mkdirSync(destPath);
          delete this.linkedDirectories[entryRelativePath];

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
      fileTreePath = this.files[entryRelativePath.toLowerCase()]
      if (fileTreePath != null) {
        if (!this.options.overwrite) {
          throw new Error('Merge error: ' +
                          'file "' + entryRelativePath + '" exists in ' +
                          baseDir + ' and ' + fileTreePath + ' - ' +
                          'pass option { overwrite: true } to mergeTrees in order ' +
                          'to have the latter file win')
        }
      } else {
        this.files[entryRelativePath.toLowerCase()] = baseDir

        // if this is a relative path, append the rootPath (which defaults to process.cwd)
        if (isWindows) {
          // hardlinking is preferable on windows
          fs.linkSync(baseDir + pathSep + entryRelativePath, destPath)
        } else {
          fs.symlinkSync(basePath + pathSep + entryRelativePath, destPath);
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
