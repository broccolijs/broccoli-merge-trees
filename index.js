var fs = require('fs')
var path = require('path')
var Writer = require('broccoli-writer')
var mapSeries = require('promise-map-series')
var helpers = require('broccoli-kitchen-sink-helpers')

var isWindows = process.platform === 'win32'

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
}

TreeMerger.prototype.write = function (readTree, destDir) {
  var self = this

  return mapSeries(this.inputTrees, readTree).then(function (treePaths) {
    var allIndices = treePaths.map(function (treePath, i) { return i })
    mergeRelativePath('', allIndices)

    function mergeRelativePath (baseDir, possibleIndices) { // baseDir has a trailing path.sep
      var i, j, fileName, fullPath

      // Array of readdir arrays
      var names = treePaths.map(function (treePath, i) {
        if (possibleIndices.indexOf(i) !== -1) {
          return fs.readdirSync(treePath + path.sep + baseDir).sort()
        } else {
          return []
        }
      })

      // Guard against conflicting capitalizations
      var lowerCaseNames = {}
      for (i = 0; i < treePaths.length; i++) {
        for (j = 0; j < names[i].length; j++) {
          fileName = names[i][j]
          var lowerCaseName = fileName.toLowerCase()
          if (lowerCaseNames[lowerCaseName] == null) {
            lowerCaseNames[lowerCaseName] = {
              index: i,
              originalName: fileName
            }
          } else {
            var originalName = lowerCaseNames[lowerCaseName].originalName
            var originalIndex = lowerCaseNames[lowerCaseName].index
            if (originalName !== fileName) {
              throw new Error('Merge error: conflicting capitalizations:\n'
                + baseDir + originalName + ' in ' + treePaths[originalIndex] + '\n'
                + baseDir + fileName + ' in ' + treePaths[i] + '\n'
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
      for (i = 0; i < treePaths.length; i++) {
        for (j = 0; j < names[i].length; j++) {
          fileName = names[i][j]
          fullPath = treePaths[i] + path.sep + baseDir + fileName
          var isDirectory = checkIsDirectory(fullPath)
          if (fileInfo[fileName] == null) {
            fileInfo[fileName] = {
              isDirectory: isDirectory,
              indices: [i] // indices into treePaths in which this file exists
            }
          } else {
            var originallyDirectory = fileInfo[fileName].isDirectory

            // Guard against conflicting file types
            if (originallyDirectory !== isDirectory) {
              throw new Error('Merge error: conflicting file types: ' + baseDir + fileName
                + ' is a ' + (originallyDirectory ? 'directory' : 'file')
                  + ' in ' + treePaths[fileInfo[fileName].indices[0]]
                + ' but a ' + (isDirectory ? 'directory' : 'file')
                  + ' in ' + treePaths[i] + '\n'
                + 'Remove or rename either of those.'
              )
            }

            // Guard against overwriting when disabled
            if (!isDirectory && !self.options.overwrite) {
              throw new Error('Merge error: '
                + 'file ' + baseDir + fileName + ' exists in '
                + treePaths[fileInfo[fileName].indices[0]] + ' and ' + treePaths[i] + '\n'
                + 'Pass option { overwrite: true } to mergeTrees in order '
                + 'to have the latter file win.'
              )
            }

            fileInfo[fileName].indices.push(i)
          }
        }
      }

      // Done guarding against all error conditions. Actually merge now.
      for (i = 0; i < treePaths.length; i++) {
        for (j = 0; j < names[i].length; j++) {
          fileName = names[i][j]
          fullPath = treePaths[i] + path.sep + baseDir + fileName
          var destPath = destDir + path.sep + baseDir + fileName
          var infoHash = fileInfo[fileName]

          if (infoHash.isDirectory) {
            if (isWindows || infoHash.indices.length > 1) {
              // Copy/merge subdirectory
              if (infoHash.indices[0] === i) { // avoid duplicate recursion
                fs.mkdirSync(destPath)
                mergeRelativePath(baseDir + fileName + path.sep, infoHash.indices)
              }
            } else {
              // Symlink entire subdirectory
              if (fs.lstatSync(fullPath).isSymbolicLink()) {
                // When we encounter symlinks, follow them. This prevents indirection
                // from growing out of control. Note: At the moment `realpath` on Node
                // is 70x slower than native: https://github.com/joyent/node/issues/7902
                fullPath = fs.realpathSync(fullPath)
              } else if (fullPath[0] !== path.sep) {
                fullPath = process.cwd() + path.sep + fullPath
              }
              fs.symlinkSync(fullPath, destPath)
            }
          } else { // isFile
            if (infoHash.indices[infoHash.indices.length-1] === i) {
              helpers.symlinkOrCopyPreserveSync(fullPath, destPath)
            } else {
              // This file exists in a later tree. Do nothing here to have the
              // later file win out and thus "overwrite" the earlier file.
            }
          }
        }
      }
    }
  })
}

// True if directory, false if file, exception otherwise
function checkIsDirectory (fullPath) {
  var stat = fs.statSync(fullPath) // may throw ENOENT on broken symlink
  if (stat.isDirectory()) {
    return true
  } else if (stat.isFile()) {
    return false
  } else {
    throw new Error('Unexpected file type for ' + fullPath)
  }
}
