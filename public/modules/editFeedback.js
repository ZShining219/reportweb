const INTENT_LABELS = {
  hover: '可选择组件',
  text: '编辑文本',
  move: '移动组件',
  resize: '调整尺寸',
  select: '选择组件'
};

export function createEditFeedbackModel({ mode, intent, component, delta, size, dirty = false } = {}) {
  if (mode !== 'edit' || !component || !intent) {
    return { active: false };
  }

  const classNames = ['edit-feedback', `edit-feedback--${intent}`];
  if (dirty) {
    classNames.push('edit-feedback--dirty');
  }

  return {
    active: true,
    componentId: component.id,
    intent,
    label: intentLabel(intent),
    className: classNames.join(' '),
    detail: feedbackDetail({ intent, component, delta, size, dirty })
  };
}

export function renderEditFeedback(container, model) {
  if (!container) {
    return;
  }

  container.querySelectorAll('.edit-feedback').forEach((node) => node.remove());
  if (!model?.active) {
    return;
  }

  const feedback = document.createElement('div');
  feedback.className = model.className;
  feedback.dataset.intent = model.intent;
  feedback.dataset.componentId = model.componentId || '';

  const label = document.createElement('strong');
  label.textContent = model.label;
  feedback.append(label);

  if (model.detail) {
    const detail = document.createElement('span');
    detail.textContent = model.detail;
    feedback.append(detail);
  }

  container.append(feedback);
}

function intentLabel(intent) {
  return INTENT_LABELS[intent] || '编辑组件';
}

function feedbackDetail({ intent, component, delta, size, dirty }) {
  if (intent === 'text') {
    return dirty ? '修改后将保存为 patch revision' : '点击后直接修改文字内容';
  }

  if (intent === 'move') {
    const dx = delta?.x ?? 0;
    const dy = delta?.y ?? 0;
    const x = (component.x ?? 0) + dx;
    const y = (component.y ?? 0) + dy;
    return `x: ${x}, y: ${y}, 位移 ${signed(dx)}, ${signed(dy)}`;
  }

  if (intent === 'resize') {
    const width = size?.width ?? component.width ?? 0;
    const height = size?.height ?? component.height ?? 0;
    return `尺寸 ${width} x ${height}`;
  }

  if (intent === 'select') {
    return `${component.type || 'component'} #${component.id}`;
  }

  if (intent === 'hover') {
    return `${component.type || 'component'} #${component.id}`;
  }

  return '松手后应用当前操作结果';
}

function signed(value) {
  return value > 0 ? `+${value}` : String(value);
}
