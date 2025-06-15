import { v4 as uuidv4 } from 'uuid';

// ======== PriorityQueue class to be added near the top of the file ========
class PriorityQueue<T> {
    private nodes: { item: T; priority: number }[] = [];
    enqueue(item: T, priority: number) {
        this.nodes.push({ item, priority });
        this.nodes.sort((a, b) => a.priority - b.priority);
    }
    dequeue(): T | undefined {
        return this.nodes.shift()?.item;
    }
    isEmpty(): boolean {
        return this.nodes.length === 0;
    }
}

/* ────────────────────────────────────────────────────────────────────────── */
/* 1 ▏Core, Mutation, & Event Types                                          */
/* ────────────────────────────────────────────────────────────────────────── */
// ... Node, Edge, HyperEdge, Mutation, SerializedGraph types (unchanged)
export type Id = string;
export const NODE_TYPES = [ 'root', 'standard', 'nest', 'subnest', 'folder', 'note', 'tag', 'entity' ] as const;
export type NodeType = typeof NODE_TYPES[number];
export interface Node<P = unknown> { id: Id; type: NodeType; props: P; }
export const EDGE_TYPES = [ 'hierarchy', 'linksTo', 'hasTag', 'mentions', 'semantic' ] as const;
export type EdgeType = typeof EDGE_TYPES[number];
export interface Edge<P = unknown> { id: Id; type: EdgeType; from: Id; to: Id; props?: P; }
export interface HyperEdge<P = unknown> { id: Id; type: 'hyper'; nodes: Id[]; props?: P; }
// export type Mutation = any; // Simplified for brevity - let's use the more specific one from before
// Types for Batch Mutations (from previous version, keep these for applyBatch if it's still there or for future use)
type AddNodeMutation = { action: 'addNode'; payload: { type: NodeType; props: any; parentId?: Id; id?: Id } }; // Added id for clone
type UpdateNodeMutation = { action: 'updateNodeProps'; payload: { id: Id; props: any } };
type DeleteNodeMutation = { action: 'deleteNode'; payload: { id: Id, recursive?: boolean } }; // This might map to destroyNode now
type MoveNodeMutation = { action: 'moveNode'; payload: { nodeId: Id; newParentId: Id } }; // This might map to new move()
type AddEdgeMutation = { action: 'addEdge'; payload: { type: EdgeType; from: Id; to: Id; props?: any } };

export type Mutation = AddNodeMutation | UpdateNodeMutation | DeleteNodeMutation | MoveNodeMutation | AddEdgeMutation;
export interface SerializedGraph { nodes: Node[]; edges: Edge[]; hyperedges: HyperEdge[]; }

// Enhanced Event Types
export type GraphEvent =
    | 'node:added' | 'node:removed' | 'node:restored' | 'node:destroyed' | 'node:updated' | 'node:moved'
    | 'edge:added' | 'edge:removed' | 'edge:restored' | 'edge:destroyed' | 'edge:moved'
    | 'reloaded';
export type GraphListener = (payload: any) => void;

/* ────────────────────────────────────────────────────────────────────────── */
/* 2 ▏The Dynamic & Robust Graph Core                                        */
/* ────────────────────────────────────────────────────────────────────────── */
export class Graph {
  // --- Active Graph Storage ---
  private nodes = new Map<Id, Node>();
  private edges = new Map<Id, Edge>();
  private hyperedges = new Map<Id, HyperEdge>(); // Assuming hyperedge logic remains similar, not detailed in new snippet

  // --- NEW: Limbo Storage for "Removed" Elements ---
  private removedNodes = new Map<Id, Node>();
  private removedEdges = new Map<Id, Edge>();

  // Indexes (operate only on the active graph)
  private children = new Map<Id, Set<Id>>();
  private parent = new Map<Id, Id>();
  private nodeToEdges = new Map<Id, Set<Id>>();
  private nodeToHyperedges = new Map<Id, Set<Id>>(); // Assuming this is still used

  // Advanced Feature Components (stubs from snippet, assuming full versions exist or are not primary focus of this change)
  private listeners = new Map<GraphEvent, GraphListener[]>();
  private propertyIndex = new Map<string, Map<any, Set<Id>>>(); // For findNodes, not detailed here

  // Constructor from previous version
  constructor() {}

  // InitializeNodeIndexes from previous full version
  private initializeNodeIndexes(id: Id) {
    this.children.set(id, new Set());
    this.nodeToEdges.set(id, new Set());
    this.nodeToHyperedges.set(id, new Set()); // Keep if hyperedges are still a feature
  }

  // getNode from previous version
  getNode(id: Id): Node | undefined { return this.nodes.get(id) || this.removedNodes.get(id); }


  /* --- Existing CRUD methods that need review/integration with new concepts --- */
  // addNode - modified to align with cloneNode expecting an ID
  public addNode<P>(type: NodeType, props: P, parentId?: Id | null, nodeId?: Id): Node<P> {
    const idToUse = nodeId || uuidv4();
    if (this.nodes.has(idToUse) || this.removedNodes.has(idToUse)) throw new Error(`Node with ID ${idToUse} already exists or is in limbo.`);

    const node: Node<P> = { id: idToUse, type, props };
    this.nodes.set(idToUse, node);
    this.initializeNodeIndexes(idToUse); // Make sure this is comprehensive
    this.indexNode(node); // Assuming this method is for property indexing

    if (parentId) {
      // Use the new move mechanism if applicable, or ensure addEdge is correct
      this.addEdge('hierarchy', parentId, idToUse);
    }
    this.emit('node:added', { node });
    return node;
  }

  // addEdge - from previous version, ensure compatibility
  public addEdge<P>(type: EdgeType, from: Id, to: Id, props?: P): Edge<P> {
    if (!this.nodes.has(from) || !this.nodes.has(to)) throw new Error(`Cannot create edge. Node not found in active graph.`);

    if (type === 'hierarchy') {
      if (from === to) throw new Error(`Cannot create a self-referential hierarchy edge on node ${from}.`);
      if (this.parent.has(to)) throw new Error(`Node ${to} already has a parent. Move it instead of adding a new hierarchy edge.`);
      // isAncestor check should be against active graph structure
      if (this.isAncestor(to, from, true)) throw new Error(`Adding hierarchy edge from ${from} to ${to} would create a cycle.`);
    }

    const edge: Edge<P> = { id: uuidv4(), type, from, to, props };
    this.edges.set(edge.id, edge);

    this.nodeToEdges.get(from)!.add(edge.id);
    this.nodeToEdges.get(to)!.add(edge.id);
    if (type === 'hierarchy') {
      this.children.get(from)!.add(to);
      this.parent.set(to, from);
    }
    this.emit('edge:added', { edge });
    return edge;
  }

