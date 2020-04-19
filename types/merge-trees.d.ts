/**
 * Symlink or copy multiple trees of files on top of each other, resulting in a single merged tree.
 * Optimized for repeated (incremental) merging.
 */
declare module "merge-trees" {

    interface MergeTreesOptions {
      /**
       *  By default, broccoli-merge-trees throws an error when a file exists in multiple nodes.
       *  If you pass { overwrite: true }, the output will contain the version of the file as it exists in
       *  the last input node that contains it.
       */
      overwrite?: boolean;
      /**
       * A note to help with logging.
       */
      annotation?: string;
    }

    export default class MergeTrees {

      /**
       * Constructor
       *
       * @param inputPaths: An array of paths to the input directories
       * @param outputPath: The path to the output directory. Must exist and be empty.
       * @param options: A hash of options
       */
      constructor(inputPaths: string[], outputPath: string, options?: MergeTreesOptions);

      /**
       * Merge the input directories into the output directory.
       * Can be called repeatedly for efficient incremental merging.
       */
      merge(): void;
    }
}
