function Entry(relativePath, basePath, mode, size, mtime) {
  this.relativePath = relativePath;
  this.basePath = basePath;
  this.mode = mode;
  this.size = size;
  this.mtime = mtime;
}


Entry.prototype.isDirectory = function() {
  return (this.mode & 61440) === 16384;
};

module.exports = Entry;
