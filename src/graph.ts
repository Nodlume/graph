/**
 * In-memory `Graph` class: node and edge storage, degree and reachability
 * queries, BFS/DFS traversal, and topological sort, cycle detection,
 * Dijkstra, connected components, mapping and subgraph extraction.
 */
import type { NodeId, GraphNode, Edge, GraphOptions, Visitor, NodePredicate } from "./types.js";

/**
 * Generic graph with adjacency-list representation.
 * Supports directed and undirected graphs, weighted edges, and common traversals.
 * Undirected edges are stored as a pair of mirrored directed edges, so
 * per-node edge lists contain both directions.
 *
 * @typeParam T - Node data type
 * @typeParam E - Edge data type
 */
export class Graph<T = unknown, E = unknown> {
  readonly directed: boolean;

  private nodes = new Map<NodeId, GraphNode<T>>();
  private adjOut = new Map<NodeId, Edge<E>[]>(); // outgoing edges
  private adjIn = new Map<NodeId, Edge<E>[]>(); // incoming edges (directed only, for convenience)

  /** Graphs are directed unless `opts.directed` is explicitly `false`. */
  constructor(opts: GraphOptions = {}) {
    this.directed = opts.directed ?? true;
  }

  // ── Node operations ──────────────────────────────────────────────

  /** Adds or replaces a node's data; existing edges on `id` are kept. Chainable. */
  addNode(id: NodeId, data: T): this {
    this.nodes.set(id, { id, data });
    if (!this.adjOut.has(id)) this.adjOut.set(id, []);
    if (!this.adjIn.has(id)) this.adjIn.set(id, []);
    return this;
  }

  getNode(id: NodeId): GraphNode<T> | undefined {
    return this.nodes.get(id);
  }

  hasNode(id: NodeId): boolean {
    return this.nodes.has(id);
  }

  /**
   * Deletes a node and its edges; returns false if `id` was not a registered node.
   * Only the first edge between `id` and each other node is removed from that
   * node's lists, so parallel edges leave dangling entries behind.
   */
  removeNode(id: NodeId): boolean {
    if (!this.nodes.has(id)) return false;
    this.nodes.delete(id);
    // Remove all edges touching this node
    this.adjOut.delete(id);
    this.adjIn.delete(id);
    for (const [, edges] of this.adjOut) {
      const idx = edges.findIndex((e) => e.to === id);
      if (idx !== -1) edges.splice(idx, 1);
    }
    for (const [, edges] of this.adjIn) {
      const idx = edges.findIndex((e) => e.from === id);
      if (idx !== -1) edges.splice(idx, 1);
    }
    return true;
  }

  get nodeCount(): number {
    return this.nodes.size;
  }

  nodeIds(): NodeId[] {
    return [...this.nodes.keys()];
  }

  nodeEntries(): GraphNode<T>[] {
    return [...this.nodes.values()];
  }

  // ── Edge operations ──────────────────────────────────────────────

  /**
   * Appends an edge (weight defaults to 1); parallel edges are allowed. Endpoints
   * not added via `addNode` get adjacency lists but are not registered nodes:
   * they are absent from `nodeIds`/`getNode` and skipped by traversal visitors
   * and `dijkstra`. Chainable.
   */
  addEdge(from: NodeId, to: NodeId, weight = 1, data?: E): this {
    this.ensureNode(from);
    this.ensureNode(to);
    const edge: Edge<E> = { from, to, weight, data: data as E };
    this.adjOut.get(from)!.push(edge);
    this.adjIn.get(to)!.push(edge);
    if (!this.directed) {
      const reverse: Edge<E> = { from: to, to: from, weight, data: data as E };
      this.adjOut.get(to)!.push(reverse);
      this.adjIn.get(from)!.push(reverse);
    }
    return this;
  }

  /** First stored edge from `from` to `to`; with parallel edges the others are not returned. */
  getEdge(from: NodeId, to: NodeId): Edge<E> | undefined {
    return this.adjOut.get(from)?.find((e) => e.to === to);
  }

  hasEdge(from: NodeId, to: NodeId): boolean {
    return this.getEdge(from, to) !== undefined;
  }

  /**
   * Removes one `from`→`to` edge (and its mirror when undirected); returns false
   * if none exists. Parallel edges must be removed one call at a time.
   */
  removeEdge(from: NodeId, to: NodeId): boolean {
    const out = this.adjOut.get(from);
    if (!out) return false;
    const idx = out.findIndex((e) => e.to === to);
    if (idx === -1) return false;
    out.splice(idx, 1);
    const inEdges = this.adjIn.get(to);
    if (inEdges) {
      const iIdx = inEdges.findIndex((e) => e.from === from);
      if (iIdx !== -1) inEdges.splice(iIdx, 1);
    }
    if (!this.directed) {
      const revOut = this.adjOut.get(to);
      if (revOut) {
        const rIdx = revOut.findIndex((e) => e.to === from);
        if (rIdx !== -1) revOut.splice(rIdx, 1);
      }
      const revIn = this.adjIn.get(from);
      if (revIn) {
        const rIdx = revIn.findIndex((e) => e.from === to);
        if (rIdx !== -1) revIn.splice(rIdx, 1);
      }
    }
    return true;
  }