  // addHyperEdge - from previous full version
  addHyperEdge<P>(nodeIds: Id[], props?: P): HyperEdge<P> {
      const uniqueNodeIds = [...new Set(nodeIds)];
      if (uniqueNodeIds.length < 2) throw new Error('Hyperedge must connect at least 2 unique nodes.');
      for (const id of uniqueNodeIds) if (!this.nodes.has(id)) throw new Error(`Node ${id} not found.`);

      const hyperedge: HyperEdge<P> = { id: uuidv4(), type: 'hyper', nodes: uniqueNodeIds, props };
      this.hyperedges.set(hyperedge.id, hyperedge);

      for (const nodeId of uniqueNodeIds) {
          this.nodeToHyperedges.get(nodeId)!.add(hyperedge.id);
      }
      // this.emit('hyperedge:added', { hyperedge }); // Consider adding event
      return hyperedge;
  }

  // updateNodeProps - from previous version
  updateNodeProps<P>(id: Id, partialProps: Partial<P>): Node<P> {
    const node = this.nodes.get(id) as Node<P>;
    if (!node) throw new Error(`Node with ID ${id} not found in active graph.`);

    this.deindexNode(node); // Deindex old props
    node.props = { ...node.props, ...partialProps };
    this.indexNode(node); // Index new props

    this.emit('node:updated', { node });
    return node;
  }

  /* ─────────────────────── State Checking ────────────────────────── */
  isInside(id: Id): boolean { return this.nodes.has(id) || this.edges.has(id) || this.hyperedges.has(id); }
  isRemoved(id: Id): boolean { return this.removedNodes.has(id) || this.removedEdges.has(id); }

  /* ─────────────────────── Cytoscape-Inspired Manipulation ────────────────── */
  cloneNode(id: Id): Node {
    const sourceNode = this.nodes.get(id) || this.removedNodes.get(id); // Can clone from limbo
    if (!sourceNode) throw new Error(`Node ${id} not found to clone.`);
    const clonedNode: Node = {
      id: uuidv4(), // New ID for the clone
      type: sourceNode.type,
      props: JSON.parse(JSON.stringify(sourceNode.props)), // Deep copy props
    };
    return clonedNode;
  }

  move(elementId: Id, location: { parent?: Id | null; source?: Id; target?: Id }): void {
    if (this.nodes.has(elementId)) {
        if (location.parent === undefined && location.parent !== null) throw new Error("For moving a node, a 'parent' key (Id or null) is required.");
        this._moveNode(elementId, location.parent);
    } else if (this.edges.has(elementId)) {
        if (!location.source && !location.target) throw new Error("For moving an edge, 'source' and/or 'target' must be provided.");
        this._moveEdge(elementId, location);
    } else {
        throw new Error(`Element ${elementId} not found in the active graph.`);
    }
  }

  removeNode(id: Id): Node | undefined {
    const node = this.nodes.get(id);
    if (!node) return; // Already removed or does not exist
    if (this.children.get(id)!.size > 0) {
      throw new Error(`Cannot remove compound node ${id}: it has children. Use removeNodeAndDescendants.`);
    }

    // Remove connected edges first
    const connectedEdgeIds = Array.from(this.nodeToEdges.get(id) || []);
    for (const edgeId of connectedEdgeIds) {
        this.removeEdge(edgeId); // This will move edges to removedEdges and emit events
    }
    // Handle hyperedges similarly if they are fully implemented
    const connectedHyperEdgeIds = Array.from(this.nodeToHyperedges.get(id) || []);
    for (const hyperEdgeId of connectedHyperEdgeIds) {
        // this.removeHyperEdge(hyperEdgeId); // Assuming a similar method exists
    }


    this.deindexNode(node); // For property index
    this.nodes.delete(id);
    this.removedNodes.set(id, node);

    const parentId = this.parent.get(id);
    if (parentId) {
        this.children.get(parentId)?.delete(id);
        this.parent.delete(id); // Node is now parentless in limbo
    }

    this.emit('node:removed', { node });
    return node;
  }

  removeNodeAndDescendants(id: Id): void {
    const node = this.nodes.get(id);
    if (!node) return;
    // Post-order traversal for removal
    const childrenCopy = Array.from(this.children.get(id) || []);
    for (const childId of childrenCopy) {
        this.removeNodeAndDescendants(childId);
    }
    this.removeNode(id); // Remove the node itself after its descendants
  }

  removeEdge(id: Id): Edge | undefined {
      const edge = this.edges.get(id);
      if(!edge) return;

      this.edges.delete(id);
      this.removedEdges.set(id, edge);

      this.nodeToEdges.get(edge.from)?.delete(id);
      this.nodeToEdges.get(edge.to)?.delete(id);
      if(edge.type === 'hierarchy') {
          this.children.get(edge.from)?.delete(edge.to);
          this.parent.delete(edge.to);
      }
      this.emit('edge:removed', {edge});
      return edge;
  }

  restoreNode(id: Id): Node | undefined {
    const node = this.removedNodes.get(id);
    if (!node) return; // Not in limbo
    if (this.nodes.has(id)) throw new Error(`Cannot restore node ${id}: an active node with the same ID already exists.`);

    this.removedNodes.delete(id);
    this.nodes.set(id, node);

    // Re-initialize graph-structure indexes (parent/children are restored when edges are restored)
    this.initializeNodeIndexes(id); // Clears children, nodeToEdges for the restored node
    this.indexNode(node); // For property index

    // Restore connected edges
    const edgesToRestore: Edge[] = [];
    for (const [edgeId, removedEdge] of this.removedEdges.entries()) {
        if (removedEdge.from === id || removedEdge.to === id) {
            edgesToRestore.push(removedEdge);
        }
    }
    for (const edge of edgesToRestore) {
        // Check if the other end of the edge is active
        const otherNodeId = edge.from === id ? edge.to : edge.from;
        if (this.nodes.has(otherNodeId)) {
             this.restoreEdge(edge.id);
        }
    }
    // Restore hyperedges similarly

    this.emit('node:restored', { node });
    return node;
  }

