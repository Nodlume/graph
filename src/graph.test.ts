import { describe, it, expect } from "vitest";
import { Graph } from "./graph.js";

describe("Graph — structure", () => {
  it("adds and retrieves nodes", () => {
    const g = new Graph<string>();
    g.addNode("a", "Alice").addNode("b", "Bob");
    expect(g.nodeCount).toBe(2);
    expect(g.getNode("a")?.data).toBe("Alice");
    expect(g.hasNode("b")).toBe(true);
    expect(g.hasNode("c")).toBe(false);
  });

  it("adds and retrieves edges (directed)", () => {
    const g = new Graph<string>({ directed: true });
    g.addNode("a", "A").addNode("b", "B");
    g.addEdge("a", "b", 5);
    expect(g.edgeCount).toBe(1);
    expect(g.hasEdge("a", "b")).toBe(true);
    expect(g.hasEdge("b", "a")).toBe(false);
    expect(g.getEdge("a", "b")?.weight).toBe(5);
  });

  it("adds bidirectional edges for undirected", () => {
    const g = new Graph<string>({ directed: false });
    g.addNode("a", "A").addNode("b", "B");
    g.addEdge("a", "b");
    expect(g.edgeCount).toBe(1); // deduplicated count
    expect(g.hasEdge("a", "b")).toBe(true);
    expect(g.hasEdge("b", "a")).toBe(true);
  });

  it("removes nodes and their edges", () => {
    const g = new Graph<string>();
    g.addNode("a", "A").addNode("b", "B").addNode("c", "C");
    g.addEdge("a", "b").addEdge("b", "c");
    g.removeNode("b");
    expect(g.nodeCount).toBe(2);
    expect(g.hasEdge("a", "b")).toBe(false);
  });

  it("removes edges", () => {
    const g = new Graph<string>();
    g.addNode("a", "A").addNode("b", "B");
    g.addEdge("a", "b");
    expect(g.removeEdge("a", "b")).toBe(true);
    expect(g.hasEdge("a", "b")).toBe(false);
    expect(g.removeEdge("a", "b")).toBe(false);
  });

  it("reports degree correctly", () => {
    const g = new Graph<string>();
    g.addNode("a", "A").addNode("b", "B").addNode("c", "C");
    g.addEdge("a", "b").addEdge("a", "c");
    expect(g.outDegree("a")).toBe(2);
    expect(g.inDegree("b")).toBe(1);
  });
});

describe("Graph — traversals", () => {
  function makeDAG() {
    //  a → b → d
    //  a → c → d
    const g = new Graph<string>();
    g.addNode("a", "A").addNode("b", "B").addNode("c", "C").addNode("d", "D");
    g.addEdge("a", "b").addEdge("a", "c").addEdge("b", "d").addEdge("c", "d");
    return g;
  }

  it("BFS visits in level order", () => {
    const g = makeDAG();
    const order: string[] = [];
    g.bfs("a", (n) => { order.push(n.id as string); });
    expect(order).toEqual(["a", "b", "c", "d"]);
  });

  it("DFS visits depth-first", () => {
    const g = makeDAG();
    const order: string[] = [];
    g.dfs("a", (n) => { order.push(n.id as string); });
    // First neighbor "b" explored fully before "c"
    expect(order).toEqual(["a", "b", "d", "c"]);
  });

  it("BFS early termination", () => {
    const g = makeDAG();
    const order: string[] = [];
    g.bfs("a", (n) => {
      order.push(n.id as string);
      if (n.id === "b") return false;
    });
    expect(order).toEqual(["a", "b"]);
  });

  it("findBfs returns matching node", () => {
    const g = makeDAG();
    const found = g.findBfs("a", (n) => n.data === "D");
    expect(found?.id).toBe("d");
  });

  it("findDfs returns matching node", () => {
    const g = makeDAG();
    const found = g.findDfs("a", (n) => n.data === "D");
    expect(found?.id).toBe("d");
  });
});

