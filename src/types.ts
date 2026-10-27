/** Unique identifier for a node — typically a string or number. */
export type NodeId = string | number;

/** A node in the graph, holding an id and arbitrary data. */
export interface GraphNode<T = unknown> {
  id: NodeId;
  data: T;
}

/** An edge connecting two nodes, with optional weight and metadata. */
export interface Edge<E = unknown> {
  from: NodeId;
  to: NodeId;
  weight: number;
  data: E;
}

/** Options when constructing a graph. */
export interface GraphOptions {
  directed?: boolean;
}

/** Visitor callback for traversals. Return `false` to stop early. */
export type Visitor<T> = (node: GraphNode<T>, depth: number) => void | false;

/** Filter predicate for search methods. */
export type NodePredicate<T> = (node: GraphNode<T>) => boolean;
