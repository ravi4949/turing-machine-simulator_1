/**
 * visualizer.js - D3.js State Diagram Renderer
 */

var _svg = null;
var _simulation = null;
var _zoomBehavior = null;
var _graphDef = null;
var _nodeMap = {};

var STATE_COLORS = {
  start:  { fill: '#0a2a2a', stroke: '#00e5ff' },
  normal: { fill: '#1e2535', stroke: '#2d3a52' },
  accept: { fill: '#0a2a1a', stroke: '#00ff88' },
  reject: { fill: '#2a0a10', stroke: '#ff4466' },
};
var ACTIVE_FILL   = '#2a2200';
var ACTIVE_STROKE = '#ffcc00';

function drawGraph(containerId, graphDef) {
  _graphDef = graphDef;

  var container = document.getElementById(containerId);
  if (!container) { console.error('Graph container not found:', containerId); return; }

  container.innerHTML = '';

  var W = container.offsetWidth  || 380;
  var H = container.offsetHeight || 400;
  if (W < 100) W = 380;
  if (H < 100) H = 400;

  _svg = d3.select('#' + containerId)
    .append('svg')
    .attr('width',  W)
    .attr('height', H)
    .style('background', 'transparent')
    .style('display', 'block');

  var defs = _svg.append('defs');

  function makeArrow(id, color) {
    defs.append('marker')
      .attr('id',           id)
      .attr('viewBox',      '0 0 10 10')
      .attr('refX',         9)
      .attr('refY',         5)
      .attr('markerWidth',  7)
      .attr('markerHeight', 7)
      .attr('orient',       'auto')
      .append('path')
      .attr('d',    'M 0 0 L 10 5 L 0 10 z')
      .attr('fill', color);
  }

  makeArrow('arrow-normal', '#4a5a7a');
  makeArrow('arrow-accept', '#00ff88');
  makeArrow('arrow-reject', '#ff4466');
  makeArrow('arrow-active', '#ffcc00');

  var g = _svg.append('g').attr('class', 'zoom-layer');

  _zoomBehavior = d3.zoom()
    .scaleExtent([0.2, 3])
    .on('zoom', function(event) {
      g.attr('transform', event.transform);
    });
  _svg.call(_zoomBehavior);

  // ── Build nodes ──────────────────────────────────────
  var count  = graphDef.states.length;
  var radius = Math.min(W, H) * 0.32;
  var cx     = W / 2;
  var cy     = H / 2;

  var nodes = graphDef.states.map(function(s, i) {
    var angle = (i / count) * 2 * Math.PI - Math.PI / 2;
    return {
      id:    s.id,
      label: s.label || s.id,
      type:  s.type,
      x:     cx + radius * Math.cos(angle),
      y:     cy + radius * Math.sin(angle),
    };
  });

  _nodeMap = {};
  nodes.forEach(function(n) { _nodeMap[n.id] = n; });

  // ── Build edges ───────────────────────────────────────
  var edgeMap = {};
  graphDef.transitions.forEach(function(t) {
    var key = t.from + '__' + t.to;
    if (!edgeMap[key]) edgeMap[key] = { from: t.from, to: t.to, labels: [] };
    edgeMap[key].labels.push(t.label);
  });
  var edges = Object.values(edgeMap);

  // Check which edges are bidirectional
  edges.forEach(function(e) {
    var reverse = e.to + '__' + e.from;
    e.curved = (e.from !== e.to) && !!edgeMap[reverse];
  });

  // ── Draw edges ────────────────────────────────────────
  var edgeGroup = g.append('g').attr('class', 'edge-layer');

  var edgeSel = edgeGroup.selectAll('.edge')
    .data(edges)
    .enter()
    .append('g')
    .attr('class', 'edge');

  var paths = edgeSel.append('path')
    .attr('fill',         'none')
    .attr('stroke',       function(d) { return edgeColor(d); })
    .attr('stroke-width', 1.5)
    .attr('marker-end',   function(d) { return 'url(#' + arrowId(d) + ')'; });

  var labels = edgeSel.append('text')
    .attr('fill',        '#8899b0')
    .attr('font-family', 'Space Mono, monospace')
    .attr('font-size',   '9px')
    .attr('text-anchor', 'middle')
    .text(function(d) { return d.labels.join(' | '); });

  // ── Draw nodes ────────────────────────────────────────
  var nodeGroup = g.append('g').attr('class', 'node-layer');

  var nodeSel = nodeGroup.selectAll('.node')
    .data(nodes)
    .enter()
    .append('g')
    .attr('class', 'node')
    .attr('id',    function(d) { return 'state-node-' + d.id; })
    .style('cursor', 'grab')
    .call(
      d3.drag()
        .on('start', function(event, d) {
          d.fx = d.x; d.fy = d.y;
          if (_simulation) _simulation.alphaTarget(0.3).restart();
        })
        .on('drag', function(event, d) {
          d.fx = event.x; d.fy = event.y;
        })
        .on('end', function(event, d) {
          d.fx = null; d.fy = null;
          if (_simulation) _simulation.alphaTarget(0);
        })
    );

  // Double ring for accept state
  nodeSel.filter(function(d) { return d.type === 'accept'; })
    .append('circle')
    .attr('r',            30)
    .attr('fill',         'none')
    .attr('stroke',       '#00ff88')
    .attr('stroke-width', 1)
    .attr('opacity',      0.5);

  nodeSel.append('circle')
    .attr('class',        'state-circle')
    .attr('r',            24)
    .attr('fill',         function(d) { return (STATE_COLORS[d.type] || STATE_COLORS.normal).fill; })
    .attr('stroke',       function(d) { return (STATE_COLORS[d.type] || STATE_COLORS.normal).stroke; })
    .attr('stroke-width', 2);

  nodeSel.append('text')
    .attr('text-anchor',       'middle')
    .attr('dominant-baseline', 'central')
    .attr('fill',              '#e2e8f0')
    .attr('font-family',       'Space Mono, monospace')
    .attr('font-size',         '11px')
    .attr('font-weight',       'bold')
    .attr('pointer-events',    'none')
    .text(function(d) { return d.label; });

  // Start arrow
  var startNode = _nodeMap[graphDef.startState];
  var startArrow = g.append('line')
    .attr('id',           'start-arrow-line')
    .attr('stroke',       '#00e5ff')
    .attr('stroke-width', 2)
    .attr('marker-end',   'url(#arrow-normal)');

  // ── Force simulation ──────────────────────────────────
  var linkData = edges
    .filter(function(e) { return e.from !== e.to; })
    .map(function(e) {
      return {
        source: _nodeMap[e.from],
        target: _nodeMap[e.to]
      };
    });

  _simulation = d3.forceSimulation(nodes)
    .force('link',    d3.forceLink(linkData).distance(130).strength(0.2))
    .force('charge',  d3.forceManyBody().strength(-350))
    .force('center',  d3.forceCenter(W / 2, H / 2))
    .force('collide', d3.forceCollide(55))
    .on('tick', function() {
      // Update edge paths
      paths.attr('d', function(d) {
        var s = _nodeMap[d.from];
        var t = _nodeMap[d.to];
        if (!s || !t) return '';
        if (d.from === d.to) return selfLoop(s);
        if (d.curved)        return curvedPath(s, t, 35);
        return straightPath(s, t);
      });

      // Update edge label positions
      labels.attr('x', function(d) {
        var s = _nodeMap[d.from];
        var t = _nodeMap[d.to];
        if (!s || !t) return 0;
        if (d.from === d.to) return s.x + 52;
        var mx = (s.x + t.x) / 2;
        if (d.curved) {
          var dx = t.x - s.x, dy = t.y - s.y;
          var len = Math.sqrt(dx*dx + dy*dy) || 1;
          return mx - (dy / len) * 35;
        }
        return mx;
      }).attr('y', function(d) {
        var s = _nodeMap[d.from];
        var t = _nodeMap[d.to];
        if (!s || !t) return 0;
        if (d.from === d.to) return s.y - 52;
        var my = (s.y + t.y) / 2;
        if (d.curved) {
          var dx = t.x - s.x, dy = t.y - s.y;
          var len = Math.sqrt(dx*dx + dy*dy) || 1;
          return my + (dx / len) * 35;
        }
        return my - 6;
      });

      // Update node positions
      nodeSel.attr('transform', function(d) {
        return 'translate(' + d.x + ',' + d.y + ')';
      });

      // Update start arrow
      if (startNode) {
        startArrow
          .attr('x1', startNode.x - 55)
          .attr('y1', startNode.y)
          .attr('x2', startNode.x - 26)
          .attr('y2', startNode.y);
      }
    });
}

