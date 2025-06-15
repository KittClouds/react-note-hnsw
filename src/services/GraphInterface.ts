import { v4 as uuidv4 } from 'uuid';

/* ────────────────────────────────────────────────────────────────────────── / / Core Types / / ────────────────────────────────────────────────────────────────────────── */

/** A unique identifier for any graph element. */ export type Id = string;

/** Defines the valid types for a Node, categorizing its role in the graph. */ export const NODE_TYPES = ['root', 'standard', 'nest', 'subnest', 'folder', 'note', 'tag', 'entity'] as const; export type NodeType = typeof NODE_TYPES[number];

/** Represents a node in the graph, the fundamental unit of information. */ export interface Node<P = unknown> { id: Id; type: NodeType; props: P; }

/** Defines the valid types for an Edge, describing the nature of a relationship. */ export const EDGE_TYPES = ['hierarchy', 'linksTo', 'hasTag', 'mentions', 'semantic'] as const; export type EdgeType = typeof EDGE_TYPES[number];

/** Represents a directed, typed connection between two nodes. */ export interface Edge<P = unknown> { id: Id; type: EdgeType; from: Id; to: Id; props?: P; }

/** Represents a connection between a group of two or more nodes. */ export interface HyperEdge<P = unknown> { id: Id; type: 'hyper'; nodes: Id[]; props?: P; }

/** A union of all possible mutation actions that can be applied to the graph. */ type AddNodeMutation = { action: 'addNode'; payload: { type: NodeType; props: any; parentId?: Id; id?: Id } }; type UpdateNodeMutation = { action: 'updateNodeProps'; payload: { id: Id; props: any } }; type DeleteNodeMutation = { action: 'deleteNode'; payload: { id: Id, recursive?: boolean } }; type MoveNodeMutation = { action: 'moveNode'; payload: { nodeId: Id; newParentId: Id } }; type AddEdgeMutation = { action: 'addEdge'; payload: { type: EdgeType; from: Id; to: Id; props?: any } }; export type Mutation = AddNodeMutation | UpdateNodeMutation | DeleteNodeMutation | MoveNodeMutation | AddEdgeMutation;

/** Defines the shape of a fully serialized graph for persistence or transfer. */ export interface SerializedGraph { nodes: Node[]; edges: Edge[]; hyperedges: HyperEdge[]; removedNodes?: Node[]; removedEdges?: Edge[]; }

/** A union of all possible events the graph can emit. */ export type GraphEvent = | 'node:added' | 'node:removed' | 'node:restored' | 'node:destroyed' | 'node:updated' | 'node:moved' | 'edge:added' | 'edge:removed' | 'edge:restored' | 'edge:destroyed' | 'edge:moved' | 'reloaded' | 'transaction:commit' | 'transaction:rollback'; export type GraphListener = (payload: any) => void;

/**
 * A simple priority queue implementation used for pathfinding algorithms.
 * @internal
 */
class PriorityQueue<T> {
    private elements: { item: T; priority: number }[] = [];

    enqueue(item: T, priority: number): void {
        this.elements.push({ item, priority });
        this.elements.sort((a, b) => a.priority - b.priority);
    }

    dequeue(): T | undefined {
        return this.elements.shift()?.item;
    }

    isEmpty(): boolean {
        return this.elements.length === 0;
    }

    get length(): number {
        return this.elements.length;
    }
}

/* ────────────────────────────────────────────────────────────────────────── / / The Graph Class (API) / / ────────────────────────────────────────────────────────────────────────── */

/**
 * A dynamic, in-memory graph database featuring a rich API for manipulation,
 * traversal, and analysis. It supports compound nodes, state management (limbo),
 * and advanced algorithms.
 */
export class Graph<NProps = any, EProps = any> {
    // --- Storage ---
    private nodes = new Map<Id, Node<NProps>>();
    private edges = new Map<Id, Edge<EProps>>();
    private hyperedges = new Map<Id, HyperEdge>(); // Assuming HyperEdge props are generic or any
    private removedNodes = new Map<Id, Node<NProps>>();
    private removedEdges = new Map<Id, Edge<EProps>>();

    // --- Indexes for fast lookups ---
    private children = new Map<Id, Set<Id>>();
    private parent = new Map<Id, Id>(); // childId -> parentId
    private nodeToEdges = new Map<Id, Set<Id>>(); // nodeId -> Set of edgeIds
    private nodeToHyperedges = new Map<Id, Set<Id>>(); // nodeId -> Set of hyperedgeIds
    private propertyIndex = new Map<string, Map<any, Set<Id>>>(); // propKey -> propValue -> Set of nodeIds

    // --- Event System ---
    private listeners = new Map<GraphEvent, GraphListener[]>();

    constructor() {}

    /* ────────────────────── A. Core Object Management ─────────────────────── */

