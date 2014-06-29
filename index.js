var fs = require('fs')
var Writer = require('broccoli-writer')
var mapSeries = require('promise-map-series')

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
  var directoryTreePath;
  // Inside this function, prefer string concatenation to the slower path.join
  // https://github.com/joyent/node/pull/6929
  if (relativePath == null) {
    relativePath = ''
  } else if (relativePath.slice(-1) !== '/') {
    relativePath += '/'
  }

  var entries = fs.readdirSync(baseDir + '/' + relativePath).sort()

  for (var i = 0; i < entries.length; i++) {
    var sourcePath = baseDir + '/' + relativePath + entries[i];
    var destPath   = this.destDir + '/' + relativePath + '/' + entries[i]
    var stats      = fs.statSync(sourcePath)

    if (stats.isDirectory()) {
      fileTreePath = this.files[relativePath]
      if (fileIndex != null) {
        this.throwFileAndDirectoryCollision(relativePath, fileTreePath, baseDir)
      }
      directoryTreePath = this.directories[relativePath]
      if (directoryTreePath == null) {
        //var basePath = baseDir[0] === '/' ? treePath : this.rootPath + '/' + treePath
        fs.symlinkSync(sourcePath, destPath);
        this.directories[relativePath] = baseDir
      } else {
        fs.mkdirSync(destPath)

        this.processDirectory(baseDir, relativePath + '/' + entries[i])
      }
    } else {
      directoryTreePath = this.directories[relativePath]
      if (directoryTreePath != null) {
        this.throwFileAndDirectoryCollision(relativePath, treePath, directoryTreePath)
      }
      fileTreePath = this.files[relativePath.toLowerCase()]
      if (fileTreePath != null) {
        if (!this.options.overwrite) {
          throw new Error('Merge error: ' +
                          'file "' + relativePath + '" exists in ' +
                          treePath + ' and ' + fileTreePath + ' - ' +
                          'pass option { overwrite: true } to mergeTrees in order ' +
                          'to have the latter file win')
        }
        // Else, ignore this file. It is "overwritten" by a file we copied
        // earlier, thanks to reverse iteration over trees
      } else {
        // if this is a relative path, append the rootPath (which defaults to process.cwd)
        var basePath = treePath[0] === '/' ? treePath : this.rootPath + '/' + treePath
        fs.symlinkSync(basePath + '/' + relativePath, destPath);
        this.files[relativePath.toLowerCase()] = treePath
      }
    }
  }
}

TreeMerger.prototype.processTreePath = function(treePath) {
  var treeContents = walkSync(treePath)
  var fileIndex
  for (var j = 0; j < treeContents.length; j++) {
    var relativePath = treeContents[j]
    var destPath = this.destDir + '/' + relativePath
    if (relativePath.slice(-1) === '/') { // is directory
      relativePath = relativePath.slice(0, -1) // chomp "/"
      fileTreePath = this.files[relativePath]
      if (fileIndex != null) {
        this.throwFileAndDirectoryCollision(relativePath, fileTreePath, treePath)
      }
      if (this.directories[relativePath] == null) {
        fs.mkdirSync(destPath)
        this.directories[relativePath] = treePath
      }
    } else { // is file
    }
  }
}

TreeMerger.prototype.write = function (readTree, destDir) {
  this.destDir = destDir
  this.files = {}
  this.directories = {}

  return mapSeries(this.inputTrees, readTree).then(function (treePaths) {
    this.treePaths = treePaths

    for (var i = treePaths.length - 1; i >= 0; i--) {
      this.processTreePath(treePaths[i], i)
    }
  }.bind(this))
}

TreeMerger.prototype.throwFileAndDirectoryCollision = function (relativePath, fileTreePath, directoryTreePath) {
  throw new Error('Merge error: "' + relativePath +
                  '" exists as a file in ' + fileTreePath +
                  ' but as a directory in ' + directoryTreePath)
}

function walkSync (baseDir, relativePath) {
  // Inside this function, prefer string concatenation to the slower path.join
  // https://github.com/joyent/node/pull/6929
  if (relativePath == null) {
    relativePath = ''
  } else if (relativePath.slice(-1) !== '/') {
    relativePath += '/'
  }

  var results = []
  var entries = fs.readdirSync(baseDir + '/' + relativePath).sort()
  for (var i = 0; i < entries.length; i++) {
    var stats = fs.statSync(baseDir + '/' + relativePath + entries[i])
    if (stats.isDirectory()) {
      results.push(relativePath + entries[i] + '/')
      results = results.concat(walkSync(baseDir, relativePath + entries[i]))
    } else {
      results.push(relativePath + entries[i])
    }
  }
  return results
}
