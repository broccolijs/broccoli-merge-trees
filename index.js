'use strict';

var Plugin = require('broccoli-plugin');
var _MergeTrees = require('merge-trees');

class MergeTrees extends _MergeTrees {
  constructor(inputPaths, outputPath, options) {
    super(inputPaths, outputPath, options);

    this._symlinks = new Set();
    this.hadPatches = false;
  }

  _applyPatch(patches, instrumentation) {
    super._applyPatch(patches, instrumentation);

    for (let patch of patches) {
      let operation = patch[0];
      let relativePath = patch[1];
      let entry = patch[2];

      // skip any entries that are not symlinks
      if (!entry.linkDir) { continue; }

      switch (operation) {
      case 'rmdir':
      case 'unlink':
        this._symlinks.delete(relativePath);
        break;

      case 'create':
      case 'mkdir':
        this._symlinks.add(relativePath);
        break;
      }
    }

    this.hadPatches = patches.length > 0;
  }

  get hasDirectorySymlinks() {
    return this._symlinks.size > 0;
  }
}

module.exports = BroccoliMergeTrees;
BroccoliMergeTrees.prototype = Object.create(Plugin.prototype);
BroccoliMergeTrees.prototype.constructor = BroccoliMergeTrees;
function BroccoliMergeTrees(inputNodes, options) {
  if (!(this instanceof BroccoliMergeTrees)) return new BroccoliMergeTrees(inputNodes, options);
  options = options || {};
  var name = 'broccoli-merge-trees:' + (options.annotation || '');
  if (!Array.isArray(inputNodes)) {
    throw new TypeError(name + ': Expected array, got: [' + inputNodes +']');
  }
  Plugin.call(this, inputNodes, {
    persistentOutput: true,
    needsCache: false,
    annotation: options.annotation,
    sideEffectFree: true
  });
  this.options = options;
}

BroccoliMergeTrees.prototype.build = function() {
  if (this.mergeTrees == null) {
    // Defer instantiation until the first build because we only
    // have this.inputPaths and this.outputPath once we build.
    this.mergeTrees = new MergeTrees(this.inputPaths, this.outputPath, {
      overwrite: this.options.overwrite,
      annotation: this.options.annotation
    });
  }

  this.mergeTrees.merge();

  if (this.mergeTrees.hasDirectorySymlinks || this.mergeTrees.hadPatches) {
    this.revised();
  }
};
