/**
 * Public entry point for the graph package: re-exports the `Graph` class and
 * its supporting types, so consumers never import from internal module paths.
 * The types are exported with `export type`, so they disappear at compile time
 * and only `Graph` remains as a runtime export.
 */
export { Graph } from "./graph.js";
export type {
  NodeId,
  GraphNode,
  Edge,
  GraphOptions,
  Visitor,
  NodePredicate,
} from "./types.js";