    /**
     * Creates a new node and adds it to the graph.
     * @param type The type of the node.
     * @param props The data properties of the node.
     * @param parentId The ID of the parent node to create a 'hierarchy' edge to.
     * @param nodeId Optional. A specific ID to assign to the node. If not provided, a UUID will be generated.
     * @returns The newly created Node object.
     * @throws If a node with the given ID already exists in the active or limbo state.
     */
    public addNode<P extends NProps>(
        type: NodeType,
        props: P,
        parentId?: Id | null,
        nodeId?: Id
    ): Node<P> {
        const idToUse = nodeId || uuidv4();
        if (this.nodes.has(idToUse) || this.removedNodes.has(idToUse)) {
            throw new Error(`Node with ID ${idToUse} already exists or is in limbo.`);
        }

        const node: Node<P> = { id: idToUse, type, props };
        this.nodes.set(idToUse, node as Node<NProps>); // Cast to base NProps for storage
        this._initializeNodeIndexes(idToUse);
        this._indexNodeByProps(node as Node<NProps>);

        if (parentId) {
            this.addEdge('hierarchy', parentId, idToUse);
        }
        this.emit('node:added', { node });
        return node;
    }

    /**
     * Retrieves a node by its ID. It will search both active and removed (limbo) nodes.
     * @param id The ID of the node to retrieve.
     * @returns The Node object if found, otherwise undefined.
     */
    public getNode(id: Id): Node<NProps> | undefined {
        return this.nodes.get(id) || this.removedNodes.get(id);
    }

    /**
     * Updates the properties of an active node.
     * @param id The ID of the node to update.
     * @param partialProps An object with the properties to update. These will be merged with existing props.
     * @returns The updated Node object.
     * @throws If the node is not found in the active graph.
     */
    public updateNodeProps<P extends Partial<NProps>>(
        id: Id,
        partialProps: P
    ): Node<NProps> {
        const node = this.nodes.get(id);
        if (!node) {
            throw new Error(`Node with ID ${id} not found in active graph.`);
        }

        this._deindexNodeByProps(node);
        node.props = { ...node.props, ...partialProps };
        this._indexNodeByProps(node);

        this.emit('node:updated', { node });
        return node;
    }

    /**
     * Creates a new edge between two active nodes.
     * @param type The type of the edge.
     * @param from The ID of the source node.
     * @param to The ID of the target node.
     * @param props Optional data properties for the edge.
     * @returns The newly created Edge object.
     * @throws If source or target nodes are not found, or if adding the edge violates graph constraints (e.g., cycles).
     */
    public addEdge<P extends EProps>(
        type: EdgeType,
        from: Id,
        to: Id,
        props?: P
    ): Edge<P> {
        if (!this.nodes.has(from) || !this.nodes.has(to)) {
            throw new Error('Cannot create edge: Source or target node not found in active graph.');
        }
        if (type === 'hierarchy') {
            if (from === to) throw new Error('Cannot create a self-referential hierarchy edge.');
            if (this.parent.has(to)) throw new Error(`Node ${to} already has a parent. Move it instead.`);
            if (this.isAncestor(to, from)) throw new Error('Adding hierarchy edge would create a cycle.');
        }

        const edge: Edge<P> = { id: uuidv4(), type, from, to, props };
        this.edges.set(edge.id, edge as Edge<EProps>); // Cast to base EProps for storage

        this.nodeToEdges.get(from)!.add(edge.id);
        this.nodeToEdges.get(to)!.add(edge.id);
        if (type === 'hierarchy') {
            this.children.get(from)!.add(to);
            this.parent.set(to, from);
        }
        this.emit('edge:added', { edge });
        return edge;
    }

    /* ─────────────────── B. State Manipulation & Lifecycle ────────────────── */

    /**
     * Moves a node to a new parent or retargets an edge's source/target.
     * @param elementId The ID of the node or edge to move.
     * @param location An object specifying the new location. For nodes: { parent: newParentId | null }. For edges: { source?: newSourceId, target?: newTargetId }.
     */
    public move(elementId: Id, location: { parent?: Id | null; source?: Id; target?: Id }): void {
        if (this.nodes.has(elementId)) {
            if (location.parent === undefined) throw new Error("For moving a node, 'parent' (Id or null) is required.");
            this._moveNode(elementId, location.parent);
        } else if (this.edges.has(elementId)) {
            if (!location.source && !location.target) throw new Error("For moving an edge, 'source' or 'target' must be provided.");
            this._moveEdge(elementId, location as { source?: Id, target?: Id });
        } else {
            throw new Error(`Element ${elementId} not found in the active graph.`);
        }
    }

    /**
     * Temporarily removes a non-compound node and its connected edges from the active graph, placing them in limbo.
     * @param id The ID of the node to remove.
     * @returns The removed Node object, or undefined if not found.
     * @throws If the node has children (is a parent). Use removeNodeAndDescendants instead.
     */
    public removeNode(id: Id): Node<NProps> | undefined {
        const node = this.nodes.get(id);
        if (!node) return;

        if (this.isParent(id)) {
            throw new Error(`Cannot remove compound node ${id}: it has children. Use removeNodeAndDescendants.`);
        }

        // Move connected edges to limbo first
        for (const edgeId of Array.from(this.nodeToEdges.get(id) || [])) {
            this.removeEdge(edgeId);
        }

        // Move node to limbo
        this._deindexNodeByProps(node);
        this.nodes.delete(id);
        this.removedNodes.set(id, node);

        const parentId = this.parent.get(id);
        if (parentId) {
            this.children.get(parentId)?.delete(id);
            this.parent.delete(id);
        }

        this.emit('node:removed', { node });
        return node;
    }

