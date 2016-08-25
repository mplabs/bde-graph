BDE Graph [![MIT license](http://img.shields.io/badge/License-MIT-brightgreen.svg)](#license)
=========

This project provides a [Web Component](http://www.polymer-project.org/) for viewing and editing flow-based programming graphs.
It is a fork of the brilliant [TheGraph](https://github.com/the-grid/the-graph) library, ported to Polymer 1.x with special customization for use with [Cubbles](http://cubbles.github.io/).

BDE Graph has the following dependencies:

* [Polymer](http://www.polymer-project.org/) for providing various polyfills for emerging web technologies like custom elements and pointer events
* [React](http://facebook.github.io/react/) for the "virtual DOM" to make SVG fast
* [KLay Layered](http://rtsys.informatik.uni-kiel.de/confluence/display/KIELER/KLay+Layered) graph autolayout via [KLayJS](https://github.com/automata/klay-js)

## Table of Contents

* [Installation](#installation)
* [Components](#components)
	* [Structure](#structure)
	* [TheGraph](#thegraph)
	* [TheGraphApp](#thegraphapp)
	* [TheGraphClipboard](#thegraphclipboard)
	* [TheGraphEdge](#thegraphedge)
	* [TheGraphGraph](#thegraphgraph)
	* [TheGraphGroup](#thegraphgroup)
	* [TheGraphIIP](#thegraphiip)
	* [TheGraphMenu](#thegraphmenu)
	* [TheGraphNodeMenuPort](#thegraphnodemenuport)
	* [TheGraphNodeMenuPorts](#thegraphnodemenuports)
	* [TheGraphNodeMenu](#thegraphnodemenu)
	* [TheGraphNode](#thegraphnode)
	* [TheGraphPort](#thegraphport)
	* [TheGraphTooltip](#thegraphtooltip)
	* [noflo](#noflo)
	* [Autolayouter](#autolayouter)
* [License](#license)

## Installation

Get dependencies:

	npm i && bower i

## Components

BDE Graph is made up of several components that are bound at the root by the `<bde-graph/>` element.

### Structure

```
TheGraphApp
	TheGraphGraph
		[TheGraphGroup]
		[TheGraphEdge]
		[TheGraphIIP]
		[TheGraphNode]
			[TheGraphPort] (inports)
			[TheGraphPort] (outports)
		[TheGraphNode] (ex-inports)
		[TheGraphNode] (ex-outports)
	TheGraphTooltip
	TheGraphNodeMenu
		[TheGraphNodeMenuPorts] (inports)
			[TheGraphMenuPort]
		[TheGraphNodeMenuPorts] (outports)
			[TheGraphMenuPort]
		TheGraphMenu
```

Wrapping elements omitted for better readability.
		
### TheGraph

TheGraph initializes the application and provides some sugar functions.

#### Properties:

`contextPortSize` Context menus

`zbp(Big|Normal|Small)` Zoom breakpoints

`config` An object containing various settings

`factories` The components factory functions

`mixins` An object referencing application global mixins (e.g. [Tooltip](#thegraphtooltip))

#### Methods:

`findMinMax(graph, nodes)` Find the bounds of the graph, returns `{ minX, minY, maxX, maxY }`.

`findFit(graph, width, height)` Find pan and scale to fit all elements of the graph, returns `{ x, y, sacle }`.

`findAreaFit(point1, point2, width, height)` Find pan and scale to fit all elements inside the point1, point2 bounds, returns `{ x, y, sacle }`.

`findNodeFit(node, width, height)` Find pan and scale to fit the provided [node](#thegraphnode). Requires current graph width and height, returns `{ x, y, sacle }`.

`merge(src, dest, overwrite)` Merges two objects and returns the result.

`getOffset(domNode)` Returns unreliably the offset of the application on screen.

#### Classes:

* `SVGImage`

* `TextBG`

### TheGraphApp

TheGraphApp will render as the outermost element in the DOM. It contains all other elements that are rendered on screen.

#### Properties:

`x, y, scale, width, height, offsetY` Pan, scale, and position of the application on screen.

`minZoom, maxZoom` Zoom constraints.

`tooltip, tooltipX, tooltipY. tooltipVisible` [Tooltip](#thegraphtooltip) content and position.

#### Methods:

`showContext(options)` Show the context menu. `options` defines the menu.

`hideContext` Hide the context menu.

`changeTooltip(event)` Show the tooltip at the position of the event.

`hideTooltip` Hide the tooltip.

`triggerFit` Fit the graph to all elements.

`focusNode(node)` Focus the graph to the given [node](#thegraphnode).

`unselectAll` Clear [edge](#TheGraphEdge) and [node](#thegraphnode) selections.

`renderGraph` Mark the graph dirty for rendering.

`renderCanvas` Render the <canvas\/\> (the dotted background).

`getContext(menu, options, hide)` Return a context menu. The menu definition is done on the `<bde-graph/>` level.

`render` The React render method. Renders background, context menu, [TheGraphGraph](#thegraphgraph), and [Tooltip](#TheGraphTooltip).

#### Events:

`edgeStart` Hide context menu and trigger [`TheGraphGraph.edgeStart`](#thegraphgraph).

#### EventHandlers:

`onTrack` Handle track events on the graph. Change pan accordingly.

`onPanScale` Pass pan/scale events to `<bde-graph/>`

`onShowContext(event)`  Show the context menu at the position of the event.

`keyDown, keyUp` Handle key events

### TheGraphClipboard

TheGraphClipboard handles copy and paste in the application.

Methods:

`copy(graph, keys)` Copy the [nodes](#thegraphnode) specified in `keys` to the clipboard.

`paste(graph)` Paste the [nodes](#thegraphnode) from the clipboard.

### TheGraphEdge

TheGraphEdge represents all connections (edges) in the graph.

Properties:

`sX, sY` The start point of the edge.

`tX, tY` The end point of the edge.

`selected, animated` Wether or not the edge is currently selected and/or animated.

#### EventHandlers:

`track -> dontPan` Dont drag the edge when a menu is shown.

`tap -> onEdgeSelection` Call `onEdgeSelection` on `<bde-graph/>`.

`contextmenu -> showContext` Show the context menu at the position of the event.

### TheGraphGraph

TheGraphGraph will handle all interactions with the graph and render all containing elements to the screen.

#### Properties:

`displaySelectionGroup` Wether to create a temporary group when selecting nodes.

`edgePreview, edgePreviewX, edgePreviewY` References the temporary [edge](#thegraphedge) that is shown while dragging a new connection.

`forceSelection` Wether to force-select nodes when interacting.

`selectedNodes, errorNodes` Arrays of selected or errored [nodes](#thegraphnode).

`selectedEdges, animatedEdges` Arrays of selected or animated [edges](#thegraphedge).

`offsetX, offsetY` The offset of the application on screen.

#### EventHandlers

`addEdge, changeEdge, removeEdge, removeInitial -> resetPortRoute` Mark nodes with changed rotues for rerender.

`changeNode, changeInport, changeOutport, endTransaction -> markDirty` Mark the graph dirty for rerender.

### TheGraphGroup

TheGraphGroup handles the display of groups in the graph.

#### Properties:

`x, y, width, height` Size and position of the group.

#### EventHandlers:

`track -> onTrack` Change to position of the group.

### TheGraphIIP

TheGraphIIP handles the display of initializers on [nodes](#thegraphnode) [ports](#thegraphport).

#### Properties:

`x, y` The position of the initializer.

### TheGraphMenu

TheGraphMenu handles display and interaction of the menus. Menus can be defined in `<bde-graph/>` by assigning icon, label, and function to one of four quadrants; `n4, s4, e4, w4` representing the position of the feature on the menu circle.

#### Properties:

`width, height` The size of the menu.

#### Methods:

`getPosition` Returns the current position of the menu.

#### EventHandlers:

`tap -> onTapN4, onTapS4, onTapE4, onTapW4` Handles taps on the corresponding circle slice.

### TheGraphNodeMenuPort

TheGraphNodeMenuPort handles display and interaction of a single port in the nodes menu.

#### Properties:

`x, y` The position of the port.

#### EventHandlers:

`up -> edgeStart` Create a new [edge](#thegraphedge) when clicked or tapped on.

### TheGraphNodeMenuPorts

TheGraphNodeMenuPorts displays a list of [ports](#thegraphnodemenuport) in the node menu.

#### Properties:

`scale` The current scale of the application.

`ports` An array of ports associated with the current [node](#thegraphnode).

`processKey` The process id of the current [node](#thegraphnode).

`deltaX, deltaY` The position of the group of [ports](#thegraphnodemenuport).

### TheGraphNodeMenu

TheGraphNodeMenu handles display and interaction of the node menu.

#### Properties:

`processKey` The process id of the current [node](#thegraphnode).

`nodeWidth, nodeHeight` The size of the current [node](#thegraphnode).

### TheGraphNode

TheGraphNode handles display and interaction with a single node.

#### Properties:

`x, y` The position of the node.

`icon, label, sublabel` Icon and label of the node.

`ports` An array of [ports](#thegraphport) for the node.

`selected, error` Flags for selected and error state.

#### EventHandlers:

`track -> onTrack` Handle dragging the node.

`tap -> onNodeSelection` Defer event to `<bde-graph/>`.

`contextmenu -> showContext` Trigger `showContext` in [TheGraphApp](#thegraphapp).

#### Methods:

`getContext` Create a new [TheGraphMenu](#thegraphmenu), [TheGraphPorts](#thegraphports), and [TheGraphPort](#thegraphport).

### TheGraphPort

TheGraphPort handles display and interaction of the [node](#thegraphnode) ports.

#### Properties:

`label` The name of the port.

`isIn` Wether the port is an input.

`type` The type of the port.

#### EventHandlers:

`tap, track, the-graph-edge-drop -> edgeStart` Start a preview [edge](#thegraphedge).

`track -> triggerDroponTarget` Complete the preview [edge](#thegraphedge).

`contextmenu -> showContext` Display the port [menu](#thegraphmenu).

### TheGraphTooltip
	
TheGraphTooltip displays various tooltips.

#### Properties:

`label` The content of the tooltip.

`visible` Wether the tooltip is visible.
	
### noflo-cubbles

noflo-cubbles is a customized and stripped down version of [noflo](https://github.com/noflo/noflo) containing only the necessary parts for displaying a graph.

#### Classes:

`EventEmitter`

##### Methods:

`setMaxListeners` Set the maximum number of listeners for an event. Default: 10

`addListener(type, listener)` Add a listener to an event.

`emit(type, data*)` Emit an event

`on(type, listener)` Alias of `addListener`.

`once(type, listener)` Add a listener that is only fired once.

`removeListener(type, listener)` Remove a specific listener from the stack.

`removeAllListeners(type)` Remove all listeners for a specific event.

`listeners(type)` Return all registered listeners for an event.

`listenerCount(type)` Return the number of registered listeners for an event.

`Graph`

Graph will emit an event for every altering method called.

##### Properties:

`name` (String) The name of the current graph.

`properties` An object of properties. Currently only `caseSensitive` is supported.

`nodes` Array of nodes.

`edges` Array of edges.

`initializers` Array of initializers.

`inports` Key-Value-Map of inports.

`outports` Key-Value-Map of outports.

`groups` Array of groups.

`transaction` The currently running transaction.

`caseSensitive` Flag wether to be case sensitive when handling names.

##### Methods:

`Graph(name, properties)` Class constructor

`getPortName(port)` Return the lowercased name of a port, if not case sensitive.

`startTransaction(id, metadata)` Start a new transaction.

`endTransaction(id, metadata)` End a transaction.

`checkTransactionStart` Start an implicit transaction.

`checkTransactionEnd` End an implicit transaction.

`setProperties(properties)` Set the properties object.

`addInport(publicPort, type, metadata)` Add an inport.

`removeInport(publicPort)` Remove an inport.

`renameInport(oldPort, newPort)` Rename an inport.

`setInportMetadata(publicPort, metadata)` Set an inports metadata. `{x, y, width, heigth}`

`addOutport(publicPort, type, metadata)` Add an outport.

`removeOutport(publicPort)` Remove an outport.

`renameOutport(oldPort, newPort)` Rename an outport.

`setOutportMetadata(publicPort, metadata)` Set an outports metadata. `{x, y, width, heigth}`

`addGroup(group, nodes, metadata)` Add a group.

`renameGroup(oldName, newName)` Rename a group.

`removeGroup(groupName)` Remove a group. This will not remove nodes.

`setGroupMetadata(groupName, metadata)` Set a groups metadata.

`addNode(id, component, metadata)` Add a node.

`removeNode(id)` Remove a node. Also removes affected edges.

`getNode(id)` Return the node with the given id.

`renameNode(oldId, newId)` Rename a node. Also changes affected edges.

`setNodeMetadata(id, metadata)` Set a nodes metadata.

`addEdge(outNode, outPort, inNode, inPort, metadata)` Add an edge.

`removeEdge(node, port, node2, port2)` Remove an edge.

`getEdge(node, port, node2, port2)` Return an edge for the given nodes. 

`setEdgeMetadata(node, port, node2, port2, metadata)` Set an edges metadata.

`addInitial(data, node, port, metadata)` Add an IIP.

`removeInitial(node, port)` Remove an IIP.

### Autolayouter
	
This module convertes cubble graphs to KGraphs for use with the [klayjs](https://github.com/OpenKieler/klayjs) autolayouter.

#### Methods:

`init(params)` Initializes the autolayouter.

`layout(params)` Get the layouted graph.

`cubblesToKieler(graph, portInfo, direction)` Convert the cubbles graph to a KGraph. PortInfo is a key-value-map of node-port information. Direction is a string `"RIGHT|DOWN"` selecting how the resulting graph will be layed out.

## License

[The MIT License](./LICENSE-MIT.txt)