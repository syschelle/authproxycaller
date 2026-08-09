(function () {
  'use strict';

  const i18n = window.AppI18n;
  const t = (key, fallback) => (i18n && i18n.t ? i18n.t(key, fallback) : fallback || key);
  const hint = (key, fallback) => (i18n && i18n.hint ? i18n.hint(key, fallback) : fallback || '');
  const FORM_DATA_START = '--- Authproxycaller-FormData v1 ---';
  const FORM_DATA_END = '--- /Authproxycaller-FormData ---';

  const URL_OPTIONS = [
    ['viewer-study', 'scenario.viewerStudy', 'Viewer: Studie über StudyUID'],
    ['viewer-patient', 'scenario.viewerPatient', 'Viewer: alle Studien eines Patienten'],
    ['viewer-accession', 'scenario.viewerAccession', 'Viewer: Patient und Accession Number'],
    ['studysearch-empty', 'scenario.studySearchEmpty', 'Viewer Search ohne Filter'],
    ['studysearch-filtered', 'scenario.studySearchFiltered', 'Viewer Search mit Filtern']
  ];

  const COMPANION_OPTIONS = [
    ['companion-study', 'scenario.companionStudy', 'Companion: Studie über StudyUID'],
    ['companion-patient', 'scenario.companionPatient', 'Companion: Patient mit Issuer'],
    ['companion-accession', 'scenario.companionAccession', 'Companion: Patient und Accession Number'],
    ['companion-multi-accession', 'scenario.companionMultiAccession', 'Companion: mehrere Accession Numbers'],
    ['companion-diagnost', 'scenario.companionDiagnost', 'Companion: abweichender DeepUnity-Ordnerpfad'],
    ['companion-custom', 'scenario.companionCustom', 'Companion: freie Parameterkombination']
  ];

  const SVF_RIS_OPTIONS = [
    ['scenario.deepUnityInsight', 'Start #DeepUnity Insight', {}, { companionOnly: true, includeIssuer: false }],
    ['scenario.systemStudy', 'Systemaufruf für Anzeige einer Studie', { PatientID: '%PATIENTID%', studyUID: '%STUDYUID%' }],
    ['scenario.systemAllStudies', 'Systemaufruf für Anzeige aller Studien', { PatientID: '%PATIENTID%', AccessionNumber: '%ORDERNR%' }],
    ['scenario.systemPatientStudies', 'Systemaufruf für Anzeige aller Studien eines Patienten', { PatientID: '%PATIENTID%' }]
  ];

  const SVF_CARD_OPTIONS = [
    ['scenario.systemPatientOrder', 'Systemaufruf für Anzeige mit Patienten-ID und Auftragsnummer', {
      PatientID: '%patid',
      AccessionNumber: '%auftragsnr'
    }]
  ];

  const FIELD_LABELS = {
    AccessionNumber: ['field.AccessionNumber', 'Auftragsnummer'],
    browserChoice: ['field.browserChoice', 'Browserwahl'],
    companionPath: ['field.companionPath', 'Pfad zur Companion App'],
    debugLevel: ['field.debugLevel', 'Debuglevel'],
    diagnostPath: ['field.diagnostPath', 'Pfad zum DeepUnity-Ordner'],
    dicomFqdn: ['field.dicomFqdn', 'FQDN DicomServices'],
    IssuerOfPatientID: ['field.IssuerOfPatientID', 'IssuerOfPatientID'],
    PatientID: ['field.PatientID', 'Patienten-ID'],
    appName: ['field.companionPath', 'Pfad zur Companion App'],
    encryptedSvf: ['field.encryptedSvf', 'ORBIS Verschlüsselung'],
    idp: ['field.idp', 'IDP'],
    loginserver: ['field.dicomFqdn', 'FQDN DicomServices'],
    password: ['field.password', 'Passwort'],
    remote: ['field.remote', 'Terminal-KIS'],
    server: ['field.viewerFqdn', 'FQDN DU Viewer'],
    studyUID: ['field.studyUID', 'SUID'],
    terminalKis: ['field.terminalKis', 'KIS läuft im Terminal?'],
    urlAuditUserEnabled: ['field.urlAuditUserEnabledShort', 'Audit-Protokoll-Benutzer'],
    urlSharedPassword: ['field.urlSharedPassword', 'Sammelpasswort'],
    urlSharedUser: ['field.urlSharedUser', 'Sammelbenutzer'],
    urlSharedUserEnabled: ['field.urlSharedUserEnabled', 'URL Aufruf Sammelnutzer?'],
    user: ['field.user', 'Benutzername'],
    viewerFqdn: ['field.viewerFqdn', 'FQDN DU Viewer'],
    kisType: ['field.kisType', 'KIS-Typ'],
    sameViewerFqdn: ['field.sameViewerFqdn', 'FQDN für DicomServices und DU Viewer gleich?'],
    foreignPatientIdVariable: ['field.foreignPatientIdVariable', 'Variablenname Patienten-ID'],
    foreignOrderNumberVariable: ['field.foreignOrderNumberVariable', 'Variablenname Auftragsnummer'],
    foreignUserVariable: ['field.foreignUserVariable', 'Variablenname Benutzername'],
    foreignPasswordVariable: ['field.foreignPasswordVariable', 'Variablenname Passwort']
  };

  const state = {
    rawOutput: '',
    urlOutput: '',
    companionOutput: '',
    svfOutput: '',
    svfCardOutput: '',
    svfFrauOutput: '',
    svfOpapOutput: '',
    svfLstmOutput: '',
    sections: [],
    noticeTimeout: 0,
    testDataActive: false,
    testDataSnapshot: null
  };

  const form = document.getElementById('builder-form');
  const output = document.getElementById('output');
  const formError = document.getElementById('form-error');
  const copyUrlButton = document.getElementById('copy-url-button');
  const copyCompanionButton = document.getElementById('copy-companion-button');
  const copySvfButton = document.getElementById('copy-svf-button');
  const copySvfCardButton = document.getElementById('copy-svf-card-button');
  const copySvfFrauButton = document.getElementById('copy-svf-frau-button');
  const copySvfOpapButton = document.getElementById('copy-svf-opap-button');
  const copySvfLstmButton = document.getElementById('copy-svf-lstm-button');
  const clearButton = document.getElementById('clear-button');
  const serverTestButton = document.getElementById('server-test-button');
  const txtExportButton = document.getElementById('txt-export-button');
  const txtImportButton = document.getElementById('txt-import-button');
  const txtImportInput = document.getElementById('txt-import-input');
  const exportDialog = document.getElementById('export-dialog');
  const exportCancelButton = document.getElementById('export-cancel-button');
  const txtCreateButton = document.getElementById('txt-create-button');
  const txtImportDialog = document.getElementById('txt-import-dialog');
  const txtImportCancelButton = document.getElementById('txt-import-cancel-button');
  const txtImportContinueButton = document.getElementById('txt-import-continue-button');
  const hintDialog = document.getElementById('hint-dialog');
  const hintDialogTitle = document.getElementById('hint-dialog-title');
  const hintDialogBody = document.getElementById('hint-dialog-body');
  const hintCloseButton = document.getElementById('hint-close-button');
  const hintDownloadButton = document.getElementById('hint-download-button');
  const hintDownloadDialog = document.getElementById('hint-download-dialog');
  const hintDownloadCloseButton = document.getElementById('hint-download-close-button');
  const hintDownloadCreateButton = document.getElementById('hint-download-create-button');
  const languageDownloadCreateButton = document.getElementById('language-download-create-button');
  const exportChecks = exportDialog.querySelectorAll('input[type="checkbox"]');
  const exportCallTypeRadios = exportDialog.querySelectorAll('input[name="export-call-type"]');
  const displayCallTypeRadios = document.querySelectorAll('input[name="display-call-type"]');
  const displayCompanionOption = document.querySelector('input[name="display-call-type"][value="companion"]').closest('label');
  const exportCompanionOption = exportDialog.querySelector('input[name="export-call-type"][value="companion"]').closest('label');
  const svfExportLabel = exportDialog.querySelector('input[value="svf"]').closest('label').querySelector('span');
  const copyStatus = document.getElementById('copy-status');
  const copyToast = document.getElementById('copy-toast');
  const sameViewerFqdn = document.getElementById('sameViewerFqdn');
  const urlSharedUserEnabled = document.getElementById('urlSharedUserEnabled');
  const viewerFqdn = document.getElementById('viewerFqdn');
  const viewerFqdnContainer = document.querySelector('[data-field="viewerFqdn"]');
  const kisType = document.getElementById('kisType');
  const foreignKisFields = document.querySelectorAll('.foreign-kis-only');
  const orbisKisFields = document.querySelectorAll('.orbis-kis-only');
  const sharedUrlUserFields = document.querySelectorAll('.shared-url-user-only');
  const svfOnlyElements = document.querySelectorAll('.svf-only');

  function updateServerFields() {
    const sameFqdn = sameViewerFqdn.checked;
    viewerFqdn.disabled = sameFqdn;
    viewerFqdnContainer.classList.toggle('hidden', sameFqdn);
    if (sameFqdn) {
      viewerFqdnContainer.classList.remove('invalid');
    }

    const sharedUserActive = urlSharedUserEnabled.checked;
    sharedUrlUserFields.forEach((field) => {
      const input = field.querySelector('input, select, textarea');
      field.classList.toggle('hidden', !sharedUserActive);
      if (input) {
        input.disabled = !sharedUserActive;
      }
    });
  }

  function updateKisFields() {
    const isForeignKis = kisType.value === 'fremd';
    foreignKisFields.forEach((field) => {
      const input = field.querySelector('input, select, textarea');
      field.classList.toggle('hidden', !isForeignKis);
      if (input) {
        input.disabled = !isForeignKis;
      }
    });
    orbisKisFields.forEach((field) => {
      const input = field.querySelector('input, select, textarea');
      field.classList.toggle('hidden', isForeignKis);
      if (input) {
        input.disabled = isForeignKis;
      }
    });
    svfOnlyElements.forEach((element) => {
      element.classList.toggle('hidden', isForeignKis);
    });
    copySvfButton.textContent = isForeignKis ? t('section.foreignRis', 'Fremd-RIS') : 'SVF-RIS';
    svfExportLabel.textContent = isForeignKis ? t('section.foreignRis', 'Fremd-RIS') : 'SVF-RIS';
  }

  function fieldLabel(fieldId) {
    const label = FIELD_LABELS[fieldId];
    if (Array.isArray(label)) {
      return t(label[0], label[1]);
    }
    const control = document.getElementById(fieldId);
    const field = control ? control.closest('label') : null;
    const labelText = field ? field.querySelector('[data-i18n], span') : null;
    return labelText ? labelText.textContent.replace('*', '').trim() : fieldId;
  }

  function closeHintDialog() {
    hintDialog.classList.add('hidden');
  }

  function openHintDialog(fieldId) {
    const title = fieldLabel(fieldId);
    const body = hint(fieldId, t('message.noFieldHint', 'Für dieses Feld ist noch kein Hinweis hinterlegt.'));
    hintDialogTitle.textContent = title;
    hintDialogBody.textContent = body;
    hintDialog.classList.remove('hidden');
    hintCloseButton.focus();
  }

  function openHintDownloadDialog() {
    hintDownloadDialog.classList.remove('hidden');
    hintDownloadCreateButton.focus();
  }

  function closeHintDownloadDialog() {
    hintDownloadDialog.classList.add('hidden');
  }

  async function downloadXml(path, filename, successKey, successFallback, failureKey, failureFallback) {
    try {
      const response = await fetch(path, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`${path} could not be loaded.`);
      }
      const blob = new Blob([await response.text()], { type: 'application/xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      showNotice(t(successKey, successFallback));
    } catch {
      showNotice(t(failureKey, failureFallback), 'error');
    }
  }

  function downloadCurrentHintXml() {
    const language = i18n && i18n.language ? i18n.language : 'de';
    downloadXml(
      `i18n/hints/${language}.xml`,
      `authproxycaller-hints-${language}.xml`,
      'message.hintXmlDownloaded',
      'Hint-XML wurde heruntergeladen.',
      'message.hintXmlDownloadFailed',
      'Hint-XML konnte nicht heruntergeladen werden.'
    );
  }

  function downloadCurrentLanguageXml() {
    const language = i18n && i18n.language ? i18n.language : 'de';
    downloadXml(
      `i18n/${language}.xml`,
      `authproxycaller-language-${language}.xml`,
      'message.languageXmlDownloaded',
      'Sprach-XML wurde heruntergeladen.',
      'message.languageXmlDownloadFailed',
      'Sprach-XML konnte nicht heruntergeladen werden.'
    );
  }

  function refreshHintButtons() {
    document.querySelectorAll('.hint-button').forEach((button) => {
      const fieldId = button.dataset.hintKey;
      button.setAttribute('aria-label', `${t('button.fieldHint', 'Hinweis anzeigen')}: ${fieldLabel(fieldId)}`);
      button.title = `${t('button.fieldHint', 'Hinweis anzeigen')}: ${fieldLabel(fieldId)}`;
    });
  }

  function createHintButtons() {
    form.querySelectorAll('input[id], select[id], textarea[id]').forEach((control) => {
      const fieldId = control.id;
      const label = control.closest('label');
      if (!label || label.querySelector(`.hint-button[data-hint-key="${fieldId}"]`)) {
        return;
      }
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'hint-button';
      button.dataset.hintKey = fieldId;
      button.textContent = '?';
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        openHintDialog(fieldId);
      });
      label.classList.add('has-hint');
      label.append(button);
    });
    refreshHintButtons();
  }

  function variablePlaceholder(value) {
    const text = typeof value === 'string' ? value.trim() : '';
    if (!text) return '';
    const unwrapped = text.replace(/^%/, '').replace(/%$/, '');
    return `%${DUBuilder.validateParameterName(unwrapped)}%`;
  }

  function collectConfig() {
    const data = new FormData(form);
    const config = {};
    for (const [key, value] of data.entries()) {
      config[key] = typeof value === 'string' ? value.trim() : value;
    }

    const sameFqdn = sameViewerFqdn.checked;
    config.server = sameFqdn ? config.dicomFqdn : config.viewerFqdn;
    config.loginserver = config.dicomFqdn;
    config.appName = config.companionPath
      ? DUBuilder.companionExecutablePath(config.companionPath)
      : '';
    config.diagnostParameter = 'diagnostPath';
    config.AccessionNumber = DUBuilder.normalizeAccessions(config.AccessionNumber);
    config.browser = config.browserChoice;
    config.debuglevel = config.debugLevel;
    config.remote = config.terminalKis ? '%' : '';
    config.encryptedSvf = Boolean(config.encryptedSvf);
    config.urlSharedUserEnabled = Boolean(config.urlSharedUserEnabled);
    config.urlAuditUserEnabled = Boolean(config.urlAuditUserEnabled);
    if (config.kisType === 'fremd') {
      config.PatientID = variablePlaceholder(config.foreignPatientIdVariable);
      config.AccessionNumber = variablePlaceholder(config.foreignOrderNumberVariable);
      config.foreignUserPlaceholder = variablePlaceholder(config.foreignUserVariable);
      config.foreignPasswordPlaceholder = variablePlaceholder(config.foreignPasswordVariable);
    }
    return config;
  }

  function svfCredentials(config, userPlaceholder, passwordPlaceholder, encryptedPrefix = 'enc_', options = {}) {
    const encrypted = options.applyEncryption === false ? false : config.encryptedSvf;
    return {
      user: DUBuilder.svfCredentialPlaceholder(userPlaceholder, encrypted, encryptedPrefix),
      password: DUBuilder.svfCredentialPlaceholder(passwordPlaceholder, encrypted, encryptedPrefix)
    };
  }

  function svfUrlCredentials(config, userPlaceholder, passwordPlaceholder, encryptedPrefix = 'enc_', options = {}) {
    if (config.urlSharedUserEnabled) {
      return {
        user: DUBuilder.validatePlainText(config.urlSharedUser, 'Sammelbenutzer'),
        password: DUBuilder.validatePlainText(config.urlSharedPassword, 'Sammelpasswort')
      };
    }
    return svfCredentials(config, userPlaceholder, passwordPlaceholder, encryptedPrefix, options);
  }

  function clearInvalidState() {
    document.querySelectorAll('.field.invalid').forEach((element) => element.classList.remove('invalid'));
    formError.classList.add('hidden');
    formError.textContent = '';
  }

  function missingFieldsFrom(error) {
    if (error && error.code === 'MISSING_FIELDS' && Array.isArray(error.fields)) {
      const fields = error.fields.map((field) => {
        const label = FIELD_LABELS[field];
        return Array.isArray(label) ? t(label[0], label[1]) : field;
      });
      return `${t('message.parametersMissing', 'Parameter fehlen')}: ${fields.join(', ')}`;
    }
    if (error && error.message) {
      return error.message;
    }
    return t('message.unknownError', 'Unbekannter Fehler.');
  }

  function createOutputSection(key, title) {
    return {
      key,
      title,
      items: []
    };
  }

  function appendScenario(section, label, value) {
    section.items.push({ label, value, type: 'call' });
  }

  function appendMissing(section, label, error) {
    section.items.push({
      label,
      value: `${t('message.noticePrefix', 'Hinweis')}: ${missingFieldsFrom(error)}`,
      type: 'missing'
    });
  }

  function sectionToText(section) {
    const lines = [section.title, ''];
    section.items.forEach((item) => {
      lines.push(`[${item.label}]`, item.value, '');
    });
    return lines.join('\n').trim();
  }

  function renderOutputSections(sections) {
    output.innerHTML = '';
    const fragment = document.createDocumentFragment();
    sections.forEach((section) => {
      const sectionElement = document.createElement('section');
      sectionElement.className = 'output-section';

      const title = document.createElement('h3');
      title.className = 'output-section-title';
      title.textContent = section.title;
      sectionElement.append(title);

      section.items.forEach((item) => {
        const itemElement = document.createElement('div');
        itemElement.className = 'output-item';

        const label = document.createElement('div');
        label.className = 'output-item-label';
        label.textContent = item.label;
        itemElement.append(label);

        const value = document.createElement('div');
        value.className = item.type === 'missing' ? 'output-missing' : 'output-call';
        value.textContent = item.value;
        itemElement.append(value);

        if (item.type === 'call') {
          const actions = document.createElement('div');
          actions.className = 'output-item-actions';

          const copyButton = document.createElement('button');
          copyButton.type = 'button';
          copyButton.className = 'button button-secondary output-copy-button';
          copyButton.textContent = t('button.copySingle', 'Kopieren');
          copyButton.addEventListener('click', () => {
            copyText(item.value, t('message.singleCopied', '{label} wurde in die Zwischenablage kopiert.').replace('{label}', item.label));
          });

          actions.append(copyButton);
          itemElement.append(actions);
        }

        sectionElement.append(itemElement);
      });

      fragment.append(sectionElement);
    });
    output.append(fragment);
  }

  function preserveSvfVariables(value) {
    return value
      .replace(/%25ENC_USER%25/g, '%ENC_USER%')
      .replace(/%25enc_USER%25/g, '%enc_USER%')
      .replace(/%25USER%25/g, '%USER%')
      .replace(/%25ENC_PWD%25/g, '%ENC_PWD%')
      .replace(/%25enc_PWD%25/g, '%enc_PWD%')
      .replace(/%25PWD%25/g, '%PWD%')
      .replace(/%25STUDYUID%25/g, '%STUDYUID%')
      .replace(/%25ORDERNR%25/g, '%ORDERNR%')
      .replace(/%25PATIENTID%25/g, '%PATIENTID%')
      .replace(/%25enc_benutzercode/g, '%enc_benutzercode')
      .replace(/%25benutzercode/g, '%benutzercode')
      .replace(/%25enc_passwort/g, '%enc_passwort')
      .replace(/%25passwort/g, '%passwort')
      .replace(/%25auftragsnr/g, '%auftragsnr')
      .replace(/%25patid/g, '%patid');
  }

  function missingFieldsError(fields) {
    const error = new Error(`Pflichtfelder fehlen: ${fields.join(', ')}`);
    error.code = 'MISSING_FIELDS';
    error.fields = fields;
    return error;
  }

  function svfCommonCallParameters(config) {
    const browser = DUBuilder.validatePlainText(config.browser, 'Browserwahl');
    return {
      ...(browser ? { browser } : {})
    };
  }

  function buildSvfRisUrl(config, parameters, options = {}) {
    const credentialFields = config.urlSharedUserEnabled ? ['urlSharedUser', 'urlSharedPassword'] : [];
    const missing = ['server', ...credentialFields].filter((field) => !config[field]);
    if (missing.length > 0) {
      throw missingFieldsError(missing);
    }

    const url = new URL('/du-auth-proxy/viewer', DUBuilder.normalizeServer(config.server));
    const credentials = svfUrlCredentials(
      config,
      options.userPlaceholder || '%USER%',
      options.passwordPlaceholder || '%PWD%',
      options.encryptedPrefix || 'ENC_',
      { applyEncryption: options.applyEncryption }
    );
    const auditCredentials = svfCredentials(
      config,
      options.userPlaceholder || '%USER%',
      options.passwordPlaceholder || '%PWD%',
      options.encryptedPrefix || 'ENC_',
      { applyEncryption: options.applyEncryption }
    );
    const params = {
      user: credentials.user,
      password: credentials.password,
      ...(config.urlAuditUserEnabled ? { app_usr: auditCredentials.user } : {}),
      ...(config.idp ? { idp: config.idp } : {}),
      ...(config.IssuerOfPatientID ? { IssuerOfPatientID: config.IssuerOfPatientID } : {}),
      ...svfCommonCallParameters(config),
      ...parameters
    };

    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
    return preserveSvfVariables(url.toString());
  }

  function buildExternalCompanion(config, userPlaceholder, passwordPlaceholder, parameters, options = {}) {
    const includeIssuer = options.includeIssuer !== false;
    const requiredFields = ['appName', 'loginserver'];
    const missing = requiredFields.filter((field) => !config[field]);
    if (missing.length > 0) {
      throw missingFieldsError(missing);
    }

    const pairs = {
      loginserver: DUBuilder.normalizeLoginServer(config.loginserver),
      user: userPlaceholder,
      password: passwordPlaceholder,
      ...(config.idp ? { idp: config.idp } : {}),
      ...(includeIssuer && config.IssuerOfPatientID ? { IssuerOfPatientID: config.IssuerOfPatientID } : {}),
      ...svfCommonCallParameters(config),
      ...(config.remote ? { remote: config.remote } : {}),
      ...parameters
    };
    const parts = [DUBuilder.quoteCmdValue(config.appName)];
    Object.entries(pairs).forEach(([key, value]) => {
      const formattedValue = key === 'remote' && value === '%' ? '%' : DUBuilder.quoteCmdValue(value);
      parts.push(`${key}=${formattedValue}`);
    });

    if (config.diagnostPath) {
      parts.push(`diagnostPath=${DUBuilder.quoteCmdValue(config.diagnostPath)}`);
    }
    return parts.join(' ');
  }

  function buildSvfRisCompanion(config, parameters, options) {
    const credentials = svfCredentials(config, '%USER%', '%PWD%', 'ENC_');
    return buildExternalCompanion(config, credentials.user, credentials.password, parameters, options);
  }

  function foreignRisParameters(config, parameters) {
    return Object.fromEntries(Object.entries(parameters).map(([key, value]) => {
      if (value === '%PATIENTID%') return [key, config.PatientID];
      if (value === '%ORDERNR%') return [key, config.AccessionNumber];
      return [key, value];
    }));
  }

  function missingForeignRisParameterFields(config, parameters) {
    const missing = [];
    Object.values(parameters).forEach((value) => {
      if (value === '%PATIENTID%' && !config.PatientID) {
        missing.push('foreignPatientIdVariable');
      }
      if (value === '%ORDERNR%' && !config.AccessionNumber) {
        missing.push('foreignOrderNumberVariable');
      }
    });
    return missing;
  }

  function buildForeignRisUrl(config, parameters) {
    const missing = missingForeignRisParameterFields(config, parameters);
    if (!config.urlSharedUserEnabled) {
      if (!config.foreignUserPlaceholder) missing.push('foreignUserVariable');
      if (!config.foreignPasswordPlaceholder) missing.push('foreignPasswordVariable');
    }
    if (config.urlAuditUserEnabled && !config.foreignUserPlaceholder) {
      missing.push('foreignUserVariable');
    }
    if (missing.length > 0) {
      throw missingFieldsError([...new Set(missing)]);
    }
    return buildSvfRisUrl(config, foreignRisParameters(config, parameters), {
      userPlaceholder: config.foreignUserPlaceholder || '%USER%',
      passwordPlaceholder: config.foreignPasswordPlaceholder || '%PWD%',
      encryptedPrefix: '',
      applyEncryption: false
    });
  }

  function buildForeignRisCompanion(config, parameters, options) {
    const missing = missingForeignRisParameterFields(config, parameters);
    if (!config.foreignUserPlaceholder) missing.push('foreignUserVariable');
    if (!config.foreignPasswordPlaceholder) missing.push('foreignPasswordVariable');
    if (missing.length > 0) {
      throw missingFieldsError([...new Set(missing)]);
    }
    return buildExternalCompanion(
      config,
      config.foreignUserPlaceholder,
      config.foreignPasswordPlaceholder,
      foreignRisParameters(config, parameters),
      options
    );
  }

  function buildRisSection(title, config, includeCompanion, urlBuilder, companionBuilder) {
    const section = createOutputSection('svf', title);
    SVF_RIS_OPTIONS.forEach(([labelKey, fallbackLabel, parameters, options = {}]) => {
      const label = t(labelKey, fallbackLabel);
      if (!options.companionOnly) {
        try {
          appendScenario(section, `${t('label.urlCall', 'URL-Aufruf')} - ${label}`, urlBuilder(config, parameters, options));
        } catch (error) {
          appendMissing(section, `${t('label.urlCall', 'URL-Aufruf')} - ${label}`, error);
        }
      }
      if (includeCompanion) {
        try {
          appendScenario(section, `Companion App - ${label}`, companionBuilder(config, parameters, options));
        } catch (error) {
          appendMissing(section, `Companion App - ${label}`, error);
        }
      }
    });
    return section;
  }

  function buildSvfCardUrl(config, parameters) {
    return buildSvfRisUrl(config, parameters, {
      userPlaceholder: '%benutzercode',
      passwordPlaceholder: '%passwort',
      encryptedPrefix: 'enc_'
    });
  }

  function buildSvfCardCompanion(config, parameters) {
    const credentials = svfCredentials(config, '%benutzercode', '%passwort');
    return buildExternalCompanion(config, credentials.user, credentials.password, parameters);
  }

  function buildSvfCardSection(key, title, config, includeCompanion) {
    const section = createOutputSection(key, title);
    SVF_CARD_OPTIONS.forEach(([labelKey, fallbackLabel, parameters]) => {
      const label = t(labelKey, fallbackLabel);
      try {
        appendScenario(section, `${t('label.urlCall', 'URL-Aufruf')} - ${label}`, buildSvfCardUrl(config, parameters));
      } catch (error) {
        appendMissing(section, `${t('label.urlCall', 'URL-Aufruf')} - ${label}`, error);
      }
      if (includeCompanion) {
        try {
          appendScenario(section, `Companion App - ${label}`, buildSvfCardCompanion(config, parameters));
        } catch (error) {
          appendMissing(section, `Companion App - ${label}`, error);
        }
      }
    });
    return section;
  }

  function showNotice(message, type) {
    window.clearTimeout(state.noticeTimeout);
    copyToast.textContent = message;
    copyToast.classList.toggle('toast-error', type === 'error');
    copyToast.classList.remove('hidden');
    state.noticeTimeout = window.setTimeout(() => {
      copyToast.classList.add('hidden');
    }, 2400);
  }

  function openExportDialog() {
    const availableKeys = state.sections.map((section) => section.key);
    exportDialog.classList.remove('hidden');
    exportChecks.forEach((input) => {
      const option = input.closest('label');
      const unavailable = input.value !== 'all' && !availableKeys.includes(input.value);
      option.classList.toggle('hidden', unavailable);
      if (unavailable) {
        input.checked = false;
      }
    });
    exportDialog.querySelector('input[value="all"]').checked = true;
    exportDialog.querySelector('input[name="export-call-type"][value="both"]').checked = true;
  }

  function closeExportDialog() {
    exportDialog.classList.add('hidden');
  }

  function openTxtImportDialog() {
    txtImportDialog.classList.remove('hidden');
  }

  function closeTxtImportDialog() {
    txtImportDialog.classList.add('hidden');
  }

  function chooseTxtImportFile() {
    closeTxtImportDialog();
    txtImportInput.click();
  }

  function selectedRadioValue(radios, fallback) {
    const selected = Array.from(radios).find((input) => input.checked);
    return selected ? selected.value : fallback;
  }

  function selectedExportCallType() {
    return selectedRadioValue(exportCallTypeRadios, 'both');
  }

  function selectedDisplayCallType() {
    return selectedRadioValue(displayCallTypeRadios, 'both');
  }

  function sectionForCallType(section, callType) {
    if (callType === 'both') {
      return section;
    }

    if (section.key === 'url') {
      return callType === 'url' ? section : null;
    }

    if (section.key === 'companion') {
      return callType === 'companion' ? section : null;
    }

    const prefix = callType === 'url' ? `${t('label.urlCall', 'URL-Aufruf')} - ` : 'Companion App - ';
    const items = section.items.filter((item) => item.label.startsWith(prefix));
    if (items.length === 0) {
      return null;
    }
    return { ...section, items };
  }

  function sectionsForCallType(sections, callType) {
    return sections
      .map((section) => sectionForCallType(section, callType))
      .filter(Boolean);
  }

  function selectedDisplaySections() {
    return sectionsForCallType(state.sections, selectedDisplayCallType());
  }

  function textFromSections(sections) {
    return sections.map(sectionToText).filter(Boolean).join('\n\n');
  }

  function outputForSectionKey(key) {
    const section = state.sections.find((item) => item.key === key);
    if (!section) return '';
    const visibleSection = sectionForCallType(section, selectedDisplayCallType());
    return visibleSection ? sectionToText(visibleSection) : '';
  }

  function visibleOutput() {
    return textFromSections(selectedDisplaySections());
  }

  function updateCopyButtonStates() {
    const hasCompanionSection = state.sections.some((section) => section.key === 'companion');
    copyCompanionButton.classList.toggle('hidden', !hasCompanionSection);
    copyUrlButton.disabled = !outputForSectionKey('url');
    copyCompanionButton.disabled = !outputForSectionKey('companion');
    const svfDisabled = kisType.value === 'fremd';
    copySvfButton.disabled = svfDisabled || !outputForSectionKey('svf');
    copySvfCardButton.disabled = svfDisabled || !outputForSectionKey('svfCard');
    copySvfFrauButton.disabled = svfDisabled || !outputForSectionKey('svfFrau');
    copySvfOpapButton.disabled = svfDisabled || !outputForSectionKey('svfOpap');
    copySvfLstmButton.disabled = svfDisabled || !outputForSectionKey('svfLstm');
  }

  function updateCompanionOptions(hasCompanionSection) {
    displayCompanionOption.classList.toggle('hidden', !hasCompanionSection);
    exportCompanionOption.classList.toggle('hidden', !hasCompanionSection);
    if (!hasCompanionSection) {
      const selectedDisplayCompanion = document.querySelector('input[name="display-call-type"][value="companion"]:checked');
      const selectedExportCompanion = exportDialog.querySelector('input[name="export-call-type"][value="companion"]:checked');
      if (selectedDisplayCompanion) {
        document.querySelector('input[name="display-call-type"][value="both"]').checked = true;
      }
      if (selectedExportCompanion) {
        exportDialog.querySelector('input[name="export-call-type"][value="both"]').checked = true;
      }
    }
  }

  function selectedExportSections() {
    const selected = Array.from(exportChecks)
      .filter((input) => input.checked)
      .map((input) => input.value);
    const selectedSections = selected.includes('all')
      ? state.sections
      : state.sections.filter((section) => selected.includes(section.key));
    const callType = selectedExportCallType();
    return sectionsForCallType(selectedSections, callType);
  }

  function formDataPayload() {
    const values = {};
    const checked = {};
    form.querySelectorAll('input[id], select[id], textarea[id]').forEach((control) => {
      if (control.type === 'checkbox') {
        checked[control.id] = control.checked;
      } else if (control.type !== 'file') {
        values[control.id] = control.value;
      }
    });
    return {
      type: 'authproxycaller-form-data',
      version: 1,
      appVersion: '0.2.22',
      language: i18n && i18n.language ? i18n.language : 'de',
      exportedAt: new Date().toISOString(),
      values,
      checked
    };
  }

  function buildFormDataBlock() {
    return [
      FORM_DATA_START,
      JSON.stringify(formDataPayload(), null, 2),
      FORM_DATA_END
    ].join('\n');
  }

  function filenameTimestamp(date = new Date()) {
    const pad = (value) => String(value).padStart(2, '0');
    return [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate())
    ].join('') + '-' + [
      pad(date.getHours()),
      pad(date.getMinutes()),
      pad(date.getSeconds())
    ].join('');
  }

  function filenameFqdnPrefix() {
    const value = String(document.getElementById('dicomFqdn').value || '').trim();
    const host = value.replace(/^https?:\/\//i, '').split(/[/?#]/)[0];
    return host
      .replace(/\./g, '_')
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'authproxycaller';
  }

  function txtExportFilename() {
    return `${filenameFqdnPrefix()}_authproxycaller-export_${filenameTimestamp()}.txt`;
  }

  function createTxtExport() {
    const sections = selectedExportSections();
    if (sections.length === 0) {
      showNotice(t('message.selectTxtSection', 'Bitte mindestens eine Rubrik für den TXT Export auswählen.'), 'error');
      return;
    }

    const text = `${buildFormDataBlock()}\n\n${textFromSections(sections)}`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = txtExportFilename();
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    closeExportDialog();
    showNotice(t('message.txtCreated', 'TXT Export wurde erstellt.'));
  }

  function parseImportedFormData(text) {
    const start = text.indexOf(FORM_DATA_START);
    const end = text.indexOf(FORM_DATA_END);
    if (start === -1 || end === -1 || end <= start) {
      throw new Error('missing-form-data');
    }
    const jsonText = text.slice(start + FORM_DATA_START.length, end).trim();
    const payload = JSON.parse(jsonText);
    if (!payload || payload.type !== 'authproxycaller-form-data' || payload.version !== 1) {
      throw new Error('invalid-form-data');
    }
    return payload;
  }

  function applyImportedFormData(payload) {
    const values = payload.values && typeof payload.values === 'object' ? payload.values : {};
    const checked = payload.checked && typeof payload.checked === 'object' ? payload.checked : {};
    form.querySelectorAll('input[id], select[id], textarea[id]').forEach((control) => {
      if (control.type === 'checkbox') {
        if (Object.prototype.hasOwnProperty.call(checked, control.id)) {
          control.checked = Boolean(checked[control.id]);
        }
      } else if (control.type !== 'file' && Object.prototype.hasOwnProperty.call(values, control.id)) {
        control.value = String(values[control.id] ?? '');
      }
    });
    state.testDataActive = false;
    state.testDataSnapshot = null;
    setTestButton(false);
    updateServerFields();
    updateKisFields();
    renderOutput();
  }

  async function importTxtFile(file) {
    if (!file) return;
    try {
      const payload = parseImportedFormData(await file.text());
      applyImportedFormData(payload);
      showNotice(t('message.txtImportSuccess', 'TXT Import wurde eingelesen.'));
    } catch (error) {
      const key = error && error.message === 'missing-form-data'
        ? 'message.txtImportMissingData'
        : 'message.txtImportFailed';
      const fallback = error && error.message === 'missing-form-data'
        ? 'Die TXT-Datei enthält keinen Authproxycaller-Formularblock.'
        : 'TXT Import konnte nicht eingelesen werden.';
      showNotice(t(key, fallback), 'error');
    } finally {
      txtImportInput.value = '';
    }
  }

  function renderOutput() {
    clearInvalidState();
    copyStatus.textContent = '';

    const config = collectConfig();
    const urlSection = createOutputSection('url', t('section.testUrlCall', 'Test URL-Aufruf'));

    URL_OPTIONS.forEach(([scenarioName, labelKey, fallbackLabel]) => {
      const label = t(labelKey, fallbackLabel);
      try {
        const value = DUBuilder.buildUrl(scenarioName, config);
        appendScenario(urlSection, label, value);
      } catch (error) {
        appendMissing(urlSection, label, error);
      }
    });

    const includeCompanion = Boolean(config.appName);
    let companionSection = createOutputSection('companion', t('section.testCompanionApp', 'Test Companion App'));
    const sections = [urlSection];
    if (includeCompanion) {
      COMPANION_OPTIONS.forEach(([scenarioName, labelKey, fallbackLabel]) => {
        const label = t(labelKey, fallbackLabel);
        try {
          const value = DUBuilder.buildCompanion(scenarioName, config, 'single-line');
          appendScenario(companionSection, label, value);
        } catch (error) {
          appendMissing(companionSection, label, error);
        }
      });
      sections.push(companionSection);
    } else {
      companionSection = null;
    }

    let svfSection = createOutputSection('svf', 'SVF-RIS');
    let svfCardSection = createOutputSection('svfCard', 'SVF CARD');
    let svfFrauSection = createOutputSection('svfFrau', 'SVF-FRAU');
    let svfOpapSection = createOutputSection('svfOpap', 'SVF-OPAP');
    let svfLstmSection = createOutputSection('svfLstm', 'SVF LSTM');

    if (config.kisType !== 'fremd') {
      svfSection = buildRisSection('SVF-RIS', config, includeCompanion, buildSvfRisUrl, buildSvfRisCompanion);
      svfCardSection = buildSvfCardSection('svfCard', 'SVF CARD', config, includeCompanion);
      svfFrauSection = buildSvfCardSection('svfFrau', 'SVF-FRAU', config, includeCompanion);
      svfOpapSection = buildSvfCardSection('svfOpap', 'SVF-OPAP', config, includeCompanion);
      svfLstmSection = buildSvfCardSection('svfLstm', 'SVF LSTM', config, includeCompanion);
      sections.push(svfSection, svfCardSection, svfFrauSection, svfOpapSection, svfLstmSection);
    } else {
      svfSection = buildRisSection(t('section.foreignRis', 'Fremd-RIS'), config, includeCompanion, buildForeignRisUrl, buildForeignRisCompanion);
      sections.push(svfSection);
    }
    state.sections = sections;
    updateCompanionOptions(Boolean(companionSection));

    state.urlOutput = sectionToText(urlSection);
    state.companionOutput = companionSection ? sectionToText(companionSection) : '';
    if (config.kisType === 'fremd') {
      state.svfOutput = sectionToText(svfSection);
      state.svfCardOutput = '';
      state.svfFrauOutput = '';
      state.svfOpapOutput = '';
      state.svfLstmOutput = '';
    } else {
      state.svfOutput = sectionToText(svfSection);
      state.svfCardOutput = sectionToText(svfCardSection);
      state.svfFrauOutput = sectionToText(svfFrauSection);
      state.svfOpapOutput = sectionToText(svfOpapSection);
      state.svfLstmOutput = sectionToText(svfLstmSection);
    }
    state.rawOutput = [
      state.urlOutput,
      state.companionOutput,
      state.svfOutput,
      state.svfCardOutput,
      state.svfFrauOutput,
      state.svfOpapOutput,
      state.svfLstmOutput
    ].filter(Boolean).join('\n\n');
    renderOutputSections(selectedDisplaySections());
    updateCopyButtonStates();
  }

  async function copyText(value, successMessage) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      copyStatus.textContent = successMessage;
      showNotice(successMessage);
    } catch {
      const temporary = document.createElement('textarea');
      temporary.value = value;
      temporary.setAttribute('readonly', '');
      temporary.style.position = 'fixed';
      temporary.style.opacity = '0';
      document.body.append(temporary);
      temporary.select();
      const copied = document.execCommand('copy');
      temporary.remove();
      copyStatus.textContent = copied
        ? successMessage
        : t('message.copyBlocked', 'Kopieren wurde vom Browser blockiert.');
      showNotice(copyStatus.textContent, copied ? undefined : 'error');
    }
  }

  function copyUrlOutput() {
    copyText(outputForSectionKey('url'), t('message.urlCopied', 'URL-Aufrufe wurden in die Zwischenablage kopiert.'));
  }

  function copyCompanionOutput() {
    copyText(outputForSectionKey('companion'), t('message.companionCopied', 'Companion-App-Aufrufe wurden in die Zwischenablage kopiert.'));
  }

  function copySvfOutput() {
    const label = kisType.value === 'fremd' ? t('section.foreignRis', 'Fremd-RIS') : 'SVF-RIS';
    copyText(outputForSectionKey('svf'), t('message.sectionCopied', '{section}-Aufrufe wurden in die Zwischenablage kopiert.').replace('{section}', label));
  }

  function copySvfCardOutput() {
    copyText(outputForSectionKey('svfCard'), t('message.sectionCopied', '{section}-Aufrufe wurden in die Zwischenablage kopiert.').replace('{section}', 'SVF-CARD'));
  }

  function copySvfFrauOutput() {
    copyText(outputForSectionKey('svfFrau'), t('message.sectionCopied', '{section}-Aufrufe wurden in die Zwischenablage kopiert.').replace('{section}', 'SVF-FRAU'));
  }

  function copySvfOpapOutput() {
    copyText(outputForSectionKey('svfOpap'), t('message.sectionCopied', '{section}-Aufrufe wurden in die Zwischenablage kopiert.').replace('{section}', 'SVF-OPAP'));
  }

  function copySvfLstmOutput() {
    copyText(outputForSectionKey('svfLstm'), t('message.sectionCopied', '{section}-Aufrufe wurden in die Zwischenablage kopiert.').replace('{section}', 'SVF-LSTM'));
  }

  const TEST_DATA_FIELDS = [
    'dicomFqdn',
    'viewerFqdn',
    'IssuerOfPatientID',
    'idp',
    'urlSharedUser',
    'urlSharedPassword',
    'browserChoice',
    'debugLevel',
    'user',
    'password',
    'companionPath',
    'kisType',
    'foreignPatientIdVariable',
    'foreignOrderNumberVariable',
    'foreignUserVariable',
    'foreignPasswordVariable',
    'diagnostPath',
    'PatientID',
    'AccessionNumber',
    'studyUID'
  ];
  const TEST_DATA_CHECKBOXES = [
    'terminalKis',
    'encryptedSvf',
    'urlSharedUserEnabled',
    'urlAuditUserEnabled'
  ];

  function setTestButton(active) {
    serverTestButton.textContent = active ? t('button.testDataDisable', 'Testdaten aus') : t('button.testDataEnable', 'Testdaten an');
  }

  function snapshotTestData() {
    const values = {};
    TEST_DATA_FIELDS.forEach((fieldId) => {
      const field = document.getElementById(fieldId);
      values[fieldId] = field ? field.value : '';
    });
    const checked = {};
    TEST_DATA_CHECKBOXES.forEach((fieldId) => {
      const field = document.getElementById(fieldId);
      checked[fieldId] = field ? field.checked : false;
    });
    return {
      sameViewerFqdn: sameViewerFqdn.checked,
      values,
      checked
    };
  }

  function restoreTestDataSnapshot(snapshot) {
    if (!snapshot) return;
    sameViewerFqdn.checked = snapshot.sameViewerFqdn;
    TEST_DATA_FIELDS.forEach((fieldId) => {
      const field = document.getElementById(fieldId);
      if (field) {
        field.value = snapshot.values[fieldId] || '';
      }
    });
    TEST_DATA_CHECKBOXES.forEach((fieldId) => {
      const field = document.getElementById(fieldId);
      if (field) {
        field.checked = Boolean(snapshot.checked && snapshot.checked[fieldId]);
      }
    });
  }

  function applyServerTestData() {
    sameViewerFqdn.checked = false;
    document.getElementById('dicomFqdn').value = 'dicomservices.test.local';
    viewerFqdn.value = 'viewer.test.local';
    document.getElementById('IssuerOfPatientID').value = 'TESTISSUER';
    document.getElementById('idp').value = 'ldap_IDP';
    document.getElementById('urlSharedUserEnabled').checked = true;
    document.getElementById('urlAuditUserEnabled').checked = true;
    document.getElementById('urlSharedUser').value = 'sammelbenutzer';
    document.getElementById('urlSharedPassword').value = 'sammelpasswort123';
    document.getElementById('browserChoice').value = 'CHROME';
    document.getElementById('debugLevel').value = 'DEBUG';
    document.getElementById('terminalKis').checked = true;
    document.getElementById('encryptedSvf').checked = true;
    document.getElementById('user').value = 'testuser';
    document.getElementById('password').value = 'testpasswort123';
    document.getElementById('companionPath').value = 'O:\\orbis\\admin';
    kisType.value = 'fremd';
    document.getElementById('foreignPatientIdVariable').value = 'FKIS_PATIENT_ID';
    document.getElementById('foreignOrderNumberVariable').value = 'FKIS_AUFTRAG_NR';
    document.getElementById('foreignUserVariable').value = 'FKIS_USER';
    document.getElementById('foreignPasswordVariable').value = 'FKIS_PASSWORD';
    document.getElementById('diagnostPath').value = 'C:\\Program Files\\Dedalus\\DeepUnity';
    document.getElementById('PatientID').value = 'PAT-100200';
    document.getElementById('AccessionNumber').value = 'ORD-2026-0001';
    document.getElementById('studyUID').value = '1.2.276.0.7230010.3.1.2.100.20260806.1';
  }

  function clearForm() {
    form.reset();
    sameViewerFqdn.checked = true;
    state.testDataActive = false;
    state.testDataSnapshot = null;
    setTestButton(false);
    updateServerFields();
    updateKisFields();
    renderOutput();
    copyStatus.textContent = '';
    document.getElementById('dicomFqdn').focus();
  }

  function toggleServerTestData() {
    if (state.testDataActive) {
      restoreTestDataSnapshot(state.testDataSnapshot);
      state.testDataActive = false;
      state.testDataSnapshot = null;
      setTestButton(false);
      showNotice(t('message.testDataDisabled', 'Testdaten wurden deaktiviert.'));
    } else {
      state.testDataSnapshot = snapshotTestData();
      applyServerTestData();
      state.testDataActive = true;
      setTestButton(true);
      showNotice(t('message.testDataEnabled', 'Testdaten wurden aktiviert.'));
    }
    updateServerFields();
    updateKisFields();
    renderOutput();
  }

  sameViewerFqdn.addEventListener('change', () => {
    updateServerFields();
    renderOutput();
  });
  form.addEventListener('input', renderOutput);
  form.addEventListener('change', () => {
    updateServerFields();
    updateKisFields();
    renderOutput();
  });
  copyUrlButton.addEventListener('click', copyUrlOutput);
  copyCompanionButton.addEventListener('click', copyCompanionOutput);
  copySvfButton.addEventListener('click', copySvfOutput);
  copySvfCardButton.addEventListener('click', copySvfCardOutput);
  copySvfFrauButton.addEventListener('click', copySvfFrauOutput);
  copySvfOpapButton.addEventListener('click', copySvfOpapOutput);
  copySvfLstmButton.addEventListener('click', copySvfLstmOutput);
  txtExportButton.addEventListener('click', openExportDialog);
  txtImportButton.addEventListener('click', openTxtImportDialog);
  txtImportInput.addEventListener('change', () => importTxtFile(txtImportInput.files && txtImportInput.files[0]));
  exportCancelButton.addEventListener('click', closeExportDialog);
  txtCreateButton.addEventListener('click', createTxtExport);
  exportDialog.addEventListener('click', (event) => {
    if (event.target === exportDialog) {
      closeExportDialog();
    }
  });
  txtImportCancelButton.addEventListener('click', closeTxtImportDialog);
  txtImportContinueButton.addEventListener('click', chooseTxtImportFile);
  txtImportDialog.addEventListener('click', (event) => {
    if (event.target === txtImportDialog) {
      closeTxtImportDialog();
    }
  });
  hintCloseButton.addEventListener('click', closeHintDialog);
  hintDialog.addEventListener('click', (event) => {
    if (event.target === hintDialog) {
      closeHintDialog();
    }
  });
  hintDownloadButton.addEventListener('click', openHintDownloadDialog);
  hintDownloadCloseButton.addEventListener('click', closeHintDownloadDialog);
  hintDownloadCreateButton.addEventListener('click', downloadCurrentHintXml);
  languageDownloadCreateButton.addEventListener('click', downloadCurrentLanguageXml);
  hintDownloadDialog.addEventListener('click', (event) => {
    if (event.target === hintDownloadDialog) {
      closeHintDownloadDialog();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeHintDialog();
      closeHintDownloadDialog();
      closeExportDialog();
      closeTxtImportDialog();
    }
  });
  exportChecks.forEach((input) => {
    input.addEventListener('change', () => {
      if (input.value === 'all' && input.checked) {
        exportChecks.forEach((item) => {
          if (item.value !== 'all') item.checked = false;
        });
      } else if (input.value !== 'all' && input.checked) {
        exportDialog.querySelector('input[value="all"]').checked = false;
      }
    });
  });
  displayCallTypeRadios.forEach((input) => {
    input.addEventListener('change', () => {
      renderOutputSections(selectedDisplaySections());
      updateCopyButtonStates();
    });
  });
  clearButton.addEventListener('click', clearForm);
  serverTestButton.addEventListener('click', toggleServerTestData);

  window.addEventListener('pagehide', () => {
    form.reset();
    state.rawOutput = '';
    state.urlOutput = '';
    state.companionOutput = '';
    state.svfOutput = '';
    state.svfCardOutput = '';
    state.svfFrauOutput = '';
    state.svfOpapOutput = '';
    state.svfLstmOutput = '';
    state.sections = [];
    copyToast.classList.add('hidden');
  });

  window.addEventListener('i18n:ready', () => {
    setTestButton(state.testDataActive);
    updateKisFields();
    refreshHintButtons();
    renderOutput();
  });
  window.addEventListener('i18n:change', () => {
    setTestButton(state.testDataActive);
    updateKisFields();
    refreshHintButtons();
    renderOutput();
  });

  updateServerFields();
  updateKisFields();
  createHintButtons();
  setTestButton(state.testDataActive);
  renderOutput();
})();