    /**
     * Recursively removes a node and all its descendants, placing them in limbo.
     * @param id The ID of the root node of the subgraph to remove.
     */
    public removeNodeAndDescendants(id: Id): void {
        // Post-order traversal for removal
        for (const childId of Array.from(this.children.get(id) || [])) {
            this.removeNodeAndDescendants(childId);
        }
        this.removeNode(id);
    }

    /**
     * Temporarily removes an edge from the active graph, placing it in limbo.
     * @param id The ID of the edge to remove.
     * @returns The removed Edge object, or undefined if not found.
     */
    public removeEdge(id: Id): Edge<EProps> | undefined {
        const edge = this.edges.get(id);
        if (!edge) return;

        this.edges.delete(id);
        this.removedEdges.set(id, edge);

        this.nodeToEdges.get(edge.from)?.delete(id);
        this.nodeToEdges.get(edge.to)?.delete(id);
        if (edge.type === 'hierarchy') {
            this.children.get(edge.from)?.delete(edge.to);
            this.parent.delete(edge.to);
        }
        this.emit('edge:removed', { edge });
        return edge;
    }

    /**
     * Restores a node from limbo to the active graph. It will also attempt to restore any connected
     * edges if their other endpoint is also active.
     * @param id The ID of the node to restore.
     * @returns The restored Node object, or undefined if not in limbo.
     * @throws If an active node with the same ID already exists.
     */
    public restoreNode(id: Id): Node<NProps> | undefined {
        const node = this.removedNodes.get(id);
        if (!node) return;
        if (this.nodes.has(id)) throw new Error(`Cannot restore node ${id}: an active node with the same ID already exists.`);

        this.removedNodes.delete(id);
        this.nodes.set(id, node);

        this._initializeNodeIndexes(id);
        this._indexNodeByProps(node);

        // Attempt to restore connected edges
        for (const edge of this.removedEdges.values()) {
            if (edge.from === id || edge.to === id) {
                const otherNodeId = edge.from === id ? edge.to : edge.from;
                if (this.nodes.has(otherNodeId)) {
                    this.restoreEdge(edge.id);
                }
            }
        }

        this.emit('node:restored', { node });
        return node;
    }

    /**
     * Restores an edge from limbo to the active graph.
     * @param id The ID of the edge to restore.
     * @returns The restored Edge object, or undefined if not in limbo.
     * @throws If an active edge with the same ID exists, or if its endpoints are not active.
     */
    public restoreEdge(id: Id): Edge<EProps> | undefined {
        const edge = this.removedEdges.get(id);
        if (!edge) return;
        if (this.edges.has(id)) throw new Error(`Cannot restore edge ${id}: an active edge with the same ID already exists.`);
        if (!this.nodes.has(edge.from) || !this.nodes.has(edge.to)) {
            throw new Error(`Cannot restore edge ${id}: source or target node is not active.`);
        }

        this.removedEdges.delete(id);
        // Re-add the edge. This creates a new ID but ensures all indexes are updated correctly.
        const newEdge = this.addEdge(edge.type, edge.from, edge.to, edge.props);

        // If preserving original ID is critical, a more complex update is needed:
        // this.edges.set(edge.id, edge);
        // this.nodeToEdges.get(edge.from)!.add(edge.id);
        // this.nodeToEdges.get(edge.to)!.add(edge.id);
        // if (edge.type === 'hierarchy') {
        //     this.children.get(edge.from)!.add(edge.to);
        //     this.parent.set(edge.to, edge.from);
        // }
        // For now, re-adding is safer and simpler.

        this.emit('edge:restored', { edge: newEdge }); // Emit with newEdge or original edge? Consider consistency.
        return newEdge; // Returning the newly created edge (with new ID).
    }

    /**
     * Permanently deletes a node and its connected edges from the graph (both active and limbo states).
     * @param id The ID of the node to destroy.
     * @param isRecursive If true, will destroy all descendant nodes as well.
     * @throws If trying to destroy a parent node without isRecursive = true.
     */
    public destroyNode(id: Id, isRecursive: boolean = false): void {
        const node = this.getNode(id); // Get from active or limbo
        if (!node) return;

        if (isRecursive) {
            for (const childId of Array.from(this.children.get(id) || [])) { // Children are only in active graph
                this.destroyNode(childId, true);
            }
        } else if (this.nodes.has(id) && this.isParent(id)) { // Check if active node is parent
             throw new Error(`Node ${id} has children. Use destroyNode(id, true) for recursive deletion.`);
        }

        // Destroy connected edges from both active and limbo states
        const allEdges = new Map([...this.edges, ...this.removedEdges]);
        for (const [edgeId, edge] of allEdges) {
            if (edge.from === id || edge.to === id) {
                this.destroyEdge(edgeId);
            }
        }

        if (this.nodes.has(id)) { // If node was active
            this._deindexNodeByProps(this.nodes.get(id)!);
            const parentId = this.parent.get(id);
            if (parentId) this.children.get(parentId)?.delete(id);
            this.nodes.delete(id);
        }
        if (this.removedNodes.has(id)) { // If node was in limbo
            this._deindexNodeByProps(this.removedNodes.get(id)!); // Ensure deindexing if it was only in limbo
            this.removedNodes.delete(id);
        }

        this.parent.delete(id); // Remove from parent index if it was a child
        this.children.delete(id); // Remove from children index if it was a parent
        this.nodeToEdges.delete(id);
        this.nodeToHyperedges.delete(id);

        this.emit('node:destroyed', { id });
    }

