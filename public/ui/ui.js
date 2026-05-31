export function createStatusTag(label, variant = 'neutral') {
  const node = document.createElement('span');
  node.className = `ui-status ui-status--${variant}`;
  node.textContent = label;
  return node;
}

export function createDefinitionRow(term, value) {
  const row = document.createElement('div');
  const dt = document.createElement('dt');
  const dd = document.createElement('dd');
  dt.textContent = term;
  dd.textContent = value || '-';
  row.append(dt, dd);
  return row;
}