// ── Highlight active state ────────────────────────────────────
function highlightState(stateId) {
  if (!_svg) return;

  _svg.selectAll('.state-circle')
    .attr('fill', function(d) {
      return (STATE_COLORS[d.type] || STATE_COLORS.normal).fill;
    })
    .attr('stroke', function(d) {
      return (STATE_COLORS[d.type] || STATE_COLORS.normal).stroke;
    })
    .attr('stroke-width', 2);

  if (!stateId) return;

  var nodeEl = document.getElementById('state-node-' + stateId);
  if (!nodeEl) return;

  d3.select('#state-node-' + stateId).select('.state-circle')
    .attr('fill',         ACTIVE_FILL)
    .attr('stroke',       ACTIVE_STROKE)
    .attr('stroke-width', 3);
}

// ── Zoom controls ─────────────────────────────────────────────
function zoomIn() {
  if (_svg && _zoomBehavior)
    _svg.transition().duration(300).call(_zoomBehavior.scaleBy, 1.4);
}
function zoomOut() {
  if (_svg && _zoomBehavior)
    _svg.transition().duration(300).call(_zoomBehavior.scaleBy, 0.7);
}
function resetZoom() {
  if (_svg && _zoomBehavior)
    _svg.transition().duration(300).call(_zoomBehavior.transform, d3.zoomIdentity);
}

