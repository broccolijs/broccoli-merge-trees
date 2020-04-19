import Plugin from "broccoli-plugin";
import {default as NodeMergeTrees} from "merge-trees";
import {InputNode} from "broccoli-node-api";

export interface Options {
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

/**
 * Copy multiple trees of files on top of each other, resulting in a single merged tree.
 */
export class BroccoliMergeTrees extends Plugin {

  private readonly inputNodes: InputNode[];
  private readonly options: Options;
  private mergeTrees: NodeMergeTrees | null;

  constructor(inputNodes: InputNode[], options: Options = {}) {
    if (!Array.isArray(inputNodes)) {
      const name = "broccoli-merge-trees:" + (options.annotation ?? "");
      throw new TypeError(`${name}: Expected array, got: [${inputNodes}]`);
    }
    super(inputNodes, {
      persistentOutput: true,
      needsCache: false,
      annotation: options.annotation
    });

    this.inputNodes = inputNodes;
    this.options = options;
    this.mergeTrees = null;
  }

  build(): void {
    if (this.mergeTrees === null) {
      // Defer instantiation until the first build because we only
      // have this.inputPaths and this.outputPath once we build.
      const outputPath = `${this.outputPath}${this.options.destDir ? "/" + this.options.destDir : ""}`;
      this.mergeTrees = new NodeMergeTrees(this.inputPaths, outputPath, {
        overwrite: this.options.overwrite ?? false,
        annotation: this.options.annotation
      });
    }

    try {
      this.mergeTrees.merge();
    } catch (err) {
      if (err !== null && typeof err === "object") {
        const nodesList = this.inputNodes.map((node, i) => `  ${i + 1}.  ${node.toString()}`).join("\n");
        const message = `${this.toString()} error while merging the following:\n${nodesList}`;

        err.message = `${message}\n${err.message}`;
      }
      throw err;
    }
  }
}

export default function mergeTrees(inputNodes: InputNode[], options: Options = {}): BroccoliMergeTrees {
  return new BroccoliMergeTrees(inputNodes, options);
}
