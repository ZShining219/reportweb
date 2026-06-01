export function createProjectManagerViewModel({
  projects = [],
  activeReportId = '',
  status = 'ready',
  errorMessage = ''
} = {}) {
  const normalizedProjects = projects.map((payload) => {
    const reportId = payload.reportId || payload.report?.id || '';
    const currentRevision = payload.patch?.current_revision || null;

    return {
      reportId,
      title: payload.state?.report?.title || payload.report?.title || reportId || '未命名汇报',
      currentRevision,
      revisionLabel: currentRevision || '基础版本',
      active: Boolean(activeReportId && reportId === activeReportId)
    };
  });

  return {
    status,
    errorMessage,
    activeReportId,
    empty: status === 'ready' && normalizedProjects.length === 0,
    projects: normalizedProjects
  };
}

export function renderProjectManager(container, model, { onSelectProject } = {}) {
  const root = document.createElement('section');
  root.className = 'project-manager';
  root.setAttribute('aria-label', '项目管理');

  const header = document.createElement('header');
  header.className = 'project-manager__header';
  header.append(
    textNode('p', 'project-manager__eyebrow eyebrow', 'ReportWebShow'),
    textNode('h2', 'project-manager__title', '项目管理')
  );
  root.append(header);

  if (model.status === 'loading') {
    root.append(textNode('p', 'project-manager__state', '正在载入项目'));
    container.replaceChildren(root);
    return;
  }

  if (model.status === 'error') {
    root.append(textNode('p', 'project-manager__state project-manager__state--error', model.errorMessage || '项目列表载入失败'));
    container.replaceChildren(root);
    return;
  }

  if (model.empty) {
    root.append(textNode('p', 'project-manager__state', '暂无可用项目'));
    container.replaceChildren(root);
    return;
  }

  const list = document.createElement('div');
  list.className = 'project-manager__list';

  for (const project of model.projects) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = project.active ? 'project-card project-card--active' : 'project-card';
    button.setAttribute('data-report-id', project.reportId);
    button.addEventListener('click', () => onSelectProject?.(project.reportId));

    const title = textNode('span', 'project-card__title', project.title);
    const reportId = textNode('span', 'project-card__id', project.reportId);
    const revision = textNode('span', 'project-card__revision', project.revisionLabel);
    button.append(title, reportId, revision);
    list.append(button);
  }

  root.append(list);
  container.replaceChildren(root);
}

function textNode(tagName, className, text) {
  const node = document.createElement(tagName);
  node.className = className;
  node.textContent = text;
  return node;
}
