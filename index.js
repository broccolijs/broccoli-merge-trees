var fs = require('fs')
var walkSync = require('walk-sync')
var Writer = require('broccoli-writer')
var helpers = require('broccoli-kitchen-sink-helpers')
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
  this.options = options || {}
}

function START (key) {
  START_TIMES[key] = process.hrtime()
}

function STOP (key) {
  var start = START_TIMES[key]
  START_TIMES[key] = null
  var now = process.hrtime()
  TIMINGS[key] = (TIMINGS[key] || 0)
    + (now[1] - start[1])
    + (now[0] - start[0]) * 1e9
}

TreeMerger.prototype.write = function (readTree, destDir) {
  START('mergeTotal')
  var self = this
  var files = {}
  var directories = {}
  return mapSeries(this.inputTrees, readTree).then(function (treePaths) {
    for (var i = treePaths.length - 1; i >= 0; i--) {
      START('walkSync')
      var treeContents = walkSync(treePaths[i])
      STOP('walkSync')
      var fileIndex
      START('pathManipulation')
      for (var j = 0; j < treeContents.length; j++) {
        var relativePath = treeContents[j]
        var destPath = destDir + '/' + relativePath
        if (relativePath.slice(-1) === '/') { // is directory
          relativePath = relativePath.slice(0, -1) // chomp "/"
          fileIndex = files[relativePath]
          if (fileIndex != null) {
            throwFileAndDirectoryCollision(relativePath, fileIndex, i)
          }
          if (directories[relativePath] == null) {
            START('mkdir'); STOP('pathManipulation')
            fs.mkdirSync(destPath)
            STOP('mkdir'); START('pathManipulation')
            directories[relativePath] = i
          }
        } else { // is file
          var directoryIndex = directories[relativePath]
          if (directoryIndex != null) {
            throwFileAndDirectoryCollision(relativePath, i, directoryIndex)
          }
          fileIndex = files[relativePath.toLowerCase()]
          if (fileIndex != null) {
            if (!self.options.overwrite) {
              throw new Error('Merge error: ' +
                'file "' + relativePath + '" exists in ' +
                treePaths[i] + ' and ' + treePaths[fileIndex] + ' - ' +
                'pass option { overwrite: true } to mergeTrees in order ' +
                'to have the latter file win')
            }
            // Else, ignore this file. It is "overwritten" by a file we copied
            // earlier, thanks to reverse iteration over trees
          } else {
            START('copy'); STOP('pathManipulation')
            helpers.copyPreserveSync(
              treePaths[i] + '/' + relativePath, destPath)
            STOP('copy'); START('pathManipulation')
            files[relativePath.toLowerCase()] = i
          }
        }
      }
      STOP('pathManipulation')
    }
    STOP('mergeTotal')

    function throwFileAndDirectoryCollision (relativePath, fileIndex, directoryIndex) {
      throw new Error('Merge error: "' + relativePath +
        '" exists as a file in ' + treePaths[fileIndex] +
        ' but as a directory in ' + treePaths[directoryIndex])
    }
  })
}
