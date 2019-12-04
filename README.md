# broccoli-merge-trees

[![Build Status](https://travis-ci.org/broccolijs/broccoli-merge-trees.svg?branch=master)](https://travis-ci.org/broccolijs/broccoli-merge-trees)
[![Build status](https://ci.appveyor.com/api/projects/status/9fkvegf4qbvfsg5v?svg=true)](https://ci.appveyor.com/project/embercli/broccoli-merge-trees)

Copy multiple trees of files on top of each other, resulting in a single merged tree.

## Installation

```bash
npm install --save-dev broccoli-merge-trees
```

## Usage
1. With `new`
```js
var BroccoliMergeTrees = require('broccoli-merge-trees');

var mergedNode = new BroccoliMergeTrees(inputNodes, options);
```
2. As a `function call`
```js
var broccoliMergeTrees = require('broccoli-merge-trees');

var mergedNode = broccoliMergeTrees(inputNodes, options);
```

3. As a `base class`
```js
const { MergeTrees } = require('broccoli-merge-trees');

class AdavancedMergeTrees extends MergeTrees {
  // add custom methods and implementations here
}

```

* **`inputNodes`**: An array of nodes, whose contents will be merged

* **`options`**: A hash of options

### Options

* `overwrite`: By default, broccoli-merge-trees throws an error when a file
  exists in multiple nodes. If you pass `{ overwrite: true }`, the output
  will contain the version of the file as it exists in the last input
  node that contains it.

* `annotation`: A note to help tell multiple plugin instances apart.

### Example

If this is your `Brocfile.js`:

```js
var BroccoliMergeTrees = require('broccoli-merge-trees');

module.exports = new BroccoliMergeTrees(['public', 'scripts']);
```

And your project contains these files:

    .
    ├─ public
    │  ├─ index.html
    │  └─ images
    │     └─ logo.png
    ├─ scripts
    │  └─ app.js
    ├─ Brocfile.js
    …

Then running `broccoli build the-output` will generate this folder:

    the-output
    ├─ app.js
    ├─ index.html
    └─ images
       └─ logo.png

The parent folders, `public` and `scripts` in this case, are not included in the output. The output tree contains only the files *within* each folder, all mixed together.

## Contributing

Clone this repo and run the tests like so:

```
npm install
npm test
```

Issues and pull requests are welcome. If you change code, be sure to re-run
`npm test`. Oftentimes it's useful to add or update tests as well.
