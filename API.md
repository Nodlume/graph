# @quokkaquery/graph — API Reference

Distilled API surface for agent prompts and quick reference. 7 exports from `src/index.ts`.

## Types

```typescript
export type NodeId = string | number

export interface GraphNode<T = unknown> {
  id: NodeId
  data: T
}

export interface Edge<E = unknown> {
  from: NodeId
  to: NodeId
  weight: number
  data: E
}

export interface GraphOptions {
  directed?: boolean    // default: true
}

export type Visitor<T> = (node: GraphNode<T>, depth: number) => void | false
export type NodePredicate<T> = (node: GraphNode<T>) => boolean
```

## Class

```typescript
export class Graph<T = unknown, E = unknown> {
  readonly directed: boolean

  constructor(opts?: GraphOptions)

  // ── Nodes ──────────────────────────────────────────
  addNode(id: NodeId, data: T): this
  getNode(id: NodeId): GraphNode<T> | undefined
  hasNode(id: NodeId): boolean
  removeNode(id: NodeId): boolean
  get nodeCount(): number
  nodeIds(): NodeId[]
  nodeEntries(): GraphNode<T>[]

  // ── Edges ──────────────────────────────────────────
  addEdge(from: NodeId, to: NodeId, weight?: number, data?: E): this
  getEdge(from: NodeId, to: NodeId): Edge<E> | undefined
  hasEdge(from: NodeId, to: NodeId): boolean
  removeEdge(from: NodeId, to: NodeId): boolean
  get edgeCount(): number
  edges(): Edge<E>[]
  neighbors(id: NodeId): NodeId[]
  outEdges(id: NodeId): Edge<E>[]
  inEdges(id: NodeId): Edge<E>[]
  outDegree(id: NodeId): number
  inDegree(id: NodeId): number
  degree(id: NodeId): number

  // ── Node helpers ───────────────────────────────────
  predecessors(id: NodeId): NodeId[]
  successors(id: NodeId): NodeId[]
  connectedNodes(id: NodeId): NodeId[]
  isSource(id: NodeId): boolean       // directed only
  isSink(id: NodeId): boolean         // directed only
  isIsolated(id: NodeId): boolean
  sources(): NodeId[]                 // directed only
  sinks(): NodeId[]                   // directed only
  isolatedNodes(): NodeId[]

  // ── Reachability ───────────────────────────────────
  reachableFrom(id: NodeId): Set<NodeId>
  reachableTo(id: NodeId): Set<NodeId>

  // ── Traversals ─────────────────────────────────────
  bfs(start: NodeId, visitor: Visitor<T>): void
  dfs(start: NodeId, visitor: Visitor<T>): void
  findBfs(start: NodeId, predicate: NodePredicate<T>): GraphNode<T> | undefined
  findDfs(start: NodeId, predicate: NodePredicate<T>): GraphNode<T> | undefined

  // ── Algorithms ─────────────────────────────────────
  topologicalSort(): NodeId[]         // directed only, throws on cycle
  hasCycle(): boolean
  dijkstra(start: NodeId, end: NodeId): { distance: number; path: NodeId[] } | undefined
  connectedComponents(): NodeId[][]   // weakly-connected for directed

  // ── Transforms ─────────────────────────────────────
  mapNodes<U>(fn: (node: GraphNode<T>) => U): Graph<U, E>
  subgraph(ids: Set<NodeId>): Graph<T, E>
}
```

## Notes

- Adjacency-list representation. Directed by default.
- `addEdge` auto-creates missing nodes. For undirected, both directions are stored internally.
- `edges()` deduplicates for undirected graphs.
- `reachableFrom` includes the start node only if a cycle leads back to it.
- Visitor callbacks can return `false` to stop traversal early.
