'use strict';

var MergeTrees = require('./')
var chai = require('chai'), expect = chai.expect
var chaiAsPromised = require('chai-as-promised'); chai.use(chaiAsPromised)
var fixture = require('broccoli-fixture')

require('mocha-jshint')({
  paths: [
    'index.js',
    'test.js'
  ]
});


function mergeFixtures(inputFixtures, options) {
  return fixture.build(new MergeTrees(inputFixtures.map(function(obj) {
    return new fixture.Node(obj)
  }), options))
}

/* globals describe:true, it:true*/
describe('MergeTrees', function() {
  it('merges files', function() {
    return expect(mergeFixtures([
      {
        foo: '1'
      }, {
        baz: '2'
      }
    ])).to.eventually.deep.equal({
      foo: '1',
      baz: '2'
    })
  })

  it('refuses to overwrite files by default', function() {
    return expect(mergeFixtures([
      {
        foo: '1a',
        bar: '2a'
      }, {
        foo: '1b',
        bar: '2b'
      }
    ])).to.be.rejectedWith(/Merge error: file bar exists in .* and [^]* overwrite: true/)
  })

  it('overwrites files with { overwrite: true }', function() {
    return expect(mergeFixtures([
      {
        foo: '1a',
        bar: '2a',
      }, {
        bar: '2b',
        baz: '3b'
      }, {
        baz: '3c'
      }
    ], {
      overwrite: true
    })).to.eventually.deep.equal({
      foo: '1a',
      bar: '2b',
      baz: '3c'
    })
  })

  it('refuses to honor conflicting capitalizations, with overwrite: false and true', function() {
    function expectItToRefuseConflictingCapitalizations(type, options) {
      var content = type === 'dir' ? {} : 'hello world'
      return expect(mergeFixtures([
        {
          FOO: content
        }, {
          Foo: content
        }
      ], options)).to.be.rejectedWith(/Merge error: conflicting capitalizations:\nFOO in .*\nFoo in .*\nRemove/)
    }

    return expectItToRefuseConflictingCapitalizations('file', { overwrite: false })
      .then(function() {
        return expectItToRefuseConflictingCapitalizations('dir', { overwrite: false })
      }).then(function() {
        return expectItToRefuseConflictingCapitalizations('file', { overwrite: true })
      }).then(function() {
        return expectItToRefuseConflictingCapitalizations('dir', { overwrite: true })
      })
  })

  it('merges directories', function() {
    return expect(mergeFixtures([
      {
        subdir: {
          foo: '1'
        }
      }, {
        subdir2: {}
      }, {
        subdir: {
          bar: '2'
        }
      }
    ])).to.eventually.deep.equal({
      subdir: {
        foo: '1',
        bar: '2'
      },
      subdir2: {}
    })
  })

  it('rejects directories colliding with files, with overwrite: false and true', function() {
    function expectItToRejectTypeCollisions(options) {
      return expect(mergeFixtures([
        {
          foo: {}
        }, {
          foo: 'hello'
        }
      ], options)).to.be.rejectedWith(/Merge error: conflicting file types: foo is a directory in .* but a file in .*/)
      .then(function() {
        return expect(mergeFixtures([
          {
            foo: 'hello'
          }, {
            foo: {}
          }
        ], options)).to.be.rejectedWith(/Merge error: conflicting file types: foo is a file in .* but a directory in .*/)
      })
    }

    return expectItToRejectTypeCollisions({ overwrite: false })
      .then(function() {
        return expectItToRejectTypeCollisions({ overwrite: true })
      })
  })

  describe('constructor', function() {
    it('provides useful feedback if non-array is provided', function() {
      expect(function() {
        new MergeTrees();
      }).to.throw('broccoli-merge-trees: Expected array, got: [undefined]')

      expect(function() {
        new MergeTrees(undefined, {
          annotation: 'some-annotation'
        });
      }).to.throw('broccoli-merge-trees:some-annotation Expected array, got: [undefined]')
    });

    it('provides useful feedback if array containing a non-tree is provided', function() {
      new MergeTrees([]); // should pass

      expect(function() {
        new MergeTrees([undefined])
      }).to.throw('broccoli-merge-trees: requires inputNodes to be all trees, but got: []')

      expect(function() {
        new MergeTrees([null])
      }).to.throw('broccoli-merge-trees: requires inputNodes to be all trees, but got: []')

      expect(function() {
        new MergeTrees([true, 1, NaN, null])
      }).to.throw('broccoli-merge-trees: requires inputNodes to be all trees, but got: [true,1,NaN,]')
    });
  });
});