    /**
     * Permanently deletes an edge from the graph (both active and limbo states).
     * @param id The ID of the edge to destroy.
     */
    public destroyEdge(id: Id): void {
        const edge = this.edges.get(id) || this.removedEdges.get(id);
        if (!edge) return;

        if (this.edges.has(id)) { // If edge was active
            this.nodeToEdges.get(edge.from)?.delete(id);
            this.nodeToEdges.get(edge.to)?.delete(id);
            if (edge.type === 'hierarchy') {
                this.children.get(edge.from)?.delete(edge.to);
                this.parent.delete(edge.to);
            }
            this.edges.delete(id);
        }
        this.removedEdges.delete(id); // Remove from limbo regardless
        this.emit('edge:destroyed', { id });
    }

    /**
     * Creates a deep-copy clone of a node with a new ID, without adding it to the graph.
     * @param id The ID of the node to clone. Can be active or in limbo.
     * @returns A new Node object, not yet added to the graph.
     */
    public cloneNode(id: Id): Node<NProps> {
        const sourceNode = this.getNode(id);
        if (!sourceNode) throw new Error(`Node ${id} not found to clone.`);
        return {
            id: uuidv4(),
            type: sourceNode.type,
            props: JSON.parse(JSON.stringify(sourceNode.props)), // Deep copy props
        };
    }

    /* ─────────────────────── C. Querying & Traversal ──────────────────────── */

    /**
     * Finds nodes based on a query object. Supports filtering by type and/or props.
     * @param query An object specifying filters, e.g., { type: 'note', props: { completed: true } }.
     * @returns An array of matching Node objects.
     */
    public findNodes(query: { type?: NodeType; props?: Record<string, any> }): Node<NProps>[] {
        let results: Set<Id> | undefined;

        if (query.type) {
            results = new Set(this.propertyIndex.get('type')?.get(query.type) || []);
        }

        if (query.props) {
            let propFilteredIds = new Set<Id>(results || Array.from(this.nodes.keys())); // Start with type results or all nodes

            for (const key in query.props) {
                const value = query.props[key];
                const nodesWithValue = this.propertyIndex.get(key)?.get(value) || new Set<Id>();

                // Intersect current results with nodes having this prop value
                propFilteredIds = new Set([...propFilteredIds].filter(id => nodesWithValue.has(id)));
            }
            results = propFilteredIds;
        }

        if (!results) return Array.from(this.nodes.values()); // No filters, return all active nodes

        return Array.from(results)
            .map(id => this.nodes.get(id))
            .filter(Boolean) as Node<NProps>[];
    }


    /**
     * Gets the direct neighbors of a node.
     * @param nodeId The ID of the starting node.
     * @param options Configuration for the neighborhood search: direction and edgeTypes.
     * @returns An array of neighboring Node objects.
     */
    public getNeighbors(nodeId: Id, options?: { direction?: 'outgoing' | 'incoming' | 'any'; edgeTypes?: EdgeType[] }): Node<NProps>[] {
        if (!this.nodes.has(nodeId)) return [];
        const { direction = 'any', edgeTypes } = options || {};
        const neighborIds = new Set<Id>();

        for (const edgeId of this.nodeToEdges.get(nodeId) || []) {
            const edge = this.edges.get(edgeId);
            if (!edge || (edgeTypes && !edgeTypes.includes(edge.type))) continue;

            if (direction === 'outgoing' && edge.from === nodeId) {
                neighborIds.add(edge.to);
            } else if (direction === 'incoming' && edge.to === nodeId) {
                neighborIds.add(edge.from);
            } else if (direction === 'any') {
                neighborIds.add(edge.from === nodeId ? edge.to : edge.from);
            }
        }
        return Array.from(neighborIds).map(id => this.nodes.get(id)).filter(Boolean) as Node<NProps>[];
    }

