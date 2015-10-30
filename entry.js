function Entry(relativePath, basePath, mode, size, mtime) {
  this.relativePath = relativePath;
  this.basePath = basePath;
  this.mode = mode;
  this.size = size;
  this.mtime = mtime;
}

module.exports = Entry;
