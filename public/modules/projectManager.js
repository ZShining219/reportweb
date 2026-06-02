export function createProjectManagerViewModel({
  projects = [],
  activeReportId = '',
  selectedProjectId = '',
  status = 'ready',
  errorMessage = ''
} = {}) {
  const baseProjects = projects.map((payload) => {
    const reportId = payload.reportId || payload.report?.id || '';
    const currentRevision = payload.patch?.current_revision || null;
    const revisions = payload.patch?.revisions || [];
    const nodes = payload.state?.story_tree?.nodes || [];
    const pages = payload.state?.pages || [];

    return {
      reportId,
      title: payload.state?.report?.title || payload.report?.title || reportId || '未命名汇报',
      currentRevision,
      revisionLabel: currentRevision || '基础版本',
      revisionCount: revisions.length,
      nodeCount: nodes.length,
      pageCount: pages.length,
      active: Boolean(activeReportId && reportId === activeReportId)
    };
  });
  const selectedProjectCandidate = baseProjects.find((project) => selectedProjectId && project.reportId === selectedProjectId)
    || baseProjects.find((project) => project.active)
    || baseProjects[0]
    || null;
  const effectiveSelectedProjectId = selectedProjectCandidate?.reportId || selectedProjectId;
  const normalizedProjects = baseProjects.map((project) => ({
    ...project,
    selected: Boolean(effectiveSelectedProjectId && project.reportId === effectiveSelectedProjectId)
  }));
  const selectedProject = normalizedProjects.find((project) => project.selected)
    || null;

  return {
    status,
    errorMessage,
    activeReportId,
    selectedProjectId: effectiveSelectedProjectId,
    selectedProject,
    empty: status === 'ready' && normalizedProjects.length === 0,
    projects: normalizedProjects
  };
}

export function renderProjectBoard(container, model, { onEnterProject } = {}) {
  const root = document.createElement('section');
  root.className = 'project-board';
  root.setAttribute('aria-label', '项目看板');

  root.append(projectHeader('项目看板', projectSummary(model)));

  if (appendProjectState(root, model)) {
    container.replaceChildren(root);
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'project-board__grid';

  for (const project of model.projects) {
    const card = document.createElement('article');
    card.className = [
      'project-board-card',
      project.active ? 'project-board-card--active' : '',
      project.selected ? 'project-board-card--selected' : ''
    ].filter(Boolean).join(' ');
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('data-report-id', project.reportId);
    card.setAttribute('aria-current', project.active ? 'page' : 'false');
    card.setAttribute('aria-selected', project.selected ? 'true' : 'false');
    card.addEventListener('click', () => onEnterProject?.(project.reportId));
    card.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault?.();
      onEnterProject?.(project.reportId);
    });

    const enterButton = document.createElement('button');
    enterButton.type = 'button';
    enterButton.className = 'project-board-card__enter';
    enterButton.textContent = '进入汇报';
    enterButton.addEventListener('click', (event) => {
      event.stopPropagation?.();
      onEnterProject?.(project.reportId);
    });

    card.append(
      textNode('span', 'project-board-card__title', project.title),
      textNode('span', 'project-board-card__id', project.reportId),
      projectMetrics(project),
      enterButton
    );
    grid.append(card);
  }

  root.append(grid);
  container.replaceChildren(root);
}

export function renderProjectList(container, model, { onSelectProject } = {}) {
  const root = document.createElement('section');
  root.className = 'project-list-panel';
  root.setAttribute('aria-label', '项目列表');
  root.append(projectHeader('项目', `${model.projects.length} 个项目`));

  if (appendProjectState(root, model)) {
    container.replaceChildren(root);
    return;
  }

  const list = document.createElement('div');
  list.className = 'project-list-panel__items';

  for (const project of model.projects) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = project.selected ? 'project-list-item project-list-item--selected' : 'project-list-item';
    button.setAttribute('data-report-id', project.reportId);
    button.setAttribute('aria-selected', project.selected ? 'true' : 'false');
    button.setAttribute('aria-current', project.active ? 'page' : 'false');
    button.addEventListener('click', () => onSelectProject?.(project.reportId));
    button.append(
      textNode('span', 'project-list-item__title', project.title),
      textNode('span', 'project-list-item__meta', project.revisionLabel)
    );
    list.append(button);
  }

  root.append(list);
  container.replaceChildren(root);
}

export function renderProjectDetails(container, model, { onEnterProject } = {}) {
  const root = document.createElement('section');
  root.className = 'project-details';
  root.setAttribute('aria-label', '项目详情');
  root.append(projectHeader('项目详情', model.selectedProject ? '当前选中项目' : '未选择项目'));

  if (appendProjectState(root, model)) {
    container.replaceChildren(root);
    return;
  }

  const project = model.selectedProject;
  if (!project) {
    root.append(textNode('p', 'project-manager__state', '未选择项目'));
    container.replaceChildren(root);
    return;
  }

  const title = document.createElement('h2');
  title.className = 'project-details__title';
  title.textContent = project.title;

  const meta = document.createElement('dl');
  meta.className = 'project-details__meta ui-meta-grid';
  meta.append(
    definitionRow('report_id', project.reportId),
    definitionRow('当前 revision', project.revisionLabel),
    definitionRow('revision 数量', String(project.revisionCount)),
    definitionRow('节点数量', String(project.nodeCount)),
    definitionRow('页面数量', String(project.pageCount)),
    definitionRow('版本状态', project.currentRevision ? '已保存 revision' : '基础版本')
  );

  const enterButton = document.createElement('button');
  enterButton.type = 'button';
  enterButton.className = 'project-details__enter primary';
  enterButton.textContent = '进入汇报';
  enterButton.addEventListener('click', () => onEnterProject?.(project.reportId));

  root.append(title, meta, enterButton);
  container.replaceChildren(root);
}

function textNode(tagName, className, text) {
  const node = document.createElement(tagName);
  node.className = className;
  node.textContent = text;
  return node;
}

function projectHeader(title, meta) {
  const header = document.createElement('header');
  header.className = 'project-manager__header';
  header.append(
    textNode('p', 'project-manager__eyebrow eyebrow', meta),
    textNode('h2', 'project-manager__title', title)
  );
  return header;
}

function appendProjectState(root, model) {
  if (model.status === 'loading') {
    root.append(textNode('p', 'project-manager__state', '正在载入项目'));
    return true;
  }

  if (model.status === 'error' && !model.projects.length) {
    root.append(textNode('p', 'project-manager__state project-manager__state--error', model.errorMessage || '项目列表载入失败'));
    return true;
  }

  if (model.empty) {
    root.append(textNode('p', 'project-manager__state', '暂无可用项目'));
    return true;
  }

  if (model.errorMessage) {
    root.append(textNode('p', 'project-manager__state project-manager__state--error', model.errorMessage));
  }

  return false;
}

function projectSummary(model) {
  if (model.status === 'loading') return '正在载入';
  if (model.status === 'error' && !model.projects.length) return '载入失败';
  return `${model.projects.length} 个项目`;
}

function projectMetrics(project) {
  const metrics = document.createElement('dl');
  metrics.className = 'project-board-card__metrics';
  metrics.append(
    definitionRow('revision', project.revisionLabel),
    definitionRow('节点', String(project.nodeCount)),
    definitionRow('页面', String(project.pageCount))
  );
  return metrics;
}

function definitionRow(term, value) {
  const row = document.createElement('div');
  const dt = document.createElement('dt');
  const dd = document.createElement('dd');
  dt.textContent = term;
  dd.textContent = value || '-';
  row.append(dt, dd);
  return row;
}
