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

describe('flatten', function() {
  var flatten = require('./flatten');

  describe('ASSIMILATION_PROTOCOL_VERSION', function() {
    it('exists', function() {
      expect(flatten).to.have.property('ASSIMILATION_PROTOCOL_VERSION', '_1');
      expect(new MergeTrees([])).to.have.property('ASSIMILATION_PROTOCOL_VERSION', '_1');
    });
  });

  describe('canFlatten', function() {
    var ASSIMILATION_PROTOCOL_VERSION = flatten.ASSIMILATION_PROTOCOL_VERSION;

    it('works', function() {
      expect(flatten.canFlatten({})).to.eql(false);
      expect(flatten.canFlatten(1)).to.eql(false);
      expect(flatten.canFlatten({ ASSIMILATION_PROTOCOL_VERSION })).to.eql(true);
      expect(flatten.canFlatten({ ASSIMILATION_PROTOCOL_VERSION: 'BANANA' })).to.eql(false);

      expect(flatten.canFlatten({ ASSIMILATION_PROTOCOL_VERSION, options: { overwrite: true  }}                     )).to.eql(false);
      expect(flatten.canFlatten({ ASSIMILATION_PROTOCOL_VERSION, options: { overwrite: true  }}, { overwrite: true })).to.eql(true);
      expect(flatten.canFlatten({ ASSIMILATION_PROTOCOL_VERSION, options: { overwrite: false }}, { overwrite: true })).to.eql(false);
      expect(flatten.canFlatten({ ASSIMILATION_PROTOCOL_VERSION, options: { overwrite: true  }}, { overwrite: false})).to.eql(false);
      expect(flatten.canFlatten({ ASSIMILATION_PROTOCOL_VERSION, options: { overwrite: false }}, { overwrite: false})).to.eql(true);
    });
  });

  function mockMergeTree(name, _inputNodes = [], ASSIMILATION_PROTOCOL_VERSION = '_1') {
    return {
      name,
      _inputNodes,
      ASSIMILATION_PROTOCOL_VERSION,
      isMergeTree: true
    };
  }

  function mockTree(name, _inputNodes = []) {
    return {
      name,
      _inputNodes
    };
  }

  it('flattens', function() {

    let broccoli = mockTree('broccoli');
    let css = mockTree('css');
    let images = mockTree('images');
    let js = mockTree('js');
    let aa = mockMergeTree('aa', [broccoli, images]);
    let bb = mockMergeTree('bb', [css, js]);
    let a = mockMergeTree('a', [aa, bb]);
    let b = mockMergeTree('b');
    let c = mockMergeTree('c', [a, b]);
    let e = mockTree('e');
    let d = mockTree('d');

    let flattened = flatten([c, d, e, broccoli, css]);
    expect(flattened.some(x => x.isMergeTree)).to.eql(false); // ensure no merge trees

    expect(flattened.map(x => x.name)).to.eql([images, js, d, e, broccoli, css].map(x => x.name));
  });
});

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
