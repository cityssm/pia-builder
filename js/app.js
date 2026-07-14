(() => {
    const storageKey = 'piaBuilder.documents.v1';
    const form = document.querySelector('#piaForm');
    const stepCards = [
        ...document.querySelectorAll('.step-card')
    ];
    const stepIndicatorItems = [
        ...document.querySelectorAll('#stepIndicator li')
    ];
    const stepTabButtons = [
        ...document.querySelectorAll('.step-tab')
    ];
    const previousStepButton = document.querySelector('#prevStepButton');
    const nextStepButton = document.querySelector('#nextStepButton');
    const saveButton = document.querySelector('#saveButton');
    const importButton = document.querySelector('#importButton');
    const importJsonInput = document.querySelector('#importJsonInput');
    const confirmNewPiaButton = document.querySelector('#confirmNewPiaButton');
    const savedPiasList = document.querySelector('#savedPiasList');
    const savedPiasEmptyState = document.querySelector('#savedPiasEmptyState');
    const openSavedPiasButton = document.querySelector('#openSavedPiasButton');
    const exportMarkdownButton = document.querySelector('#exportMarkdownButton');
    const exportJsonButton = document.querySelector('#exportJsonButton');
    const exportWordButton = document.querySelector('#exportWordButton');
    const printButton = document.querySelector('#printButton');
    const statusToastElement = document.querySelector('#statusToast');
    const statusToastBody = document.querySelector('#statusToastBody');
    const piaNameInput = document.querySelector('#piaName');
    const activePiaTitle = document.querySelector('#activePiaTitle');
    const addPersonalInfoButton = document.querySelector('#addPersonalInfoButton');
    const personalInfoList = document.querySelector('#personalInfoList');
    const addInformationSourceButton = document.querySelector('#addInformationSourceButton');
    const informationSourcesList = document.querySelector('#informationSourcesList');
    const addAccessRoleButton = document.querySelector('#addAccessRoleButton');
    const accessRolesList = document.querySelector('#accessRolesList');
    const addTechnicalSafeguardMenu = document.querySelector('#addTechnicalSafeguardMenu');
    const technicalSafeguardsList = document.querySelector('#technicalSafeguardsList');
    const addAdministrativeSafeguardMenu = document.querySelector('#addAdministrativeSafeguardMenu');
    const administrativeSafeguardsList = document.querySelector('#administrativeSafeguardsList');
    const addPhysicalSafeguardMenu = document.querySelector('#addPhysicalSafeguardMenu');
    const physicalSafeguardsList = document.querySelector('#physicalSafeguardsList');
    const emptyFieldsSummary = document.querySelector('#emptyFieldsSummary');
    const emptyFieldsSummaryList = document.querySelector('#emptyFieldsSummaryList');
    const markdownFieldIds = [
        'initiativeSummary',
        'legalAuthority',
        'collectionUseDisclosure',
        'retentionDisposal',
        'riskSummary',
        'riskMitigation'
    ];
    let currentStep = 0;
    let currentDocumentId = '';
    let statusToastTimeoutId;
    let dynamicFieldIndex = 0;
    const statusToastInstance = statusToastElement
        ? new bootstrap.Toast(statusToastElement, { autohide: false })
        : null;
    const generateDocumentId = () => {
        if (typeof crypto !== 'undefined' &&
            typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }
        return `pia-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    };
    const loadDocuments = () => {
        try {
            return JSON.parse(localStorage.getItem(storageKey) || '[]');
        }
        catch {
            return [];
        }
    };
    const saveDocuments = (documents) => {
        localStorage.setItem(storageKey, JSON.stringify(documents));
    };
    const getDocumentsSortedByUpdatedAt = () => loadDocuments().sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    const showStatus = (message, type = 'info') => {
        if (!statusToastInstance || !statusToastBody || !statusToastElement) {
            return;
        }
        const toastClassByType = {
            info: 'text-bg-primary',
            success: 'text-bg-success',
            warning: 'text-bg-warning',
            danger: 'text-bg-danger'
        };
        for (const cssClass of [
            ...Object.values(toastClassByType),
            'text-bg-secondary'
        ]) {
            statusToastElement.classList.remove(cssClass);
        }
        statusToastElement.classList.add(toastClassByType[type] || 'text-bg-secondary');
        statusToastBody.textContent = message;
        statusToastInstance.show();
        if (statusToastTimeoutId) {
            clearTimeout(statusToastTimeoutId);
        }
        statusToastTimeoutId = setTimeout(() => {
            statusToastInstance.hide();
            statusToastTimeoutId = undefined;
        }, 3200);
    };
    const clearStatus = () => {
        if (statusToastTimeoutId) {
            clearTimeout(statusToastTimeoutId);
            statusToastTimeoutId = undefined;
        }
        statusToastInstance?.hide();
    };
    const parseInformationSourceItems = (data) => {
        if (Array.isArray(data?.informationSourcesItems)) {
            return data.informationSourcesItems;
        }
        if (typeof data?.informationSources === 'string') {
            return data.informationSources
                .split('\n')
                .map((line) => line.trim())
                .filter((line) => line);
        }
        return [];
    };
    const splitPositionAndName = (combinedValue) => {
        const value = (combinedValue || '').trim();
        if (value === '') {
            return { position: '', name: '' };
        }
        const dividerIndex = value.indexOf('/');
        if (dividerIndex === -1) {
            return { position: value, name: '' };
        }
        return {
            position: value.slice(0, dividerIndex).trim(),
            name: value.slice(dividerIndex + 1).trim()
        };
    };
    const updateHeaderTitle = () => {
        const name = (piaNameInput.value || '').trim();
        activePiaTitle.textContent = name || 'Untitled PIA';
    };
    const generateDynamicFieldId = (prefix) => {
        dynamicFieldIndex += 1;
        return `${prefix}-${dynamicFieldIndex}`;
    };
    const isSafeUrlAttributeValue = (value) => {
        const trimmedValue = (value || '').trim();
        if (trimmedValue === '' || trimmedValue.startsWith('#')) {
            return true;
        }
        const normalizedValue = trimmedValue
            .replaceAll(/[\u0000-\u0020\u007f\s]+/g, '')
            .toLowerCase();
        try {
            const parsedUrl = new URL(normalizedValue, 'https://pia-builder.local');
            return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsedUrl.protocol);
        }
        catch {
            return false;
        }
    };
    const renderMarkdownInto = (source, container, placeholder = null) => {
        const trimmedSource = (source || '').trim();
        if (trimmedSource === '') {
            container.textContent = '';
            if (placeholder) {
                const paragraph = document.createElement('p');
                paragraph.textContent = placeholder;
                container.append(paragraph);
            }
            return;
        }
        const renderedHtml = marked.parse(trimmedSource);
        const sanitizedHtmlTemplate = document.createElement('template');
        sanitizedHtmlTemplate.innerHTML = renderedHtml;
        for (const blockedElement of sanitizedHtmlTemplate.content.querySelectorAll('script, iframe, object, embed, link, meta, style, base')) {
            blockedElement.remove();
        }
        for (const element of sanitizedHtmlTemplate.content.querySelectorAll('*')) {
            for (const attribute of [...element.attributes]) {
                const attributeName = attribute.name.toLowerCase();
                if (attributeName.startsWith('on')) {
                    element.removeAttribute(attribute.name);
                    continue;
                }
                if (['href', 'src', 'xlink:href', 'formaction'].includes(attributeName) &&
                    !isSafeUrlAttributeValue(attribute.value)) {
                    element.removeAttribute(attribute.name);
                }
            }
        }
        container.innerHTML = sanitizedHtmlTemplate.innerHTML;
    };
    const updateMarkdownPreview = (fieldId) => {
        const sourceTextarea = form.elements.namedItem(fieldId);
        const preview = document.getElementById(`${fieldId}Preview`);
        if (!sourceTextarea || !preview) {
            return;
        }
        renderMarkdownInto(sourceTextarea.value || '', preview, '');
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
    const buildWarningFieldWrapper = (field) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'field-warning-wrapper';
        field.classList.add('field-warning-input');
        const warningIcon = document.createElement('span');
        warningIcon.className = 'field-empty-warning text-warning d-none';
        if (field.tagName === 'TEXTAREA') {
            warningIcon.classList.add('textarea-warning');
        }
        warningIcon.innerHTML =
            '<i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i><span class="visually-hidden">This field is empty</span>';
        wrapper.append(field, warningIcon);
        return wrapper;
    };
    const ensureWarningFieldWrapper = (field) => {
        if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)) {
            return;
        }
        if (field.parentElement?.classList.contains('field-warning-wrapper')) {
            return;
        }
        const parentElement = field.parentElement;
        if (!parentElement) {
            return;
        }
        const nextSibling = field.nextSibling;
        const wrapper = buildWarningFieldWrapper(field);
        if (nextSibling) {
            parentElement.insertBefore(wrapper, nextSibling);
            return;
        }
        parentElement.append(wrapper);
    };
    const getFieldEmptyWarningIcon = (field) => field.parentElement?.querySelector('.field-empty-warning');
    const setFieldWarningState = (field, isEmpty) => {
        const warningIcon = getFieldEmptyWarningIcon(field);
        if (!warningIcon) {
            return;
        }
        warningIcon.classList.toggle('d-none', !isEmpty);
    };
    const normalizeWhitespace = (labelText) => (labelText || '').replaceAll(/\s+/g, ' ').trim();
    const getWarnableFields = () => [
        ...form.querySelectorAll('input.form-control, textarea.form-control')
    ].filter((field) => !field.disabled && field.type !== 'hidden');
    const buildListControls = (row, removeLabel) => {
        const controls = document.createElement('div');
        controls.className = 'dynamic-list-controls justify-content-end';
        const reorderButtonClass = 'btn btn-sm btn-outline-secondary reorder-item-button';
        const moveUpButton = document.createElement('button');
        moveUpButton.type = 'button';
        moveUpButton.className = reorderButtonClass;
        moveUpButton.innerHTML =
            '<i class="fa-solid fa-arrow-up" aria-hidden="true"></i> <span class="visually-hidden">Move Up</span>';
        moveUpButton.addEventListener('click', () => {
            const previousRow = row.previousElementSibling;
            if (previousRow) {
                previousRow.before(row);
            }
            refreshCompletionWarnings();
            clearStatus();
        });
        const moveDownButton = document.createElement('button');
        moveDownButton.type = 'button';
        moveDownButton.className = reorderButtonClass;
        moveDownButton.innerHTML =
            '<i class="fa-solid fa-arrow-down" aria-hidden="true"></i> <span class="visually-hidden">Move Down</span>';
        moveDownButton.addEventListener('click', () => {
            const nextRow = row.nextElementSibling;
            if (nextRow) {
                nextRow.after(row);
            }
            refreshCompletionWarnings();
            clearStatus();
        });
        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'btn btn-sm btn-outline-danger remove-item-button';
        removeButton.innerHTML = `<i class="fa-solid fa-trash" aria-hidden="true"></i> <span class="visually-hidden">${removeLabel}</span>`;
        removeButton.addEventListener('click', () => {
            row.remove();
            refreshCompletionWarnings();
            clearStatus();
        });
        controls.append(moveUpButton, moveDownButton, removeButton);
        return controls;
    };
    const buildPersonalInfoRow = (item = {}) => {
        const row = document.createElement('div');
        row.className = 'dynamic-list-item';
        const nameFieldId = generateDynamicFieldId('personal-info-name');
        const useFieldId = generateDynamicFieldId('personal-info-use');
        const infoLabel = document.createElement('label');
        infoLabel.className = 'form-label';
        infoLabel.htmlFor = nameFieldId;
        infoLabel.textContent = 'Personal Information Element';
        const infoInput = document.createElement('input');
        infoInput.id = nameFieldId;
        infoInput.className = 'form-control mb-2 personal-info-name';
        infoInput.value = item.name || '';
        infoInput.placeholder = 'e.g., Home address, email, employee ID';
        const useLabel = document.createElement('label');
        useLabel.className = 'form-label';
        useLabel.htmlFor = useFieldId;
        useLabel.textContent = 'Intended Use or Disclosure';
        const useInput = document.createElement('textarea');
        useInput.id = useFieldId;
        useInput.className = 'form-control personal-info-use';
        useInput.rows = 2;
        useInput.placeholder = 'How this item will be used and/or disclosed';
        useInput.value = item.useOrDisclosure || '';
        const infoFieldWrapper = buildWarningFieldWrapper(infoInput);
        const useFieldWrapper = buildWarningFieldWrapper(useInput);
        const controls = buildListControls(row, 'Remove Item');
        row.append(infoLabel, infoFieldWrapper, useLabel, useFieldWrapper, controls);
        return row;
    };
    const buildInformationSourceRow = (source = '') => {
        const row = document.createElement('div');
        row.className = 'dynamic-list-item';
        const sourceFieldId = generateDynamicFieldId('information-source');
        const sourceLabel = document.createElement('label');
        sourceLabel.className = 'form-label';
        sourceLabel.htmlFor = sourceFieldId;
        sourceLabel.textContent = 'Source';
        const sourceInput = document.createElement('input');
        sourceInput.id = sourceFieldId;
        sourceInput.className = 'form-control information-source';
        sourceInput.placeholder =
            'e.g., Data subject, external partner, another institution';
        sourceInput.value = source;
        const sourceFieldWrapper = buildWarningFieldWrapper(sourceInput);
        const controls = buildListControls(row, 'Remove Source');
        row.append(sourceLabel, sourceFieldWrapper, controls);
        return row;
    };
    const buildAccessRoleRow = (title = '') => {
        const row = document.createElement('div');
        row.className = 'dynamic-list-item';
        const accessRoleFieldId = generateDynamicFieldId('access-role-title');
        const label = document.createElement('label');
        label.className = 'form-label';
        label.htmlFor = accessRoleFieldId;
        label.textContent = 'Position Title';
        const input = document.createElement('input');
        input.id = accessRoleFieldId;
        input.className = 'form-control access-role-title';
        input.placeholder = 'Position title with access to personal information';
        input.value = title;
        const inputWrapper = buildWarningFieldWrapper(input);
        const controls = buildListControls(row, 'Remove');
        row.append(label, inputWrapper, controls);
        return row;
    };
    const buildSafeguardRow = (type, value = '') => {
        const row = document.createElement('div');
        row.className = 'dynamic-list-item markdown-field';
        const textAreaFieldId = generateDynamicFieldId(`${type}-safeguard`);
        row.dataset.markdownField = textAreaFieldId;
        const fieldHeader = document.createElement('div');
        fieldHeader.className = 'd-flex align-items-center gap-2 mb-2';
        const label = document.createElement('label');
        label.className = 'form-label mb-0';
        label.htmlFor = textAreaFieldId;
        label.textContent = 'Safeguard';
        const tabs = document.createElement('div');
        tabs.className = 'markdown-tabs btn-group btn-group-sm';
        tabs.role = 'group';
        tabs.setAttribute('aria-label', 'Safeguard mode');
        const editButton = document.createElement('button');
        editButton.type = 'button';
        editButton.className = 'btn btn-outline-secondary active';
        editButton.dataset.mdTarget = textAreaFieldId;
        editButton.dataset.mdMode = 'edit';
        editButton.textContent = 'Edit';
        const previewButton = document.createElement('button');
        previewButton.type = 'button';
        previewButton.className = 'btn btn-outline-secondary';
        previewButton.dataset.mdTarget = textAreaFieldId;
        previewButton.dataset.mdMode = 'preview';
        previewButton.textContent = 'Preview';
        tabs.append(editButton, previewButton);
        const input = document.createElement('textarea');
        input.id = textAreaFieldId;
        input.className = `form-control markdown-input safeguard-item ${type}-safeguard-item`;
        input.rows = 3;
        input.placeholder =
            'Describe this safeguard. Markdown formatting is supported.';
        input.value = value;
        const preview = document.createElement('div');
        preview.id = `${textAreaFieldId}Preview`;
        preview.className = 'markdown-preview p-3 border rounded d-none';
        const updatePreview = () => renderMarkdownInto(input.value || '', preview, '');
        input.addEventListener('input', updatePreview);
        updatePreview();
        const inputWrapper = buildWarningFieldWrapper(input);
        const controls = buildListControls(row, 'Remove Safeguard');
        fieldHeader.append(label, tabs);
        row.append(fieldHeader, inputWrapper, preview, controls);
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
    const getInformationSources = () => [...informationSourcesList.querySelectorAll('.information-source')]
        .map((input) => (input.value || '').trim())
        .filter((source) => source !== '');
    const getSafeguards = (list, itemSelector) => [...list.querySelectorAll(itemSelector)]
        .map((input) => (input.value || '').trim())
        .filter((item) => item !== '');
    const dynamicListSummaryConfigById = new Map([
        [
            'personalInfoList',
            {
                label: 'Personal Information Collected',
                getCount: () => getPersonalInfoItems().length
            }
        ],
        [
            'informationSourcesList',
            {
                label: 'Sources of Personal Information to be Collected',
                getCount: () => getInformationSources().length
            }
        ],
        [
            'technicalSafeguardsList',
            {
                label: 'Technical Safeguards',
                getCount: () => getSafeguards(technicalSafeguardsList, '.technical-safeguard-item')
                    .length
            }
        ],
        [
            'administrativeSafeguardsList',
            {
                label: 'Administrative Safeguards',
                getCount: () => getSafeguards(administrativeSafeguardsList, '.administrative-safeguard-item').length
            }
        ],
        [
            'physicalSafeguardsList',
            {
                label: 'Physical Safeguards',
                getCount: () => getSafeguards(physicalSafeguardsList, '.physical-safeguard-item')
                    .length
            }
        ],
        [
            'accessRolesList',
            {
                label: 'Roles with Access to Personal Information',
                getCount: () => getAccessRoles().length
            }
        ]
    ]);
    const getFieldWarningDescription = (field) => {
        const matchingLabel = field.id
            ? form.querySelector(`label[for="${field.id}"]`)
            : null;
        const fieldLabel = normalizeWhitespace(matchingLabel?.textContent || '');
        for (const [listId, config] of dynamicListSummaryConfigById.entries()) {
            const listElement = document.getElementById(listId);
            if (!listElement || !listElement.contains(field)) {
                continue;
            }
            const row = field.closest('.dynamic-list-item');
            const rowIndex = row
                ? [...listElement.querySelectorAll('.dynamic-list-item')].indexOf(row) +
                    1
                : 0;
            return `${config.label} (item ${rowIndex || 1}): ${fieldLabel || 'Field'}`;
        }
        return (fieldLabel ||
            normalizeWhitespace(field.name) ||
            normalizeWhitespace(field.id) ||
            'Unnamed field');
    };
    const getEmptyListSummaries = () => {
        const emptyListSummaries = [];
        for (const config of dynamicListSummaryConfigById.values()) {
            if (config.getCount() === 0) {
                emptyListSummaries.push(`List has no items: ${config.label}`);
            }
        }
        return emptyListSummaries;
    };
    const refreshCompletionWarnings = () => {
        if (!emptyFieldsSummary || !emptyFieldsSummaryList) {
            return;
        }
        const emptyFieldSummaries = [];
        for (const field of getWarnableFields()) {
            ensureWarningFieldWrapper(field);
            const isEmpty = (field.value || '').trim() === '';
            setFieldWarningState(field, isEmpty);
            if (isEmpty) {
                emptyFieldSummaries.push(getFieldWarningDescription(field));
            }
        }
        const emptyListSummaries = getEmptyListSummaries();
        const summaryItems = [...emptyFieldSummaries, ...emptyListSummaries];
        emptyFieldsSummaryList.replaceChildren(...summaryItems.map((summaryItem) => {
            const listItem = document.createElement('li');
            listItem.textContent = summaryItem;
            return listItem;
        }));
        emptyFieldsSummary.classList.toggle('d-none', summaryItems.length === 0);
    };
    const getFormData = () => {
        const raw = Object.fromEntries(new FormData(form).entries());
        raw.personalInfoItems = getPersonalInfoItems();
        raw.informationSourcesItems = getInformationSources();
        raw.accessRoles = getAccessRoles();
        raw.technicalSafeguardsItems = getSafeguards(technicalSafeguardsList, '.technical-safeguard-item');
        raw.administrativeSafeguardsItems = getSafeguards(administrativeSafeguardsList, '.administrative-safeguard-item');
        raw.physicalSafeguardsItems = getSafeguards(physicalSafeguardsList, '.physical-safeguard-item');
        return raw;
    };
    const setFormData = (data) => {
        for (const [key, value] of Object.entries(data || {})) {
            if (key === 'personalInfoItems' ||
                key === 'accessRoles' ||
                key === 'informationSourcesItems' ||
                key === 'technicalSafeguardsItems' ||
                key === 'administrativeSafeguardsItems' ||
                key === 'physicalSafeguardsItems') {
                continue;
            }
            const field = form.elements.namedItem(key);
            if (field) {
                field.value = value ?? '';
            }
        }
        personalInfoList.textContent = '';
        informationSourcesList.textContent = '';
        accessRolesList.textContent = '';
        technicalSafeguardsList.textContent = '';
        administrativeSafeguardsList.textContent = '';
        physicalSafeguardsList.textContent = '';
        const personalItems = Array.isArray(data?.personalInfoItems)
            ? data.personalInfoItems
            : [];
        const informationSourceItems = parseInformationSourceItems(data);
        const roleItems = Array.isArray(data?.accessRoles) ? data.accessRoles : [];
        const getSafeguardsFromData = (itemKey, legacyKey, fallbackLegacyKey = '') => {
            if (Array.isArray(data?.[itemKey])) {
                return data[itemKey];
            }
            if ((data?.[legacyKey] || '').trim()) {
                return [data[legacyKey]];
            }
            if (fallbackLegacyKey && (data?.[fallbackLegacyKey] || '').trim()) {
                return [data[fallbackLegacyKey]];
            }
            return [];
        };
        const technicalSafeguardsItems = getSafeguardsFromData('technicalSafeguardsItems', 'technicalSafeguards', 'safeguards');
        const administrativeSafeguardsItems = getSafeguardsFromData('administrativeSafeguardsItems', 'administrativeSafeguards');
        const physicalSafeguardsItems = getSafeguardsFromData('physicalSafeguardsItems', 'physicalSafeguards');
        const applyLegacyCombinedField = (legacyFieldKey, positionFieldKey, nameFieldKey) => {
            if (!(data?.[legacyFieldKey] || '').trim()) {
                return;
            }
            const { position, name } = splitPositionAndName(data[legacyFieldKey]);
            if (!data[positionFieldKey]) {
                const positionInput = form.elements.namedItem(positionFieldKey);
                if (positionInput) {
                    positionInput.value = position;
                }
            }
            if (!data[nameFieldKey]) {
                const nameInput = form.elements.namedItem(nameFieldKey);
                if (nameInput) {
                    nameInput.value = name;
                }
            }
        };
        applyLegacyCombinedField('projectLead', 'projectLeadPosition', 'projectLeadName');
        applyLegacyCombinedField('reviewedBy', 'reviewedByPosition', 'reviewedByName');
        for (const item of personalItems) {
            personalInfoList.append(buildPersonalInfoRow(item));
        }
        for (const source of informationSourceItems) {
            informationSourcesList.append(buildInformationSourceRow(source));
        }
        for (const role of roleItems) {
            accessRolesList.append(buildAccessRoleRow(role));
        }
        for (const safeguard of technicalSafeguardsItems) {
            technicalSafeguardsList.append(buildSafeguardRow('technical', safeguard));
        }
        for (const safeguard of administrativeSafeguardsItems) {
            administrativeSafeguardsList.append(buildSafeguardRow('administrative', safeguard));
        }
        for (const safeguard of physicalSafeguardsItems) {
            physicalSafeguardsList.append(buildSafeguardRow('physical', safeguard));
        }
        ensureMinimumListRows();
        updateHeaderTitle();
        updateAllMarkdownPreviews();
        refreshCompletionWarnings();
    };
    const ensureMinimumListRows = () => {
        if (personalInfoList.children.length === 0) {
            personalInfoList.append(buildPersonalInfoRow());
        }
        if (accessRolesList.children.length === 0) {
            accessRolesList.append(buildAccessRoleRow());
        }
        if (informationSourcesList.children.length === 0) {
            informationSourcesList.append(buildInformationSourceRow());
        }
        if (technicalSafeguardsList.children.length === 0) {
            technicalSafeguardsList.append(buildSafeguardRow('technical'));
        }
        if (administrativeSafeguardsList.children.length === 0) {
            administrativeSafeguardsList.append(buildSafeguardRow('administrative'));
        }
        if (physicalSafeguardsList.children.length === 0) {
            physicalSafeguardsList.append(buildSafeguardRow('physical'));
        }
    };
    const getCurrentDocumentName = () => {
        const customName = (piaNameInput.value || '').trim();
        return customName || 'Untitled PIA';
    };
    const getTodayDateString = () => {
        const now = new Date();
        const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
        return localDate.toISOString().slice(0, 10);
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
            createdAt: existingIndex >= 0 ? documents[existingIndex].createdAt || now : now
        };
        if (existingIndex >= 0) {
            documents[existingIndex] = documentRecord;
        }
        else {
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
        const assessmentDateInput = form.elements.namedItem('assessmentDate');
        if (assessmentDateInput) {
            assessmentDateInput.value = getTodayDateString();
        }
        personalInfoList.textContent = '';
        informationSourcesList.textContent = '';
        accessRolesList.textContent = '';
        ensureMinimumListRows();
        setStep(0);
        clearStatus();
        updateHeaderTitle();
        updateAllMarkdownPreviews();
        for (const fieldId of markdownFieldIds) {
            setMarkdownMode(fieldId, 'edit');
        }
        refreshCompletionWarnings();
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
        const formatMarkdownListItem = (item) => (item || '')
            .split('\n')
            .map((line, index) => (index === 0 ? line : `  ${line}`))
            .join('\n');
        const getMarkdownListLines = (items) => (items || []).length > 0
            ? items.map((item) => `- ${formatMarkdownListItem(item)}`).join('\n')
            : '- None listed';
        const personalInfoLines = (data.personalInfoItems || []).length > 0
            ? data.personalInfoItems
                .map((item) => `- **${item.name || 'Item'}:** ${item.useOrDisclosure || ''}`)
                .join('\n')
            : '- None listed';
        const accessRoleLines = (data.accessRoles || []).length > 0
            ? data.accessRoles.map((title) => `- ${title}`).join('\n')
            : '- None listed';
        const informationSourceLines = (data.informationSourcesItems || []).length > 0
            ? data.informationSourcesItems.map((source) => `- ${source}`).join('\n')
            : '- None listed';
        const technicalSafeguardLines = getMarkdownListLines(data.technicalSafeguardsItems || []);
        const administrativeSafeguardLines = getMarkdownListLines(data.administrativeSafeguardsItems || []);
        const physicalSafeguardLines = getMarkdownListLines(data.physicalSafeguardsItems || []);
        return [
            `# ${getCurrentDocumentName()}`,
            '',
            '## Overview',
            '',
            `- **Responsible Business Unit:** ${data.businessUnit || ''}`,
            `- **Project Lead Name:** ${data.projectLeadName || ''}`,
            `- **Project Lead Position:** ${data.projectLeadPosition || ''}`,
            `- **Assessor Name:** ${data.assessorName || ''}`,
            `- **Assessor Position Title:** ${data.assessorPosition || ''}`,
            `- **Assessment Date:** ${data.assessmentDate || ''}`,
            '',
            '## Initiative Summary and Program Context',
            '',
            data.initiativeSummary || '',
            '',
            '## Legal Authority for Collection/Use/Disclosure',
            '',
            data.legalAuthority || '',
            '',
            '## Personal Information Collected',
            '',
            personalInfoLines,
            '',
            '## Sources of Personal Information',
            '',
            informationSourceLines,
            '',
            '## Collection, Use, and Disclosure Controls',
            '',
            data.collectionUseDisclosure || '',
            '',
            '## Retention and Disposal Strategy',
            '',
            data.retentionDisposal || '',
            '',
            '## Technical Safeguards',
            '',
            technicalSafeguardLines,
            '',
            '## Administrative Safeguards',
            '',
            administrativeSafeguardLines,
            '',
            '## Physical Safeguards',
            '',
            physicalSafeguardLines,
            '',
            '## Summary of Risks to Individuals',
            '',
            data.riskSummary || '',
            '',
            '## Steps to Prevent or Reduce Risks',
            '',
            data.riskMitigation || '',
            '',
            '## Roles with Access to Personal Information',
            '',
            accessRoleLines,
            '',
            '## Next Steps',
            '',
            "- Review the PIA with your institution's privacy office or designated privacy contact.",
            '- Address any required mitigations or recommended actions.',
            '- Obtain approvals and signatures as required.',
            '- Gather copies of all relevant documentation, including any checklists completed prior to the PIA, and any documents cited in the "Legal Authorities" section.',
            ''
        ].join('\n');
    };
    const buildWordExport = () => {
        const container = document.createElement('div');
        const title = document.createElement('h1');
        title.textContent = getCurrentDocumentName();
        container.append(title);
        const data = getFormData();
        const overviewHeading = document.createElement('h2');
        overviewHeading.textContent = 'Overview';
        container.append(overviewHeading);
        const overviewList = document.createElement('ul');
        for (const detail of [
            `Responsible Business Unit: ${data.businessUnit || ''}`,
            `Project Lead Name: ${data.projectLeadName || ''}    Signature: ____________________`,
            `Project Lead Position: ${data.projectLeadPosition || ''}`,
            `Assessment Date: ${data.assessmentDate || ''}`,
            `Assessor Name: ${data.assessorName || ''}    Signature: ____________________`,
            `Assessor Position Title: ${data.assessorPosition || ''}`
        ]) {
            const detailItem = document.createElement('li');
            detailItem.textContent = detail;
            overviewList.append(detailItem);
        }
        container.append(overviewList);
        const textSections = [
            ['Initiative Summary and Program Context', 'initiativeSummary'],
            ['Legal Authority for Collection/Use/Disclosure', 'legalAuthority']
        ];
        for (const [label, fieldId] of textSections) {
            const heading = document.createElement('h2');
            heading.textContent = label;
            container.append(heading);
            const preview = document.createElement('div');
            const source = form.elements.namedItem(fieldId)?.value || '';
            renderMarkdownInto(source, preview);
            container.append(preview);
        }
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
        const sourceHeading = document.createElement('h2');
        sourceHeading.textContent = 'Sources of Personal Information';
        container.append(sourceHeading);
        const sourceList = document.createElement('ul');
        for (const source of data.informationSourcesItems || []) {
            const li = document.createElement('li');
            li.textContent = source;
            sourceList.append(li);
        }
        container.append(sourceList);
        const riskSections = [
            [
                'Collection, Use, and Disclosure Controls',
                data.collectionUseDisclosure
            ],
            ['Retention and Disposal Strategy', data.retentionDisposal]
        ];
        for (const [label, source] of riskSections) {
            const heading = document.createElement('h2');
            heading.textContent = label;
            container.append(heading);
            const preview = document.createElement('div');
            renderMarkdownInto(source, preview);
            container.append(preview);
        }
        const safeguardSections = [
            ['Technical Safeguards', data.technicalSafeguardsItems || []],
            ['Administrative Safeguards', data.administrativeSafeguardsItems || []],
            ['Physical Safeguards', data.physicalSafeguardsItems || []]
        ];
        for (const [label, safeguards] of safeguardSections) {
            const heading = document.createElement('h2');
            heading.textContent = label;
            container.append(heading);
            const safeguardsList = document.createElement('ul');
            for (const safeguard of safeguards) {
                const safeguardItem = document.createElement('li');
                const safeguardPreview = document.createElement('div');
                renderMarkdownInto(safeguard, safeguardPreview);
                safeguardItem.append(safeguardPreview);
                safeguardsList.append(safeguardItem);
            }
            if (safeguardsList.children.length === 0) {
                const safeguardItem = document.createElement('li');
                safeguardItem.textContent = 'None listed';
                safeguardsList.append(safeguardItem);
            }
            container.append(safeguardsList);
        }
        const riskSections = [
            ['Summary of Risks to Individuals', data.riskSummary],
            ['Steps to Prevent or Reduce Risks', data.riskMitigation]
        ];
        for (const [label, source] of riskSections) {
            const heading = document.createElement('h2');
            heading.textContent = label;
            container.append(heading);
            const preview = document.createElement('div');
            renderMarkdownInto(source, preview);
            container.append(preview);
        }
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
        const nextStepsHeading = document.createElement('h2');
        nextStepsHeading.textContent = 'Next Steps';
        container.append(nextStepsHeading);
        const nextStepsList = document.createElement('ul');
        for (const detail of [
            "Review the PIA with your institution's privacy office or designated privacy contact.",
            'Address any required mitigations or recommended actions.',
            'Obtain approvals and signatures as required.',
            'Gather copies of all relevant documentation, including any checklists completed prior to the PIA, and any documents cited in the "Legal Authorities" section.'
        ]) {
            const detailItem = document.createElement('li');
            detailItem.textContent = detail;
            nextStepsList.append(detailItem);
        }
        container.append(nextStepsList);
        const reviewOverviewHeading = document.createElement('h2');
        reviewOverviewHeading.textContent = 'Review';
        container.append(reviewOverviewHeading);
        const reviewOverviewList = document.createElement('ul');
        for (const detail of [
            'Reviewed By Name: ____________________    Signature: ____________________',
            'Reviewed By Position: ____________________',
            'Review Date: ____________________'
        ]) {
            const detailItem = document.createElement('li');
            detailItem.textContent = detail;
            reviewOverviewList.append(detailItem);
        }
        container.append(reviewOverviewList);
        const reviewNotesHeading = document.createElement('h2');
        reviewNotesHeading.textContent = 'Review Notes and Recommended Actions';
        container.append(reviewNotesHeading);
        const reviewNotesBlank = document.createElement('p');
        reviewNotesBlank.textContent =
            '____________________________________________________________';
        container.append(reviewNotesBlank);
        return `<!doctype html><html><head><meta charset="utf-8"></head><body>${container.innerHTML}</body></html>`;
    };
    const renderSavedList = () => {
        const documents = getDocumentsSortedByUpdatedAt();
        savedPiasList.textContent = '';
        savedPiasEmptyState.classList.toggle('d-none', documents.length > 0);
        for (const doc of documents) {
            const buttonRow = document.createElement('div');
            buttonRow.className =
                'list-group-item d-flex justify-content-between align-items-center gap-3 flex-wrap';
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
            openButton.innerHTML =
                '<i class="fa-solid fa-folder-open" aria-hidden="true"></i> Open';
            const deleteButton = document.createElement('button');
            deleteButton.type = 'button';
            deleteButton.className = 'btn btn-sm btn-outline-danger';
            deleteButton.dataset.action = 'delete';
            deleteButton.dataset.id = doc.id;
            deleteButton.innerHTML =
                '<i class="fa-solid fa-trash" aria-hidden="true"></i> Delete';
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
        if (currentStep === stepCards.length - 1) {
            refreshCompletionWarnings();
        }
        previousStepButton.disabled = currentStep === 0;
        nextStepButton.innerHTML =
            currentStep === stepCards.length - 1
                ? '<i class="fa-solid fa-floppy-disk" aria-hidden="true"></i> Finish &amp; Save'
                : 'Next <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>';
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
        const button = event.target?.closest('button[data-action]');
        if (!button) {
            return;
        }
        const action = button.dataset.action;
        const id = button.dataset.id;
        if (action === 'open') {
            loadDocument(id);
            bootstrap.Modal.getInstance('#savedPiasModal')?.hide();
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
        const button = event.target?.closest('[data-md-target][data-md-mode]');
        if (!button) {
            return;
        }
        if (!button.dataset.mdTarget || !button.dataset.mdMode) {
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
    addPersonalInfoButton.addEventListener('click', clearStatus);
    document.addEventListener('click', (event) => {
        const personalInfoMenuButton = event.target?.closest('[data-personal-info-value]');
        if (!personalInfoMenuButton) {
            return;
        }
        const name = personalInfoMenuButton.dataset.personalInfoValue || '';
        personalInfoList.append(buildPersonalInfoRow({ name }));
        refreshCompletionWarnings();
        clearStatus();
    });
    addInformationSourceButton.addEventListener('click', () => {
        informationSourcesList.append(buildInformationSourceRow());
        refreshCompletionWarnings();
        clearStatus();
    });
    addAccessRoleButton.addEventListener('click', () => {
        accessRolesList.append(buildAccessRoleRow());
        refreshCompletionWarnings();
        clearStatus();
    });
    for (const { menu, list, type } of [
        {
            menu: addTechnicalSafeguardMenu,
            list: technicalSafeguardsList,
            type: 'technical'
        },
        {
            menu: addAdministrativeSafeguardMenu,
            list: administrativeSafeguardsList,
            type: 'administrative'
        },
        {
            menu: addPhysicalSafeguardMenu,
            list: physicalSafeguardsList,
            type: 'physical'
        }
    ]) {
        menu.addEventListener('click', (event) => {
            const button = event.target?.closest('[data-safeguard-value]');
            if (!button) {
                return;
            }
            list.append(buildSafeguardRow(type, button.dataset.safeguardValue || ''));
            refreshCompletionWarnings();
            clearStatus();
        });
    }
    piaNameInput.addEventListener('input', updateHeaderTitle);
    nextStepButton.addEventListener('click', () => {
        if (currentStep < stepCards.length - 1) {
            setStep(currentStep + 1);
        }
        else {
            persistCurrent();
        }
    });
    previousStepButton.addEventListener('click', () => setStep(currentStep - 1));
    saveButton.addEventListener('click', persistCurrent);
    confirmNewPiaButton.addEventListener('click', () => {
        const newPiaName = (document.querySelector('#newPiaName')?.value || '').trim();
        createNewDocument(newPiaName);
        bootstrap.Modal.getInstance('#newPiaModal')?.hide();
        showStatus(`Created ${newPiaName ? `"${newPiaName}"` : 'a new PIA'}.`, 'info');
    });
    openSavedPiasButton.addEventListener('click', renderSavedList);
    exportMarkdownButton.addEventListener('click', () => {
        exportToFile(`${getExportSlug()}.md`, 'text/markdown;charset=utf-8', buildMarkdownExport());
        showStatus('Exported Markdown file.', 'success');
    });
    exportJsonButton.addEventListener('click', () => {
        exportToFile(`${getExportSlug()}.json`, 'application/json;charset=utf-8', JSON.stringify({
            id: currentDocumentId,
            name: getCurrentDocumentName(),
            exportedAt: new Date().toISOString(),
            data: getFormData()
        }, null, 2));
        showStatus('Exported JSON file.', 'success');
    });
    exportWordButton.addEventListener('click', () => {
        exportToFile(`${getExportSlug()}.doc`, 'text/html;charset=utf-8', buildWordExport());
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
        }
        catch {
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
    form.addEventListener('input', refreshCompletionWarnings);
    const existingDocuments = getDocumentsSortedByUpdatedAt();
    if (existingDocuments.length > 0) {
        const [latest] = existingDocuments;
        if (latest) {
            currentDocumentId = latest.id;
            setFormData(latest.data || {});
            showStatus(`Loaded most recent draft: "${latest.name}".`, 'info');
        }
    }
    else {
        createNewDocument();
    }
    ensureMinimumListRows();
    for (const fieldId of markdownFieldIds) {
        setMarkdownMode(fieldId, 'edit');
    }
    updateAllMarkdownPreviews();
    refreshCompletionWarnings();
    setStep(0);
})();