  restoreEdge(id: Id): Edge | undefined {
    const edge = this.removedEdges.get(id);
    if (!edge) return;
    if (this.edges.has(id)) throw new Error(`Cannot restore edge ${id}: an active edge with the same ID already exists.`);
    if (!this.nodes.has(edge.from) || !this.nodes.has(edge.to)) {
        throw new Error(`Cannot restore edge ${id}: source or target node is not active.`);
    }

    this.removedEdges.delete(id);
    this.edges.set(id, edge);

    this.nodeToEdges.get(edge.from)!.add(id);
    this.nodeToEdges.get(edge.to)!.add(id);
    if (edge.type === 'hierarchy') {
        if (this.parent.has(edge.to)) throw new Error(`Cannot restore hierarchy edge ${id}: target node ${edge.to} already has a parent.`);
        if (this.isAncestor(edge.to, edge.from, true)) throw new Error(`Restoring hierarchy edge ${id} would create a cycle.`);
        this.children.get(edge.from)!.add(edge.to);
        this.parent.set(edge.to, edge.from);
    }
    this.emit('edge:restored', {edge});
    return edge;
  }

  // Renamed from deleteNode. This is PERMANENT.
  destroyNode(id: Id, isRecursive: boolean = false): void {
    const node = this.nodes.get(id) || this.removedNodes.get(id);
    if (!node) return; // Does not exist anywhere

    if (isRecursive) {
        const childrenIds = Array.from(this.children.get(id) || []); // Children in active graph
        for (const childId of childrenIds) {
            this.destroyNode(childId, true); // Destroy descendants first
        }
    } else {
        if (this.children.get(id)?.size ?? 0 > 0) { // Check active children
             throw new Error(`Node ${id} has children. Use destroyNode(id, true) for recursive permanent deletion.`);
        }
    }

    // Permanently remove connected edges (from active or limbo)
    const allEdges = new Map([...this.edges, ...this.removedEdges]);
    for (const [edgeId, edge] of allEdges) {
        if (edge.from === id || edge.to === id) {
            this.destroyEdge(edgeId);
        }
    }
    // Handle hyperedges similarly

    // Remove from active graph
    if (this.nodes.has(id)) {
        this.deindexNode(node);
        this.nodes.delete(id);
        const parentId = this.parent.get(id);
        if (parentId) this.children.get(parentId)?.delete(id);
        this.parent.delete(id);
    }
    // Remove from limbo
    this.removedNodes.delete(id);

    // Clean up standalone indexes
    this.children.delete(id);
    this.nodeToEdges.delete(id);
    this.nodeToHyperedges.delete(id);

    this.emit('node:destroyed', { id });
  }

  destroyEdge(id: Id): void {
    const edge = this.edges.get(id) || this.removedEdges.get(id);
    if (!edge) return;

    if (this.edges.has(id)) { // If active
        this.nodeToEdges.get(edge.from)?.delete(id);
        this.nodeToEdges.get(edge.to)?.delete(id);
        if (edge.type === 'hierarchy') {
            this.children.get(edge.from)?.delete(edge.to);
            this.parent.delete(edge.to);
        }
        this.edges.delete(id);
    }
    this.removedEdges.delete(id); // Remove from limbo if it was there
    this.emit('edge:destroyed', { id });
  }

  /* ─────────────────────── Private Helpers & Core Methods ─────────────────── */
  private _moveNode(nodeId: Id, newParentId: Id | null): void {
    const node = this.nodes.get(nodeId);
    if (!node) throw new Error(`Node ${nodeId} not found for move.`);
    if (newParentId && !this.nodes.has(newParentId)) throw new Error(`New parent ${newParentId} not found.`);
    if (nodeId === newParentId) throw new Error("A node cannot be its own parent.");
    if (newParentId && this.isAncestor(newParentId, nodeId, true)) throw new Error("Cannot move a node into one of its own descendants (cycle).");

    const oldParentId = this.parent.get(nodeId);
    if (oldParentId === newParentId) return; // No-op

    const existingHierarchyEdgeId = this.findHierarchyEdgeId(nodeId);
    if (existingHierarchyEdgeId) {
        // Instead of full removeEdge, just disconnect hierarchy part and delete the edge
        const oldEdge = this.edges.get(existingHierarchyEdgeId)!;
        this.nodeToEdges.get(oldEdge.from)?.delete(existingHierarchyEdgeId);
        this.nodeToEdges.get(oldEdge.to)?.delete(existingHierarchyEdgeId);
        this.children.get(oldEdge.from)?.delete(oldEdge.to);
        this.parent.delete(oldEdge.to);
        this.edges.delete(existingHierarchyEdgeId);
        // No limbo, no event for this specific edge removal as it's part of a move
    }

    if (newParentId) {
        this.addEdge('hierarchy', newParentId, nodeId); // This will create a new hierarchy edge
    } else {
        // If newParentId is null, the node becomes a root node (already handled by removing old parent link)
    }
    this.emit('node:moved', { nodeId, fromParent: oldParentId, toParent: newParentId });
  }