describe("Graph — algorithms", () => {
  it("topological sort on a DAG", () => {
    const g = new Graph<string>();
    g.addNode("a", "").addNode("b", "").addNode("c", "").addNode("d", "");
    g.addEdge("a", "b").addEdge("a", "c").addEdge("b", "d").addEdge("c", "d");
    const sorted = g.topologicalSort();
    expect(sorted.indexOf("a")).toBeLessThan(sorted.indexOf("b"));
    expect(sorted.indexOf("a")).toBeLessThan(sorted.indexOf("c"));
    expect(sorted.indexOf("b")).toBeLessThan(sorted.indexOf("d"));
    expect(sorted.indexOf("c")).toBeLessThan(sorted.indexOf("d"));
  });

  it("topological sort throws on cycle", () => {
    const g = new Graph<string>();
    g.addNode("a", "").addNode("b", "");
    g.addEdge("a", "b").addEdge("b", "a");
    expect(() => g.topologicalSort()).toThrow("cycle");
  });

  it("hasCycle detects directed cycle", () => {
    const g = new Graph<string>();
    g.addNode("a", "").addNode("b", "").addNode("c", "");
    g.addEdge("a", "b").addEdge("b", "c").addEdge("c", "a");
    expect(g.hasCycle()).toBe(true);
  });

  it("hasCycle returns false for DAG", () => {
    const g = new Graph<string>();
    g.addNode("a", "").addNode("b", "");
    g.addEdge("a", "b");
    expect(g.hasCycle()).toBe(false);
  });

  it("hasCycle detects undirected cycle", () => {
    const g = new Graph<string>({ directed: false });
    g.addNode("a", "").addNode("b", "").addNode("c", "");
    g.addEdge("a", "b").addEdge("b", "c").addEdge("c", "a");
    expect(g.hasCycle()).toBe(true);
  });

  it("dijkstra finds shortest path", () => {
    const g = new Graph<string>();
    g.addNode("a", "").addNode("b", "").addNode("c", "").addNode("d", "");
    g.addEdge("a", "b", 1).addEdge("b", "d", 5);
    g.addEdge("a", "c", 2).addEdge("c", "d", 1);
    const result = g.dijkstra("a", "d");
    expect(result).toBeDefined();
    expect(result!.distance).toBe(3); // a→c→d
    expect(result!.path).toEqual(["a", "c", "d"]);
  });

  it("dijkstra returns undefined for unreachable node", () => {
    const g = new Graph<string>();
    g.addNode("a", "").addNode("b", "");
    expect(g.dijkstra("a", "b")).toBeUndefined();
  });

  it("connectedComponents finds components", () => {
    const g = new Graph<string>({ directed: false });
    g.addNode("a", "").addNode("b", "").addNode("c", "").addNode("d", "");
    g.addEdge("a", "b");
    g.addEdge("c", "d");
    const comps = g.connectedComponents();
    expect(comps).toHaveLength(2);
  });

  it("connectedComponents finds weakly-connected in directed", () => {
    const g = new Graph<string>();
    g.addNode("a", "").addNode("b", "").addNode("c", "");
    g.addEdge("a", "b"); // a→b, c is isolated
    const comps = g.connectedComponents();
    expect(comps).toHaveLength(2);
  });
});

