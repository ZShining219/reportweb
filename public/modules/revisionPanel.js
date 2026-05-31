export function createRevisionViewModel({ currentRevision = null, revisions = [] } = {}) {
  const items = [
    {
      id: 'base',
      revisionId: null,
      label: 'base',
      summary: '基础版本',
      createdAt: '',
      parentRevision: null,
      active: currentRevision === null
    },
    ...revisions.map((revision) => ({
      id: revision.id,
      revisionId: revision.id,
      label: revision.id,
      summary: revision.summary || '',
      createdAt: revision.created_at || revision.createdAt || '',
      parentRevision: revision.parent_revision ?? revision.parentRevision ?? null,
      active: currentRevision === revision.id
    }))
  ];

  return { currentRevision, items };
}

export function renderRevisionPanel(container, model, { onSelectRevision } = {}) {
  const doc = container.ownerDocument || document;
  const root = doc.createElement('section');
  root.className = 'revision-panel ui-panel';

  const title = doc.createElement('h2');
  title.textContent = 'Revision Timeline';
  root.append(title);

  const list = doc.createElement('ol');
  list.className = 'revision-panel__list ui-list';

  for (const item of model.items) {
    const listItem = doc.createElement('li');
    listItem.className = item.active
      ? 'revision-panel__item revision-panel__item--active ui-list-item'
      : 'revision-panel__item ui-list-item';

    const button = doc.createElement('button');
    button.type = 'button';
    button.className = item.active
      ? 'revision-panel__button revision-panel__button--active ui-button ui-button-primary'
      : 'revision-panel__button ui-button ui-button-ghost';
    button.dataset.revisionId = item.revisionId ?? 'base';
    button.textContent = item.label;
    button.addEventListener('click', () => {
      onSelectRevision?.(item.revisionId);
    });

    listItem.append(button);

    if (item.summary) {
      const summary = doc.createElement('p');
      summary.className = 'revision-panel__summary';
      summary.textContent = item.summary;
      listItem.append(summary);
    }

    if (item.createdAt) {
      const createdAt = doc.createElement('time');
      createdAt.className = 'revision-panel__time';
      createdAt.dateTime = item.createdAt;
      createdAt.textContent = item.createdAt;
      listItem.append(createdAt);
    }

    list.append(listItem);
  }

  root.append(list);
  container.replaceChildren(root);
}
