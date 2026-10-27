# @quokkaquery/graph

> Built and maintained by [QuokkaQuery](https://quokkaquery.com). Source on [GitHub](https://github.com/Nodlume/graph).

Generic TypeScript graph library with adjacency-list representation. Supports directed and undirected graphs, weighted edges, traversals, and common graph algorithms.

## Install

```bash
npm install @quokkaquery/graph
```

## Quick Start

```ts
import { Graph } from "@quokkaquery/graph";

const g = new Graph<string>({ directed: true });

g.addNode("a", "Alice")
 .addNode("b", "Bob")
 .addNode("c", "Carol");

g.addEdge("a", "b", 1);
g.addEdge("b", "c", 2);
g.addEdge("a", "c", 10);

// Shortest path
const result = g.dijkstra("a", "c");
// { distance: 3, path: ["a", "b", "c"] }
```

## API

### Constructor

```ts
new Graph<T, E>(opts?: { directed?: boolean })
```

- `T` — node data type (default `unknown`)
- `E` — edge data type (default `unknown`)
- `directed` — defaults to `true`

### Node Operations

| Method | Returns | Description |
|---|---|---|
| `addNode(id, data)` | `this` | Add a node (chainable) |
| `getNode(id)` | `GraphNode<T> \| undefined` | Get node by id |
| `hasNode(id)` | `boolean` | Check if node exists |
| `removeNode(id)` | `boolean` | Remove node and all its edges |
| `nodeCount` | `number` | Number of nodes |
| `nodeIds()` | `NodeId[]` | All node ids |
| `nodeEntries()` | `GraphNode<T>[]` | All nodes |

### Edge Operations

| Method | Returns | Description |
|---|---|---|
| `addEdge(from, to, weight?, data?)` | `this` | Add an edge (chainable, default weight 1) |
| `getEdge(from, to)` | `Edge<E> \| undefined` | Get edge between two nodes |
| `hasEdge(from, to)` | `boolean` | Check if edge exists |
| `removeEdge(from, to)` | `boolean` | Remove an edge |
| `edgeCount` | `number` | Number of edges |
| `edges()` | `Edge<E>[]` | All edges (deduplicated for undirected) |

### Neighbors & Degree

| Method | Returns | Description |
|---|---|---|
| `neighbors(id)` | `NodeId[]` | Outgoing neighbor ids |
| `outEdges(id)` | `Edge<E>[]` | Outgoing edges |
| `inEdges(id)` | `Edge<E>[]` | Incoming edges |
| `outDegree(id)` | `number` | Number of outgoing edges |
| `inDegree(id)` | `number` | Number of incoming edges |
| `degree(id)` | `number` | Total degree |
| `predecessors(id)` | `NodeId[]` | Nodes with edges pointing to this node |
| `successors(id)` | `NodeId[]` | Nodes this node points to |
| `connectedNodes(id)` | `NodeId[]` | Union of predecessors and successors |

### Node Classification

| Method | Returns | Description |
|---|---|---|
| `isSource(id)` | `boolean` | In-degree 0 (directed only) |
| `isSink(id)` | `boolean` | Out-degree 0 (directed only) |
| `isIsolated(id)` | `boolean` | Degree 0 |
| `sources()` | `NodeId[]` | All source nodes |
| `sinks()` | `NodeId[]` | All sink nodes |
| `isolatedNodes()` | `NodeId[]` | All isolated nodes |

### Reachability

| Method | Returns | Description |
|---|---|---|
| `reachableFrom(id)` | `Set<NodeId>` | All nodes reachable via outgoing edges |
| `reachableTo(id)` | `Set<NodeId>` | All nodes that can reach this node |

### Traversals

| Method | Description |
|---|---|
| `bfs(start, visitor)` | Breadth-first traversal. Return `false` from visitor to stop early. |
| `dfs(start, visitor)` | Depth-first traversal. Return `false` from visitor to stop early. |
| `findBfs(start, predicate)` | Find first node matching predicate via BFS |
| `findDfs(start, predicate)` | Find first node matching predicate via DFS |

### Algorithms

| Method | Description |
|---|---|
| `topologicalSort()` | Kahn's algorithm. Throws if graph has a cycle. Directed only. |
| `hasCycle()` | Cycle detection (DFS for directed, Union-Find for undirected) |
| `dijkstra(start, end)` | Shortest path. Returns `{ distance, path }` or `undefined`. |
| `connectedComponents()` | Connected (undirected) or weakly-connected (directed) components |

### Utilities

| Method | Description |
|---|---|
| `mapNodes(fn)` | Transform node data, producing a new graph |
| `subgraph(ids)` | Extract a subgraph containing only the given node ids |

## Types

```ts
type NodeId = string | number;

interface GraphNode<T> { id: NodeId; data: T }

interface Edge<E> { from: NodeId; to: NodeId; weight: number; data: E }

type Visitor<T> = (node: GraphNode<T>, depth: number) => void | false;

type NodePredicate<T> = (node: GraphNode<T>) => boolean;
```

## Development

```bash
npm test          # run tests
npm run test:watch # watch mode
npm run build      # compile TypeScript
```

## Gotchas

- **addEdge auto-creates nodes** with `undefined` data. If you need typed data, call `addNode` first.
- **Undirected edges** are stored as two directed entries internally. `edges()` deduplicates but `outEdges()`/`inEdges()` do not.
- **topologicalSort** throws `"Graph contains a cycle"` — catch it or check `hasCycle()` first.
- **dijkstra** uses an array-based priority queue — fine for moderate sizes, not for 100k+ node graphs.
- **reachableFrom** excludes the start node itself unless a cycle leads back to it.

## Common Patterns

### Dependency ordering

```ts
const deps = new Graph<string>();
deps.addEdge("build", "lint");
deps.addEdge("test", "build");
const order = deps.topologicalSort(); // ["test", "build", "lint"]
```

### Shortest path

```ts
const g = new Graph<string>();
g.addEdge("a", "b", 4).addEdge("b", "c", 2).addEdge("a", "c", 7);
const result = g.dijkstra("a", "c"); // { distance: 6, path: ["a", "b", "c"] }
```

### Filtering to a subgraph

```ts
const important = new Set(g.nodeIds().filter(id => g.degree(id) > 3));
const sub = g.subgraph(important);
```

## License

MIT © [QuokkaQuery](https://quokkaquery.com)

---

Part of the open-source tooling behind [QuokkaQuery](https://quokkaquery.com).
