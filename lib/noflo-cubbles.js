(function(context) {
  'use strict';

  function EventEmitter() {
    this._events = this._events || {};
    this._maxListeners = this._maxListeners || undefined;
  }

  EventEmitter.prototype._events = undefined;
  EventEmitter.prototype._maxListeners = undefined;

  // By default EventEmitters will print a warning if more than 10 listeners are
  // added to it. This is a useful default which helps finding memory leaks.
  EventEmitter.defaultMaxListeners = 10;

  // Obviously not all Emitters should be limited to 10. This function allows
  // that to be increased. Set to zero for unlimited.
  EventEmitter.prototype.setMaxListeners = function(n) {
    if (!isNumber(n) || n < 0 || isNaN(n))
      throw TypeError('n must be a positive number');
    this._maxListeners = n;
    return this;
  };

  EventEmitter.prototype.emit = function(type) {
    var er, handler, len, args, i, listeners;

    if (!this._events)
      this._events = {};

    // If there is no 'error' event listener then throw.
    if (type === 'error') {
      if (!this._events.error ||
          (isObject(this._events.error) && !this._events.error.length)) {
        er = arguments[1];
        if (er instanceof Error) {
          throw er; // Unhandled 'error' event
        }
        throw TypeError('Uncaught, unspecified "error" event.');
      }
    }

    handler = this._events[type];

    if (isUndefined(handler))
      return false;

    if (isFunction(handler)) {
      switch (arguments.length) {
        // fast cases
        case 1:
          handler.call(this);
          break;
        case 2:
          handler.call(this, arguments[1]);
          break;
        case 3:
          handler.call(this, arguments[1], arguments[2]);
          break;
        // slower
        default:
          len = arguments.length;
          args = new Array(len - 1);
          for (i = 1; i < len; i++)
            args[i - 1] = arguments[i];
          handler.apply(this, args);
      }
    } else if (isObject(handler)) {
      len = arguments.length;
      args = new Array(len - 1);
      for (i = 1; i < len; i++)
        args[i - 1] = arguments[i];

      listeners = handler.slice();
      len = listeners.length;
      for (i = 0; i < len; i++)
        listeners[i].apply(this, args);
    }

    return true;
  };

  EventEmitter.prototype.addListener = function(type, listener) {
    var m;

    if (!isFunction(listener))
      throw TypeError('listener must be a function');

    if (!this._events)
      this._events = {};

    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (this._events.newListener)
      this.emit('newListener', type,
                isFunction(listener.listener) ?
                listener.listener : listener);

    if (!this._events[type])
      // Optimize the case of one listener. Don't need the extra array object.
      this._events[type] = listener;
    else if (isObject(this._events[type]))
      // If we've already got an array, just append.
      this._events[type].push(listener);
    else
      // Adding the second element, need to change to array.
      this._events[type] = [this._events[type], listener];

    // Check for listener leak
    if (isObject(this._events[type]) && !this._events[type].warned) {
      var m;
      if (!isUndefined(this._maxListeners)) {
        m = this._maxListeners;
      } else {
        m = EventEmitter.defaultMaxListeners;
      }

      if (m && m > 0 && this._events[type].length > m) {
        this._events[type].warned = true;
        console.error('(node) warning: possible EventEmitter memory ' +
                      'leak detected. %d listeners added. ' +
                      'Use emitter.setMaxListeners() to increase limit.',
                      this._events[type].length);
        if (typeof console.trace === 'function') {
          // not supported in IE 10
          console.trace();
        }
      }
    }

    return this;
  };

  EventEmitter.prototype.on = EventEmitter.prototype.addListener;

  EventEmitter.prototype.once = function(type, listener) {
    if (!isFunction(listener))
      throw TypeError('listener must be a function');

    var fired = false;

    function g() {
      this.removeListener(type, g);

      if (!fired) {
        fired = true;
        listener.apply(this, arguments);
      }
    }

    g.listener = listener;
    this.on(type, g);

    return this;
  };

  // emits a 'removeListener' event iff the listener was removed
  EventEmitter.prototype.removeListener = function(type, listener) {
    var list, position, length, i;

    if (!isFunction(listener))
      throw TypeError('listener must be a function');

    if (!this._events || !this._events[type])
      return this;

    list = this._events[type];
    length = list.length;
    position = -1;

    if (list === listener ||
        (isFunction(list.listener) && list.listener === listener)) {
      delete this._events[type];
      if (this._events.removeListener)
        this.emit('removeListener', type, listener);

    } else if (isObject(list)) {
      for (i = length; i-- > 0;) {
        if (list[i] === listener ||
            (list[i].listener && list[i].listener === listener)) {
          position = i;
          break;
        }
      }

      if (position < 0)
        return this;

      if (list.length === 1) {
        list.length = 0;
        delete this._events[type];
      } else {
        list.splice(position, 1);
      }

      if (this._events.removeListener)
        this.emit('removeListener', type, listener);
    }

    return this;
  };

  EventEmitter.prototype.removeAllListeners = function(type) {
    var key, listeners;

    if (!this._events)
      return this;

    // not listening for removeListener, no need to emit
    if (!this._events.removeListener) {
      if (arguments.length === 0)
        this._events = {};
      else if (this._events[type])
        delete this._events[type];
      return this;
    }

    // emit removeListener for all listeners on all events
    if (arguments.length === 0) {
      for (key in this._events) {
        if (key === 'removeListener') continue;
        this.removeAllListeners(key);
      }
      this.removeAllListeners('removeListener');
      this._events = {};
      return this;
    }

    listeners = this._events[type];

    if (isFunction(listeners)) {
      this.removeListener(type, listeners);
    } else {
      // LIFO order
      while (listeners.length)
        this.removeListener(type, listeners[listeners.length - 1]);
    }
    delete this._events[type];

    return this;
  };

  EventEmitter.prototype.listeners = function(type) {
    var ret;
    if (!this._events || !this._events[type])
      ret = [];
    else if (isFunction(this._events[type]))
      ret = [this._events[type]];
    else
      ret = this._events[type].slice();
    return ret;
  };

  EventEmitter.listenerCount = function(emitter, type) {
    var ret;
    if (!emitter._events || !emitter._events[type])
      ret = 0;
    else if (isFunction(emitter._events[type]))
      ret = 1;
    else
      ret = emitter._events[type].length;
    return ret;
  };

  function isFunction(arg) {
    return typeof arg === 'function';
  }

  function isNumber(arg) {
    return typeof arg === 'number';
  }

  function isObject(arg) {
    return typeof arg === 'object' && arg !== null;
  }

  function isUndefined(arg) {
    return arg === void 0;
  }

  context.EventEmitter = EventEmitter;

  function Graph(name, options) {
    EventEmitter.call(this);

    this.name = name != null ? name : '';
    if (options == null) {
      options = {};
    }
    this.properties = {};
    this.nodes = [];
    this.edges = [];
    this.initializers = [];
    this.exports = [];
    this.inports = {};
    this.outports = {};
    this.groups = [];
    this.transaction = {
      id: null,
      depth: 0
    };
    this.caseSensitive = options.caseSensitive || false;
  }

  Graph.prototype = Object.create(EventEmitter.prototype);
  
  Graph.prototype.constructor = EventEmitter;

  Graph.prototype.name = '';

  Graph.prototype.caseSensitive = false;

  Graph.prototype.properties = {};

  Graph.prototype.nodes = [];

  Graph.prototype.edges = [];

  Graph.prototype.initializers = [];

  Graph.prototype.exports = [];

  Graph.prototype.inports = {};

  Graph.prototype.outports = {};

  Graph.prototype.groups = [];

  Graph.prototype.getPortName = function(port) {
    if (this.caseSensitive) {
      return port;
    } else {
      return port.toLowerCase();
    }
  };

  Graph.prototype.startTransaction = function(id, metadata) {
    if (this.transaction.id) {
      throw Error("Nested transactions not supported");
    }
    this.transaction.id = id;
    this.transaction.depth = 1;
    return this.emit('startTransaction', id, metadata);
  };

  Graph.prototype.endTransaction = function(id, metadata) {
    if (!this.transaction.id) {
      throw Error("Attempted to end non-existing transaction");
    }
    this.transaction.id = null;
    this.transaction.depth = 0;
    return this.emit('endTransaction', id, metadata);
  };

  Graph.prototype.checkTransactionStart = function() {
    if (!this.transaction.id) {
      return this.startTransaction('implicit');
    } else if (this.transaction.id === 'implicit') {
      return this.transaction.depth += 1;
    }
  };

  Graph.prototype.checkTransactionEnd = function() {
    if (this.transaction.id === 'implicit') {
      this.transaction.depth -= 1;
    }
    if (this.transaction.depth === 0) {
      return this.endTransaction('implicit');
    }
  };

  Graph.prototype.setProperties = function(properties) {
    var before, item, val;
    this.checkTransactionStart();
    before = clone(this.properties);
    for (item in properties) {
      val = properties[item];
      this.properties[item] = val;
    }
    this.emit('changeProperties', this.properties, before);
    return this.checkTransactionEnd();
  };

  Graph.prototype.addExport = function(publicPort, nodeKey, portKey, metadata) {
    var exported;
    if (metadata == null) {
      metadata = {
        x: 0,
        y: 0
      };
    }
    if (!this.getNode(nodeKey)) {
      return;
    }
    this.checkTransactionStart();
    exported = {
      "public": this.getPortName(publicPort),
      process: nodeKey,
      port: this.getPortName(portKey),
      metadata: metadata
    };
    this.exports.push(exported);
    this.emit('addExport', exported);
    return this.checkTransactionEnd();
  };

  Graph.prototype.removeExport = function(publicPort) {
    var exported, found, idx, _i, _len, _ref;
    publicPort = this.getPortName(publicPort);
    found = null;
    _ref = this.exports;
    for (idx = _i = 0, _len = _ref.length; _i < _len; idx = ++_i) {
      exported = _ref[idx];
      if (exported["public"] === publicPort) {
        found = exported;
      }
    }
    if (!found) {
      return;
    }
    this.checkTransactionStart();
    this.exports.splice(this.exports.indexOf(found), 1);
    this.emit('removeExport', found);
    return this.checkTransactionEnd();
  };

  Graph.prototype.addInport = function(publicPort, type, metadata) {
    publicPort = this.getPortName(publicPort);

    metadata = metadata || {};
    metadata.x = metadata.x || 0;
    metadata.y = metadata.y || 0;
    metadata.height = metadata.height || TheGraph.config.nodeHeight;
    metadata.width = metadata.width || TheGraph.config.nodeWidth;

    this.checkTransactionStart();
    this.inports[publicPort] = {
      metadata: metadata
    };
    this.emit('addInport', publicPort, this.inports[publicPort]);
    return this.checkTransactionEnd();
  };

  Graph.prototype.removeInport = function(publicPort) {
    var port;
    publicPort = this.getPortName(publicPort);
    if (!this.inports[publicPort]) { return; }
    this.checkTransactionStart();
    port = this.inports[publicPort];
    
    // Remove associated edges
    this.edges
      .filter(function(edge) {
        return edge.to.node === undefined && edge.to.port === publicPort ||
          edge.from.node === undefined && edge.from.port === publicPort;
      })
      .forEach(function(edge) {
        this.removeEdge(edge.from.node, edge.from.port, edge.to.node, edge.to.port);
      }, this);
    
    this.setInportMetadata(publicPort, {});
    delete this.inports[publicPort];
    this.emit('removeInport', publicPort, port);
    return this.checkTransactionEnd();
  };

  // Graph.prototype.removeInport = function(publicPort) {
  //   var port;
  //   publicPort = this.getPortName(publicPort);
  //   if (!this.inports[publicPort]) {
  //     return;
  //   }
  //   this.checkTransactionStart();
  //   port = this.inports[publicPort];
  //   this.setInportMetadata(publicPort, {});
  //   delete this.inports[publicPort];
  //   this.emit('removeInport', publicPort, port);
  //   return this.checkTransactionEnd();
  // };

  Graph.prototype.renameInport = function(oldPort, newPort) {
    oldPort = this.getPortName(oldPort);
    newPort = this.getPortName(newPort);
    if (!this.inports[oldPort]) {
      return;
    }
    this.checkTransactionStart();
    this.inports[newPort] = this.inports[oldPort];
    delete this.inports[oldPort];
    this.emit('renameInport', oldPort, newPort);
    return this.checkTransactionEnd();
  };

  Graph.prototype.setInportMetadata = function(publicPort, metadata) {
    var before, item, val;
    publicPort = this.getPortName(publicPort);
    if (!this.inports[publicPort]) {
      return;
    }
    this.checkTransactionStart();
    before = clone(this.inports[publicPort].metadata);
    if (!this.inports[publicPort].metadata) {
      this.inports[publicPort].metadata = {};
    }
    for (item in metadata) {
      val = metadata[item];
      if (val != null) {
        this.inports[publicPort].metadata[item] = val;
      } else {
        delete this.inports[publicPort].metadata[item];
      }
    }
    this.emit('changeInport', publicPort, this.inports[publicPort], before);
    return this.checkTransactionEnd();
  };

  Graph.prototype.addOutport = function(publicPort, type, metadata) {
    publicPort = this.getPortName(publicPort);

    metadata = metadata || {};
    metadata.x = metadata.x || 0;
    metadata.y = metadata.y || 0;
    metadata.height = metadata.height || TheGraph.config.nodeHeight;
    metadata.width = metadata.width || TheGraph.config.nodeWidth;

    this.checkTransactionStart();
    this.outports[publicPort] = {
      metadata: metadata
    };
    this.emit('addOutport', publicPort, this.outports[publicPort]);
    return this.checkTransactionEnd();
  };

  Graph.prototype.removeOutport = function(publicPort) {
    var port;
    publicPort = this.getPortName(publicPort);
    if (!this.outports[publicPort]) {
      return;
    }
    this.checkTransactionStart();
    port = this.outports[publicPort];
    this.setOutportMetadata(publicPort, {});
    delete this.outports[publicPort];
    this.emit('removeOutport', publicPort, port);
    return this.checkTransactionEnd();
  };

  Graph.prototype.renameOutport = function(oldPort, newPort) {
    oldPort = this.getPortName(oldPort);
    newPort = this.getPortName(newPort);
    if (!this.outports[oldPort]) {
      return;
    }
    this.checkTransactionStart();
    this.outports[newPort] = this.outports[oldPort];
    delete this.outports[oldPort];
    this.emit('renameOutport', oldPort, newPort);
    return this.checkTransactionEnd();
  };

  Graph.prototype.setOutportMetadata = function(publicPort, metadata) {
    var before, item, val;
    publicPort = this.getPortName(publicPort);
    if (!this.outports[publicPort]) {
      return;
    }
    this.checkTransactionStart();
    before = clone(this.outports[publicPort].metadata);
    if (!this.outports[publicPort].metadata) {
      this.outports[publicPort].metadata = {};
    }
    for (item in metadata) {
      val = metadata[item];
      if (val != null) {
        this.outports[publicPort].metadata[item] = val;
      } else {
        delete this.outports[publicPort].metadata[item];
      }
    }
    this.emit('changeOutport', publicPort, this.outports[publicPort], before);
    return this.checkTransactionEnd();
  };

  Graph.prototype.addGroup = function(group, nodes, metadata) {
    var g;
    this.checkTransactionStart();
    g = {
      name: group,
      nodes: nodes,
      metadata: metadata
    };
    this.groups.push(g);
    this.emit('addGroup', g);
    return this.checkTransactionEnd();
  };

  Graph.prototype.renameGroup = function(oldName, newName) {
    var group, _i, _len, _ref;
    this.checkTransactionStart();
    _ref = this.groups;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      group = _ref[_i];
      if (!group) {
        continue;
      }
      if (group.name !== oldName) {
        continue;
      }
      group.name = newName;
      this.emit('renameGroup', oldName, newName);
    }
    return this.checkTransactionEnd();
  };

  Graph.prototype.removeGroup = function(groupName) {
    var group, _i, _len, _ref;
    this.checkTransactionStart();
    _ref = this.groups;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      group = _ref[_i];
      if (!group) {
        continue;
      }
      if (group.name !== groupName) {
        continue;
      }
      this.setGroupMetadata(group.name, {});
      this.groups.splice(this.groups.indexOf(group), 1);
      this.emit('removeGroup', group);
    }
    return this.checkTransactionEnd();
  };

  Graph.prototype.setGroupMetadata = function(groupName, metadata) {
    var before, group, item, val, _i, _len, _ref;
    this.checkTransactionStart();
    _ref = this.groups;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      group = _ref[_i];
      if (!group) {
        continue;
      }
      if (group.name !== groupName) {
        continue;
      }
      before = clone(group.metadata);
      for (item in metadata) {
        val = metadata[item];
        if (val != null) {
          group.metadata[item] = val;
        } else {
          delete group.metadata[item];
        }
      }
      this.emit('changeGroup', group, before);
    }
    return this.checkTransactionEnd();
  };

  Graph.prototype.addNode = function(id, component, metadata) {
    var node;
    this.checkTransactionStart();
    if (!metadata) {
      metadata = {};
    }
    node = {
      id: id,
      component: component,
      metadata: metadata
    };
    this.nodes.push(node);
    this.emit('addNode', node);
    this.checkTransactionEnd();
    return node;
  };

  Graph.prototype.removeNode = function(id) {
    var edge, exported, group, index, initializer, node, priv, pub, toRemove, _i, _j, _k, _l, _len, _len1, _len2, _len3, _len4, _len5, _len6, _len7, _len8, _m, _n, _o, _p, _q, _ref, _ref1, _ref2, _ref3, _ref4, _ref5;
    node = this.getNode(id);
    if (!node) {
      return;
    }
    this.checkTransactionStart();
    toRemove = [];
    _ref = this.edges;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      edge = _ref[_i];
      if ((edge.from.node === node.id) || (edge.to.node === node.id)) {
        toRemove.push(edge);
      }
    }
    for (_j = 0, _len1 = toRemove.length; _j < _len1; _j++) {
      edge = toRemove[_j];
      this.removeEdge(edge.from.node, edge.from.port, edge.to.node, edge.to.port);
    }
    toRemove = [];
    _ref1 = this.initializers;
    for (_k = 0, _len2 = _ref1.length; _k < _len2; _k++) {
      initializer = _ref1[_k];
      if (initializer.to.node === node.id) {
        toRemove.push(initializer);
      }
    }
    for (_l = 0, _len3 = toRemove.length; _l < _len3; _l++) {
      initializer = toRemove[_l];
      this.removeInitial(initializer.to.node, initializer.to.port);
    }
    toRemove = [];
    _ref2 = this.exports;
    for (_m = 0, _len4 = _ref2.length; _m < _len4; _m++) {
      exported = _ref2[_m];
      if (this.getPortName(id) === exported.process) {
        toRemove.push(exported);
      }
    }
    for (_n = 0, _len5 = toRemove.length; _n < _len5; _n++) {
      exported = toRemove[_n];
      this.removeExport(exported["public"]);
    }
    toRemove = [];
    _ref3 = this.inports;
    for (pub in _ref3) {
      priv = _ref3[pub];
      if (priv.process === id) {
        toRemove.push(pub);
      }
    }
    for (_o = 0, _len6 = toRemove.length; _o < _len6; _o++) {
      pub = toRemove[_o];
      this.removeInport(pub);
    }
    toRemove = [];
    _ref4 = this.outports;
    for (pub in _ref4) {
      priv = _ref4[pub];
      if (priv.process === id) {
        toRemove.push(pub);
      }
    }
    for (_p = 0, _len7 = toRemove.length; _p < _len7; _p++) {
      pub = toRemove[_p];
      this.removeOutport(pub);
    }
    _ref5 = this.groups;
    for (_q = 0, _len8 = _ref5.length; _q < _len8; _q++) {
      group = _ref5[_q];
      if (!group) {
        continue;
      }
      index = group.nodes.indexOf(id);
      if (index === -1) {
        continue;
      }
      group.nodes.splice(index, 1);
    }
    this.setNodeMetadata(id, {});
    if (-1 !== this.nodes.indexOf(node)) {
      this.nodes.splice(this.nodes.indexOf(node), 1);
    }
    this.emit('removeNode', node);
    return this.checkTransactionEnd();
  };

  Graph.prototype.getNode = function(id) {
    var i = this.nodes.length, node;
    while(node = this.nodes[--i]) {
      if (this.nodes[i].id === id) {
        return this.nodes[i];
      }
    }
    return null;
  };

  Graph.prototype.renameNode = function(oldId, newId) {
    var edge, exported, group, iip, index, node, priv, pub, _i, _j, _k, _l, _len, _len1, _len2, _len3, _ref, _ref1, _ref2, _ref3, _ref4, _ref5;
    this.checkTransactionStart();
    node = this.getNode(oldId);
    if (!node) {
      return;
    }
    node.id = newId;
    _ref = this.edges;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      edge = _ref[_i];
      if (!edge) {
        continue;
      }
      if (edge.from.node === oldId) {
        edge.from.node = newId;
      }
      if (edge.to.node === oldId) {
        edge.to.node = newId;
      }
    }
    _ref1 = this.initializers;
    for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
      iip = _ref1[_j];
      if (!iip) {
        continue;
      }
      if (iip.to.node === oldId) {
        iip.to.node = newId;
      }
    }
    _ref2 = this.inports;
    for (pub in _ref2) {
      priv = _ref2[pub];
      if (priv.process === oldId) {
        priv.process = newId;
      }
    }
    _ref3 = this.outports;
    for (pub in _ref3) {
      priv = _ref3[pub];
      if (priv.process === oldId) {
        priv.process = newId;
      }
    }
    _ref4 = this.exports;
    for (_k = 0, _len2 = _ref4.length; _k < _len2; _k++) {
      exported = _ref4[_k];
      if (exported.process === oldId) {
        exported.process = newId;
      }
    }
    _ref5 = this.groups;
    for (_l = 0, _len3 = _ref5.length; _l < _len3; _l++) {
      group = _ref5[_l];
      if (!group) {
        continue;
      }
      index = group.nodes.indexOf(oldId);
      if (index === -1) {
        continue;
      }
      group.nodes[index] = newId;
    }
    this.emit('renameNode', oldId, newId);
    return this.checkTransactionEnd();
  };

  Graph.prototype.setNodeMetadata = function(id, metadata) {
    var before, item, node, val;
    node = this.getNode(id);
    if (!node) {
      return;
    }
    this.checkTransactionStart();
    before = clone(node.metadata);
    if (!node.metadata) {
      node.metadata = {};
    }
    for (item in metadata) {
      val = metadata[item];
      if (val != null) {
        node.metadata[item] = val;
      } else {
        delete node.metadata[item];
      }
    }
    this.emit('changeNode', node, before);
    return this.checkTransactionEnd();
  };

  Graph.prototype.addEdge = function(outNode, outPort, inNode, inPort, metadata) {
    var edge;
    
    metadata = metadata || {};

    outPort = this.getPortName(outPort);
    inPort = this.getPortName(inPort);

    var edge = this.edges.find(function(edge) {
      return edge.from.node === outNode && edge.from.port === outPort &&
             edge.to.node === inNode && edge.to.port === inPort;
    });
    if (edge) { return; } // Edge already exists

    this.checkTransactionStart();
    edge = {
      from: {
        node: outNode,
        port: outPort
      },
      to: {
        node: inNode,
        port: inPort
      },
      metadata: metadata
    };
    this.edges.push(edge);
    this.emit('addEdge', edge);
    this.checkTransactionEnd();
    return edge;
  };

  Graph.prototype.addEdgeIndex = function(outNode, outPort, outIndex, inNode, inPort, inIndex, metadata) {
    var edge;
    if (metadata == null) {
      metadata = {};
    }
    if (!this.getNode(outNode)) {
      return;
    }
    if (!this.getNode(inNode)) {
      return;
    }
    outPort = this.getPortName(outPort);
    inPort = this.getPortName(inPort);
    if (inIndex === null) {
      inIndex = void 0;
    }
    if (outIndex === null) {
      outIndex = void 0;
    }
    if (!metadata) {
      metadata = {};
    }
    this.checkTransactionStart();
    edge = {
      from: {
        node: outNode,
        port: outPort,
        index: outIndex
      },
      to: {
        node: inNode,
        port: inPort,
        index: inIndex
      },
      metadata: metadata
    };
    this.edges.push(edge);
    this.emit('addEdge', edge);
    this.checkTransactionEnd();
    return edge;
  };

  Graph.prototype.removeEdge = function(node, port, node2, port2) {
    var edge, index, toKeep, toRemove, _i, _j, _k, _len, _len1, _len2, _ref, _ref1;
    this.checkTransactionStart();
    port = this.getPortName(port);
    port2 = this.getPortName(port2);
    toRemove = [];
    toKeep = [];
    if (node2 && port2) {
      _ref = this.edges;
      for (index = _i = 0, _len = _ref.length; _i < _len; index = ++_i) {
        edge = _ref[index];
        if (edge.from.node === node && edge.from.port === port && edge.to.node === node2 && edge.to.port === port2) {
          this.setEdgeMetadata(edge.from.node, edge.from.port, edge.to.node, edge.to.port, {});
          toRemove.push(edge);
        } else {
          toKeep.push(edge);
        }
      }
    } else {
      _ref1 = this.edges;
      for (index = _j = 0, _len1 = _ref1.length; _j < _len1; index = ++_j) {
        edge = _ref1[index];
        if ((edge.from.node === node && edge.from.port === port) || (edge.to.node === node && edge.to.port === port)) {
          this.setEdgeMetadata(edge.from.node, edge.from.port, edge.to.node, edge.to.port, {});
          toRemove.push(edge);
        } else {
          toKeep.push(edge);
        }
      }
    }
    this.edges = toKeep;
    for (_k = 0, _len2 = toRemove.length; _k < _len2; _k++) {
      edge = toRemove[_k];
      this.emit('removeEdge', edge);
    }
    return this.checkTransactionEnd();
  };

  Graph.prototype.getEdge = function(node, port, node2, port2) {
    var edge, index, _i, _len, _ref;
    port = this.getPortName(port);
    port2 = this.getPortName(port2);
    _ref = this.edges;
    for (index = _i = 0, _len = _ref.length; _i < _len; index = ++_i) {
      edge = _ref[index];
      if (!edge) {
        continue;
      }
      if (edge.from.node === node && edge.from.port === port) {
        if (edge.to.node === node2 && edge.to.port === port2) {
          return edge;
        }
      }
    }
    return null;
  };

  Graph.prototype.setEdgeMetadata = function(node, port, node2, port2, metadata) {
    var before, edge, item, val;
    edge = this.getEdge(node, port, node2, port2);
    if (!edge) {
      return;
    }
    this.checkTransactionStart();
    before = clone(edge.metadata);
    if (!edge.metadata) {
      edge.metadata = {};
    }
    for (item in metadata) {
      val = metadata[item];
      if (val != null) {
        edge.metadata[item] = val;
      } else {
        delete edge.metadata[item];
      }
    }
    this.emit('changeEdge', edge, before);
    return this.checkTransactionEnd();
  };

  Graph.prototype.addInitial = function(data, node, port, metadata) {
    var initializer;
    if (!this.getNode(node)) {
      return;
    }
    port = this.getPortName(port);
    this.checkTransactionStart();
    initializer = {
      from: {
        data: data
      },
      to: {
        node: node,
        port: port
      },
      metadata: metadata
    };
    this.initializers.push(initializer);
    this.emit('addInitial', initializer);
    this.checkTransactionEnd();
    return initializer;
  };

  Graph.prototype.addInitialIndex = function(data, node, port, index, metadata) {
    var initializer;
    if (!this.getNode(node)) {
      return;
    }
    if (index === null) {
      index = void 0;
    }
    port = this.getPortName(port);
    this.checkTransactionStart();
    initializer = {
      from: {
        data: data
      },
      to: {
        node: node,
        port: port,
        index: index
      },
      metadata: metadata
    };
    this.initializers.push(initializer);
    this.emit('addInitial', initializer);
    this.checkTransactionEnd();
    return initializer;
  };

  Graph.prototype.addGraphInitial = function(data, node, metadata) {
    var inport;
    inport = this.inports[node];
    if (!inport) {
      return;
    }
    return this.addInitial(data, inport.process, inport.port, metadata);
  };

  Graph.prototype.addGraphInitialIndex = function(data, node, index, metadata) {
    var inport;
    inport = this.inports[node];
    if (!inport) {
      return;
    }
    return this.addInitialIndex(data, inport.process, inport.port, index, metadata);
  };

  Graph.prototype.removeInitial = function(node, port) {
    var edge, index, toKeep, toRemove, _i, _j, _len, _len1, _ref;
    port = this.getPortName(port);
    this.checkTransactionStart();
    toRemove = [];
    toKeep = [];
    _ref = this.initializers;
    for (index = _i = 0, _len = _ref.length; _i < _len; index = ++_i) {
      edge = _ref[index];
      if (edge.to.node === node && edge.to.port === port) {
        toRemove.push(edge);
      } else {
        toKeep.push(edge);
      }
    }
    this.initializers = toKeep;
    for (_j = 0, _len1 = toRemove.length; _j < _len1; _j++) {
      edge = toRemove[_j];
      this.emit('removeInitial', edge);
    }
    return this.checkTransactionEnd();
  };

  Graph.prototype.removeGraphInitial = function(node) {
    var inport;
    inport = this.inports[node];
    if (!inport) {
      return;
    }
    return this.removeInitial(inport.process, inport.port);
  };

  function clone (target) {
    if (typeof Object.assign === 'function') {
      return Object.assign.apply(Object, arguments);
    }

    var i; source, key;

    if (target === null) {
      throw TypeError('Cannot convert undefined or null to object');
    }

    target = Object(target);
    for (i = 1; i < arguments.length; i++) {
      source = arguments[i];
      if (source != null) {
        for (key in source) {
          if (Object.prototype.hasOwnProperty.call(source, key)) {
            target[key] = source[key];
          }
        }
      }
    }
  }

  context.Graph = Graph;

  context.createGraph = function(name, options) {
    return new Graph(name, options);
  }
})(this);