    /**
     * Performs a traversal (BFS or DFS) from a root node.
     * @param options Configuration for the traversal: root, algorithm, visitor, direction, edgeTypes.
     */
    public traverse(options: {
        root: Id;
        algorithm: 'bfs' | 'dfs';
        visitor: (node: Node<NProps>, path: Edge<EProps>[]) => void; // Path is list of edges taken
        direction?: 'outgoing' | 'incoming' | 'any';
        edgeTypes?: EdgeType[];
    }): void {
        const { root, algorithm, visitor, direction = 'outgoing', edgeTypes } = options;
        if (!this.nodes.has(root)) return;

        const visited = new Set<Id>();
        const collection: [Id, Edge<EProps>[]][] = [[root, []]]; // [nodeId, pathToNode]

        visited.add(root);

        while (collection.length > 0) {
            const [currentId, path] = (algorithm === 'bfs' ? collection.shift() : collection.pop())!;
            const currentNode = this.nodes.get(currentId)!;

            visitor(currentNode, path);

            const edgesFromCurrent = Array.from(this.nodeToEdges.get(currentId) || [])
                .map(id => this.edges.get(id)!)
                .filter(Boolean);

            for (const edge of edgesFromCurrent) {
                if (edgeTypes && !edgeTypes.includes(edge.type)) continue;

                let neighborId: Id | null = null;
                if (direction === 'outgoing' && edge.from === currentId) neighborId = edge.to;
                else if (direction === 'incoming' && edge.to === currentId) neighborId = edge.from;
                else if (direction === 'any') neighborId = edge.from === currentId ? edge.to : edge.from;

                if (neighborId && this.nodes.has(neighborId) && !visited.has(neighborId)) {
                    visited.add(neighborId);
                    collection.push([neighborId, [...path, edge]]);
                }
            }
        }
    }

    /** Gets the direct parent of a node in the hierarchy. */
    public getParent(childId: Id): Node<NProps> | undefined {
        const parentId = this.parent.get(childId);
        return parentId ? this.nodes.get(parentId) : undefined;
    }

    /** Gets the direct children of a node in the hierarchy. */
    public getChildren(parentId: Id): Node<NProps>[] {
        if (!this.nodes.has(parentId)) return [];
        const childIds = this.children.get(parentId) || new Set<Id>();
        return Array.from(childIds).map(id => this.nodes.get(id)).filter(Boolean) as Node<NProps>[];
    }

    /** Checks if a node is a parent in any hierarchy. */
    public isParent(nodeId: Id): boolean {
        return (this.children.get(nodeId)?.size || 0) > 0;
    }

    /** Checks if a node is a child in any hierarchy. */
    public isChild(nodeId: Id): boolean {
        return this.parent.has(nodeId);
    }

    /** Gets all ancestors of a node. */
    public getAncestors(nodeId: Id): Node<NProps>[] {
        const ancestors: Node<NProps>[] = [];
        let currentParentId = this.parent.get(nodeId);
        while (currentParentId) {
            const parentNode = this.nodes.get(currentParentId);
            if (parentNode) ancestors.push(parentNode);
            else break; // Should not happen in a consistent graph
            currentParentId = this.parent.get(currentParentId);
        }
        return ancestors;
    }

    /** Gets all descendants of a node. */
    public getDescendants(nodeId: Id): Node<NProps>[] {
        const descendants: Node<NProps>[] = [];
        const queue: Id[] = Array.from(this.children.get(nodeId) || []);
        const visited = new Set<Id>(queue);

        while(queue.length > 0) {
            const currentId = queue.shift()!;
            const node = this.nodes.get(currentId);
            if (node) descendants.push(node);

            const childrenOfCurrent = this.children.get(currentId) || new Set<Id>();
            for(const childId of childrenOfCurrent) {
                if(!visited.has(childId)) {
                    visited.add(childId);
                    queue.push(childId);
                }
            }
        }
        return descendants;
    }

    /** Checks if nodeA is an ancestor of nodeB. */
    public isAncestor(nodeAId: Id, nodeBId: Id): boolean {
        let currentParentId = this.parent.get(nodeBId);
        while (currentParentId) {
            if (currentParentId === nodeAId) return true;
            currentParentId = this.parent.get(currentParentId);
        }
        return false;
    }


    /* ─────────────────────── D. Advanced Algorithms ───────────────────────── */

    /**
     * Finds the shortest path between two nodes using Dijkstra's algorithm.
     * Assumes positive weights.
     * @param options Configuration: root, goal, weight function, directed.
     * @returns An object with the path, distance, and whether a path was found.
     */
    public dijkstra(options: {
        root: Id;
        goal: Id;
        weight?: (edge: Edge<EProps>) => number;
        directed?: boolean;
    }): { found: boolean; distance: number; path: (Node<NProps> | Edge<EProps>)[] } {
        return this.aStar({ ...options, heuristic: () => 0 });
    }