  /** Number of edges; undirected edges count once despite being stored twice. */
  get edgeCount(): number {
    let count = 0;
    for (const [, edges] of this.adjOut) count += edges.length;
    return this.directed ? count : count / 2;
  }

  /**
   * All edges. For undirected graphs, one edge per node pair is returned in
   * whichever direction was seen first, which also collapses parallel edges —
   * so `mapNodes` and `subgraph` drop undirected parallel edges.
   */
  edges(): Edge<E>[] {
    const all: Edge<E>[] = [];
    for (const [, edges] of this.adjOut) all.push(...edges);
    if (!this.directed) {
      // Deduplicate: keep the first-seen direction of each node pair
      const seen = new Set<string>();
      return all.filter((e) => {
        const key = `${e.from}->${e.to}`;
        const rev = `${e.to}->${e.from}`;
        if (seen.has(key) || seen.has(rev)) return false;
        seen.add(key);
        return true;
      });
    }
    return all;
  }

  /** Outgoing neighbors of a node. */
  neighbors(id: NodeId): NodeId[] {
    return (this.adjOut.get(id) ?? []).map((e) => e.to);
  }

  /** Outgoing edges from a node. */
  outEdges(id: NodeId): Edge<E>[] {
    return this.adjOut.get(id) ?? [];
  }

  /** Incoming edges to a node (always available, even for undirected). */
  inEdges(id: NodeId): Edge<E>[] {
    return this.adjIn.get(id) ?? [];
  }

  /** Out-degree of a node. */
  outDegree(id: NodeId): number {
    return (this.adjOut.get(id) ?? []).length;
  }

  /** In-degree of a node. */
  inDegree(id: NodeId): number {
    return (this.adjIn.get(id) ?? []).length;
  }

  /** Total degree: in + out (for undirected, equals the number of incident edges). */
  degree(id: NodeId): number {
    return this.directed
      ? this.inDegree(id) + this.outDegree(id)
      : this.outDegree(id); // undirected stores both directions, so outDegree already counts all
  }

  // ── Node-level helpers (for custom traversals) ───────────────────

  /** Predecessor node ids — nodes with an edge pointing *to* this node. */
  predecessors(id: NodeId): NodeId[] {
    return (this.adjIn.get(id) ?? []).map((e) => e.from);
  }

  /** Successor node ids — same as `neighbors`, nodes this node points *to*. */
  successors(id: NodeId): NodeId[] {
    return this.neighbors(id);
  }

  /**
   * All directly connected node ids (union of predecessors and successors).
   * For undirected graphs this equals `neighbors`. For directed graphs it
   * includes both incoming and outgoing connections, deduplicated.
   */
  connectedNodes(id: NodeId): NodeId[] {
    if (!this.directed) return this.neighbors(id);
    const set = new Set<NodeId>();
    for (const e of this.adjOut.get(id) ?? []) set.add(e.to);
    for (const e of this.adjIn.get(id) ?? []) set.add(e.from);
    return [...set];
  }

  /** Whether `id` is a source (no incoming edges). Directed only — always false for undirected. */
  isSource(id: NodeId): boolean {
    return this.directed && this.inDegree(id) === 0 && this.hasNode(id);
  }

  /** Whether `id` is a sink (no outgoing edges). Directed only — always false for undirected. */
  isSink(id: NodeId): boolean {
    return this.directed && this.outDegree(id) === 0 && this.hasNode(id);
  }

  /** Whether `id` has no edges at all. */
  isIsolated(id: NodeId): boolean {
    return this.degree(id) === 0 && this.hasNode(id);
  }

  /** All source nodes (in-degree 0). Directed graphs only. */
  sources(): NodeId[] {
    if (!this.directed) return [];
    return this.nodeIds().filter((id) => this.inDegree(id) === 0);
  }

  /** All sink nodes (out-degree 0). Directed graphs only. */
  sinks(): NodeId[] {
    if (!this.directed) return [];
    return this.nodeIds().filter((id) => this.outDegree(id) === 0);
  }

  /** All isolated nodes (degree 0). */
  isolatedNodes(): NodeId[] {
    return this.nodeIds().filter((id) => this.degree(id) === 0);
  }