  private _moveEdge(edgeId: Id, location: { source?: Id; target?: Id }): void {
    const edge = this.edges.get(edgeId);
    if (!edge) throw new Error(`Edge ${edgeId} not found for move.`);

    const { source: newSource, target: newTarget } = location;
    const oldSource = edge.from;
    const oldTarget = edge.to;

    const finalSource = newSource || oldSource;
    const finalTarget = newTarget || oldTarget;

    if (!this.nodes.has(finalSource)) throw new Error(`New source node ${finalSource} not found.`);
    if (!this.nodes.has(finalTarget)) throw new Error(`New target node ${finalTarget} not found.`);

    if (edge.type === 'hierarchy') {
        // If it's a hierarchy edge, moving it effectively changes parentage
        if (finalSource === oldSource && finalTarget === oldTarget) return; // No actual change
        if (this.isAncestor(finalTarget, finalSource, true)) throw new Error("Moving this hierarchy edge would create a cycle.");

        // Detach old hierarchy relationships
        this.children.get(oldSource)?.delete(oldTarget);
        this.parent.delete(oldTarget);
        // Attach new hierarchy relationships
        this.children.get(finalSource)!.add(finalTarget); // ensure finalSource entry exists in this.children
        this.parent.set(finalTarget, finalSource);
    }

    // Update general edge indexes
    if(oldSource !== finalSource) {
        this.nodeToEdges.get(oldSource)?.delete(edgeId);
        this.nodeToEdges.get(finalSource)!.add(edgeId); // ensure finalSource entry exists
    }
    if(oldTarget !== finalTarget) {
        this.nodeToEdges.get(oldTarget)?.delete(edgeId);
        this.nodeToEdges.get(finalTarget)!.add(edgeId); // ensure finalTarget entry exists
    }

    edge.from = finalSource;
    edge.to = finalTarget;
    this.emit('edge:moved', { edge, oldSource, oldTarget });
  }

  private findHierarchyEdgeId(childId: Id): Id | undefined {
      // This helper should only find edges in the active graph
      const parentId = this.parent.get(childId); // Parent must be in active graph
      if(!parentId) return undefined;

      const edgesFromParent = this.nodeToEdges.get(parentId);
      if (edgesFromParent) {
          for (const edgeId of edgesFromParent) {
              const edge = this.edges.get(edgeId);
              if (edge?.type === 'hierarchy' && edge.to === childId) {
                  return edgeId;
              }
          }
      }
      return undefined;
  }