    /**
     * Finds the shortest path between two nodes using the A* search algorithm.
     * @param options Configuration: root, goal, weight function, heuristic function, directed.
     * @returns An object with the path, distance, and whether a path was found.
     */
    public aStar(options: {
        root: Id;
        goal: Id;
        weight?: (edge: Edge<EProps>) => number; // Edge weight function
        heuristic?: (node: Node<NProps>) => number; // Heuristic cost from node to goal
        directed?: boolean;
    }): { found: boolean; distance: number; path: (Node<NProps> | Edge<EProps>)[] } {
        const { root, goal, weight = () => 1, heuristic = () => 0, directed = false } = options;

        if (!this.nodes.has(root) || !this.nodes.has(goal)) {
            throw new Error("Root or goal node not found in active graph.");
        }

        const pq = new PriorityQueue<Id>();
        const distances = new Map<Id, number>(); // gScore: cost from root to node
        const previous = new Map<Id, { node: Id; edge: Edge<EProps> }>(); // For path reconstruction

        this.nodes.forEach((_, id) => distances.set(id, Infinity));
        distances.set(root, 0);
        pq.enqueue(root, heuristic(this.nodes.get(root)!)); // fScore = gScore + hScore. Here gScore is 0.

        while (!pq.isEmpty()) {
            const currentId = pq.dequeue()!;

            if (currentId === goal) break; // Goal reached

            const edgesToConsider: Edge<EProps>[] = [];
            (this.nodeToEdges.get(currentId) || []).forEach(edgeId => {
                const edge = this.edges.get(edgeId);
                if(edge) {
                    if (directed) {
                        if(edge.from === currentId) edgesToConsider.push(edge);
                    } else {
                        edgesToConsider.push(edge);
                    }
                }
            });


            for (const edge of edgesToConsider) {
                const neighborId = edge.from === currentId ? edge.to : edge.from;
                if (!this.nodes.has(neighborId)) continue; // Neighbor not in active graph

                const newDist = (distances.get(currentId) ?? Infinity) + weight(edge);

                if (newDist < (distances.get(neighborId) ?? Infinity)) {
                    distances.set(neighborId, newDist);
                    previous.set(neighborId, { node: currentId, edge });
                    pq.enqueue(neighborId, newDist + heuristic(this.nodes.get(neighborId)!));
                }
            }
        }

        // Path reconstruction
        if ((distances.get(goal) ?? Infinity) === Infinity) {
            return { found: false, distance: Infinity, path: [] };
        }

        const path: (Node<NProps> | Edge<EProps>)[] = [];
        let at: Id | undefined = goal;
        while (at) {
            path.unshift(this.nodes.get(at)!);
            const prevInfo = previous.get(at);
            if (prevInfo && prevInfo.node !== at) { // Check prevInfo.node !== at to stop when root is reached (its prev is itself)
                path.unshift(prevInfo.edge);
                at = prevInfo.node;
            } else {
                at = undefined; // Reached the root or no path
            }
        }
        return { found: true, distance: distances.get(goal)!, path };
    }

    /* ─────────────────── E. State, Events & Serialization ─────────────────── */

    /**
     * Checks if an element ID exists in the active graph.
     * @param id The ID of the element to check.
     */
    public isInside(id: Id): boolean {
        return this.nodes.has(id) || this.edges.has(id) || this.hyperedges.has(id);
    }

    /**
     * Checks if an element ID exists in the limbo (removed) state.
     * @param id The ID of the element to check.
     */
    public isRemoved(id: Id): boolean {
        return this.removedNodes.has(id) || this.removedEdges.has(id);
    }

    /**
     * Subscribes to a graph event.
     * @param event The event to listen for.
     * @param listener The callback function to execute.
     */
    public on(event: GraphEvent, listener: GraphListener): void {
        const listeners = this.listeners.get(event) || [];
        this.listeners.set(event, [...listeners, listener]);
    }

    /**
     * Unsubscribes from a graph event.
     * @param event The event to stop listening to.
     * @param listener The specific listener to remove.
     */
    public off(event: GraphEvent, listener: GraphListener): void {
        const listeners = this.listeners.get(event);
        if (listeners) {
            this.listeners.set(event, listeners.filter(l => l !== listener));
        }
    }

    /**
     * Applies a series of mutations. If any mutation fails, the operation stops. Does not roll back.
     * @param mutations An array of Mutation objects.
     * @returns An array of results from each successful mutation.
     */
    public applyBatch(mutations: Mutation[]): any[] {
        const results = [];
        for (const mutation of mutations) {
            try {
                switch (mutation.action) {
                    case 'addNode':
                        results.push(this.addNode(mutation.payload.type, mutation.payload.props, mutation.payload.parentId, mutation.payload.id));
                        break;
                    case 'updateNodeProps':
                        results.push(this.updateNodeProps(mutation.payload.id, mutation.payload.props));
                        break;
                    case 'deleteNode':
                        if (mutation.payload.recursive) this.removeNodeAndDescendants(mutation.payload.id);
                        else this.removeNode(mutation.payload.id);
                        results.push({ success: true, id: mutation.payload.id });
                        break;
                    case 'moveNode':
                        this.move(mutation.payload.nodeId, { parent: mutation.payload.newParentId });
                        results.push({ success: true, id: mutation.payload.nodeId });
                        break;
                    case 'addEdge':
                        results.push(this.addEdge(mutation.payload.type, mutation.payload.from, mutation.payload.to, mutation.payload.props));
                        break;
                    default:
                        // Handle unknown mutation type if necessary, or throw error
                        console.warn('Unknown mutation action:', (mutation as any).action);
                }
            } catch (error) {
                console.error(`Failed to apply mutation:`, mutation, error);
                throw error; // Stop batch on first error
            }
        }
        return results;
    }


    /**
     * Executes a series of mutations in a transaction. If any mutation fails,
     * the entire graph state is rolled back to its state before the transaction began.
     * @param mutations An array of Mutation objects to apply.
     * @returns An array of results from each mutation.
     * @throws The error from the first failed mutation.
     */
    public transact(mutations: Mutation[]): any[] {
        const backup = this.toJSON({ includeLimbo: true });
        try {
            const results = this.applyBatch(mutations);
            this.emit('transaction:commit', { mutations });
            return results;
        } catch (error) {
            this._loadFromSerialized(backup); // Rollback
            this.emit('transaction:rollback', { error, mutations });
            throw error; // Re-throw the original error after rolling back
        }
    }

