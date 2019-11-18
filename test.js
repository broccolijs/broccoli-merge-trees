'use strict';

const MergeTrees = require('./');
const { createBuilder, createTempDir } = require('broccoli-test-helper');
const chai = require('chai'), expect = chai.expect;

describe('MergeTrees', function() {
  let input, input2, output, subject;
  beforeEach(async function () {
    input = await createTempDir();
    input2 = await createTempDir();
    subject = new MergeTrees([input.path(), input2.path()]);
    output = createBuilder(subject);
  });
  afterEach(async function() {
    input.dispose();
    input2.dispose();
    output.dispose();
  });

  it('smoke test', async function() {
    input.write({
      'a.log': 'A'
    });
    input2.write({
      'b.log': 'B',
      'c.log': 'C'
    });
    await output.build();
    expect(output.read()).to.deep.equal({
      'a.log': 'A',
      'b.log': 'B',
      'c.log': 'C'
    });
  });

  it('gives a useful error when merged trees have collisions', async function() {
    input.write({
      'a.log': 'A'
    });
    input2.write({
      'a.log': 'A'
    });
    try {
      await output.build();
    } catch (err) {
      // append input nodes' names
      expect(err.message).to.contain('[BroccoliMergeTrees] error while merging the following');
      expect(err.message).to.contain(`  1.  ${input.path()}`);
      expect(err.message).to.contain(`  2.  ${input2.path()}`);

      // wrap existing message
      expect(err.message).to.contain('Merge error: file a.log exists in');
    }
  });
  it(`doesn't error when merged trees have collisions and overwrite is set`, async function() {
    input.write({
      'a.log': 'A'
    });
    input2.write({
      'a.log': 'B'
    });
    subject = new MergeTrees([input.path(), input2.path()], {
      overwrite: true,
    });
    output = createBuilder(subject);
    await output.build();
    expect(output.read()).to.deep.equal({
      'a.log': 'B',
    });
  });
});


require('mocha-eslint')('*.js');
