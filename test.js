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
});


require('mocha-eslint')('*.js');
