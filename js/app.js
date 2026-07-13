(() => {
  const storageKey = 'piaBuilder.documents.v1';

  const form = document.getElementById('piaForm');
  const stepCards = [...document.querySelectorAll('.step-card')];
  const stepIndicatorItems = [...document.querySelectorAll('#stepIndicator li')];
  const stepTabButtons = [...document.querySelectorAll('.step-tab')];
  const prevStepButton = document.getElementById('prevStepButton');
  const nextStepButton = document.getElementById('nextStepButton');
  const saveButton = document.getElementById('saveButton');
  const importButton = document.getElementById('importButton');
  const importJsonInput = document.getElementById('importJsonInput');
  const confirmNewPiaButton = document.getElementById('confirmNewPiaButton');
  const savedPiasList = document.getElementById('savedPiasList');
  const savedPiasEmptyState = document.getElementById('savedPiasEmptyState');
  const openSavedPiasButton = document.getElementById('openSavedPiasButton');
  const exportMarkdownButton = document.getElementById('exportMarkdownButton');
  const exportJsonButton = document.getElementById('exportJsonButton');
  const exportWordButton = document.getElementById('exportWordButton');
  const printButton = document.getElementById('printButton');
  const statusMessage = document.getElementById('statusMessage');
  const piaNameInput = document.getElementById('piaName');
  const activePiaTitle = document.getElementById('activePiaTitle');
  const addPersonalInfoButton = document.getElementById('addPersonalInfoButton');
  const personalInfoList = document.getElementById('personalInfoList');
  const addAccessRoleButton = document.getElementById('addAccessRoleButton');
  const accessRolesList = document.getElementById('accessRolesList');

  const markdownFieldIds = [
    'initiativeSummary',
    'legalAuthority',
    'informationSources',
    'collectionUseDisclosure',
    'retentionDisposal',
    'safeguards',
    'reviewNotes'
  ];

  let currentStep = 0;
  let currentDocumentId = '';

  const generateDocumentId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    return `pia-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  };

  const loadDocuments = () => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || '[]');
    } catch {
      return [];
    }
  };

  const saveDocuments = (documents) => {
    localStorage.setItem(storageKey, JSON.stringify(documents));
  };

  const getDocumentsSortedByUpdatedAt = () => loadDocuments()
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  const showStatus = (message, type = 'info') => {
    statusMessage.className = `alert alert-${type} mt-4 mb-0`;
    statusMessage.textContent = message;
    statusMessage.classList.remove('d-none');
  };

  const clearStatus = () => {
    statusMessage.classList.add('d-none');
  };

  const updateHeaderTitle = () => {
    const name = (piaNameInput.value || '').trim();
    activePiaTitle.textContent = name || 'Untitled PIA';
  };

  const appendInlineMarkdown = (text, container) => {
    const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
    let lastIndex = 0;

    for (const match of text.matchAll(pattern)) {
      const matchText = match[0];
      const index = match.index || 0;

      if (index > lastIndex) {
        container.append(document.createTextNode(text.slice(lastIndex, index)));
      }

      if (matchText.startsWith('**')) {
        const strong = document.createElement('strong');
        strong.textContent = matchText.slice(2, -2);
        container.append(strong);
      } else {
        const emphasis = document.createElement('em');
        emphasis.textContent = matchText.slice(1, -1);
        container.append(emphasis);
      }

      lastIndex = index + matchText.length;
    }

    if (lastIndex < text.length) {
      container.append(document.createTextNode(text.slice(lastIndex)));
    }
  };

  const renderMarkdownInto = (source, container, placeholder = 'No content provided.') => {
    container.textContent = '';

    if ((source || '').trim() === '') {
      const paragraph = document.createElement('p');
      paragraph.textContent = placeholder;
      container.append(paragraph);
      return;
    }

    const lines = source.split('\n');
    let listElement = null;

    const flushList = () => {
      if (listElement) {
        container.append(listElement);
        listElement = null;
      }
    };

    for (const rawLine of lines) {
      const line = rawLine.trim();

      if (line.startsWith('- ')) {
        if (!listElement) {
          listElement = document.createElement('ul');
        }

        const listItem = document.createElement('li');
        appendInlineMarkdown(line.slice(2), listItem);
        listElement.append(listItem);
        continue;
      }

      flushList();

      if (line === '') {
        continue;
      }

      const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);

      if (headingMatch) {
        const heading = document.createElement(`h${headingMatch[1].length}`);
        appendInlineMarkdown(headingMatch[2], heading);
        container.append(heading);
        continue;
      }

      const paragraph = document.createElement('p');
      appendInlineMarkdown(line, paragraph);
      container.append(paragraph);
    }

    flushList();
  };

  const updateMarkdownPreview = (fieldId) => {
    const sourceTextarea = form.elements.namedItem(fieldId);
    const preview = document.getElementById(`${fieldId}Preview`);

    if (!sourceTextarea || !preview) {
      return;
    }

    renderMarkdownInto(sourceTextarea.value || '', preview, 'Preview your Markdown content here.');
  };

  const updateAllMarkdownPreviews = () => {
    for (const fieldId of markdownFieldIds) {
      updateMarkdownPreview(fieldId);
    }
  };

  const setMarkdownMode = (fieldId, mode) => {
    const fieldWrapper = document.querySelector(`[data-markdown-field="${fieldId}"]`);

    if (!fieldWrapper) {
      return;
    }

    const textarea = fieldWrapper.querySelector('.markdown-input');
    const preview = document.getElementById(`${fieldId}Preview`);
    const buttons = fieldWrapper.querySelectorAll(`[data-md-target="${fieldId}"]`);

    for (const button of buttons) {
      button.classList.toggle('active', button.dataset.mdMode === mode);
    }

    if (mode === 'preview') {
      updateMarkdownPreview(fieldId);
      textarea.classList.add('d-none');
      preview.classList.remove('d-none');
      return;
    }

    textarea.classList.remove('d-none');
    preview.classList.add('d-none');
  };

  const buildPersonalInfoRow = (item = {}) => {
    const row = document.createElement('div');
    row.className = 'dynamic-list-item';

    const infoLabel = document.createElement('label');
    infoLabel.className = 'form-label';
    infoLabel.textContent = 'Personal Information Element';

    const infoInput = document.createElement('input');
    infoInput.className = 'form-control mb-2 personal-info-name';
    infoInput.value = item.name || '';
    infoInput.placeholder = 'e.g., Home address, email, employee ID';

    const useLabel = document.createElement('label');
    useLabel.className = 'form-label';
    useLabel.textContent = 'Intended Use or Disclosure';

    const useInput = document.createElement('textarea');
    useInput.className = 'form-control personal-info-use';
    useInput.rows = 2;
    useInput.placeholder = 'How this item will be used and/or disclosed';
    useInput.value = item.useOrDisclosure || '';

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'btn btn-sm btn-outline-danger mt-2 remove-item-button';
    removeButton.textContent = 'Remove Item';
    removeButton.addEventListener('click', () => {
      row.remove();
      clearStatus();
    });

    row.append(infoLabel, infoInput, useLabel, useInput, removeButton);

    return row;
  };

  const buildAccessRoleRow = (title = '') => {
    const row = document.createElement('div');
    row.className = 'dynamic-list-item d-flex gap-2 align-items-center';

    const input = document.createElement('input');
    input.className = 'form-control access-role-title';
    input.placeholder = 'Position title with access to personal information';
    input.value = title;

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'btn btn-sm btn-outline-danger remove-item-button';
    removeButton.textContent = 'Remove';
    removeButton.addEventListener('click', () => {
      row.remove();
      clearStatus();
    });

    row.append(input, removeButton);
    return row;
  };

  const getPersonalInfoItems = () => [...personalInfoList.querySelectorAll('.dynamic-list-item')]
    .map((row) => ({
      name: (row.querySelector('.personal-info-name')?.value || '').trim(),
      useOrDisclosure: (row.querySelector('.personal-info-use')?.value || '').trim()
    }))
    .filter((item) => item.name || item.useOrDisclosure);

  const getAccessRoles = () => [...accessRolesList.querySelectorAll('.access-role-title')]
    .map((input) => (input.value || '').trim())
    .filter((title) => title !== '');

  const getFormData = () => {
    const raw = Object.fromEntries(new FormData(form).entries());

    raw.personalInfoItems = getPersonalInfoItems();
    raw.accessRoles = getAccessRoles();

    return raw;
  };

  const setFormData = (data) => {
    for (const [key, value] of Object.entries(data || {})) {
      if (key === 'personalInfoItems' || key === 'accessRoles') {
        continue;
      }

      const field = form.elements.namedItem(key);
      if (field) {
        field.value = value ?? '';
      }
    }

    personalInfoList.textContent = '';
    accessRolesList.textContent = '';

    const personalItems = Array.isArray(data?.personalInfoItems) ? data.personalInfoItems : [];
    const roleItems = Array.isArray(data?.accessRoles) ? data.accessRoles : [];

    for (const item of personalItems) {
      personalInfoList.append(buildPersonalInfoRow(item));
    }

    for (const role of roleItems) {
      accessRolesList.append(buildAccessRoleRow(role));
    }

    ensureMinimumListRows();

    updateHeaderTitle();
    updateAllMarkdownPreviews();
  };

  const ensureMinimumListRows = () => {
    if (personalInfoList.children.length === 0) {
      personalInfoList.append(buildPersonalInfoRow());
    }

    if (accessRolesList.children.length === 0) {
      accessRolesList.append(buildAccessRoleRow());
    }
  };

  const getCurrentDocumentName = () => {
    const customName = (piaNameInput.value || '').trim();
    return customName || 'Untitled PIA';
  };

  const getExportSlug = () => {
    const baseName = (piaNameInput.value || '').trim().toLowerCase();
    const slug = baseName
      .replaceAll(/\s+/g, '-')
      .replaceAll(/[^a-z0-9-]/g, '')
      .replaceAll(/-+/g, '-')
      .replaceAll(/^-|-$/g, '');

    return slug || 'pia';
  };

  const persistCurrent = () => {
    const documents = loadDocuments();
    const now = new Date().toISOString();
    const data = getFormData();
    const name = getCurrentDocumentName();

    const recordId = currentDocumentId || generateDocumentId();
    const existingIndex = documents.findIndex((doc) => doc.id === recordId);

    const documentRecord = {
      id: recordId,
      name,
      data,
      updatedAt: now,
      createdAt: existingIndex >= 0 ? (documents[existingIndex].createdAt || now) : now
    };

    if (existingIndex >= 0) {
      documents[existingIndex] = documentRecord;
    } else {
      documents.unshift(documentRecord);
    }

    currentDocumentId = documentRecord.id;
    saveDocuments(documents);
    updateHeaderTitle();
    showStatus(`Saved "${name}".`, 'success');
  };

  const createNewDocument = (name = '') => {
    form.reset();
    currentDocumentId = generateDocumentId();
    piaNameInput.value = name || '';

    personalInfoList.textContent = '';
    accessRolesList.textContent = '';
    ensureMinimumListRows();

    setStep(0);
    clearStatus();
    updateHeaderTitle();
    updateAllMarkdownPreviews();

    for (const fieldId of markdownFieldIds) {
      setMarkdownMode(fieldId, 'edit');
    }
  };

  const loadDocument = (id) => {
    const documentRecord = loadDocuments().find((doc) => doc.id === id);

    if (!documentRecord) {
      showStatus('Unable to load the selected PIA.', 'warning');
      return;
    }

    form.reset();
    currentDocumentId = documentRecord.id;
    setFormData(documentRecord.data || {});
    setStep(0);
    showStatus(`Loaded "${documentRecord.name}".`, 'info');
  };

  const deleteDocument = (id) => {
    const documents = loadDocuments();
    const filtered = documents.filter((doc) => doc.id !== id);

    if (filtered.length === documents.length) {
      return;
    }

    saveDocuments(filtered);

    if (currentDocumentId === id) {
      createNewDocument();
    }

    renderSavedList();
    showStatus('PIA deleted.', 'warning');
  };

  const exportToFile = (filename, mimeType, text) => {
    const blob = new Blob([text], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const buildMarkdownExport = () => {
    const data = getFormData();

    const personalInfoLines = (data.personalInfoItems || []).length > 0
      ? data.personalInfoItems.map((item) => `- **${item.name || 'Item'}:** ${item.useOrDisclosure || ''}`).join('\n')
      : '- None listed';

    const accessRoleLines = (data.accessRoles || []).length > 0
      ? data.accessRoles.map((title) => `- ${title}`).join('\n')
      : '- None listed';

    return [
      `# ${getCurrentDocumentName()}`,
      '',
      '## Overview',
      `- **Responsible Business Unit:** ${data.businessUnit || ''}`,
      `- **Project Lead:** ${data.projectLead || ''}`,
      `- **Assessment Date:** ${data.assessmentDate || ''}`,
      '',
      '## Initiative Summary and Program Context',
      data.initiativeSummary || '',
      '',
      '## Legal Authority for Collection/Use/Disclosure',
      data.legalAuthority || '',
      '',
      '## Personal Information Collected',
      personalInfoLines,
      '',
      '## Sources of Personal Information',
      data.informationSources || '',
      '',
      '## Collection, Use, and Disclosure Controls',
      data.collectionUseDisclosure || '',
      '',
      '## Retention and Disposal Strategy',
      data.retentionDisposal || '',
      '',
      '## Safeguards',
      data.safeguards || '',
      '',
      '## Roles with Access to Personal Information',
      accessRoleLines,
      '',
      '## Review',
      `- **Reviewed By:** ${data.reviewedBy || ''}`,
      `- **Review Date:** ${data.reviewDate || ''}`,
      '',
      data.reviewNotes || ''
    ].join('\n');
  };

  const buildWordExport = () => {
    const container = document.createElement('div');
    const title = document.createElement('h1');
    title.textContent = getCurrentDocumentName();
    container.append(title);

    const sections = [
      ['Initiative Summary and Program Context', 'initiativeSummary'],
      ['Legal Authority for Collection/Use/Disclosure', 'legalAuthority'],
      ['Sources of Personal Information', 'informationSources'],
      ['Collection, Use, and Disclosure Controls', 'collectionUseDisclosure'],
      ['Retention and Disposal Strategy', 'retentionDisposal'],
      ['Safeguards', 'safeguards'],
      ['Review Notes and Recommended Actions', 'reviewNotes']
    ];

    for (const [label, fieldId] of sections) {
      const heading = document.createElement('h2');
      heading.textContent = label;
      container.append(heading);

      const preview = document.createElement('div');
      const source = form.elements.namedItem(fieldId)?.value || '';
      renderMarkdownInto(source, preview);
      container.append(preview);
    }

    const data = getFormData();

    const personalInfoHeading = document.createElement('h2');
    personalInfoHeading.textContent = 'Personal Information Collected';
    container.append(personalInfoHeading);
    const personalInfoListElement = document.createElement('ul');
    for (const item of data.personalInfoItems || []) {
      const li = document.createElement('li');
      li.textContent = `${item.name || 'Item'}: ${item.useOrDisclosure || ''}`;
      personalInfoListElement.append(li);
    }
    container.append(personalInfoListElement);

    const accessHeading = document.createElement('h2');
    accessHeading.textContent = 'Roles with Access to Personal Information';
    container.append(accessHeading);
    const accessList = document.createElement('ul');
    for (const role of data.accessRoles || []) {
      const li = document.createElement('li');
      li.textContent = role;
      accessList.append(li);
    }
    container.append(accessList);

    return `<!doctype html><html><head><meta charset="utf-8"></head><body>${container.innerHTML}</body></html>`;
  };

  const renderSavedList = () => {
    const documents = getDocumentsSortedByUpdatedAt();

    savedPiasList.textContent = '';
    savedPiasEmptyState.classList.toggle('d-none', documents.length > 0);

    for (const doc of documents) {
      const buttonRow = document.createElement('div');
      buttonRow.className = 'list-group-item d-flex justify-content-between align-items-center gap-3 flex-wrap';

      const detailsContainer = document.createElement('div');
      const titleLine = document.createElement('div');
      titleLine.className = 'fw-semibold';
      titleLine.textContent = doc.name || 'Untitled PIA';

      const updatedLine = document.createElement('div');
      updatedLine.className = 'small text-muted';
      updatedLine.textContent = `Updated ${new Date(doc.updatedAt).toLocaleString()}`;
      detailsContainer.append(titleLine, updatedLine);

      const actionsContainer = document.createElement('div');
      actionsContainer.className = 'd-flex gap-2';

      const openButton = document.createElement('button');
      openButton.type = 'button';
      openButton.className = 'btn btn-sm btn-outline-primary';
      openButton.dataset.action = 'open';
      openButton.dataset.id = doc.id;
      openButton.textContent = 'Open';

      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'btn btn-sm btn-outline-danger';
      deleteButton.dataset.action = 'delete';
      deleteButton.dataset.id = doc.id;
      deleteButton.textContent = 'Delete';

      actionsContainer.append(openButton, deleteButton);
      buttonRow.append(detailsContainer, actionsContainer);

      savedPiasList.append(buttonRow);
    }
  };

  const setStep = (stepIndex) => {
    currentStep = Math.min(Math.max(stepIndex, 0), stepCards.length - 1);

    for (const [index, card] of stepCards.entries()) {
      card.classList.toggle('d-none', index !== currentStep);
    }

    for (const [index, step] of stepIndicatorItems.entries()) {
      step.classList.toggle('active', index === currentStep);
    }

    prevStepButton.disabled = currentStep === 0;
    nextStepButton.textContent = currentStep === stepCards.length - 1 ? 'Finish & Save' : 'Next';
  };

  const closeModalsForPrint = () => {
    for (const modalElement of document.querySelectorAll('.modal')) {
      const modalInstance = bootstrap.Modal.getInstance(modalElement);
      modalInstance?.hide();
    }

    document.body.classList.remove('modal-open');
    for (const backdrop of document.querySelectorAll('.modal-backdrop')) {
      backdrop.remove();
    }
  };

  savedPiasList.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');

    if (!button) {
      return;
    }

    const action = button.dataset.action;
    const id = button.dataset.id;

    if (action === 'open') {
      loadDocument(id);
      bootstrap.Modal.getInstance(document.getElementById('savedPiasModal'))?.hide();
      return;
    }

    if (action === 'delete') {
      deleteDocument(id);
    }
  });

  for (const markdownFieldId of markdownFieldIds) {
    const textarea = form.elements.namedItem(markdownFieldId);

    textarea?.addEventListener('input', () => {
      updateMarkdownPreview(markdownFieldId);
      clearStatus();
    });
  }

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-md-target][data-md-mode]');

    if (!button) {
      return;
    }

    setMarkdownMode(button.dataset.mdTarget, button.dataset.mdMode);
  });

  for (const stepButton of stepTabButtons) {
    stepButton.addEventListener('click', () => {
      const step = Number(stepButton.dataset.step);
      setStep(step);
    });
  }

  addPersonalInfoButton.addEventListener('click', () => {
    personalInfoList.append(buildPersonalInfoRow());
    clearStatus();
  });

  addAccessRoleButton.addEventListener('click', () => {
    accessRolesList.append(buildAccessRoleRow());
    clearStatus();
  });

  piaNameInput.addEventListener('input', updateHeaderTitle);

  nextStepButton.addEventListener('click', () => {
    if (currentStep < stepCards.length - 1) {
      setStep(currentStep + 1);
    } else {
      persistCurrent();
    }
  });

  prevStepButton.addEventListener('click', () => setStep(currentStep - 1));
  saveButton.addEventListener('click', persistCurrent);

  confirmNewPiaButton.addEventListener('click', () => {
    const newPiaName = (document.getElementById('newPiaName').value || '').trim();
    createNewDocument(newPiaName);
    bootstrap.Modal.getInstance(document.getElementById('newPiaModal'))?.hide();
    showStatus(`Created ${newPiaName ? `"${newPiaName}"` : 'a new PIA'}.`, 'info');
  });

  openSavedPiasButton.addEventListener('click', renderSavedList);

  exportMarkdownButton.addEventListener('click', () => {
    exportToFile(
      `${getExportSlug()}.md`,
      'text/markdown;charset=utf-8',
      buildMarkdownExport()
    );
    showStatus('Exported Markdown file.', 'success');
  });

  exportJsonButton.addEventListener('click', () => {
    exportToFile(
      `${getExportSlug()}.json`,
      'application/json;charset=utf-8',
      JSON.stringify({
        id: currentDocumentId,
        name: getCurrentDocumentName(),
        exportedAt: new Date().toISOString(),
        data: getFormData()
      }, null, 2)
    );
    showStatus('Exported JSON file.', 'success');
  });

  exportWordButton.addEventListener('click', () => {
    exportToFile(
      `${getExportSlug()}.doc`,
      'text/html;charset=utf-8',
      buildWordExport()
    );
    showStatus('Exported Microsoft Word document.', 'success');
  });

  importButton.addEventListener('click', () => {
    importJsonInput.value = '';
    importJsonInput.click();
  });

  importJsonInput.addEventListener('change', async () => {
    const [file] = importJsonInput.files || [];

    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const imported = JSON.parse(text);
      const importedData = imported?.data;

      if (!importedData || typeof importedData !== 'object') {
        throw new Error('Missing data payload.');
      }

      form.reset();
      currentDocumentId = imported?.id || generateDocumentId();
      setFormData(importedData);

      if ((imported?.name || '').trim() && !piaNameInput.value.trim()) {
        piaNameInput.value = imported.name.trim();
        updateHeaderTitle();
      }

      setStep(0);
      showStatus(`Imported "${imported?.name || 'PIA'}" from JSON.`, 'success');
    } catch {
      showStatus('Import failed. Please choose a valid exported JSON file.', 'danger');
    }
  });

  printButton.addEventListener('click', () => {
    closeModalsForPrint();
    updateAllMarkdownPreviews();
    window.print();
  });

  window.addEventListener('beforeprint', () => {
    closeModalsForPrint();
    updateAllMarkdownPreviews();
  });

  form.addEventListener('input', clearStatus);

  const existingDocuments = getDocumentsSortedByUpdatedAt();

  if (existingDocuments.length > 0) {
    const [latest] = existingDocuments;

    if (latest) {
      currentDocumentId = latest.id;
      setFormData(latest.data || {});
      showStatus(`Loaded most recent draft: "${latest.name}".`, 'info');
    }
  } else {
    createNewDocument();
  }

  ensureMinimumListRows();

  for (const fieldId of markdownFieldIds) {
    setMarkdownMode(fieldId, 'edit');
  }

  updateAllMarkdownPreviews();
  setStep(0);
})();
