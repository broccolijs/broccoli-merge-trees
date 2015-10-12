'use strict';
var expect = require('chai').expect;
var BroccoliMergeTrees = require('./');

require('mocha-jshint')({
  paths: [
    'index.js',
    'test.js'
  ]
});

/* globals describe:true, it:true*/
describe('BroccoliMergeTrees', function() {
  describe('constructor', function() {
    it('provides useful feedback if non-array is provided', function() {
      expect(function() {
        new BroccoliMergeTrees();
      }).to.throw('broccoli-merge-trees: Expected array, got: [undefined]')

      expect(function() {
        new BroccoliMergeTrees(undefined, {
          annotation: 'some-annotation'
        });
      }).to.throw('broccoli-merge-trees:some-annotation Expected array, got: [undefined]')
    });

    it('provides useful feedback if array containing a non-tree is provided', function() {
      new BroccoliMergeTrees([]); // should pass

      expect(function() {
        new BroccoliMergeTrees([undefined])
      }).to.throw('broccoli-merge-trees: requires inputNodes to be all trees, but got: []')

      expect(function() {
        new BroccoliMergeTrees([null])
      }).to.throw('broccoli-merge-trees: requires inputNodes to be all trees, but got: []')

      expect(function() {
        new BroccoliMergeTrees([true, 1, NaN, null])
      }).to.throw('broccoli-merge-trees: requires inputNodes to be all trees, but got: [true,1,NaN,]')
    });
  });
});
