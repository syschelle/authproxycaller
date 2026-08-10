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
      params: ['user', 'password', 'idp', 'browser', 'studyUID']
    },
    'viewer-patient': {
      path: '/du-auth-proxy/viewer',
      required: ['server', 'user', 'password', 'PatientID'],
      params: ['user', 'password', 'idp', 'browser', 'PatientID', 'IssuerOfPatientID']
    },
    'viewer-accession': {
      path: '/du-auth-proxy/viewer',
      required: ['server', 'user', 'password', 'PatientID', 'AccessionNumber'],
      params: ['user', 'password', 'idp', 'browser', 'PatientID', 'IssuerOfPatientID', 'AccessionNumber']
    },
    'studysearch-empty': {
      path: '/du-auth-proxy/api/v1/viewer/studysearch',
      required: ['server', 'user', 'password'],
      params: ['user', 'password', 'idp', 'browser']
    },
    'studysearch-filtered': {
      path: '/du-auth-proxy/api/v1/viewer/studysearch',
      required: ['server', 'user', 'password'],
      params: ['user', 'password', 'idp', 'browser', 'ModalitiesInStudy', 'PatientID', 'StudyDateTime']
    }
  });

  const COMPANION_SCENARIOS = Object.freeze({
    'companion-study': {
      required: ['appName', 'loginserver', 'user', 'password', 'studyUID'],
      params: ['loginserver', 'user', 'password', 'idp', 'browser', 'studyUID', 'remote']
    },
    'companion-patient': {
      required: ['appName', 'loginserver', 'user', 'password', 'PatientID'],
      params: ['loginserver', 'user', 'password', 'idp', 'browser', 'PatientID', 'IssuerOfPatientID', 'remote']
    },
    'companion-accession': {
      required: ['appName', 'loginserver', 'user', 'password', 'PatientID', 'AccessionNumber'],
      params: ['loginserver', 'user', 'password', 'idp', 'browser', 'PatientID', 'IssuerOfPatientID', 'AccessionNumber', 'remote']
    },
    'companion-multi-accession': {
      required: ['appName', 'loginserver', 'user', 'password', 'AccessionNumber'],
      params: ['loginserver', 'user', 'password', 'idp', 'browser', 'IssuerOfPatientID', 'AccessionNumber', 'remote']
    },
    'companion-remote': {
      required: ['appName', 'loginserver', 'user', 'password', 'PatientID', 'remote'],
      params: ['loginserver', 'user', 'password', 'idp', 'browser', 'PatientID', 'IssuerOfPatientID', 'remote']
    },
    'companion-diagnost': {
      required: [
        'appName',
        'loginserver',
        'user',
        'password',
        'PatientID'
      ],
      params: ['loginserver', 'user', 'password', 'idp', 'browser', 'PatientID', 'IssuerOfPatientID', 'remote']
    },
    'companion-custom': {
      required: ['appName', 'loginserver', 'user', 'password'],
      params: [
        'loginserver',
        'user',
        'password',
        'idp',
        'browser',
        'studyUID',
        'PatientID',
        'IssuerOfPatientID',
        'AccessionNumber',
        'remote'
      ]
    }
  });

  const MAX_FIELD_LENGTH = 1024;
  const MAX_PATH_LENGTH = 2048;
  const MAX_PARAMETER_NAME_LENGTH = 64;
  const CONTROL_CHARS = /[\u0000-\u001F\u007F]/u;
  const HOST_PATTERN = /^(?:localhost|[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*|\d{1,3}(?:\.\d{1,3}){3})(?::\d{1,5})?$/u;

  // All public builders pass values through these validation helpers before a value
  // can become part of a URL, command line or project-specific parameter.
  function clean(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function validatePlainText(value, label, maxLength = MAX_FIELD_LENGTH) {
    const text = clean(value);
    if (text.length > maxLength) {
      throw new Error(`${label} ist zu lang.`);
    }
    if (CONTROL_CHARS.test(text)) {
      throw new Error(`${label} enthält unzulässige Steuerzeichen.`);
    }
    return text;
  }

  function validateDebugLevel(value) {
    const text = validatePlainText(value, 'Debuglevel');
    if (text && !['DEBUG', 'TRACE'].includes(text)) {
      throw new Error('Debuglevel muss DEBUG oder TRACE sein.');
    }
    return text;
  }

  function validateHost(value, label) {
    const text = validatePlainText(value, label);
    if (!HOST_PATTERN.test(text)) {
      throw new Error(`${label} muss ein Hostname, eine IP-Adresse oder Host:Port sein.`);
    }

    const portMatch = text.match(/:(\d{1,5})$/u);
    if (portMatch) {
      const port = Number(portMatch[1]);
      if (port < 1 || port > 65535) {
        throw new Error(`${label} enthält einen ungültigen Port.`);
      }
    }
    return text;
  }

  function rejectUrlParts(parsed, label) {
    if (parsed.username || parsed.password) {
      throw new Error('Benutzerdaten dürfen nicht im Serverfeld stehen.');
    }
    if (parsed.pathname !== '/' || parsed.search || parsed.hash) {
      throw new Error(`${label} darf keinen Pfad, Query-String oder Fragment enthalten.`);
    }
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

  // URL targets are intentionally limited to host/IP plus optional port. Paths,
  // query strings, fragments and credentials are rejected before URLs are built.
  function normalizeServer(input) {
    let value = validatePlainText(input, 'Server');
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
    rejectUrlParts(parsed, 'Server');
    validateHost(parsed.host, 'Server');

    return parsed.origin;
  }

  function normalizeLoginServer(input) {
    const value = validatePlainText(input, 'Loginserver');
    if (!value) {
      throw new Error('Loginserver fehlt.');
    }

    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) {
      const parsed = new URL(value);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Für den Loginserver sind nur HTTP und HTTPS zulässig.');
      }
      rejectUrlParts(parsed, 'Loginserver');
      validateHost(parsed.host, 'Loginserver');
      return parsed.host;
    }

    return validateHost(value.replace(/^\/+|\/+$/g, ''), 'Loginserver');
  }

  // Users enter only the Companion App directory. This helper appends the executable
  // name unless the full du-proxy-app.exe path was already provided.
  function companionExecutablePath(path) {
    const value = validatePlainText(path, 'Pfad zur Companion App', MAX_PATH_LENGTH);
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

  // buildUrl applies the selected URL_SCENARIOS definition, validates required
  // fields and appends only non-empty parameters to the DeepUnity Auth Proxy URL.
  function buildUrl(scenarioName, config) {
    const scenario = URL_SCENARIOS[scenarioName];
    if (!scenario) {
      throw new Error('Unbekanntes URL-Szenario.');
    }

    requireFields(config, scenario.required);
    const url = new URL(scenario.path, normalizeServer(config.server));

    scenario.params.forEach((parameter) => {
      const value = validatePlainText(config[parameter], parameter);
      if (value !== '') {
        url.searchParams.append(parameter, value);
      }
    });

    const debugLevel = validateDebugLevel(config.debuglevel);
    if (debugLevel) {
      url.search += `${url.search ? '&' : '?'}${encodeURIComponent(debugLevel)}`;
    }

    return url.toString();
  }

  function validateParameterName(name) {
    const value = validatePlainText(name, 'Parametername', MAX_PARAMETER_NAME_LENGTH);
    if (!/^[A-Za-z][A-Za-z0-9_.-]*$/.test(value)) {
      throw new Error('Der projektspezifische Parametername enthält unzulässige Zeichen.');
    }
    return value;
  }

  function quoteCmdValue(value) {
    const text = validatePlainText(String(value), 'Kommando-Wert', MAX_PATH_LENGTH);
    if (text === '') {
      return '""';
    }

    if (/[\s&|<>^()%!"]/u.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }

  // SVF credential placeholders keep their surrounding percent syntax. When
  // encryption is enabled, only the placeholder name receives the configured prefix.
  function svfCredentialPlaceholder(value, encrypted, encryptedPrefix = 'enc_') {
    const text = clean(value);
    if (!encrypted) {
      return text;
    }
    return text.replace(/^%/, `%${encryptedPrefix}`);
  }

  // buildCompanion creates Windows command lines for du-proxy-app.exe. It quotes
  // unsafe shell values, appends optional debug/deepUnity parameters and supports
  // both single-line and caret-wrapped multiline output.
  function buildCompanion(scenarioName, config, format) {
    const scenario = COMPANION_SCENARIOS[scenarioName];
    if (!scenario) {
      throw new Error('Unbekanntes Companion-App-Szenario.');
    }

    requireFields(config, scenario.required);

    const appName = validatePlainText(config.appName, 'Pfad zur Companion App', MAX_PATH_LENGTH);

    const normalizedConfig = {
      ...config,
      loginserver: normalizeLoginServer(config.loginserver)
    };

    const pairs = [];
    scenario.params.forEach((parameter) => {
      const value = validatePlainText(normalizedConfig[parameter], parameter);
      if (value !== '') {
        const formattedValue = parameter === 'remote' && value === '%' ? '%' : quoteCmdValue(value);
        pairs.push(`${parameter}=${formattedValue}`);
      }
    });

    const debugLevel = validateDebugLevel(config.debuglevel);
    if (debugLevel) {
      pairs.push(quoteCmdValue(debugLevel));
    }

    const diagnostParameter = clean(config.diagnostParameter);
    const diagnostPath = validatePlainText(config.diagnostPath, 'Pfad zum DeepUnity-Ordner', MAX_PATH_LENGTH);
    if (diagnostParameter && diagnostPath) {
      requireFields(config, ['diagnostParameter', 'diagnostPath']);
      pairs.push(`${validateParameterName(diagnostParameter)}=${quoteCmdValue(diagnostPath)}`);
    }

    if (format === 'single-line') {
      return `${[quoteCmdValue(appName), ...pairs].join(' ')} //`;
    }

    const lines = [quoteCmdValue(appName), ...pairs.map((pair) => `  ${pair}`), '  //'];
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
    validatePlainText,
    normalizeServer,
    normalizeLoginServer,
    companionExecutablePath,
    normalizeAccessions,
    quoteCmdValue,
    svfCredentialPlaceholder,
    validateParameterName
  };
});
