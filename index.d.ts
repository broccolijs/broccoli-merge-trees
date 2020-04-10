/**
 * Copy multiple trees of files on top of each other, resulting in a single merged tree.
 */
import Plugin from "broccoli-plugin";
import { InputNode } from "broccoli-node-api";

interface MergeTreesOptions {
  /**
   *  By default, broccoli-merge-trees throws an error when a file exists in multiple nodes.
   *  If you pass { overwrite: true }, the output will contain the version of the file as it exists in
   *  the last input node that contains it.
   */
  overwrite?: boolean;
  /**
   * A note to help tell multiple plugin instances apart.
   */
  annotation?: string;
  /**
   *  A string representing the destination path that merged files will be copied to.
   */
  destDir?: string;
}

export default function mergeTrees(inputNodes: InputNode[], options?: MergeTreesOptions): MergeTrees;

export class MergeTrees extends Plugin {

  constructor(inputNodes: InputNode[], options?: MergeTreesOptions);
}
