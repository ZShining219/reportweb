import { getNodeGraph } from './nodeContext.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

export function renderNodeNavigator(container, { state, currentNodeId, onSelect }) {
  const model = createNodeNavigatorModel(getNodeGraph(state, currentNodeId));
  const svg = createSvg('svg', {
    viewBox: `0 0 ${model.bounds.width} ${model.bounds.height}`,
    preserveAspectRatio: 'xMidYMid meet',
    role: 'img',
    'aria-label': '树状节点导航图'
  });
  const linkLayer = createSvg('g', { class: 'node-navigator__links' });
  const nodeLayer = createSvg('g', { class: 'node-navigator__nodes' });
  const hitLayer = document.createElement('div');
  hitLayer.className = 'node-navigator__hits';

  for (const link of model.links) {
    const path = createSvg('path', {
      class: link.className,
      d: link.d
    });
    path.style.opacity = String(link.opacity);
    linkLayer.append(path);
  }

  for (const node of model.nodes) {
    const group = createSvg('g', {
      class: node.className,
      transform: `translate(${node.x} ${node.y})`,
      'data-node-id': node.id
    });
    group.dataset.nodeId = node.id;
    const circle = createSvg('circle', { r: node.radius });
    group.style.opacity = String(node.opacity);
    group.append(circle);
    nodeLayer.append(group);

    const hit = document.createElement('button');
    hit.type = 'button';
    hit.className = node.hitClassName;
    hit.dataset.nodeId = node.id;
    hit.dataset.nodeTitle = node.title;
    hit.dataset.nodeProximity = node.data.proximity || '';
    hit.dataset.nodeRegion = node.data.region || '';
    hit.dataset.nodeDepth = String(node.data.depth ?? '');
    hit.nodeData = node.data;
    hit.setAttribute('aria-label', `跳转到${node.title}`);
    hit.title = node.tooltip;
    hit.style.left = node.style.left;
    hit.style.top = node.style.top;
    hit.addEventListener('mouseenter', () => showNodeHover(group));
    hit.addEventListener('mouseleave', () => hideNodeHover(group));
    hit.addEventListener('focus', () => showNodeHover(group));
    hit.addEventListener('blur', () => hideNodeHover(group));
    hit.addEventListener('click', () => onSelect?.(node.id));
    hitLayer.append(hit);
  }

  svg.append(linkLayer, nodeLayer);
  container.replaceChildren(svg, hitLayer);
}

export function createNodeNavigatorModel(graph) {
  const bounds = graph.bounds || { width: 100, height: 100 };
  const nodesById = new Map((graph.nodes || []).map((node) => [node.id, node]));

  return {
    bounds,
    links: (graph.links || [])
      .map((link) => linkModel(link, nodesById))
      .filter(Boolean),
    nodes: (graph.nodes || []).map((node) => nodeModel(node, bounds))
  };
}

function linkModel(link, nodesById) {
  const from = nodesById.get(link.from);
  const to = nodesById.get(link.to);
  if (!from || !to) return null;

  const midpoint = from.x + (to.x - from.x) * 0.55;
  const isPath = from.isPath && to.isPath;
  return {
    className: `node-navigator__link${isPath ? ' node-navigator__link--path' : ''}`,
    d: `M ${from.x} ${from.y} C ${round(midpoint)} ${from.y}, ${round(midpoint)} ${to.y}, ${to.x} ${to.y}`,
    opacity: Math.min(from.opacity, to.opacity)
  };
}

function nodeModel(node, bounds) {
  const labelOnLeft = node.x > bounds.width * 0.6;
  const proximity = node.proximity || 'distant';
  return {
    id: node.id,
    title: node.title,
    x: node.x,
    y: node.y,
    opacity: node.opacity,
    radius: nodeRadius(proximity),
    className: `node-navigator__node node-navigator__node--${proximity}`,
    hitClassName: `node-navigator__hit node-navigator__hit--${proximity} node-navigator__hit--${labelOnLeft ? 'label-left' : 'label-right'}`,
    tooltip: node.title,
    data: { ...node },
    style: {
      left: `${round((node.x / bounds.width) * 100)}%`,
      top: `${round((node.y / bounds.height) * 100)}%`
    }
  };
}

function nodeRadius(proximity) {
  if (proximity === 'primary') return 4.68;
  if (proximity === 'secondary') return 3.6;
  return 1.8;
}

function showNodeHover(nodeGroup) {
  nodeGroup.classList.add('is-hovered');
}

function hideNodeHover(nodeGroup) {
  nodeGroup.classList.remove('is-hovered');
}

function createSvg(tagName, attributes = {}) {
  const node = document.createElementNS(SVG_NS, tagName);
  for (const [key, value] of Object.entries(attributes)) {
    node.setAttribute(key, String(value));
  }
  return node;
}

function round(value) {
  return Math.round(value * 100) / 100;
}
