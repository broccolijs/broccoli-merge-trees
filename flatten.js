'use strict';

var ASSIMILATION_PROTOCOL_VERSION = '_1';

function canFlatten(node, options = { overwrite: false /* broccoli-merge-tree's default */ }) {
  const hasSameProtocol = node.ASSIMILATION_PROTOCOL_VERSION === ASSIMILATION_PROTOCOL_VERSION;
  const nodeOptions = node.options !== null && typeof node.options === 'object' ? node.options : { overwrite: false };
  const hasSameOverwrite = nodeOptions.overwrite === options.overwrite;

  return hasSameProtocol && hasSameOverwrite;
}

function doFlatten(inputNodes, options) {
  var nodes = [];
  for (var i = 0 ; i < inputNodes.length ; i++ ) {
    var node = inputNodes[i];

    if (canFlatten(node, options)) {
      nodes = nodes.concat(doFlatten(node._inputNodes, node.options));
    } else {
      nodes.push(node);
    }
  }

  return nodes;
}
/*
 *
 * Given an array of inputNodes, this function will attempt to inline all
 * compatible MergeTree inputNodes (recursively) with the current MergeTree.
 *
 * A child inputTree is considered inline safe it it:
 *   * has a matching options.overwrite
 *   * shares the same ASSIMILATION_PROTOCOL_VERSION
 *
 * This function will also drop obvious duplicates.
 */
module.exports = function flattenNodes(inputNodes) {
  let seen = new Set();
  let flattened = doFlatten(inputNodes);
  let result = [];

  for (let i = flattened.length - 1; i >= 0; i--) {
    let node = flattened[i];

    if (seen.has(node) === false) {
      seen.add(node);
      result.push(node);
    }
  }

  return result.reverse();
};

module.exports.ASSIMILATION_PROTOCOL_VERSION = ASSIMILATION_PROTOCOL_VERSION;
module.exports.canFlatten = canFlatten;
