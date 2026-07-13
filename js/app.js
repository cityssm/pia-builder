(() => {
  const storageKey = 'piaBuilder.documents.v1';
  const form = document.getElementById('piaForm');
  const stepCards = [...document.querySelectorAll('.step-card')];
  const stepIndicatorItems = [...document.querySelectorAll('#stepIndicator li')];
  const prevStepButton = document.getElementById('prevStepButton');
  const nextStepButton = document.getElementById('nextStepButton');
  const saveButton = document.getElementById('saveButton');
  const confirmNewPiaButton = document.getElementById('confirmNewPiaButton');
  const savedPiasList = document.getElementById('savedPiasList');
  const savedPiasEmptyState = document.getElementById('savedPiasEmptyState');
  const openSavedPiasButton = document.getElementById('openSavedPiasButton');
  const exportMarkdownButton = document.getElementById('exportMarkdownButton');
  const exportJsonButton = document.getElementById('exportJsonButton');
  const printButton = document.getElementById('printButton');
  const statusMessage = document.getElementById('statusMessage');
  const markdownPreview = document.getElementById('markdownPreview');
  const reviewNotes = document.getElementById('reviewNotes');
  const piaNameInput = document.getElementById('piaName');
  const activePiaTitle = document.getElementById('activePiaTitle');

  let currentStep = 0;
  let currentDocumentId = '';

  const getUuid = () => {
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

  const showStatus = (message, type = 'info') => {
    statusMessage.className = `alert alert-${type} mt-4 mb-0`;
    statusMessage.textContent = message;
    statusMessage.classList.remove('d-none');
  };

  const clearStatus = () => {
    statusMessage.classList.add('d-none');
  };

  const getFormData = () => Object.fromEntries(new FormData(form).entries());

  const setFormData = (data) => {
    for (const [key, value] of Object.entries(data || {})) {
      const field = form.elements.namedItem(key);
      if (field) {
        field.value = value ?? '';
      }
    }

    updateHeaderTitle();
    updateMarkdownPreview();
  };

  const updateHeaderTitle = () => {
    const name = (piaNameInput.value || '').trim();
    activePiaTitle.textContent = name || 'Untitled PIA';
  };

  const renderSimpleMarkdown = (text) => {
    const escaped = (text || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');

    return escaped
      .replace(/^### (.*)$/gm, '<h3>$1</h3>')
      .replace(/^## (.*)$/gm, '<h2>$1</h2>')
      .replace(/^# (.*)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^- (.*)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
      .replace(/\n{2,}/g, '</p><p>')
      .replace(/\n/g, '<br>');
  };

  const updateMarkdownPreview = () => {
    const rendered = renderSimpleMarkdown(reviewNotes.value || '');
    markdownPreview.innerHTML = `<p>${rendered || 'Preview your review notes here.'}</p>`;
  };

  const getCurrentDocumentName = () => {
    const customName = (piaNameInput.value || '').trim();
    return customName || 'Untitled PIA';
  };

  const persistCurrent = () => {
    const documents = loadDocuments();
    const now = new Date().toISOString();
    const data = getFormData();
    const name = getCurrentDocumentName();

    const documentRecord = {
      id: currentDocumentId || getUuid(),
      name,
      data,
      updatedAt: now,
      createdAt: now
    };

    const existingIndex = documents.findIndex((doc) => doc.id === documentRecord.id);

    if (existingIndex >= 0) {
      documentRecord.createdAt = documents[existingIndex].createdAt || now;
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
    currentDocumentId = getUuid();
    piaNameInput.value = name || '';
    setStep(0);
    clearStatus();
    updateHeaderTitle();
    updateMarkdownPreview();
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

    return [
      `# ${getCurrentDocumentName()}`,
      '',
      '## Overview',
      `- **Business Unit:** ${data.businessUnit || ''}`,
      `- **Project Lead:** ${data.projectLead || ''}`,
      `- **Assessment Date:** ${data.assessmentDate || ''}`,
      '',
      '## Data Profile',
      data.initiativeSummary || '',
      '',
      '### Legal Authority',
      data.legalAuthority || '',
      '',
      '### Personal Information Collected',
      data.personalInfo || '',
      '',
      '## Risk and Controls',
      '### Collection, Use, and Disclosure',
      data.collectionUseDisclosure || '',
      '',
      '### Retention and Disposal',
      data.retentionDisposal || '',
      '',
      '### Security Safeguards',
      data.safeguards || '',
      '',
      '## Review',
      `- **Reviewed By:** ${data.reviewedBy || ''}`,
      `- **Review Date:** ${data.reviewDate || ''}`,
      '',
      data.reviewNotes || ''
    ].join('\n');
  };

  const renderSavedList = () => {
    const documents = loadDocuments().sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

    savedPiasList.innerHTML = '';
    savedPiasEmptyState.classList.toggle('d-none', documents.length > 0);

    for (const doc of documents) {
      const buttonRow = document.createElement('div');
      buttonRow.className = 'list-group-item d-flex justify-content-between align-items-center gap-3 flex-wrap';
      buttonRow.innerHTML = `
        <div>
          <div class="fw-semibold">${doc.name || 'Untitled PIA'}</div>
          <div class="small text-muted">Updated ${new Date(doc.updatedAt).toLocaleString()}</div>
        </div>
        <div class="d-flex gap-2">
          <button type="button" class="btn btn-sm btn-outline-primary" data-action="open" data-id="${doc.id}">Open</button>
          <button type="button" class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${doc.id}">Delete</button>
        </div>
      `;

      savedPiasList.appendChild(buttonRow);
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
    nextStepButton.textContent = currentStep === stepCards.length - 1 ? 'Finish' : 'Next';
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

  reviewNotes.addEventListener('input', updateMarkdownPreview);
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
      `${getCurrentDocumentName().replaceAll(/\s+/g, '-').toLowerCase() || 'pia'}.md`,
      'text/markdown;charset=utf-8',
      buildMarkdownExport()
    );
    showStatus('Exported Markdown file.', 'success');
  });

  exportJsonButton.addEventListener('click', () => {
    exportToFile(
      `${getCurrentDocumentName().replaceAll(/\s+/g, '-').toLowerCase() || 'pia'}.json`,
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

  printButton.addEventListener('click', () => window.print());
  form.addEventListener('input', clearStatus);

  const existingDocuments = loadDocuments();

  if (existingDocuments.length > 0) {
    const latest = [...existingDocuments].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))[0];
    currentDocumentId = latest.id;
    setFormData(latest.data || {});
    showStatus(`Loaded most recent draft: "${latest.name}".`, 'info');
  } else {
    createNewDocument();
  }

  setStep(0);
})();
