(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.DUBuilder = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const URL_SCENARIOS = Object.freeze({
    'viewer-study': {
      path: '/du-auth-proxy/viewer',
      required: ['server', 'user', 'password', 'studyUID'],
      params: ['user', 'password', 'idp', 'studyUID']
    },
    'viewer-patient': {
      path: '/du-auth-proxy/viewer',
      required: ['server', 'user', 'password', 'PatientID', 'IssuerOfPatientID'],
      params: ['user', 'password', 'idp', 'PatientID', 'IssuerOfPatientID']
    },
    'viewer-accession': {
      path: '/du-auth-proxy/viewer',
      required: ['server', 'user', 'password', 'PatientID', 'IssuerOfPatientID', 'AccessionNumber'],
      params: ['user', 'password', 'idp', 'PatientID', 'IssuerOfPatientID', 'AccessionNumber']
    },
    'studysearch-empty': {
      path: '/du-auth-proxy/api/v1/viewer/studysearch',
      required: ['server', 'user', 'password'],
      params: ['user', 'password', 'idp']
    },
    'studysearch-filtered': {
      path: '/du-auth-proxy/api/v1/viewer/studysearch',
      required: ['server', 'user', 'password'],
      params: ['user', 'password', 'idp', 'ModalitiesInStudy', 'PatientID', 'StudyDateTime']
    }
  });

  const COMPANION_SCENARIOS = Object.freeze({
    'companion-study': {
      required: ['appName', 'loginserver', 'user', 'password', 'studyUID'],
      params: ['loginserver', 'user', 'password', 'idp', 'studyUID', 'remote']
    },
    'companion-patient': {
      required: ['appName', 'loginserver', 'user', 'password', 'PatientID', 'IssuerOfPatientID'],
      params: ['loginserver', 'user', 'password', 'idp', 'PatientID', 'IssuerOfPatientID', 'remote']
    },
    'companion-accession': {
      required: ['appName', 'loginserver', 'user', 'password', 'PatientID', 'IssuerOfPatientID', 'AccessionNumber'],
      params: ['loginserver', 'user', 'password', 'idp', 'PatientID', 'IssuerOfPatientID', 'AccessionNumber', 'remote']
    },
    'companion-multi-accession': {
      required: ['appName', 'loginserver', 'user', 'password', 'IssuerOfPatientID', 'AccessionNumber'],
      params: ['loginserver', 'user', 'password', 'idp', 'IssuerOfPatientID', 'AccessionNumber', 'remote']
    },
    'companion-remote': {
      required: ['appName', 'loginserver', 'user', 'password', 'PatientID', 'IssuerOfPatientID', 'remote'],
      params: ['loginserver', 'user', 'password', 'idp', 'PatientID', 'IssuerOfPatientID', 'remote']
    },
    'companion-diagnost': {
      required: [
        'appName',
        'loginserver',
        'user',
        'password',
        'PatientID',
        'IssuerOfPatientID'
      ],
      params: ['loginserver', 'user', 'password', 'idp', 'PatientID', 'IssuerOfPatientID', 'remote']
    },
    'companion-custom': {
      required: ['appName', 'loginserver', 'user', 'password'],
      params: [
        'loginserver',
        'user',
        'password',
        'idp',
        'studyUID',
        'PatientID',
        'IssuerOfPatientID',
        'AccessionNumber',
        'remote'
      ]
    }
  });

  function clean(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function requireFields(config, requiredFields) {
    const missing = requiredFields.filter((field) => clean(config[field]) === '');
    if (missing.length > 0) {
      const error = new Error(`Pflichtfelder fehlen: ${missing.join(', ')}`);
      error.code = 'MISSING_FIELDS';
      error.fields = missing;
      throw error;
    }
  }

  function normalizeServer(input) {
    let value = clean(input);
    if (!value) {
      throw new Error('Server fehlt.');
    }
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) {
      value = `https://${value}`;
    }

    let parsed;
    try {
      parsed = new URL(value);
    } catch {
      throw new Error('Server ist keine gültige URL oder kein gültiger Hostname.');
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Für URL-Aufrufe sind nur HTTP und HTTPS zulässig.');
    }
    if (parsed.username || parsed.password) {
      throw new Error('Benutzerdaten dürfen nicht im Serverfeld stehen.');
    }

    return parsed.origin;
  }

  function normalizeLoginServer(input) {
    const value = clean(input);
    if (!value) {
      throw new Error('Loginserver fehlt.');
    }

    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) {
      const parsed = new URL(value);
      return parsed.host;
    }

    return value.replace(/^\/+|\/+$/g, '');
  }

  function companionExecutablePath(path) {
    const value = clean(path);
    if (!value) {
      return '';
    }
    if (/du-proxy-app\.exe$/i.test(value)) {
      return value;
    }

    const separator = value.endsWith('\\') || value.endsWith('/')
      ? ''
      : value.includes('/') && !value.includes('\\')
        ? '/'
        : '\\';
    return `${value}${separator}du-proxy-app.exe`;
  }

  function buildUrl(scenarioName, config) {
    const scenario = URL_SCENARIOS[scenarioName];
    if (!scenario) {
      throw new Error('Unbekanntes URL-Szenario.');
    }

    requireFields(config, scenario.required);
    const url = new URL(scenario.path, normalizeServer(config.server));

    scenario.params.forEach((parameter) => {
      const value = clean(config[parameter]);
      if (value !== '') {
        url.searchParams.append(parameter, value);
      }
    });

    return url.toString();
  }

  function validateParameterName(name) {
    const value = clean(name);
    if (!/^[A-Za-z][A-Za-z0-9_.-]*$/.test(value)) {
      throw new Error('Der projektspezifische Parametername enthält unzulässige Zeichen.');
    }
    return value;
  }

  function quoteCmdValue(value) {
    const text = String(value);
    if (text === '') {
      return '""';
    }

    if (/[\s&|<>^()%!"]/u.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }

  function svfCredentialPlaceholder(value, encrypted, encryptedPrefix = 'enc_') {
    const text = clean(value);
    if (!encrypted) {
      return text;
    }
    return text.replace(/^%/, `%${encryptedPrefix}`);
  }

  function buildCompanion(scenarioName, config, format) {
    const scenario = COMPANION_SCENARIOS[scenarioName];
    if (!scenario) {
      throw new Error('Unbekanntes Companion-App-Szenario.');
    }

    requireFields(config, scenario.required);

    const appName = clean(config.appName);
    if (/\r|\n/.test(appName)) {
      throw new Error('Der App-Name darf keinen Zeilenumbruch enthalten.');
    }

    const normalizedConfig = {
      ...config,
      loginserver: normalizeLoginServer(config.loginserver)
    };

    const pairs = [];
    scenario.params.forEach((parameter) => {
      const value = clean(normalizedConfig[parameter]);
      if (value !== '') {
        const formattedValue = parameter === 'remote' && value === '%' ? '%' : quoteCmdValue(value);
        pairs.push(`${parameter}=${formattedValue}`);
      }
    });

    const diagnostParameter = clean(config.diagnostParameter);
    const diagnostPath = clean(config.diagnostPath);
    if (diagnostParameter && diagnostPath) {
      requireFields(config, ['diagnostParameter', 'diagnostPath']);
      pairs.push(`${validateParameterName(diagnostParameter)}=${quoteCmdValue(diagnostPath)}`);
    }

    if (format === 'single-line') {
      return [quoteCmdValue(appName), ...pairs].join(' ');
    }

    const lines = [quoteCmdValue(appName), ...pairs.map((pair) => `  ${pair}`)];
    return lines
      .map((line, index) => (index < lines.length - 1 ? `${line} ^` : line))
      .join('\n');
  }

  function splitAccessions(value) {
    return clean(value)
      .split(/[;,\r\n]+/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  function normalizeAccessions(value) {
    return splitAccessions(value).join(',');
  }

  return {
    URL_SCENARIOS,
    COMPANION_SCENARIOS,
    buildUrl,
    buildCompanion,
    normalizeServer,
    normalizeLoginServer,
    companionExecutablePath,
    normalizeAccessions,
    quoteCmdValue,
    svfCredentialPlaceholder,
    validateParameterName
  };
});
