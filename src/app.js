(function () {
  'use strict';

  const URL_OPTIONS = [
    ['viewer-study', 'Viewer: Studie über StudyUID'],
    ['viewer-patient', 'Viewer: alle Studien eines Patienten'],
    ['viewer-accession', 'Viewer: Patient und Accession Number'],
    ['studysearch-empty', 'Viewer Search ohne Filter'],
    ['studysearch-filtered', 'Viewer Search mit Filtern']
  ];

  const COMPANION_OPTIONS = [
    ['companion-study', 'Companion: Studie über StudyUID'],
    ['companion-patient', 'Companion: Patient mit Issuer'],
    ['companion-accession', 'Companion: Patient und Accession Number'],
    ['companion-multi-accession', 'Companion: mehrere Accession Numbers'],
    ['companion-diagnost', 'Companion: abweichender DeepUnity-Ordnerpfad'],
    ['companion-custom', 'Companion: freie Parameterkombination']
  ];

  const SVF_RIS_OPTIONS = [
    ['Start #DeepUnity Insight', {}, { companionOnly: true, includeIssuer: false }],
    ['Systemaufruf für Anzeige einer Studie', { PatientID: '%PATIENTID%', studyUID: '%STUDYUID%' }],
    ['Systemaufruf für Anzeige aller Studien', { PatientID: '%PATIENTID%', AccessionNumber: '%ORDERNR%' }],
    ['Systemaufruf für Anzeige aller Studien eines Patienten', { PatientID: '%PATIENTID%' }]
  ];

  const SVF_CARD_OPTIONS = [
    ['Systemaufruf für Anzeige mit Patienten-ID und Auftragsnummer', {
      PatientID: '%patid',
      AccessionNumber: '%auftragsnr'
    }]
  ];

  const FIELD_LABELS = {
    AccessionNumber: 'Auftragsnummer',
    IssuerOfPatientID: 'IssuerOfPatientID',
    PatientID: 'Patienten-ID',
    appName: 'Pfad zur Companion App',
    encryptedSvf: 'Verschlüsselt',
    idp: 'IDP',
    loginserver: 'FQDN DicomServices',
    password: 'Passwort',
    remote: 'Terminal-KIS',
    server: 'FQDN DU Viewer',
    studyUID: 'SUID',
    urlSharedPassword: 'Sammelpasswort',
    urlSharedUser: 'Sammelbenutzer',
    urlSharedUserEnabled: 'URL Aufruf Sammelnutzer?',
    user: 'Benutzername',
    foreignPatientIdVariable: 'Variablenname Patienten-ID',
    foreignOrderNumberVariable: 'Variablenname Auftragsnummer'
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
  const copyAllButton = document.getElementById('copy-all-button');
  const copyUrlButton = document.getElementById('copy-url-button');
  const copyCompanionButton = document.getElementById('copy-companion-button');
  const copySvfButton = document.getElementById('copy-svf-button');
  const copySvfCardButton = document.getElementById('copy-svf-card-button');
  const copySvfFrauButton = document.getElementById('copy-svf-frau-button');
  const copySvfOpapButton = document.getElementById('copy-svf-opap-button');
  const copySvfLstmButton = document.getElementById('copy-svf-lstm-button');
  const clearButton = document.getElementById('clear-button');
  const serverTestButton = document.getElementById('server-test-button');
  const pdfExportButton = document.getElementById('pdf-export-button');
  const pdfDialog = document.getElementById('pdf-dialog');
  const pdfCancelButton = document.getElementById('pdf-cancel-button');
  const pdfCreateButton = document.getElementById('pdf-create-button');
  const txtCreateButton = document.getElementById('txt-create-button');
  const pdfChecks = pdfDialog.querySelectorAll('input[type="checkbox"]');
  const exportCallTypeRadios = pdfDialog.querySelectorAll('input[name="export-call-type"]');
  const displayCallTypeRadios = document.querySelectorAll('input[name="display-call-type"]');
  const displayCompanionOption = document.querySelector('input[name="display-call-type"][value="companion"]').closest('label');
  const exportCompanionOption = pdfDialog.querySelector('input[name="export-call-type"][value="companion"]').closest('label');
  const copyStatus = document.getElementById('copy-status');
  const copyToast = document.getElementById('copy-toast');
  const sameViewerFqdn = document.getElementById('sameViewerFqdn');
  const urlSharedUserEnabled = document.getElementById('urlSharedUserEnabled');
  const viewerFqdn = document.getElementById('viewerFqdn');
  const viewerFqdnContainer = document.querySelector('[data-field="viewerFqdn"]');
  const kisType = document.getElementById('kisType');
  const foreignKisFields = document.querySelectorAll('.foreign-kis-only');
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
    svfOnlyElements.forEach((element) => {
      element.classList.toggle('hidden', isForeignKis);
    });
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
    config.remote = config.terminalKis ? '%' : '';
    config.encryptedSvf = Boolean(config.encryptedSvf);
    config.urlSharedUserEnabled = Boolean(config.urlSharedUserEnabled);
    if (config.kisType === 'fremd') {
      config.PatientID = variablePlaceholder(config.foreignPatientIdVariable);
      config.AccessionNumber = variablePlaceholder(config.foreignOrderNumberVariable);
    }
    return config;
  }

  function svfCredentials(config, userPlaceholder, passwordPlaceholder, encryptedPrefix = 'enc_') {
    return {
      user: DUBuilder.svfCredentialPlaceholder(userPlaceholder, config.encryptedSvf, encryptedPrefix),
      password: DUBuilder.svfCredentialPlaceholder(passwordPlaceholder, config.encryptedSvf, encryptedPrefix)
    };
  }

  function svfUrlCredentials(config, userPlaceholder, passwordPlaceholder, encryptedPrefix = 'enc_') {
    if (config.urlSharedUserEnabled) {
      return {
        user: DUBuilder.validatePlainText(config.urlSharedUser, 'Sammelbenutzer'),
        password: DUBuilder.validatePlainText(config.urlSharedPassword, 'Sammelpasswort')
      };
    }
    return svfCredentials(config, userPlaceholder, passwordPlaceholder, encryptedPrefix);
  }

  function clearInvalidState() {
    document.querySelectorAll('.field.invalid').forEach((element) => element.classList.remove('invalid'));
    formError.classList.add('hidden');
    formError.textContent = '';
  }

  function missingFieldsFrom(error) {
    if (error && error.code === 'MISSING_FIELDS' && Array.isArray(error.fields)) {
      return `Parameter fehlen: ${error.fields.map((field) => FIELD_LABELS[field] || field).join(', ')}`;
    }
    if (error && error.message) {
      return error.message;
    }
    return 'Unbekannter Fehler.';
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
      value: `Hinweis: ${missingFieldsFrom(error)}`,
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
          copyButton.textContent = 'Kopieren';
          copyButton.addEventListener('click', () => {
            copyText(item.value, `${item.label} wurde in die Zwischenablage kopiert.`);
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

  function buildSvfRisUrl(config, parameters, options = {}) {
    const credentialFields = config.urlSharedUserEnabled ? ['urlSharedUser', 'urlSharedPassword'] : [];
    const missing = ['server', 'IssuerOfPatientID', ...credentialFields].filter((field) => !config[field]);
    if (missing.length > 0) {
      throw missingFieldsError(missing);
    }

    const url = new URL('/du-auth-proxy/viewer', DUBuilder.normalizeServer(config.server));
    const credentials = svfUrlCredentials(
      config,
      options.userPlaceholder || '%USER%',
      options.passwordPlaceholder || '%PWD%',
      options.encryptedPrefix || 'ENC_'
    );
    const params = {
      user: credentials.user,
      password: credentials.password,
      ...(config.idp ? { idp: config.idp } : {}),
      IssuerOfPatientID: config.IssuerOfPatientID,
      ...parameters
    };

    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
    return preserveSvfVariables(url.toString());
  }

  function buildExternalCompanion(config, userPlaceholder, passwordPlaceholder, parameters, options = {}) {
    const includeIssuer = options.includeIssuer !== false;
    const requiredFields = includeIssuer
      ? ['appName', 'loginserver', 'IssuerOfPatientID']
      : ['appName', 'loginserver'];
    const missing = requiredFields.filter((field) => !config[field]);
    if (missing.length > 0) {
      throw missingFieldsError(missing);
    }

    const pairs = {
      loginserver: DUBuilder.normalizeLoginServer(config.loginserver),
      user: userPlaceholder,
      password: passwordPlaceholder,
      ...(config.idp ? { idp: config.idp } : {}),
      ...(includeIssuer ? { IssuerOfPatientID: config.IssuerOfPatientID } : {}),
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
    SVF_CARD_OPTIONS.forEach(([label, parameters]) => {
      try {
        appendScenario(section, `URL-Aufruf - ${label}`, buildSvfCardUrl(config, parameters));
      } catch (error) {
        appendMissing(section, `URL-Aufruf - ${label}`, error);
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

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function sectionToPdfHtml(section) {
    const items = section.items.map((item) => `
      <div class="item">
        <div class="label">${escapeHtml(item.label)}</div>
        <pre class="${item.type === 'missing' ? 'missing' : 'call'}">${escapeHtml(item.value)}</pre>
      </div>
    `).join('');
    return `
      <section class="section">
        <h2>${escapeHtml(section.title)}</h2>
        ${items}
      </section>
    `;
  }

  function buildPdfDocument(sections) {
    return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <title>Authproxycaller PDF Export</title>
  <style>
    body { margin: 24px; font-family: Arial, sans-serif; color: #172033; background: #fff; }
    h1 { margin: 0 0 14px; font-size: 20px; }
    .section { margin: 0 0 18px; page-break-inside: avoid; }
    .section h2 { margin: 0 0 8px; padding: 5px 8px; border-left: 4px solid #3157d5; background: #edf1ff; color: #203564; font-size: 14px; }
    .item { margin: 0 0 8px; }
    .label { display: inline-block; margin: 0 0 4px; padding: 2px 7px; border: 1px solid #cfd9ea; border-radius: 999px; background: #f6f9fd; font-size: 11px; font-weight: 700; }
    pre { margin: 0; padding: 7px 9px; border-radius: 7px; white-space: pre-wrap; overflow-wrap: anywhere; font: 11px/1.45 Consolas, monospace; }
    .call { border: 1px solid #0f6f2a; background: #020403; color: #33ff66; }
    .missing { border: 1px solid #f1bbb4; background: #fff0ee; color: #b42318; font-weight: 700; }
  </style>
</head>
<body>
  <h1>Authproxycaller PDF Export</h1>
  ${sections.map(sectionToPdfHtml).join('')}
</body>
</html>`;
  }

  function openPdfDialog() {
    const availableKeys = state.sections.map((section) => section.key);
    pdfDialog.classList.remove('hidden');
    pdfChecks.forEach((input) => {
      const option = input.closest('label');
      const unavailable = input.value !== 'all' && !availableKeys.includes(input.value);
      option.classList.toggle('hidden', unavailable);
      if (unavailable) {
        input.checked = false;
      }
    });
    pdfDialog.querySelector('input[value="all"]').checked = true;
    pdfDialog.querySelector('input[name="export-call-type"][value="both"]').checked = true;
  }

  function closePdfDialog() {
    pdfDialog.classList.add('hidden');
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

    const prefix = callType === 'url' ? 'URL-Aufruf - ' : 'Companion App - ';
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
    copyAllButton.disabled = !visibleOutput();
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
      const selectedExportCompanion = pdfDialog.querySelector('input[name="export-call-type"][value="companion"]:checked');
      if (selectedDisplayCompanion) {
        document.querySelector('input[name="display-call-type"][value="both"]').checked = true;
      }
      if (selectedExportCompanion) {
        pdfDialog.querySelector('input[name="export-call-type"][value="both"]').checked = true;
      }
    }
  }

  function selectedPdfSections() {
    const selected = Array.from(pdfChecks)
      .filter((input) => input.checked)
      .map((input) => input.value);
    const selectedSections = selected.includes('all')
      ? state.sections
      : state.sections.filter((section) => selected.includes(section.key));
    const callType = selectedExportCallType();
    return sectionsForCallType(selectedSections, callType);
  }

  function createPdfExport() {
    const sections = selectedPdfSections();
    if (sections.length === 0) {
      showNotice('Bitte mindestens eine Rubrik für den PDF Export auswählen.', 'error');
      return;
    }

    const pdfWindow = window.open('', '_blank');
    if (!pdfWindow) {
      showNotice('PDF Export wurde vom Browser blockiert.', 'error');
      return;
    }

    pdfWindow.document.open();
    pdfWindow.document.write(buildPdfDocument(sections));
    pdfWindow.document.close();
    pdfWindow.focus();
    window.setTimeout(() => pdfWindow.print(), 250);
    closePdfDialog();
    showNotice('PDF Export wurde vorbereitet.');
  }

  function createTxtExport() {
    const sections = selectedPdfSections();
    if (sections.length === 0) {
      showNotice('Bitte mindestens eine Rubrik für den TXT Export auswählen.', 'error');
      return;
    }

    const text = textFromSections(sections);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'authproxycaller-export.txt';
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    closePdfDialog();
    showNotice('TXT Export wurde erstellt.');
  }

  function renderOutput() {
    clearInvalidState();
    copyStatus.textContent = '';

    const config = collectConfig();
    const urlSection = createOutputSection('url', 'Test URL-Aufruf');

    URL_OPTIONS.forEach(([scenarioName, label]) => {
      try {
        const value = DUBuilder.buildUrl(scenarioName, config);
        appendScenario(urlSection, label, value);
      } catch (error) {
        appendMissing(urlSection, label, error);
      }
    });

    const includeCompanion = Boolean(config.appName);
    let companionSection = createOutputSection('companion', 'Test Companion App');
    const sections = [urlSection];
    if (includeCompanion) {
      COMPANION_OPTIONS.forEach(([scenarioName, label]) => {
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
      svfSection = createOutputSection('svf', 'SVF-RIS');
      SVF_RIS_OPTIONS.forEach(([label, parameters, options = {}]) => {
        if (!options.companionOnly) {
          try {
            appendScenario(svfSection, `URL-Aufruf - ${label}`, buildSvfRisUrl(config, parameters));
          } catch (error) {
            appendMissing(svfSection, `URL-Aufruf - ${label}`, error);
          }
        }
        if (includeCompanion) {
          try {
            appendScenario(svfSection, `Companion App - ${label}`, buildSvfRisCompanion(config, parameters, options));
          } catch (error) {
            appendMissing(svfSection, `Companion App - ${label}`, error);
          }
        }
      });

      svfCardSection = buildSvfCardSection('svfCard', 'SVF CARD', config, includeCompanion);
      svfFrauSection = buildSvfCardSection('svfFrau', 'SVF-FRAU', config, includeCompanion);
      svfOpapSection = buildSvfCardSection('svfOpap', 'SVF-OPAP', config, includeCompanion);
      svfLstmSection = buildSvfCardSection('svfLstm', 'SVF LSTM', config, includeCompanion);
      sections.push(svfSection, svfCardSection, svfFrauSection, svfOpapSection, svfLstmSection);
    }
    state.sections = sections;
    updateCompanionOptions(Boolean(companionSection));

    state.urlOutput = sectionToText(urlSection);
    state.companionOutput = companionSection ? sectionToText(companionSection) : '';
    if (config.kisType === 'fremd') {
      state.svfOutput = '';
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
        : 'Kopieren wurde vom Browser blockiert.';
      showNotice(copyStatus.textContent, copied ? undefined : 'error');
    }
  }

  function copyUrlOutput() {
    copyText(outputForSectionKey('url'), 'URL-Aufrufe wurden in die Zwischenablage kopiert.');
  }

  function copyAllOutput() {
    copyText(visibleOutput(), 'Alle sichtbaren Aufrufe wurden in die Zwischenablage kopiert.');
  }

  function copyCompanionOutput() {
    copyText(outputForSectionKey('companion'), 'Companion-App-Aufrufe wurden in die Zwischenablage kopiert.');
  }

  function copySvfOutput() {
    copyText(outputForSectionKey('svf'), 'SVF-RIS-Aufrufe wurden in die Zwischenablage kopiert.');
  }

  function copySvfCardOutput() {
    copyText(outputForSectionKey('svfCard'), 'SVF-CARD-Aufrufe wurden in die Zwischenablage kopiert.');
  }

  function copySvfFrauOutput() {
    copyText(outputForSectionKey('svfFrau'), 'SVF-FRAU-Aufrufe wurden in die Zwischenablage kopiert.');
  }

  function copySvfOpapOutput() {
    copyText(outputForSectionKey('svfOpap'), 'SVF-OPAP-Aufrufe wurden in die Zwischenablage kopiert.');
  }

  function copySvfLstmOutput() {
    copyText(outputForSectionKey('svfLstm'), 'SVF-LSTM-Aufrufe wurden in die Zwischenablage kopiert.');
  }

  const TEST_DATA_FIELDS = [
    'dicomFqdn',
    'viewerFqdn',
    'IssuerOfPatientID',
    'idp',
    'urlSharedUser',
    'urlSharedPassword',
    'user',
    'password',
    'companionPath',
    'kisType',
    'foreignPatientIdVariable',
    'foreignOrderNumberVariable',
    'diagnostPath',
    'PatientID',
    'AccessionNumber',
    'studyUID'
  ];
  const TEST_DATA_CHECKBOXES = [
    'terminalKis',
    'encryptedSvf',
    'urlSharedUserEnabled'
  ];

  function setTestButton(active) {
    serverTestButton.textContent = active ? 'Testdaten deaktivieren' : 'Testdaten aktivieren';
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
    document.getElementById('urlSharedUser').value = 'sammelbenutzer';
    document.getElementById('urlSharedPassword').value = 'sammelpasswort123';
    document.getElementById('terminalKis').checked = true;
    document.getElementById('encryptedSvf').checked = true;
    document.getElementById('user').value = 'testuser';
    document.getElementById('password').value = 'testpasswort123';
    document.getElementById('companionPath').value = 'O:\\orbis\\admin';
    kisType.value = 'fremd';
    document.getElementById('foreignPatientIdVariable').value = 'FKIS_PATIENT_ID';
    document.getElementById('foreignOrderNumberVariable').value = 'FKIS_AUFTRAG_NR';
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
      showNotice('Testdaten wurden deaktiviert.');
    } else {
      state.testDataSnapshot = snapshotTestData();
      applyServerTestData();
      state.testDataActive = true;
      setTestButton(true);
      showNotice('Testdaten wurden aktiviert.');
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
  copyAllButton.addEventListener('click', copyAllOutput);
  copyUrlButton.addEventListener('click', copyUrlOutput);
  copyCompanionButton.addEventListener('click', copyCompanionOutput);
  copySvfButton.addEventListener('click', copySvfOutput);
  copySvfCardButton.addEventListener('click', copySvfCardOutput);
  copySvfFrauButton.addEventListener('click', copySvfFrauOutput);
  copySvfOpapButton.addEventListener('click', copySvfOpapOutput);
  copySvfLstmButton.addEventListener('click', copySvfLstmOutput);
  pdfExportButton.addEventListener('click', openPdfDialog);
  pdfCancelButton.addEventListener('click', closePdfDialog);
  pdfCreateButton.addEventListener('click', createPdfExport);
  txtCreateButton.addEventListener('click', createTxtExport);
  pdfDialog.addEventListener('click', (event) => {
    if (event.target === pdfDialog) {
      closePdfDialog();
    }
  });
  pdfChecks.forEach((input) => {
    input.addEventListener('change', () => {
      if (input.value === 'all' && input.checked) {
        pdfChecks.forEach((item) => {
          if (item.value !== 'all') item.checked = false;
        });
      } else if (input.value !== 'all' && input.checked) {
        pdfDialog.querySelector('input[value="all"]').checked = false;
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

  updateServerFields();
  updateKisFields();
  renderOutput();
})();