    /**
     * Serializes the graph's state to a plain JSON object.
     * @param options Specify whether to include elements in the limbo state.
     * @returns A SerializedGraph object.
     */
    public toJSON(options: { includeLimbo?: boolean } = {}): SerializedGraph {
        const json: SerializedGraph = {
            nodes: Array.from(this.nodes.values()),
            edges: Array.from(this.edges.values()),
            hyperedges: Array.from(this.hyperedges.values()),
        };
        if (options.includeLimbo) {
            json.removedNodes = Array.from(this.removedNodes.values());
            json.removedEdges = Array.from(this.removedEdges.values());
        }
        return json;
    }

    /**
     * Creates a new Graph instance from a serialized state.
     * @param json A SerializedGraph object.
     * @returns A new, fully hydrated Graph instance.
     */
    public static fromJSON<N=any, E=any>(json: SerializedGraph): Graph<N, E> {
        const graph = new Graph<N, E>();
        graph._loadFromSerialized(json);
        graph.emit('reloaded', {});
        return graph;
    }

    /* ─────────────────────────── Private Helpers ──────────────────────────── */

    private emit(event: GraphEvent, payload: any): void {
        this.listeners.get(event)?.forEach(l => l(payload));
    }

    private _initializeNodeIndexes(id: Id): void {
        this.children.set(id, new Set());
        this.nodeToEdges.set(id, new Set());
        this.nodeToHyperedges.set(id, new Set());
    }

    private _indexNodeByProps(node: Node<NProps>): void {
        // Index by type
        const typeKey = 'type';
        if (!this.propertyIndex.has(typeKey)) this.propertyIndex.set(typeKey, new Map());
        let typeMap = this.propertyIndex.get(typeKey)!;
        if (!typeMap.has(node.type)) typeMap.set(node.type, new Set());
        typeMap.get(node.type)!.add(node.id);

        // Index by other properties (simple equality check)
        for (const propKey in node.props) {
            if (Object.prototype.hasOwnProperty.call(node.props, propKey)) {
                const propValue = (node.props as any)[propKey];
                 // Avoid indexing complex objects directly as map keys, could stringify or handle specific types
                if (typeof propValue === 'string' || typeof propValue === 'number' || typeof propValue === 'boolean') {
                    if (!this.propertyIndex.has(propKey)) this.propertyIndex.set(propKey, new Map());
                    let valueMap = this.propertyIndex.get(propKey)!;
                    if (!valueMap.has(propValue)) valueMap.set(propValue, new Set());
                    valueMap.get(propValue)!.add(node.id);
                }
            }
        }
    }

    private _deindexNodeByProps(node: Node<NProps>): void {
        // De-index by type
        this.propertyIndex.get('type')?.get(node.type)?.delete(node.id);
        if (this.propertyIndex.get('type')?.get(node.type)?.size === 0) {
            this.propertyIndex.get('type')?.delete(node.type);
        }

        // De-index by other properties
        for (const propKey in node.props) {
             if (Object.prototype.hasOwnProperty.call(node.props, propKey)) {
                const propValue = (node.props as any)[propKey];
                if (typeof propValue === 'string' || typeof propValue === 'number' || typeof propValue === 'boolean') {
                    this.propertyIndex.get(propKey)?.get(propValue)?.delete(node.id);
                    if (this.propertyIndex.get(propKey)?.get(propValue)?.size === 0) {
                        this.propertyIndex.get(propKey)?.delete(propValue);
                    }
                    if (this.propertyIndex.get(propKey)?.size === 0) {
                        this.propertyIndex.delete(propKey);
                    }
                }
            }
        }
    }


    private _moveNode(nodeId: Id, newParentId: Id | null): void {
        const node = this.nodes.get(nodeId);
        if (!node) throw new Error(`Node ${nodeId} not found for moving.`);

        const oldParentId = this.parent.get(nodeId);

        // Validate new parent
        if (newParentId && !this.nodes.has(newParentId)) {
            throw new Error(`New parent node ${newParentId} not found.`);
        }
        if (newParentId === nodeId) throw new Error("Node cannot be its own parent.");
        if (newParentId && this.isAncestor(nodeId, newParentId)) {
             throw new Error(`Cannot move node ${nodeId} under ${newParentId} as it would create a cycle.`);
        }


        // Remove from old parent's children
        if (oldParentId && this.children.has(oldParentId)) {
            this.children.get(oldParentId)!.delete(nodeId);
        }

        // Update parent map
        if (newParentId) {
            this.parent.set(nodeId, newParentId);
            // Add to new parent's children
            if (!this.children.has(newParentId)) this.children.set(newParentId, new Set());
            this.children.get(newParentId)!.add(nodeId);
        } else {
            this.parent.delete(nodeId); // Becoming a root node
        }

        // Update edges if hierarchy type is affected.
        // If there was an old hierarchy edge, remove it.
        const oldHierarchyEdge = Array.from(this.edges.values()).find(e =>
            e.type === 'hierarchy' && e.to === nodeId && e.from === oldParentId
        );
        if (oldHierarchyEdge) this.removeEdge(oldHierarchyEdge.id); // This should be removeEdge, not destroyEdge

        // If newParentId, add new hierarchy edge
        if (newParentId) {
            this.addEdge('hierarchy', newParentId, nodeId);
        }

        this.emit('node:moved', { nodeId, oldParentId, newParentId });
    }