  /**
   * All nodes reachable from `id` (transitive closure of successors).
   * Does not include `id` itself unless there is a cycle back to it.
   */
  reachableFrom(id: NodeId): Set<NodeId> {
    const reached = new Set<NodeId>();
    const stack: NodeId[] = [...this.neighbors(id)];
    while (stack.length > 0) {
      const cur = stack.pop()!;
      if (reached.has(cur)) continue;
      reached.add(cur);
      for (const next of this.neighbors(cur)) {
        if (!reached.has(next)) stack.push(next);
      }
    }
    return reached;
  }

  /**
   * All nodes that can reach `id` (transitive closure of predecessors).
   * Does not include `id` itself unless there is a cycle.
   */
  reachableTo(id: NodeId): Set<NodeId> {
    const reached = new Set<NodeId>();
    const stack: NodeId[] = [...this.predecessors(id)];
    while (stack.length > 0) {
      const cur = stack.pop()!;
      if (reached.has(cur)) continue;
      reached.add(cur);
      for (const prev of this.predecessors(cur)) {
        if (!reached.has(prev)) stack.push(prev);
      }
    }
    return reached;
  }

  // ── Traversals ───────────────────────────────────────────────────

  /** Breadth-first traversal from a start node. */
  bfs(start: NodeId, visitor: Visitor<T>): void {
    const visited = new Set<NodeId>();
    const queue: Array<{ id: NodeId; depth: number }> = [{ id: start, depth: 0 }];
    visited.add(start);
    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      const node = this.nodes.get(id);
      if (!node) continue;
      if (visitor(node, depth) === false) return;
      for (const nId of this.neighbors(id)) {
        if (!visited.has(nId)) {
          visited.add(nId);
          queue.push({ id: nId, depth: depth + 1 });
        }
      }
    }
  }

  /** Depth-first traversal from a start node (iterative). */
  dfs(start: NodeId, visitor: Visitor<T>): void {
    const visited = new Set<NodeId>();
    const stack: Array<{ id: NodeId; depth: number }> = [{ id: start, depth: 0 }];
    while (stack.length > 0) {
      const { id, depth } = stack.pop()!;
      if (visited.has(id)) continue;
      visited.add(id);
      const node = this.nodes.get(id);
      if (!node) continue;
      if (visitor(node, depth) === false) return;
      // Push neighbors in reverse so the first neighbor is visited first
      const nbrs = this.neighbors(id);
      for (let i = nbrs.length - 1; i >= 0; i--) {
        if (!visited.has(nbrs[i])) stack.push({ id: nbrs[i], depth: depth + 1 });
      }
    }
  }

  /** Find a node matching a predicate via BFS. */
  findBfs(start: NodeId, predicate: NodePredicate<T>): GraphNode<T> | undefined {
    let found: GraphNode<T> | undefined;
    this.bfs(start, (node) => {
      if (predicate(node)) {
        found = node;
        return false;
      }
    });
    return found;
  }

  /** Find a node matching a predicate via DFS. */
  findDfs(start: NodeId, predicate: NodePredicate<T>): GraphNode<T> | undefined {
    let found: GraphNode<T> | undefined;
    this.dfs(start, (node) => {
      if (predicate(node)) {
        found = node;
        return false;
      }
    });
    return found;
  }

  // ── Algorithms ───────────────────────────────────────────────────

  /**
   * Topological sort (Kahn's algorithm). Returns node ids in topological order.
   * Throws if the graph is undirected or has a cycle.
   */
  topologicalSort(): NodeId[] {
    if (!this.directed) throw new Error("Topological sort requires a directed graph");
    const inDeg = new Map<NodeId, number>();
    for (const id of this.nodes.keys()) inDeg.set(id, 0);
    for (const [, edges] of this.adjOut) {
      for (const e of edges) inDeg.set(e.to, (inDeg.get(e.to) ?? 0) + 1);
    }
    const queue: NodeId[] = [];
    for (const [id, deg] of inDeg) if (deg === 0) queue.push(id);
    const result: NodeId[] = [];
    while (queue.length > 0) {
      const id = queue.shift()!;
      result.push(id);
      for (const e of this.adjOut.get(id) ?? []) {
        const newDeg = inDeg.get(e.to)! - 1;
        inDeg.set(e.to, newDeg);
        if (newDeg === 0) queue.push(e.to);
      }
    }
    if (result.length !== this.nodes.size) throw new Error("Graph contains a cycle");
    return result;
  }

  /** Detect whether the graph contains a cycle. */
  hasCycle(): boolean {
    if (this.directed) {
      // DFS-based: white(0)/gray(1)/black(2)
      const color = new Map<NodeId, number>();
      for (const id of this.nodes.keys()) color.set(id, 0);
      const dfs = (id: NodeId): boolean => {
        color.set(id, 1);
        for (const e of this.adjOut.get(id) ?? []) {
          if (color.get(e.to) === 1) return true;
          if (color.get(e.to) === 0 && dfs(e.to)) return true;
        }
        color.set(id, 2);
        return false;
      };
      for (const id of this.nodes.keys()) {
        if (color.get(id) === 0 && dfs(id)) return true;
      }
      return false;
    } else {
      // Union-Find for undirected
      const parent = new Map<NodeId, NodeId>();
      const find = (x: NodeId): NodeId => {
        while (parent.get(x) !== x) {
          parent.set(x, parent.get(parent.get(x)!)!);
          x = parent.get(x)!;
        }
        return x;
      };
      for (const id of this.nodes.keys()) parent.set(id, id);
      for (const edge of this.edges()) {
        const rootA = find(edge.from);
        const rootB = find(edge.to);
        if (rootA === rootB) return true;
        parent.set(rootA, rootB);
      }
      return false;
    }
  }

  /**
   * Dijkstra's shortest path from `start` to `end`.
   * Returns `{ distance, path }` or `undefined` if unreachable.
   * Edges must have non-negative weights. `end` must be a registered node;
   * otherwise the result is a one-element path with an undefined distance
   * rather than `undefined`.
   */
  dijkstra(
    start: NodeId,
    end: NodeId
  ): { distance: number; path: NodeId[] } | undefined {
    const dist = new Map<NodeId, number>();
    const prev = new Map<NodeId, NodeId | null>();
    const visited = new Set<NodeId>();
    // Simple priority queue (array-based — fine for moderate graph sizes)
    const pq: Array<{ id: NodeId; d: number }> = [];

    for (const id of this.nodes.keys()) dist.set(id, Infinity);
    dist.set(start, 0);
    prev.set(start, null);
    pq.push({ id: start, d: 0 });

    while (pq.length > 0) {
      pq.sort((a, b) => a.d - b.d);
      const { id } = pq.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      if (id === end) break;
      for (const e of this.adjOut.get(id) ?? []) {
        const alt = dist.get(id)! + e.weight;
        if (alt < dist.get(e.to)!) {
          dist.set(e.to, alt);
          prev.set(e.to, id);
          pq.push({ id: e.to, d: alt });
        }
      }
    }

    if (dist.get(end) === Infinity) return undefined;
    const path: NodeId[] = [];
    let cur: NodeId | null = end;
    while (cur !== null) {
      path.unshift(cur);
      cur = prev.get(cur) ?? null;
    }
    return { distance: dist.get(end)!, path };
  }

  /**
   * Connected components (undirected) or weakly-connected components (directed).
   * Returns an array of node-id arrays, one per component.
   */
  connectedComponents(): NodeId[][] {
    const visited = new Set<NodeId>();
    const components: NodeId[][] = [];
    for (const id of this.nodes.keys()) {
      if (visited.has(id)) continue;
      const component: NodeId[] = [];
      // BFS ignoring direction
      const queue: NodeId[] = [id];
      visited.add(id);
      while (queue.length > 0) {
        const cur = queue.shift()!;
        component.push(cur);
        for (const e of this.adjOut.get(cur) ?? []) {
          if (!visited.has(e.to)) {
            visited.add(e.to);
            queue.push(e.to);
          }
        }
        if (this.directed) {
          for (const e of this.adjIn.get(cur) ?? []) {
            if (!visited.has(e.from)) {
              visited.add(e.from);
              queue.push(e.from);
            }
          }
        }
      }
      components.push(component);
    }
    return components;
  }

  /**
   * Map over node data, producing a new graph with transformed data.
   * Edges and structure are preserved.
   */
  mapNodes<U>(fn: (node: GraphNode<T>) => U): Graph<U, E> {
    const g = new Graph<U, E>({ directed: this.directed });
    for (const node of this.nodes.values()) g.addNode(node.id, fn(node));
    for (const edge of this.edges()) g.addEdge(edge.from, edge.to, edge.weight, edge.data);
    return g;
  }

  /** Create a subgraph containing only the given node ids. */
  subgraph(ids: Set<NodeId>): Graph<T, E> {
    const g = new Graph<T, E>({ directed: this.directed });
    for (const id of ids) {
      const node = this.nodes.get(id);
      if (node) g.addNode(id, node.data);
    }
    for (const edge of this.edges()) {
      if (ids.has(edge.from) && ids.has(edge.to)) {
        g.addEdge(edge.from, edge.to, edge.weight, edge.data);
      }
    }
    return g;
  }

  // ── Internal ─────────────────────────────────────────────────────

  private ensureNode(id: NodeId): void {
    if (!this.adjOut.has(id)) {
      this.adjOut.set(id, []);
      this.adjIn.set(id, []);
    }
  }
}