  // Stubs/Simplified for methods not fully detailed in the snippet or needing full implementation
  // Event Emitter System (Simplified)
  on(event: GraphEvent, listener: GraphListener) {
    const listeners = this.listeners.get(event) || [];
    listeners.push(listener);
    this.listeners.set(event, listeners);
  }
  off(event: GraphEvent, listener: GraphListener) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      this.listeners.set(event, listeners.filter(l => l !== listener));
    }
  }
  emit(event: GraphEvent, payload: any) {
    // console.log(`EVENT: ${event}`, payload); // Keep for debugging if needed by tests
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(l => { try { l(payload); } catch (e) { console.error("Error in event listener", e); }});
    }
  }

  // Property Indexing (Simplified Stubs)
  private indexNode(node: Node<any>) {
    // Example: index by type
    const typeKey = `type`;
    if (!this.propertyIndex.has(typeKey)) this.propertyIndex.set(typeKey, new Map());
    if (!this.propertyIndex.get(typeKey)!.has(node.type)) this.propertyIndex.get(typeKey)!.set(node.type, new Set());
    this.propertyIndex.get(typeKey)!.get(node.type)!.add(node.id);

    // Example: index by a specific prop if it exists
    // if (node.props && node.props.title) { // Assuming 'title' is a common prop
    //   const propKey = `props.title`;
    //   if (!this.propertyIndex.has(propKey)) this.propertyIndex.set(propKey, new Map());
    //   if (!this.propertyIndex.get(propKey)!.has(node.props.title)) this.propertyIndex.get(propKey)!.set(node.props.title, new Set());
    //   this.propertyIndex.get(propKey)!.get(node.props.title)!.add(node.id);
    // }
  }
  private deindexNode(node: Node<any>) {
    const typeKey = `type`;
    this.propertyIndex.get(typeKey)?.get(node.type)?.delete(node.id);
    // if (node.props && node.props.title) {
    //   const propKey = `props.title`;
    //   this.propertyIndex.get(propKey)?.get(node.props.title)?.delete(node.id);
    // }
  }

  // findNodes (Simplified Stub) - this would be more complex
  findNodes(query: { type?: NodeType; props?: Record<string, any> }): Node[] {
    let results: Set<Id> | undefined;
    if (query.type) {
        results = this.propertyIndex.get('type')?.get(query.type);
    }
    // Add more complex prop querying here, intersecting results
    if (!results) return Array.from(this.nodes.values()); // Fallback or if no query
    return Array.from(results).map(id => this.nodes.get(id)!);
  }

  // isAncestor - from previous full version, ensure it uses active graph only
  isAncestor(nodeId: Id, potentialAncestorId: Id, activeOnly: boolean = true): boolean {
    // If activeOnly is true, uses this.parent which is only for active hierarchy
    let currentId: Id | undefined = this.parent.get(nodeId);
    while (currentId) {
      if (currentId === potentialAncestorId) return true;
      currentId = this.parent.get(currentId);
    }
    return false;
  }

  /* Compound Node Traversal (Hierarchy) */
  // Note: These methods operate exclusively on the 'hierarchy' DAG.

  /** Checks if a node is a parent to any other node. */
  isParent(nodeId: Id): boolean {
      if (!this.nodes.has(nodeId)) return false; // Ensure node exists
      return (this.children.get(nodeId)?.size ?? 0) > 0;
  }

  /** Checks if a node has no children. */
  isChildless(nodeId: Id): boolean {
      if (!this.nodes.has(nodeId)) return true; // Non-existent node is childless
      return !this.isParent(nodeId);
  }

  /** Checks if a node has a parent. */
  isChild(nodeId: Id): boolean {
      if (!this.nodes.has(nodeId)) return false; // Non-existent node is not a child
      return this.parent.has(nodeId);
  }

  /** Checks if a node has no parent. The root node is an orphan. */
  isOrphan(nodeId: Id): boolean {
      if (!this.nodes.has(nodeId)) return true; // Non-existent node is an orphan
      return !this.parent.has(nodeId);
  }

  /** Gets the direct parent of a node. (Replaces previous getParent if any) */
  // This is the primary getParent method now, replacing the one in "Traversal helpers"
  // getParent(childId: Id): Node | undefined { // Already defined in "Traversal helpers", this is the replacement logic
  //     const parentId = this.parent.get(childId);
  //     return parentId ? this.nodes.get(parentId) : undefined;
  // }

  /** Gets the direct children of a node. (Replaces previous listChildren) */
  getChildren(parentId: Id): Node[] {
      const childIds = this.children.get(parentId);
      if (!childIds) return [];
      return Array.from(childIds).map(id => this.nodes.get(id)!).filter(Boolean) as Node[]; // filter Boolean for safety
  }

  /** Gets all ancestors of a node, from the immediate parent to the root. */
  getAncestors(nodeId: Id): Node[] {
      const ancestors: Node[] = [];
      if (!this.nodes.has(nodeId)) return ancestors; // or throw error

      let currentParentId = this.parent.get(nodeId);
      while (currentParentId) {
          const ancestorNode = this.nodes.get(currentParentId);
          if (ancestorNode) { // Should always find if parent map is consistent
              ancestors.push(ancestorNode);
          }
          currentParentId = this.parent.get(currentParentId);
      }
      return ancestors;
  }

  /** Gets all descendants of a node (children, children's children, etc.). */
  getDescendants(nodeId: Id): Node[] {
      if (!this.nodes.has(nodeId)) return [];

      const descendants: Node[] = [];
      const queue: Id[] = Array.from(this.children.get(nodeId) || []); // Start with direct children
      const visited = new Set<Id>(); // To handle potential (though unlikely in strict DAG) re-visits if graph structure is complex during traversal additions

      for(const id of queue) visited.add(id); // Add initial children to visited

      while(queue.length > 0) {
          const currentId = queue.shift()!;
          const currentNode = this.nodes.get(currentId);
          if (currentNode) { // Should always find
               descendants.push(currentNode);
          }

          const childIdsOfCurrent = this.children.get(currentId) || new Set();
          for (const childId of childIdsOfCurrent) {
              if (!visited.has(childId)) {
                  visited.add(childId);
                  queue.push(childId);
              }
          }
      }
      return descendants;
  }

  /** Gets all nodes that share the same immediate parent. */
  getSiblings(nodeId: Id): Node[] {
      if (!this.nodes.has(nodeId)) return [];
      const parentId = this.parent.get(nodeId);
      if (!parentId) return []; // Orphans have no siblings

      const allChildrenOfParent = this.children.get(parentId);
      if (!allChildrenOfParent) return []; // Should not happen if parentId is valid

      const siblings: Node[] = [];
      for (const childId of allChildrenOfParent) {
          if (childId !== nodeId) {
              const siblingNode = this.nodes.get(childId);
              if (siblingNode) siblings.push(siblingNode); // Should always find
          }
      }
      return siblings;
  }

  /** Finds all ancestors common to a set of nodes, ordered from closest to farthest. */
  getCommonAncestors(nodeIds: Id[]): Node[] {
      if (nodeIds.length === 0) return [];
      if (nodeIds.some(id => !this.nodes.has(id))) {
          // console.warn("getCommonAncestors called with non-existent node IDs."); // Or throw error
          return [];
      }
      if (nodeIds.length === 1) return this.getAncestors(nodeIds[0]);

      // Get ancestors for the first node (maintaining order)
      const firstAncestorList = this.getAncestors(nodeIds[0]);
      if (firstAncestorList.length === 0) return []; // No common ancestors if one has none

      // Get ancestor ID sets for other nodes for quick lookup
      const otherAncestorSets = nodeIds.slice(1).map(id => {
          const ancestors = this.getAncestors(id);
          return new Set(ancestors.map(n => n.id));
      });

      // If any of the other nodes have no ancestors, there can be no common ones
      if (otherAncestorSets.some(s => s.size === 0 && firstAncestorList.length > 0)) return [];


      const common = firstAncestorList.filter(ancestor => {
          return otherAncestorSets.every(set => set.has(ancestor.id));
      });

      return common;
  }

  /** From a given list of nodes, returns those that are orphans. */
  getOrphans(nodeIds: Id[]): Node[] {
      return nodeIds
          .map(id => this.nodes.get(id))
          .filter(node => node && this.isOrphan(node.id)) as Node[];
  }

  /** From a given list of nodes, returns those that are not orphans (i.e., are children). */
  getNonOrphans(nodeIds: Id[]): Node[] {
      return nodeIds
          .map(id => this.nodes.get(id))
          .filter(node => node && this.isChild(node.id)) as Node[];
  }

  // Traversal helpers from previous version (ensure they operate on active graph)
  // getParent(childId: Id): Node | undefined { const parentId = this.parent.get(childId); return parentId ? this.nodes.get(parentId) : undefined; } // Replaced by new getParent in Compound section
  // listChildren(parentId: Id, options?: { type: NodeType }): Node[] { const childIds = this.children.get(parentId); if (!childIds) return []; let childrenNodes = Array.from(childIds).map(id => this.nodes.get(id)!); if (options?.type) { childrenNodes = childrenNodes.filter(node => node.type === options.type); } return childrenNodes.filter(Boolean); } // Replaced by new getChildren in Compound section
  getFolderPath(nodeId: Id): Node[] { const path: Node[] = []; let current = this.nodes.get(nodeId); while(current) { path.unshift(current); const parentId = this.parent.get(current.id); current = parentId ? this.nodes.get(parentId) : undefined; } return path; }

  // applyBatch - from previous version, needs to be adapted for new method names like destroyNode
  applyBatch(mutations: Mutation[]): any[] {
    const results = [];
    for (const mutation of mutations) {
      let result;
      switch (mutation.action) {
        case 'addNode':
          result = this.addNode(mutation.payload.type, mutation.payload.props, mutation.payload.parentId, mutation.payload.id);
          break;
        case 'updateNodeProps':
          result = this.updateNodeProps(mutation.payload.id, mutation.payload.props);
          break;
        case 'deleteNode': // This should now map to destroyNode
          this.destroyNode(mutation.payload.id, mutation.payload.recursive);
          result = { id: mutation.payload.id, destroyed: true };
          break;
        case 'moveNode': // This should map to the new move() method
          this.move(mutation.payload.nodeId, { parent: mutation.payload.newParentId });
          result = { moved: mutation.payload.nodeId };
          break;
        case 'addEdge':
          result = this.addEdge(mutation.payload.type, mutation.payload.from, mutation.payload.to, mutation.payload.props);
          break;
      }
      results.push(result);
    }
    return results;
  }

  /* Advanced Traversal */

  /**
   * Gets the direct neighbors of a node.
   * @param nodeId The ID of the starting node.
   * @param options Configuration for the neighborhood search.
   *  - direction: 'outgoing', 'incoming', or 'any' (default: 'any').
   *  - edgeTypes: An array of EdgeTypes to consider (default: all types).
   * @returns An array of neighboring Node objects.
   */
  getNeighbors(nodeId: Id, options?: { direction?: 'outgoing' | 'incoming' | 'any'; edgeTypes?: EdgeType[] }): Node[] {
      if (!this.nodes.has(nodeId)) {
          // console.warn(`Node ${nodeId} not found in active graph for getNeighbors.`);
          return [];
      }

      const { direction = 'any', edgeTypes } = options || {};
      const neighborIds = new Set<Id>();
      const connectedEdgeIds = this.nodeToEdges.get(nodeId) || new Set();

      for (const edgeId of connectedEdgeIds) {
          const edge = this.edges.get(edgeId);
          if (!edge) continue;

          if (edgeTypes && edgeTypes.length > 0 && !edgeTypes.includes(edge.type)) {
              continue;
          }

          if (direction === 'outgoing' && edge.from === nodeId) {
              if (this.nodes.has(edge.to)) neighborIds.add(edge.to);
          } else if (direction === 'incoming' && edge.to === nodeId) {
              if (this.nodes.has(edge.from)) neighborIds.add(edge.from);
          } else if (direction === 'any') {
              const neighborIsTo = edge.from === nodeId;
              const neighborNodeId = neighborIsTo ? edge.to : edge.from;
              if (this.nodes.has(neighborNodeId)) {
                  neighborIds.add(neighborNodeId);
              }
          }
      }

      return Array.from(neighborIds).map(id => this.nodes.get(id)!);
  }

  /**
   * Performs a traversal (BFS or DFS) starting from a root node.
   * @param options Configuration for the traversal.
   *  - root: The ID of the node to start from.
   *  - algorithm: 'bfs' (Breadth-First Search) or 'dfs' (Depth-First Search).
   *  - visitor: A function called for each visited node: (node, path) => void. path is array of EDGES
   *  - direction & edgeTypes: Same as in getNeighbors, to control the traversal path.
   */
  traverse(options: {
      root: Id;
      algorithm: 'bfs' | 'dfs';
      visitor: (node: Node, path: Edge[]) => void;
      direction?: 'outgoing' | 'incoming' | 'any';
      edgeTypes?: EdgeType[];
  }): void {
      const { root, algorithm, visitor, direction = 'outgoing', edgeTypes } = options;
      if (!this.nodes.has(root)) return;

      const visited = new Set<Id>();
      const collection: [Id, Edge[]][] = [[root, []]];

      visited.add(root);

      while (collection.length > 0) {
          const [currentId, currentPathToCurrentNode] = (algorithm === 'bfs' ? collection.shift() : collection.pop())!;

          const currentNode = this.nodes.get(currentId);
          if (!currentNode) continue;

          visitor(currentNode, currentPathToCurrentNode);

          const connectedEdgeIds = this.nodeToEdges.get(currentId) || new Set();
          for (const edgeId of connectedEdgeIds) {
              const edge = this.edges.get(edgeId);
              if (!edge) continue;
              if (edgeTypes && edgeTypes.length > 0 && !edgeTypes.includes(edge.type)) continue;

              let neighborNodeId: Id | null = null;
              if (direction === 'outgoing' && edge.from === currentId) {
                  neighborNodeId = edge.to;
              } else if (direction === 'incoming' && edge.to === currentId) {
                  neighborNodeId = edge.from;
              } else if (direction === 'any') {
                  neighborNodeId = edge.from === currentId ? edge.to : edge.from;
              }

              if (neighborNodeId && this.nodes.has(neighborNodeId) && !visited.has(neighborNodeId)) {
                  visited.add(neighborNodeId);
                  const newPathToNeighbor = [...currentPathToCurrentNode, edge];
                  collection.push([neighborNodeId, newPathToNeighbor]);
              }
          }
      }
  }

  /** Gets the direct parent of a node. (This is the primary one, replaces older if any) */
  getParent(childId: Id): Node | undefined {
      const parentId = this.parent.get(childId);
      return parentId ? this.nodes.get(parentId) : undefined;
  }

  // transact method (Conceptual stub - full implementation is complex)
  transact(mutations: Mutation[]): any[] {
    // This is a placeholder. True transactions require saving state,
    // trying operations, and rolling back on any error.
    // For now, it can behave like applyBatch for simplicity in this step.
    console.warn("transact() is not truly atomic in this version. Behaves like applyBatch.");
    return this.applyBatch(mutations);
  }

  /* Advanced Graph Algorithms */

  /**
   * Finds the shortest path using Dijkstra's algorithm.
   * @param options Configuration for the algorithm.
   * @returns An object containing the path, distance, and whether a path was found.
   */
  dijkstra(options: {
      root: Id;
      goal?: Id;
      weight?: (edge: Edge) => number;
      directed?: boolean;
  }): { found: boolean; distance: number; path: (Node | Edge)[] } {
      const { root, goal, weight = () => 1, directed = false } = options;
      return this.aStar({ root, goal, weight, directed, heuristic: () => 0 });
  }

  /**
   * Finds the shortest path using the A* search algorithm.
   * @param options Configuration for the algorithm.
   * @returns An object containing the path, distance, and whether a path was found.
   */
  aStar(options: {
      root: Id;
      goal?: Id;
      weight?: (edge: Edge) => number;
      heuristic?: (node: Node) => number;
      directed?: boolean;
  }): { found: boolean; distance: number; path: (Node | Edge)[] } {
      const { root, goal, weight = () => 1, heuristic = () => 0, directed = false } = options;

      if (!this.nodes.has(root) || (goal && !this.nodes.has(goal))) {
          throw new Error("Root or goal node not found in the active graph.");
      }

      const pq = new PriorityQueue<Id>();
      const distances = new Map<Id, number>();
      const previous = new Map<Id, { node: Id, edge: Edge }>(); // Stores how we reached a node

      for (const nodeId of this.nodes.keys()) {
          distances.set(nodeId, Infinity);
      }
      distances.set(root, 0);
      pq.enqueue(root, 0 + heuristic(this.nodes.get(root)!)); // Priority includes heuristic for A*

      while (!pq.isEmpty()) {
          const currentId = pq.dequeue()!;

          // Optimization: if we dequeue the goal, we've found the shortest path to it
          if (goal && currentId === goal) {
               // Path reconstruction logic moved to the end for when goal is specified
          }

          // If currentId's distance is already greater than goal's known shortest path, skip (for A* with consistent heuristic)
          if (goal && distances.get(currentId)! > (distances.get(goal) ?? Infinity) ) {
              continue;
          }

          // Use getNeighbors to find relevant connections
          const neighborEdges: Edge[] = [];
          const G_nodeToEdges = this.nodeToEdges.get(currentId) || new Set();

          for (const edgeId of G_nodeToEdges) {
              const edge = this.edges.get(edgeId);
              if (!edge) continue;

              if (directed) {
                  if (edge.from === currentId && this.nodes.has(edge.to)) {
                      neighborEdges.push(edge);
                  }
              } else {
                  if (edge.from === currentId && this.nodes.has(edge.to)) {
                      neighborEdges.push(edge);
                  } else if (edge.to === currentId && this.nodes.has(edge.from)) {
                      // For undirected, treat as if edge goes from currentId to edge.from
                      neighborEdges.push(edge);
                  }
              }
          }


          for (const edge of neighborEdges) {
              const neighborNodeId = edge.from === currentId ? edge.to : edge.from;
              const neighborNode = this.nodes.get(neighborNodeId);
              if (!neighborNode) continue; // Should not happen if this.nodes.has check was done

              const edgeWeightVal = weight(edge);
              const newDist = distances.get(currentId)! + edgeWeightVal;

              if (newDist < (distances.get(neighborNodeId) ?? Infinity)) {
                  distances.set(neighborNodeId, newDist);
                  previous.set(neighborNodeId, { node: currentId, edge });
                  const priority = newDist + heuristic(neighborNode);
                  pq.enqueue(neighborNodeId, priority);
              }
          }
      }

      // Path reconstruction for when a goal is specified
      if (goal && distances.get(goal)! !== Infinity) {
          const path: (Node | Edge)[] = [];
          let at = goal;
          while (at) {
              path.unshift(this.nodes.get(at)!);
              const prevInfo = previous.get(at);
              if (prevInfo) {
                  path.unshift(prevInfo.edge);
                  at = prevInfo.node;
              } else {
                  break; // Reached the root or no path
              }
          }
          // Verify root of path is the start node
          if (path.length > 0 && (path[0] as Node).id === root) {
              return { found: true, distance: distances.get(goal)!, path };
          } else if (root === goal) { // Path to self
               return { found: true, distance: 0, path: [this.nodes.get(root)!] };
          }
      } else if (!goal) {
          // If no goal, Dijkstra returns all reachable nodes and their distances.
          // This specific return type is for a single path.
          // For full Dijkstra result, would return 'distances' and 'previous' maps.
          // For now, adhere to current return type, implies path to self if no goal.
          return { found: true, distance: 0, path: [this.nodes.get(root)!] };
      }

      return { found: false, distance: Infinity, path: [] };
  }


  pageRank(options?: { dampingFactor?: number; precision?: number; iterations?: number; }) {
      const { dampingFactor = 0.85, precision = 0.0001, iterations = 100 } = options || {}; // Adjusted defaults
      const nodeIds = Array.from(this.nodes.keys());
      const numNodes = nodeIds.length;
      if (numNodes === 0) return { rank: () => 0, ranks: new Map<Id, number>() };

      let ranks = new Map<Id, number>();
      const outDegrees = new Map<Id, number>();
      const incomingEdgesMap = new Map<Id, Edge[]>(); // Map: nodeId -> list of incoming edges

      // Initialization
      for (const id of nodeIds) {
          ranks.set(id, 1 / numNodes);
          const G_nodeToEdges = this.nodeToEdges.get(id) || new Set();
          let G_outDegree = 0;
          for(const edgeId of G_nodeToEdges){
              const edge = this.edges.get(edgeId);
              if(edge && edge.from === id) G_outDegree++;
          }
          outDegrees.set(id, G_outDegree);

          // Precompute incoming edges for each node
          incomingEdgesMap.set(id, []);
      }

      for (const edge of this.edges.values()) {
          if (this.nodes.has(edge.from) && this.nodes.has(edge.to)) { // Consider only edges between active nodes
              incomingEdgesMap.get(edge.to)!.push(edge);
          }
      }


      for (let i = 0; i < iterations; i++) {
          const newRanks = new Map<Id, number>();
          let danglingSum = 0; // Sum of ranks of dangling nodes (nodes with no outgoing links)

          for (const id of nodeIds) {
              if (outDegrees.get(id)! === 0) {
                  danglingSum += ranks.get(id)!;
              }
          }

          let rankChange = 0;
          for (const id of nodeIds) {
              let rankContribution = 0;
              const G_incomingEdges = incomingEdgesMap.get(id)!;

              for (const edge of G_incomingEdges) {
                  const sourceNodeId = edge.from;
                  // Ensure sourceNodeId exists and has an out-degree entry (should always be true)
                  if (ranks.has(sourceNodeId) && outDegrees.has(sourceNodeId) && outDegrees.get(sourceNodeId)! > 0) {
                       rankContribution += ranks.get(sourceNodeId)! / outDegrees.get(sourceNodeId)!;
                  }
              }

              // Add contribution from dangling nodes (distributed among all nodes)
              rankContribution += danglingSum / numNodes;

              const newRank = (1 - dampingFactor) / numNodes + dampingFactor * rankContribution;
              newRanks.set(id, newRank);
              rankChange += Math.abs(newRank - (ranks.get(id) ?? 0)); // Handle if ranks.get(id) was undefined
          }

          ranks = newRanks;
          if (rankChange < precision * numNodes) break; // Adjusted precision check
      }

      // Normalize ranks so they sum to 1 (optional, but good practice)
      const totalRank = Array.from(ranks.values()).reduce((sum, r) => sum + r, 0);
      if (totalRank !== 0) {
          for (const [id, rank] of ranks) {
              ranks.set(id, rank / totalRank);
          }
      }

      return {
          rank: (nodeId: Id): number => ranks.get(nodeId) || 0,
          ranks: ranks // Expose all ranks
      };
  }

  kMeans(options: {
      nodeIds?: Id[]; // Optional: defaults to all nodes if not provided
      k: number;
      attributes: ((node: Node) => number)[]; // Array of functions to extract numeric attributes
      maxIterations?: number;
  }): Node[][] {
      const { nodeIds: providedNodeIds, k, attributes, maxIterations = 300 } = options; // Increased maxIterations

      const targetNodeIds = providedNodeIds || Array.from(this.nodes.keys());
      if (targetNodeIds.length === 0) return [];
      if (targetNodeIds.length < k) throw new Error("Cannot have more clusters (k) than nodes.");
      if (attributes.length === 0) throw new Error("At least one attribute function must be provided for k-Means.");

      const vectors = new Map<Id, number[]>();
      for (const id of targetNodeIds) {
          const node = this.nodes.get(id);
          if (!node) throw new Error(`Node ${id} not found for k-Means vectorization.`);
          vectors.set(id, attributes.map(fn => fn(node)));
      }

      // Initialize centroids by picking k random distinct nodes (medoids)
      let centroidIds = [...targetNodeIds].sort(() => 0.5 - Math.random()).slice(0, k);
      let centroids = centroidIds.map(id => vectors.get(id)!);

      let clusters: Id[][] = Array.from({ length: k }, () => []);
      let iterations = 0;

      while (iterations < maxIterations) {
          iterations++;
          const newClusters: Id[][] = Array.from({ length: k }, () => []);

          // Assignment step
          for (const id of targetNodeIds) {
              const vector = vectors.get(id)!;
              let minDistance = Infinity;
              let bestClusterIndex = 0;
              for (let j = 0; j < k; j++) {
                  const dist = this._euclideanDist(vector, centroids[j]);
                  if (dist < minDistance) {
                      minDistance = dist;
                      bestClusterIndex = j;
                  }
              }
              newClusters[bestClusterIndex].push(id);
          }

          // Update step: Recalculate centroids
          const newCentroids: number[][] = [];
          let centroidsChanged = false;
          for (let j = 0; j < k; j++) {
              if (newClusters[j].length === 0) {
                  // Handle empty cluster: re-initialize centroid (e.g., pick a random node not in other clusters)
                  // For simplicity, we can keep the old centroid, or pick the farthest point, or a random one.
                  // Picking a random point from the dataset for robustness:
                  const availableNodesForCentroid = targetNodeIds.filter(id => !newClusters.flat().includes(id));
                  if (availableNodesForCentroid.length > 0) {
                      newCentroids.push(vectors.get(availableNodesForCentroid[Math.floor(Math.random() * availableNodesForCentroid.length)])!);
                  } else {
                      // Fallback if all nodes are clustered, just reuse old
                      newCentroids.push(centroids[j]);
                  }
                  if(newClusters[j].length !== clusters[j].length) centroidsChanged = true; // Cluster assignment changed
                  continue;
              }

              const currentCentroid = Array(attributes.length).fill(0);
              for(let attrIndex = 0; attrIndex < attributes.length; attrIndex++) {
                  const sum = newClusters[j].reduce((acc, id) => acc + vectors.get(id)![attrIndex], 0);
                  currentCentroid[attrIndex] = sum / newClusters[j].length;
              }
              newCentroids.push(currentCentroid);

              if (JSON.stringify(centroids[j]) !== JSON.stringify(newCentroids[j])) {
                  centroidsChanged = true;
              }
          }

          clusters = newClusters;
          centroids = newCentroids;

          if (!centroidsChanged) break; // Convergence
      }

      // Remove empty clusters from the final result
      return clusters.filter(cluster => cluster.length > 0).map(clusterIds => clusterIds.map(id => this.nodes.get(id)!));
  }


  private _euclideanDist(v1: number[], v2: number[]): number {
      if (v1.length !== v2.length) throw new Error("Vectors must have the same dimension for Euclidean distance.");
      return Math.sqrt(v1.reduce((sum, _, i) => sum + (v1[i] - v2[i]) ** 2, 0));
  }

  // findEdgeBetween was slightly modified to be more robust if nodeToEdges is undefined for a node
  private findEdgeBetween(nodeA_id: Id, nodeB_id: Id, directed: boolean): Edge | undefined {
      const edgesOfA = this.nodeToEdges.get(nodeA_id);
      if (!edgesOfA) return undefined;

      for(const edgeId of edgesOfA) {
          const edge = this.edges.get(edgeId);
          if(!edge) continue;

          if(directed) {
              if(edge.from === nodeA_id && edge.to === nodeB_id) return edge;
          } else {
              if((edge.from === nodeA_id && edge.to === nodeB_id) || (edge.from === nodeB_id && edge.to === nodeA_id)) return edge;
          }
      }
      return undefined;
  }

  // toJSON / fromJSON (Conceptual stubs)
  toJSON(): SerializedGraph {
    return {
      nodes: Array.from(this.nodes.values()).map(n => JSON.parse(JSON.stringify(n))), // Deep copy
      edges: Array.from(this.edges.values()).map(e => JSON.parse(JSON.stringify(e))),
      hyperedges: Array.from(this.hyperedges.values()).map(h => JSON.parse(JSON.stringify(h)))
      // Should also include removedNodes/removedEdges if they are to be persisted
    };
  }

  static fromJSON(json: SerializedGraph): Graph {
    const graph = new Graph();
    // Basic rehydration - does not handle complex cases like order of edge creation
    // or restoring limbo state.
    json.nodes.forEach(nodeData => graph.addNode(nodeData.type, nodeData.props, undefined, nodeData.id));
    json.edges.forEach(edgeData => graph.addEdge(edgeData.type, edgeData.from, edgeData.to, edgeData.props));
    // json.hyperedges.forEach(hyperEdgeData => graph.addHyperEdge(hyperEdgeData.nodes, hyperEdgeData.props));
    graph.emit('reloaded', {});
    return graph;
  }
}