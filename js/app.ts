/* eslint-disable @typescript-eslint/no-unsafe-type-assertion */

import type * as Bootstrap from 'bootstrap'

declare const bootstrap: typeof Bootstrap

;(() => {
  const storageKey = 'piaBuilder.documents.v1'

  const form = document.querySelector('#piaForm') as HTMLFormElement
  const stepCards = [
    ...document.querySelectorAll('.step-card')
  ] as HTMLDivElement[]
  const stepIndicatorItems = [
    ...document.querySelectorAll('#stepIndicator li')
  ] as HTMLLIElement[]

  const stepTabButtons = [...document.querySelectorAll('.step-tab')]
  const previousStepButton = document.querySelector(
    '#prevStepButton'
  ) as HTMLButtonElement
  const nextStepButton = document.querySelector(
    '#nextStepButton'
  ) as HTMLButtonElement

  const saveButton = document.querySelector('#saveButton') as HTMLButtonElement

  const importButton = document.querySelector(
    '#importButton'
  ) as HTMLButtonElement
  const importJsonInput = document.querySelector(
    '#importJsonInput'
  ) as HTMLInputElement
  const confirmNewPiaButton = document.querySelector(
    '#confirmNewPiaButton'
  ) as HTMLButtonElement

  const savedPiasList = document.querySelector(
    '#savedPiasList'
  ) as HTMLUListElement
  const savedPiasEmptyState = document.querySelector(
    '#savedPiasEmptyState'
  ) as HTMLElement
  const openSavedPiasButton = document.querySelector(
    '#openSavedPiasButton'
  ) as HTMLButtonElement

  const exportMarkdownButton = document.querySelector(
    '#exportMarkdownButton'
  ) as HTMLButtonElement
  const exportJsonButton = document.querySelector(
    '#exportJsonButton'
  ) as HTMLButtonElement
  const exportWordButton = document.querySelector(
    '#exportWordButton'
  ) as HTMLButtonElement
  const printButton = document.querySelector(
    '#printButton'
  ) as HTMLButtonElement

  const statusToastElement = document.querySelector(
    '#statusToast'
  ) as HTMLElement
  const statusToastBody = document.querySelector(
    '#statusToastBody'
  ) as HTMLElement
  const piaNameInput = document.querySelector('#piaName') as HTMLInputElement
  const activePiaTitle = document.querySelector(
    '#activePiaTitle'
  ) as HTMLElement
  const addPersonalInfoButton = document.querySelector(
    '#addPersonalInfoButton'
  ) as HTMLButtonElement
  const personalInfoList = document.querySelector(
    '#personalInfoList'
  ) as HTMLUListElement
  const addInformationSourceButton = document.querySelector(
    '#addInformationSourceButton'
  ) as HTMLButtonElement
  const informationSourcesList = document.querySelector(
    '#informationSourcesList'
  ) as HTMLUListElement
  const addAccessRoleButton = document.querySelector(
    '#addAccessRoleButton'
  ) as HTMLButtonElement
  const accessRolesList = document.querySelector(
    '#accessRolesList'
  ) as HTMLUListElement

  const markdownFieldIds = [
    'initiativeSummary',
    'legalAuthority',
    'collectionUseDisclosure',
    'retentionDisposal',
    'safeguards',
    'reviewNotes'
  ]

  let currentStep = 0
  let currentDocumentId = ''
  let statusToastTimeoutId
  const statusToastInstance = statusToastElement
    ? new bootstrap.Toast(statusToastElement, { autohide: false })
    : null

  const generateDocumentId = () => {
    if (
      typeof crypto !== 'undefined' &&
      typeof crypto.randomUUID === 'function'
    ) {
      return crypto.randomUUID()
    }

    return `pia-${Date.now()}-${Math.floor(Math.random() * 100000)}`
  }

  const loadDocuments = () => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || '[]')
    } catch {
      return []
    }
  }

  const saveDocuments = (documents: any[]) => {
    localStorage.setItem(storageKey, JSON.stringify(documents))
  }

  const getDocumentsSortedByUpdatedAt = () =>
    loadDocuments().sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )

  const showStatus = (
    message: string,
    type: 'info' | 'success' | 'warning' | 'danger' = 'info'
  ) => {
    if (!statusToastInstance || !statusToastBody || !statusToastElement) {
      return
    }

    const toastClassByType = {
      info: 'text-bg-primary',
      success: 'text-bg-success',
      warning: 'text-bg-warning',
      danger: 'text-bg-danger'
    }

    for (const cssClass of [
      ...Object.values(toastClassByType),
      'text-bg-secondary'
    ]) {
      statusToastElement.classList.remove(cssClass)
    }

    statusToastElement.classList.add(
      toastClassByType[type] || 'text-bg-secondary'
    )
    statusToastBody.textContent = message
    statusToastInstance.show()

    if (statusToastTimeoutId) {
      clearTimeout(statusToastTimeoutId)
    }

    statusToastTimeoutId = setTimeout(() => {
      statusToastInstance.hide()
      statusToastTimeoutId = undefined
    }, 3200)
  }

  const clearStatus = () => {
    if (statusToastTimeoutId) {
      clearTimeout(statusToastTimeoutId)
      statusToastTimeoutId = undefined
    }

    statusToastInstance?.hide()
  }

  const parseInformationSourceItems = (data: any) => {
    if (Array.isArray(data?.informationSourcesItems)) {
      return data.informationSourcesItems
    }

    if (typeof data?.informationSources === 'string') {
      return data.informationSources
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line)
    }

    return []
  }

  const splitPositionAndName = (combinedValue: string) => {
    const value = (combinedValue || '').trim()

    if (value === '') {
      return { position: '', name: '' }
    }

    // Legacy values were captured as "Position/Name".
    const dividerIndex = value.indexOf('/')

    if (dividerIndex === -1) {
      return { position: value, name: '' }
    }

    return {
      position: value.slice(0, dividerIndex).trim(),
      name: value.slice(dividerIndex + 1).trim()
    }
  }

  const updateHeaderTitle = () => {
    const name = (piaNameInput.value || '').trim()
    activePiaTitle.textContent = name || 'Untitled PIA'
  }

  const appendInlineMarkdown = (text: string, container: HTMLElement) => {
    const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*)/g
    let lastIndex = 0

    for (const match of text.matchAll(pattern)) {
      const matchText = match[0]
      const index = match.index || 0

      if (index > lastIndex) {
        container.append(document.createTextNode(text.slice(lastIndex, index)))
      }

      if (matchText.startsWith('**')) {
        const strong = document.createElement('strong')
        strong.textContent = matchText.slice(2, -2)
        container.append(strong)
      } else {
        const emphasis = document.createElement('em')
        emphasis.textContent = matchText.slice(1, -1)
        container.append(emphasis)
      }

      lastIndex = index + matchText.length
    }

    if (lastIndex < text.length) {
      container.append(document.createTextNode(text.slice(lastIndex)))
    }
  }

  const renderMarkdownInto = (
    source: string,
    container: HTMLElement,
    placeholder: string | null = null
  ) => {
    container.textContent = ''

    if ((source || '').trim() === '') {
      if (placeholder) {
        const paragraph = document.createElement('p')
        paragraph.textContent = placeholder
        container.append(paragraph)
      }
      return
    }

    const lines = source.split('\n')
    let listElement: HTMLUListElement | null = null

    const flushList = () => {
      if (listElement) {
        container.append(listElement)
        listElement = null
      }
    }

    for (const rawLine of lines) {
      const line = rawLine.trim()

      if (line.startsWith('- ')) {
        if (!listElement) {
          listElement = document.createElement('ul')
        }

        const listItem = document.createElement('li')
        appendInlineMarkdown(line.slice(2), listItem)
        listElement.append(listItem)
        continue
      }

      flushList()

      if (line === '') {
        continue
      }

      const headingMatch = line.match(/^(#{1,3})\s+(.+)$/)

      if (headingMatch) {
        const heading = document.createElement(`h${headingMatch[1].length}`)
        appendInlineMarkdown(headingMatch[2], heading)
        container.append(heading)
        continue
      }

      const paragraph = document.createElement('p')
      appendInlineMarkdown(line, paragraph)
      container.append(paragraph)
    }

    flushList()
  }

  const updateMarkdownPreview = (fieldId: string) => {
    const sourceTextarea = form.elements.namedItem(
      fieldId
    ) as HTMLTextAreaElement
    const preview = document.getElementById(`${fieldId}Preview`)

    if (!sourceTextarea || !preview) {
      return
    }

    renderMarkdownInto(sourceTextarea.value || '', preview, '')
  }

  const updateAllMarkdownPreviews = () => {
    for (const fieldId of markdownFieldIds) {
      updateMarkdownPreview(fieldId)
    }
  }

  const setMarkdownMode = (fieldId: string, mode: 'edit' | 'preview') => {
    const fieldWrapper = document.querySelector(
      `[data-markdown-field="${fieldId}"]`
    )

    if (!fieldWrapper) {
      return
    }

    const textarea = fieldWrapper.querySelector(
      '.markdown-input'
    ) as HTMLTextAreaElement
    const preview = document.getElementById(`${fieldId}Preview`) as HTMLElement
    const buttons = fieldWrapper.querySelectorAll(
      `[data-md-target="${fieldId}"]`
    ) as NodeListOf<HTMLButtonElement>

    for (const button of buttons) {
      button.classList.toggle('active', button.dataset.mdMode === mode)
    }

    if (mode === 'preview') {
      updateMarkdownPreview(fieldId)
      textarea.classList.add('d-none')
      preview.classList.remove('d-none')
      return
    }

    textarea.classList.remove('d-none')
    preview.classList.add('d-none')
  }

  const buildListControls = (row: HTMLElement, removeLabel: string) => {
    const controls = document.createElement('div')
    controls.className = 'dynamic-list-controls justify-content-end'
    const reorderButtonClass =
      'btn btn-sm btn-outline-secondary reorder-item-button'

    const moveUpButton = document.createElement('button')
    moveUpButton.type = 'button'
    moveUpButton.className = reorderButtonClass
    moveUpButton.textContent = 'Move Up'
    moveUpButton.addEventListener('click', () => {
      const previousRow = row.previousElementSibling
      if (previousRow) {
        previousRow.before(row)
      }
      clearStatus()
    })

    const moveDownButton = document.createElement('button')
    moveDownButton.type = 'button'
    moveDownButton.className = reorderButtonClass
    moveDownButton.textContent = 'Move Down'
    moveDownButton.addEventListener('click', () => {
      const nextRow = row.nextElementSibling
      if (nextRow) {
        nextRow.after(row)
      }
      clearStatus()
    })

    const removeButton = document.createElement('button')
    removeButton.type = 'button'
    removeButton.className = 'btn btn-sm btn-outline-danger remove-item-button'
    removeButton.textContent = removeLabel
    removeButton.addEventListener('click', () => {
      row.remove()
      clearStatus()
    })

    controls.append(moveUpButton, moveDownButton, removeButton)
    return controls
  }

  const buildPersonalInfoRow = (
    item: { name?: string; useOrDisclosure?: string } = {}
  ) => {
    const row = document.createElement('div')
    row.className = 'dynamic-list-item'

    const infoLabel = document.createElement('label')
    infoLabel.className = 'form-label'
    infoLabel.textContent = 'Personal Information Element'

    const infoInput = document.createElement('input')
    infoInput.className = 'form-control mb-2 personal-info-name'
    infoInput.value = item.name || ''
    infoInput.placeholder = 'e.g., Home address, email, employee ID'

    const useLabel = document.createElement('label')
    useLabel.className = 'form-label'
    useLabel.textContent = 'Intended Use or Disclosure'

    const useInput = document.createElement('textarea')
    useInput.className = 'form-control personal-info-use'
    useInput.rows = 2
    useInput.placeholder = 'How this item will be used and/or disclosed'
    useInput.value = item.useOrDisclosure || ''

    const controls = buildListControls(row, 'Remove Item')
    row.append(infoLabel, infoInput, useLabel, useInput, controls)

    return row
  }

  const buildInformationSourceRow = (source: string = '') => {
    const row = document.createElement('div')
    row.className = 'dynamic-list-item'

    const sourceLabel = document.createElement('label')
    sourceLabel.className = 'form-label'
    sourceLabel.textContent = 'Source'

    const sourceInput = document.createElement('input')
    sourceInput.className = 'form-control information-source'
    sourceInput.placeholder =
      'e.g., Data subject, external partner, another institution'
    sourceInput.value = source

    const controls = buildListControls(row, 'Remove Source')
    row.append(sourceLabel, sourceInput, controls)

    return row
  }

  const buildAccessRoleRow = (title = '') => {
    const row = document.createElement('div')
    row.className = 'dynamic-list-item'

    const input = document.createElement('input')
    input.className = 'form-control access-role-title'
    input.placeholder = 'Position title with access to personal information'
    input.value = title

    const controls = buildListControls(row, 'Remove')
    row.append(input, controls)
    return row
  }

  const getPersonalInfoItems = () =>
    [...personalInfoList.querySelectorAll('.dynamic-list-item')]
      .map((row) => ({
        name: (row.querySelector('.personal-info-name')?.value || '').trim(),
        useOrDisclosure: (
          row.querySelector('.personal-info-use')?.value || ''
        ).trim()
      }))
      .filter((item) => item.name || item.useOrDisclosure)

  const getAccessRoles = () =>
    [...accessRolesList.querySelectorAll('.access-role-title')]
      .map((input) => (input.value || '').trim())
      .filter((title) => title !== '')

  const getInformationSources = () =>
    [...informationSourcesList.querySelectorAll('.information-source')]
      .map((input) => (input.value || '').trim())
      .filter((source) => source !== '')

  const getFormData = () => {
    const raw = Object.fromEntries(new FormData(form).entries())

    raw.personalInfoItems = getPersonalInfoItems()
    raw.informationSourcesItems = getInformationSources()
    raw.accessRoles = getAccessRoles()

    return raw
  }

  const setFormData = (data: Record<string, any>) => {
    for (const [key, value] of Object.entries(data || {})) {
      if (
        key === 'personalInfoItems' ||
        key === 'accessRoles' ||
        key === 'informationSourcesItems'
      ) {
        continue
      }

      const field = form.elements.namedItem(key) as HTMLInputElement

      if (field) {
        field.value = value ?? ''
      }
    }

    personalInfoList.textContent = ''
    informationSourcesList.textContent = ''
    accessRolesList.textContent = ''

    const personalItems = Array.isArray(data?.personalInfoItems)
      ? data.personalInfoItems
      : []
    const informationSourceItems = parseInformationSourceItems(data)
    const roleItems = Array.isArray(data?.accessRoles) ? data.accessRoles : []

    const applyLegacyCombinedField = (
      legacyFieldKey,
      positionFieldKey,
      nameFieldKey
    ) => {
      if (!(data?.[legacyFieldKey] || '').trim()) {
        return
      }

      const { position, name } = splitPositionAndName(data[legacyFieldKey])

      if (!data[positionFieldKey]) {
        const positionInput = form.elements.namedItem(positionFieldKey) as HTMLInputElement

        if (positionInput) {
          positionInput.value = position
        }
      }

      if (!data[nameFieldKey]) {
        const nameInput = form.elements.namedItem(nameFieldKey) as HTMLInputElement

        if (nameInput) {
          nameInput.value = name
        }
      }
    }

    applyLegacyCombinedField(
      'projectLead',
      'projectLeadPosition',
      'projectLeadName'
    )
    applyLegacyCombinedField(
      'reviewedBy',
      'reviewedByPosition',
      'reviewedByName'
    )

    for (const item of personalItems) {
      personalInfoList.append(buildPersonalInfoRow(item))
    }

    for (const source of informationSourceItems) {
      informationSourcesList.append(buildInformationSourceRow(source))
    }

    for (const role of roleItems) {
      accessRolesList.append(buildAccessRoleRow(role))
    }

    ensureMinimumListRows()

    updateHeaderTitle()
    updateAllMarkdownPreviews()
  }

  const ensureMinimumListRows = () => {
    if (personalInfoList.children.length === 0) {
      personalInfoList.append(buildPersonalInfoRow())
    }

    if (accessRolesList.children.length === 0) {
      accessRolesList.append(buildAccessRoleRow())
    }

    if (informationSourcesList.children.length === 0) {
      informationSourcesList.append(buildInformationSourceRow())
    }
  }

  const getCurrentDocumentName = () => {
    const customName = (piaNameInput.value || '').trim()
    return customName || 'Untitled PIA'
  }

  const getExportSlug = () => {
    const baseName = (piaNameInput.value || '').trim().toLowerCase()
    const slug = baseName
      .replaceAll(/\s+/g, '-')
      .replaceAll(/[^a-z0-9-]/g, '')
      .replaceAll(/-+/g, '-')
      .replaceAll(/^-|-$/g, '')

    return slug || 'pia'
  }

  const persistCurrent = () => {
    const documents = loadDocuments()
    const now = new Date().toISOString()
    const data = getFormData()
    const name = getCurrentDocumentName()

    const recordId = currentDocumentId || generateDocumentId()
    const existingIndex = documents.findIndex((doc) => doc.id === recordId)

    const documentRecord = {
      id: recordId,
      name,
      data,
      updatedAt: now,
      createdAt:
        existingIndex >= 0 ? documents[existingIndex].createdAt || now : now
    }

    if (existingIndex >= 0) {
      documents[existingIndex] = documentRecord
    } else {
      documents.unshift(documentRecord)
    }

    currentDocumentId = documentRecord.id
    saveDocuments(documents)
    updateHeaderTitle()
    showStatus(`Saved "${name}".`, 'success')
  }

  const createNewDocument = (name = '') => {
    form.reset()

    currentDocumentId = generateDocumentId()
    piaNameInput.value = name || ''

    personalInfoList.textContent = ''
    informationSourcesList.textContent = ''
    accessRolesList.textContent = ''
    ensureMinimumListRows()

    setStep(0)
    clearStatus()
    updateHeaderTitle()
    updateAllMarkdownPreviews()

    for (const fieldId of markdownFieldIds) {
      setMarkdownMode(fieldId, 'edit')
    }
  }

  const loadDocument = (id) => {
    const documentRecord = loadDocuments().find((doc) => doc.id === id)

    if (!documentRecord) {
      showStatus('Unable to load the selected PIA.', 'warning')
      return
    }

    form.reset()
    currentDocumentId = documentRecord.id
    setFormData(documentRecord.data || {})
    setStep(0)
    showStatus(`Loaded "${documentRecord.name}".`, 'info')
  }

  const deleteDocument = (id) => {
    const documents = loadDocuments()
    const filtered = documents.filter((doc) => doc.id !== id)

    if (filtered.length === documents.length) {
      return
    }

    saveDocuments(filtered)

    if (currentDocumentId === id) {
      createNewDocument()
    }

    renderSavedList()
    showStatus('PIA deleted.', 'warning')
  }

  const exportToFile = (filename, mimeType, text) => {
    const blob = new Blob([text], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')

    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  const buildMarkdownExport = () => {
    const data = getFormData()

    const personalInfoLines =
      (data.personalInfoItems || []).length > 0
        ? data.personalInfoItems
            .map(
              (item) =>
                `- **${item.name || 'Item'}:** ${item.useOrDisclosure || ''}`
            )
            .join('\n')
        : '- None listed'

    const accessRoleLines =
      (data.accessRoles || []).length > 0
        ? data.accessRoles.map((title) => `- ${title}`).join('\n')
        : '- None listed'

    const informationSourceLines =
      (data.informationSourcesItems || []).length > 0
        ? data.informationSourcesItems.map((source) => `- ${source}`).join('\n')
        : '- None listed'

    return [
      `# ${getCurrentDocumentName()}`,
      '',
      '## Overview',
      `- **Responsible Business Unit:** ${data.businessUnit || ''}`,
      `- **Project Lead Name:** ${data.projectLeadName || ''}`,
      `- **Project Lead Position:** ${data.projectLeadPosition || ''}`,
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
      informationSourceLines,
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
      `- **Reviewed By Name:** ${data.reviewedByName || ''}`,
      `- **Reviewed By Position:** ${data.reviewedByPosition || ''}`,
      `- **Review Date:** ${data.reviewDate || ''}`,
      '',
      data.reviewNotes || ''
    ].join('\n')
  }

  const buildWordExport = () => {
    const container = document.createElement('div')
    const title = document.createElement('h1')
    title.textContent = getCurrentDocumentName()
    container.append(title)

    const sections = [
      ['Initiative Summary and Program Context', 'initiativeSummary'],
      ['Legal Authority for Collection/Use/Disclosure', 'legalAuthority'],
      ['Collection, Use, and Disclosure Controls', 'collectionUseDisclosure'],
      ['Retention and Disposal Strategy', 'retentionDisposal'],
      ['Safeguards', 'safeguards'],
      ['Review Notes and Recommended Actions', 'reviewNotes']
    ]

    for (const [label, fieldId] of sections) {
      const heading = document.createElement('h2')
      heading.textContent = label
      container.append(heading)

      const preview = document.createElement('div')
      const source = form.elements.namedItem(fieldId)?.value || ''
      renderMarkdownInto(source, preview)
      container.append(preview)
    }

    const data = getFormData()
    const overviewHeading = document.createElement('h2')
    overviewHeading.textContent = 'Overview'
    container.append(overviewHeading)
    const overviewList = document.createElement('ul')
    for (const detail of [
      `Responsible Business Unit: ${data.businessUnit || ''}`,
      `Project Lead Position: ${data.projectLeadPosition || ''}`,
      `Project Lead Name: ${data.projectLeadName || ''}`,
      `Assessment Date: ${data.assessmentDate || ''}`
    ]) {
      const detailItem = document.createElement('li')
      detailItem.textContent = detail
      overviewList.append(detailItem)
    }
    container.append(overviewList)

    const personalInfoHeading = document.createElement('h2')
    personalInfoHeading.textContent = 'Personal Information Collected'
    container.append(personalInfoHeading)
    const personalInfoListElement = document.createElement('ul')
    for (const item of data.personalInfoItems || []) {
      const li = document.createElement('li')
      li.textContent = `${item.name || 'Item'}: ${item.useOrDisclosure || ''}`
      personalInfoListElement.append(li)
    }
    container.append(personalInfoListElement)

    const sourceHeading = document.createElement('h2')
    sourceHeading.textContent = 'Sources of Personal Information'
    container.append(sourceHeading)
    const sourceList = document.createElement('ul')
    for (const source of data.informationSourcesItems || []) {
      const li = document.createElement('li')
      li.textContent = source
      sourceList.append(li)
    }
    container.append(sourceList)

    const accessHeading = document.createElement('h2')
    accessHeading.textContent = 'Roles with Access to Personal Information'
    container.append(accessHeading)
    const accessList = document.createElement('ul')
    for (const role of data.accessRoles || []) {
      const li = document.createElement('li')
      li.textContent = role
      accessList.append(li)
    }
    container.append(accessList)

    const reviewOverviewHeading = document.createElement('h2')
    reviewOverviewHeading.textContent = 'Review'
    container.append(reviewOverviewHeading)
    const reviewOverviewList = document.createElement('ul')
    for (const detail of [
      `Reviewed By Name: ${data.reviewedByName || ''}`,
      `Reviewed By Position: ${data.reviewedByPosition || ''}`,
      `Review Date: ${data.reviewDate || ''}`
    ]) {
      const detailItem = document.createElement('li')
      detailItem.textContent = detail
      reviewOverviewList.append(detailItem)
    }
    container.append(reviewOverviewList)

    return `<!doctype html><html><head><meta charset="utf-8"></head><body>${container.innerHTML}</body></html>`
  }

  const renderSavedList = () => {
    const documents = getDocumentsSortedByUpdatedAt()

    savedPiasList.textContent = ''
    savedPiasEmptyState.classList.toggle('d-none', documents.length > 0)

    for (const doc of documents) {
      const buttonRow = document.createElement('div')
      buttonRow.className =
        'list-group-item d-flex justify-content-between align-items-center gap-3 flex-wrap'

      const detailsContainer = document.createElement('div')
      const titleLine = document.createElement('div')
      titleLine.className = 'fw-semibold'
      titleLine.textContent = doc.name || 'Untitled PIA'

      const updatedLine = document.createElement('div')
      updatedLine.className = 'small text-muted'
      updatedLine.textContent = `Updated ${new Date(doc.updatedAt).toLocaleString()}`
      detailsContainer.append(titleLine, updatedLine)

      const actionsContainer = document.createElement('div')
      actionsContainer.className = 'd-flex gap-2'

      const openButton = document.createElement('button')
      openButton.type = 'button'
      openButton.className = 'btn btn-sm btn-outline-primary'
      openButton.dataset.action = 'open'
      openButton.dataset.id = doc.id
      openButton.textContent = 'Open'

      const deleteButton = document.createElement('button')
      deleteButton.type = 'button'
      deleteButton.className = 'btn btn-sm btn-outline-danger'
      deleteButton.dataset.action = 'delete'
      deleteButton.dataset.id = doc.id
      deleteButton.textContent = 'Delete'

      actionsContainer.append(openButton, deleteButton)
      buttonRow.append(detailsContainer, actionsContainer)

      savedPiasList.append(buttonRow)
    }
  }

  const setStep = (stepIndex) => {
    currentStep = Math.min(Math.max(stepIndex, 0), stepCards.length - 1)

    for (const [index, card] of stepCards.entries()) {
      card.classList.toggle('d-none', index !== currentStep)
    }

    for (const [index, step] of stepIndicatorItems.entries()) {
      step.classList.toggle('active', index === currentStep)
    }

    previousStepButton.disabled = currentStep === 0
    nextStepButton.textContent =
      currentStep === stepCards.length - 1 ? 'Finish & Save' : 'Next'
  }

  const closeModalsForPrint = () => {
    for (const modalElement of document.querySelectorAll('.modal')) {
      const modalInstance = bootstrap.Modal.getInstance(modalElement)
      modalInstance?.hide()
    }

    document.body.classList.remove('modal-open')
    for (const backdrop of document.querySelectorAll('.modal-backdrop')) {
      backdrop.remove()
    }
  }

  savedPiasList.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement)?.closest(
      'button[data-action]'
    ) as HTMLButtonElement

    if (!button) {
      return
    }

    const action = button.dataset.action
    const id = button.dataset.id

    if (action === 'open') {
      loadDocument(id)
      bootstrap.Modal.getInstance('#savedPiasModal')?.hide()
      return
    }

    if (action === 'delete') {
      deleteDocument(id)
    }
  })

  for (const markdownFieldId of markdownFieldIds) {
    const textarea = form.elements.namedItem(
      markdownFieldId
    ) as HTMLTextAreaElement

    textarea?.addEventListener('input', () => {
      updateMarkdownPreview(markdownFieldId)
      clearStatus()
    })
  }

  document.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement)?.closest(
      '[data-md-target][data-md-mode]'
    ) as HTMLButtonElement

    if (!button) {
      return
    }

    setMarkdownMode(button.dataset.mdTarget, button.dataset.mdMode)
  })

  for (const stepButton of stepTabButtons) {
    stepButton.addEventListener('click', () => {
      const step = Number(stepButton.dataset.step)
      setStep(step)
    })
  }

  addPersonalInfoButton.addEventListener('click', () => {
    personalInfoList.append(buildPersonalInfoRow())
    clearStatus()
  })

  addInformationSourceButton.addEventListener('click', () => {
    informationSourcesList.append(buildInformationSourceRow())
    clearStatus()
  })

  addAccessRoleButton.addEventListener('click', () => {
    accessRolesList.append(buildAccessRoleRow())
    clearStatus()
  })

  piaNameInput.addEventListener('input', updateHeaderTitle)

  nextStepButton.addEventListener('click', () => {
    if (currentStep < stepCards.length - 1) {
      setStep(currentStep + 1)
    } else {
      persistCurrent()
    }
  })

  previousStepButton.addEventListener('click', () => setStep(currentStep - 1))
  saveButton.addEventListener('click', persistCurrent)

  confirmNewPiaButton.addEventListener('click', () => {
    const newPiaName = (
      (document.querySelector('#newPiaName') as HTMLInputElement)?.value || ''
    ).trim()
    createNewDocument(newPiaName)
    bootstrap.Modal.getInstance('#newPiaModal')?.hide()
    showStatus(
      `Created ${newPiaName ? `"${newPiaName}"` : 'a new PIA'}.`,
      'info'
    )
  })

  openSavedPiasButton.addEventListener('click', renderSavedList)

  exportMarkdownButton.addEventListener('click', () => {
    exportToFile(
      `${getExportSlug()}.md`,
      'text/markdown;charset=utf-8',
      buildMarkdownExport()
    )
    showStatus('Exported Markdown file.', 'success')
  })

  exportJsonButton.addEventListener('click', () => {
    exportToFile(
      `${getExportSlug()}.json`,
      'application/json;charset=utf-8',
      JSON.stringify(
        {
          id: currentDocumentId,
          name: getCurrentDocumentName(),
          exportedAt: new Date().toISOString(),
          data: getFormData()
        },
        null,
        2
      )
    )
    showStatus('Exported JSON file.', 'success')
  })

  exportWordButton.addEventListener('click', () => {
    exportToFile(
      `${getExportSlug()}.doc`,
      'text/html;charset=utf-8',
      buildWordExport()
    )
    showStatus('Exported Microsoft Word document.', 'success')
  })

  importButton.addEventListener('click', () => {
    importJsonInput.value = ''
    importJsonInput.click()
  })

  importJsonInput.addEventListener('change', async () => {
    const [file] = importJsonInput.files || []

    if (!file) {
      return
    }

    try {
      const text = await file.text()
      const imported = JSON.parse(text)
      const importedData = imported?.data

      if (!importedData || typeof importedData !== 'object') {
        throw new Error('Missing data payload.')
      }

      form.reset()
      currentDocumentId = imported?.id || generateDocumentId()
      setFormData(importedData)

      if ((imported?.name || '').trim() && !piaNameInput.value.trim()) {
        piaNameInput.value = imported.name.trim()
        updateHeaderTitle()
      }

      setStep(0)
      showStatus(`Imported "${imported?.name || 'PIA'}" from JSON.`, 'success')
    } catch {
      showStatus(
        'Import failed. Please choose a valid exported JSON file.',
        'danger'
      )
    }
  })

  printButton.addEventListener('click', () => {
    closeModalsForPrint()
    updateAllMarkdownPreviews()
    window.print()
  })

  window.addEventListener('beforeprint', () => {
    closeModalsForPrint()
    updateAllMarkdownPreviews()
  })

  form.addEventListener('input', clearStatus)

  const existingDocuments = getDocumentsSortedByUpdatedAt()

  if (existingDocuments.length > 0) {
    const [latest] = existingDocuments

    if (latest) {
      currentDocumentId = latest.id
      setFormData(latest.data || {})
      showStatus(`Loaded most recent draft: "${latest.name}".`, 'info')
    }
  } else {
    createNewDocument()
  }

  ensureMinimumListRows()

  for (const fieldId of markdownFieldIds) {
    setMarkdownMode(fieldId, 'edit')
  }

  updateAllMarkdownPreviews()
  setStep(0)
})()
