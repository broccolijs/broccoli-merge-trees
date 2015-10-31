function Entry(relativePath, basePath, mode, size, mtime) {
  this.mode = mode;

  if (this.isDirectory() && relativePath.charAt(relativePath.length - 1) !== '/') {
    relativePath += '/';
  }

  this.relativePath = relativePath;
  this.basePath = basePath;
  this.size = size;
  this.mtime = mtime;
}


Entry.prototype.isDirectory = function() {
  /*jshint -W016 */
  return (this.mode & 61440) === 16384;
};

module.exports = Entry;