describe("Graph — node-level helpers", () => {
  //  a → b → d
  //  a → c → d
  //  e (isolated)
  function makeDag() {
    const g = new Graph<string>();
    g.addNode("a", "").addNode("b", "").addNode("c", "").addNode("d", "").addNode("e", "");
    g.addEdge("a", "b").addEdge("a", "c").addEdge("b", "d").addEdge("c", "d");
    return g;
  }

  it("predecessors returns incoming neighbors", () => {
    const g = makeDag();
    expect(g.predecessors("d").sort()).toEqual(["b", "c"]);
    expect(g.predecessors("a")).toEqual([]);
  });

  it("successors returns outgoing neighbors", () => {
    const g = makeDag();
    expect(g.successors("a").sort()).toEqual(["b", "c"]);
    expect(g.successors("d")).toEqual([]);
  });

  it("connectedNodes returns union of predecessors and successors (directed)", () => {
    const g = makeDag();
    // b: predecessors=[a], successors=[d]
    expect(g.connectedNodes("b").sort()).toEqual(["a", "d"]);
  });

  it("connectedNodes equals neighbors for undirected", () => {
    const g = new Graph<string>({ directed: false });
    g.addNode("a", "").addNode("b", "").addNode("c", "");
    g.addEdge("a", "b").addEdge("a", "c");
    expect(g.connectedNodes("a").sort()).toEqual(["b", "c"]);
  });

  it("degree returns total connections", () => {
    const g = makeDag();
    expect(g.degree("b")).toBe(2); // in:1 + out:1
    expect(g.degree("a")).toBe(2); // in:0 + out:2
    expect(g.degree("d")).toBe(2); // in:2 + out:0
    expect(g.degree("e")).toBe(0);
  });

  it("isSource / isSink / isIsolated", () => {
    const g = makeDag();
    expect(g.isSource("a")).toBe(true);
    expect(g.isSource("b")).toBe(false);
    expect(g.isSink("d")).toBe(true);
    expect(g.isSink("a")).toBe(false);
    expect(g.isIsolated("e")).toBe(true);
    expect(g.isIsolated("a")).toBe(false);
  });

  it("sources / sinks / isolatedNodes", () => {
    const g = makeDag();
    expect(g.sources().sort()).toEqual(["a", "e"]);
    expect(g.sinks().sort()).toEqual(["d", "e"]);
    expect(g.isolatedNodes()).toEqual(["e"]);
  });

  it("sources/sinks return empty for undirected", () => {
    const g = new Graph<string>({ directed: false });
    g.addNode("a", "").addNode("b", "");
    g.addEdge("a", "b");
    expect(g.sources()).toEqual([]);
    expect(g.sinks()).toEqual([]);
  });

  it("reachableFrom finds transitive successors", () => {
    const g = makeDag();
    const reached = g.reachableFrom("a");
    expect([...reached].sort()).toEqual(["b", "c", "d"]);
    expect(reached.has("e")).toBe(false);
    expect(reached.has("a")).toBe(false); // no cycle, doesn't include self
  });

  it("reachableFrom includes self on cycle", () => {
    const g = new Graph<string>();
    g.addNode("a", "").addNode("b", "");
    g.addEdge("a", "b").addEdge("b", "a");
    const reached = g.reachableFrom("a");
    expect(reached.has("a")).toBe(true);
    expect(reached.has("b")).toBe(true);
  });

  it("reachableTo finds transitive predecessors", () => {
    const g = makeDag();
    const reached = g.reachableTo("d");
    expect([...reached].sort()).toEqual(["a", "b", "c"]);
    expect(reached.has("e")).toBe(false);
  });

  it("reachableTo returns empty for source node", () => {
    const g = makeDag();
    expect(g.reachableTo("a").size).toBe(0);
  });
});

describe("Graph — utilities", () => {
  it("mapNodes transforms data", () => {
    const g = new Graph<number>();
    g.addNode(1, 10).addNode(2, 20).addEdge(1, 2);
    const doubled = g.mapNodes((n) => n.data * 2);
    expect(doubled.getNode(1)?.data).toBe(20);
    expect(doubled.getNode(2)?.data).toBe(40);
    expect(doubled.hasEdge(1, 2)).toBe(true);
  });

  it("subgraph extracts subset", () => {
    const g = new Graph<string>();
    g.addNode("a", "").addNode("b", "").addNode("c", "");
    g.addEdge("a", "b").addEdge("b", "c").addEdge("a", "c");
    const sub = g.subgraph(new Set(["a", "b"]));
    expect(sub.nodeCount).toBe(2);
    expect(sub.hasEdge("a", "b")).toBe(true);
    expect(sub.hasEdge("a", "c")).toBe(false);
  });
});
