# This code is not part of the test suite. It was used for manually isolating
# bottlenecks, and preserved here for future reference.

testHelpers = require('./broccoli_test_helpers')
mergeTrees = require('../')
mapSeries = require('promise-map-series')
RSVP = require('rsvp')

makeFixtureTree = testHelpers.makeFixtureTree
MinimalBroccoliBuilder = testHelpers.MinimalBroccoliBuilder

buildTimes = (tree, times) ->
  builder = new MinimalBroccoliBuilder(tree)
  return mapSeries([0...times], => builder.build())
    .then => builder.cleanup()
    .catch (err) => console.log err

printTimings = (iterations) ->
  for key of global.TIMINGS
    console.log key, (TIMINGS[key] / 1e6 / iterations).toFixed(0), 'ms'
  global.TIMINGS = {}
  for key of global.START_TIMES
    if global.START_TIMES[key] != null
      console.log 'missing STOP for', key
  console.log ''
  null

regularFileBenchmark = ->
  fixture1 = {}
  fixture2 = {}
  for dir in [0...10]
    fixture1[dir + 'a'] = {}
    fixture2[dir + 'b'] = {}
    for file in [0...50]
      fixture1[dir + 'a'][file] = 'contents'
      fixture2[dir + 'b'][file] = 'contents'

  mergedTree = mergeTrees([makeFixtureTree(fixture1), makeFixtureTree(fixture2)])

  global.START_TIMES = {}
  global.TIMINGS = {}
  iterations = 10
  return buildTimes(mergedTree, iterations)
    .then => printTimings(iterations)

# symlinkBenchmark = ->
#   symlinkFixture1 = {}
#   symlinkFixture2 = {}
#   for dir in [0...10]
#     symlinkFixture1[dir + 'a'] = {}
#     symlinkFixture2[dir + 'b'] = {}
#     for file in [0...50]
#       symlinkFixture1[dir + 'a'][file] = ['/some/path']
#       symlinkFixture2[dir + 'b'][file] = ['/some/path']

#   symlinkMergedTree = mergeTrees([makeFixtureTree(symlinkFixture1), makeFixtureTree(symlinkFixture2)])

#   global.START_TIMES = {}
#   global.TIMINGS = {}
#   iterations = 10
#   return buildTimes(symlinkMergedTree, iterations)
#     .then => printTimings(iterations)

regularFileBenchmark()
  # .then symlinkBenchmark
  .catch (err) =>
    console.log err