// ── Path helpers ──────────────────────────────────────────────
function selfLoop(node) {
  var x = node.x, y = node.y;
  return 'M ' + (x+16) + ' ' + (y-18) +
         ' C ' + (x+50) + ' ' + (y-60) + ' ' +
                 (x-10) + ' ' + (y-60) + ' ' +
                 (x-16) + ' ' + (y-18);
}

function straightPath(s, t) {
  var dx  = t.x - s.x;
  var dy  = t.y - s.y;
  var len = Math.sqrt(dx*dx + dy*dy) || 1;
  var sx  = s.x + (dx/len)*26;
  var sy  = s.y + (dy/len)*26;
  var tx  = t.x - (dx/len)*26;
  var ty  = t.y - (dy/len)*26;
  return 'M ' + sx + ' ' + sy + ' L ' + tx + ' ' + ty;
}

function curvedPath(s, t, bend) {
  var dx  = t.x - s.x;
  var dy  = t.y - s.y;
  var len = Math.sqrt(dx*dx + dy*dy) || 1;
  var mx  = (s.x + t.x) / 2 - (dy/len)*bend;
  var my  = (s.y + t.y) / 2 + (dx/len)*bend;
  var sx  = s.x + (dx/len)*26;
  var sy  = s.y + (dy/len)*26;
  var tx  = t.x - (dx/len)*26;
  var ty  = t.y - (dy/len)*26;
  return 'M ' + sx + ' ' + sy +
         ' Q ' + mx + ' ' + my +
         ' '   + tx + ' ' + ty;
}

function edgeColor(edge) {
  if (!_graphDef) return '#4a5a7a';
  if (edge.to === _graphDef.acceptState) return '#00ff88';
  if (edge.to === _graphDef.rejectState) return '#ff4466';
  return '#4a5a7a';
}

function arrowId(edge) {
  if (!_graphDef) return 'arrow-normal';
  if (edge.to === _graphDef.acceptState) return 'arrow-accept';
  if (edge.to === _graphDef.rejectState) return 'arrow-reject';
  return 'arrow-normal';
}

// ── Expose globally ───────────────────────────────────────────
window.drawGraph      = drawGraph;
window.highlightState = highlightState;
window.zoomIn         = zoomIn;
window.zoomOut        = zoomOut;
window.resetZoom      = resetZoom;