    private _moveEdge(edgeId: Id, location: { source?: Id; target?: Id }): void {
        const edge = this.edges.get(edgeId);
        if (!edge) throw new Error(`Edge ${edgeId} not found for moving.`);

        const newSource = location.source || edge.from;
        const newTarget = location.target || edge.to;

        if (!this.nodes.has(newSource) || !this.nodes.has(newTarget)) {
            throw new Error("New source or target node not found for moving edge.");
        }

        if (edge.type === 'hierarchy') {
            if (newSource === newTarget) throw new Error("Cannot create a self-referential hierarchy edge.");
            // Check if newTarget already has a parent, if edge.to is changing
            if (newTarget !== edge.to && this.parent.has(newTarget) && this.parent.get(newTarget) !== newSource) {
                 throw new Error(`Node ${newTarget} already has a parent. Cannot move hierarchy edge.`);
            }
            if (this.isAncestor(newTarget, newSource)) {
                throw new Error("Moving hierarchy edge would create a cycle.");
            }
        }

        // Remove old indexing
        this.nodeToEdges.get(edge.from)?.delete(edgeId);
        this.nodeToEdges.get(edge.to)?.delete(edgeId);
        if (edge.type === 'hierarchy') {
            this.children.get(edge.from)?.delete(edge.to);
            this.parent.delete(edge.to);
        }

        // Update edge properties
        const oldSource = edge.from;
        const oldTarget = edge.to;
        edge.from = newSource;
        edge.to = newTarget;

        // Add new indexing
        this.nodeToEdges.get(newSource)!.add(edgeId);
        this.nodeToEdges.get(newTarget)!.add(edgeId);
        if (edge.type === 'hierarchy') {
            this.children.get(newSource)!.add(newTarget);
            this.parent.set(newTarget, newSource);
        }

        this.emit('edge:moved', { edgeId, oldSource, oldTarget, newSource, newTarget });
    }


    private _findEdgeBetween(from: Id, to: Id, directed: boolean): Edge<EProps> | undefined {
        for (const edgeId of this.nodeToEdges.get(from) || []) {
            const edge = this.edges.get(edgeId);
            if (!edge) continue;
            if (directed) {
                if (edge.to === to) return edge;
            } else {
                // For undirected, check if 'to' is the other node, regardless of edge.from/edge.to
                if ((edge.from === from && edge.to === to) || (edge.from === to && edge.to === from)) return edge;
            }
        }
        return undefined;
    }

    /** Resets the graph and rehydrates it from a serialized object. */
    private _loadFromSerialized(json: SerializedGraph): void {
        // Clear all current state
        this.nodes.clear();
        this.edges.clear();
        this.hyperedges.clear();
        this.removedNodes.clear();
        this.removedEdges.clear();
        this.children.clear();
        this.parent.clear();
        this.nodeToEdges.clear();
        this.nodeToHyperedges.clear();
        this.propertyIndex.clear();

        // Load active elements
        json.nodes.forEach(n => this.nodes.set(n.id, n as Node<NProps>));
        json.edges.forEach(e => this.edges.set(e.id, e as Edge<EProps>));
        json.hyperedges.forEach(h => this.hyperedges.set(h.id, h)); // Assuming HyperEdge props are any

        // Load limbo elements if they exist
        json.removedNodes?.forEach(n => this.removedNodes.set(n.id, n as Node<NProps>));
        json.removedEdges?.forEach(e => this.removedEdges.set(e.id, e as Edge<EProps>));

        // Rebuild all indexes from scratch
        this._rebuildIndexes();
    }

    /** Reconstructs all derived indexes from the primary node/edge maps. */
    private _rebuildIndexes(): void {
        // Initialize indexes for all nodes first
        this.nodes.forEach(node => {
            this._initializeNodeIndexes(node.id); // Ensures sets are created
            this._indexNodeByProps(node);
        });

        // Then process edges
        this.edges.forEach(edge => {
            // Ensure from/to nodes exist in nodeToEdges map (should be guaranteed by _initializeNodeIndexes)
            this.nodeToEdges.get(edge.from)?.add(edge.id);
            this.nodeToEdges.get(edge.to)?.add(edge.id);

            if (edge.type === 'hierarchy') {
                // Ensure from/to nodes exist in children/parent maps
                this.children.get(edge.from)?.add(edge.to);
                this.parent.set(edge.to, edge.from);
            }
        });

        // Process hyperedges (if they affect nodeToHyperedges index)
        this.hyperedges.forEach(hyperEdge => {
            hyperEdge.nodes.forEach(nodeId => {
                this.nodeToHyperedges.get(nodeId)?.add(hyperEdge.id);
            });
        });
    }
}