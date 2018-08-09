'use strict';

var MergeTrees = require('./');
var chai = require('chai'), expect = chai.expect;
var chaiAsPromised = require('chai-as-promised'); chai.use(chaiAsPromised);
var Fixture = require('broccoli-fixture');

function mergeFixtures(inputFixtures, options) {
  return Fixture.build(new MergeTrees(inputFixtures.map(inputFixture), options));
}

function inputFixture(obj) {
  return new Fixture.Node(obj);
}

describe('MergeTrees', function() {
  it('smoke test', function() {
    return expect(mergeFixtures([
      {
        foo: '1'
      }, {
        baz: {}
      }
    ])).to.eventually.deep.equal({
      foo: '1',
      baz: {}
    });
  });

  it('gives a useful error when merged trees have collisions', function () {
    return mergeFixtures([
      {
        foo: 'hello',
      }, {
        foo: 'morehello',
      }
    ]).then(v => {
      throw Error(`Should not fulfill ${v}`);
    }, err => {
      // append input nodes' names
      expect(err.message).to.contain('[BroccoliMergeTrees] error while merging the following');
      expect(err.message).to.contain('  1.  [Fixturify]');
      expect(err.message).to.contain('  2.  [Fixturify]');

      // wrap existing message
      expect(err.message).to.contain('Merge error: file foo exists in');
    });
  });
});


require('mocha-eslint')('*.js');
