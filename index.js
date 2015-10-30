var fs = require('fs')
var Plugin = require('broccoli-plugin')
var symlinkOrCopySync = require('symlink-or-copy').sync
var debug = require('debug')
var Set = require('fast-ordered-set');
var FSTree = require('fs-tree-diff');
var Entry = require('./entry');

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
    annotation: options.annotation
  })

  this._debug = debug(name);
  this.options = options
  this._buildCount = 0;
  this._currentTree = FSTree.fromPaths([]);
}

BroccoliMergeTrees.prototype.debug = function(message, args) {
  this._debug(message, args);
}

BroccoliMergeTrees.prototype.build = function() {
  this._buildCount++;

  var start = new Date()

  var sourceMap = new Set();
  var newEntries = this._mergeRelativePath('', null, sourceMap); 
  var newTree = FSTree.fromEntries(newEntries);
  var patch = this._currentTree.calculatePatch(newTree);
  this._currentTree = newTree;
  this._applyPatch(patch);


  this.debug('build: \n %o', {
    count: this._buildCount,
    in: new Date() - start + 'ms'
  })
}

BroccoliMergeTrees.prototype._applyPatch = function (patch, sourceMapping) {
  // ∀ p ϵ patch
  //  apply p (create, link &c.)
};

BroccoliMergeTrees.prototype._mergeRelativePath = function (baseDir, possibleIndices, result) {
  var inputPaths = this.inputPaths;
  var outputPath = this.outputPath;
  var overwrite = this.options.overwrite;
  if (!result) { result = []; }

  // baseDir has a trailing path.sep if non-empty
  var i, j, fileName, fullPath

  // Array of readdir arrays
  var names = inputPaths.map(function (inputPath, i) {
    if (possibleIndices == null || possibleIndices.indexOf(i) !== -1) {
      return fs.readdirSync(inputPath + '/' + baseDir).sort()
    } else {
      return []
    }
  })

  // Guard against conflicting capitalizations
  var lowerCaseNames = {}
  for (i = 0; i < inputPaths.length; i++) {
    for (j = 0; j < names[i].length; j++) {
      fileName = names[i][j]
      var lowerCaseName = fileName.toLowerCase()
      // Note: We are using .toLowerCase to approximate the case
      // insensitivity behavior of HFS+ and NTFS. While .toLowerCase is at
      // least Unicode aware, there are probably better-suited functions.
      if (lowerCaseNames[lowerCaseName] == null) {
        lowerCaseNames[lowerCaseName] = {
          index: i,
          originalName: fileName
        }
      } else {
        var originalIndex = lowerCaseNames[lowerCaseName].index
        var originalName = lowerCaseNames[lowerCaseName].originalName
        if (originalName !== fileName) {
          throw new Error('Merge error: conflicting capitalizations:\n'
            + baseDir + originalName + ' in ' + inputPaths[originalIndex] + '\n'
            + baseDir + fileName + ' in ' + inputPaths[i] + '\n'
            + 'Remove one of the files and re-add it with matching capitalization.\n'
            + 'We are strict about this to avoid divergent behavior '
            + 'between case-insensitive Mac/Windows and case-sensitive Linux.'
          )
        }
      }
    }
  }
  // From here on out, no files and directories exist with conflicting
  // capitalizations, which means we can use `===` without .toLowerCase
  // normalization.

  // Accumulate fileInfo hashes of { isDirectory, indices }.
  // Also guard against conflicting file types and overwriting.
  var fileInfo = {}
  for (i = 0; i < inputPaths.length; i++) {
    for (j = 0; j < names[i].length; j++) {
      fileName = names[i][j]
      var entry = buildEntry(baseDir + fileName, inputPaths[i]);
      var isDirectory = entry.isDirectory();

      if (fileInfo[fileName] == null) {
        fileInfo[fileName] = {
          entry: entry,
          isDirectory: isDirectory,
          indices: [i] // indices into inputPaths in which this file exists
        }
      } else {
        fileInfo[fileName].entry = entry;
        fileInfo[fileName].indices.push(i)

        // Guard against conflicting file types
        var originallyDirectory = fileInfo[fileName].isDirectory
        if (originallyDirectory !== isDirectory) {
          throw new Error('Merge error: conflicting file types: ' + baseDir + fileName
            + ' is a ' + (originallyDirectory ? 'directory' : 'file')
              + ' in ' + inputPaths[fileInfo[fileName].indices[0]]
            + ' but a ' + (isDirectory ? 'directory' : 'file')
              + ' in ' + inputPaths[i] + '\n'
            + 'Remove or rename either of those.'
          )
        }

        // Guard against overwriting when disabled
        if (!isDirectory && !overwrite) {
          throw new Error('Merge error: '
            + 'file ' + baseDir + fileName + ' exists in '
            + inputPaths[fileInfo[fileName].indices[0]] + ' and ' + inputPaths[i] + '\n'
            + 'Pass option { overwrite: true } to mergeTrees in order '
            + 'to have the latter file win.'
          )
        }
      }
    }
  }

  // Done guarding against all error conditions. Actually merge now.
  for (i = 0; i < inputPaths.length; i++) {
    for (j = 0; j < names[i].length; j++) {
      fileName = names[i][j]
      fullPath = inputPaths[i] + '/' + baseDir + fileName
      var destPath = outputPath + '/' + baseDir + fileName
      var infoHash = fileInfo[fileName]

      if (infoHash.isDirectory) {
        if (infoHash.indices.length > 1) {
          // Copy/merge subdirectory
          if (infoHash.indices[0] === i) { // avoid duplicate recursion
          // TODO: add to result
            fs.mkdirSync(destPath)
            this._mergeRelativePath(baseDir + fileName + '/', infoHash.indices)
          }
        } else {
          // TODO: add to result
          // Symlink entire subdirectory
          symlinkOrCopySync(fullPath, destPath)
        }
      } else { // isFile
        if (infoHash.indices[infoHash.indices.length-1] === i) {
          result.push(infoHash);
        } else {
          // This file exists in a later inputPath. Do nothing here to have the
          // later file win out and thus "overwrite" the earlier file.
        }
      }
    }
  }

  return result;
};

function buildEntry(relativePath, basePath) {
  var stat = fs.statSync(basePath + '/' + relativePath);
  return new Entry(relativePath, basePath, stat.mode, stat.size, stat.mtime);
}

