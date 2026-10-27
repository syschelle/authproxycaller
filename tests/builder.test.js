'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildUrl,
  buildCompanion,
  buildExternalCompanion,
  buildInfo4UPacsParameters,
  normalizeAccessions,
  companionExecutablePath,
  svfCredentialPlaceholder,
  validatePlainText,
  validateParameterName,
  externalVariableValue,
  preserveUrlTemplateValues
} = require('../src/builder.js');

test('builds viewer URL by StudyUID with encoded parameters', () => {
  const result = buildUrl('viewer-study', {
    server: 'deepunity.example.local',
    user: 'web user',
    password: 'p&ss',
    realm: 'REALM',
    studyUID: '1.2.3.4'
  });

  assert.equal(
    result,
    'https://deepunity.example.local/du-auth-proxy/viewer?user=web+user&password=p%26ss&realm=REALM&studyUID=1.2.3.4'
  );
});

test('builds filtered study search and omits empty filters', () => {
  const result = buildUrl('studysearch-filtered', {
    server: 'https://auth.example.com',
    user: 'test',
    password: 'secret',
    ModalitiesInStudy: 'CT,MR',
    PatientID: '',
    StudyDateTime: 'TODAY'
  });

  assert.equal(
    result,
    'https://auth.example.com/du-auth-proxy/api/v1/viewer/studysearch?user=test&password=secret&ModalitiesInStudy=CT%2CMR&StudyDateTime=TODAY'
  );
});

test('adds browser and raw debug level to URL calls', () => {
  const result = buildUrl('viewer-study', {
    server: 'deepunity.example.local',
    user: 'web',
    password: 'PW',
    realm: '',
    browser: 'EDGE',
    debuglevel: 'TRACE',
    studyUID: '1.2.3.4'
  });

  assert.equal(
    result,
    'https://deepunity.example.local/du-auth-proxy/viewer?user=web&password=PW&browser=EDGE&studyUID=1.2.3.4&TRACE'
  );
  assert.doesNotMatch(result, /debuglevel=/);
});

test('builds multiline Companion App command', () => {
  const result = buildCompanion('companion-remote', {
    appName: 'du-proxy-app',
    loginserver: 'https://deepunity.example.local',
    user: 'web',
    password: 'PW',
    realm: 'REALM',
    PatientID: '123456',
    IssuerOfPatientID: '9509KBT',
    remote: 'CITRIX-01'
  }, 'multi-line');

  assert.equal(result, [
    'du-proxy-app ^',
    '  loginserver=deepunity.example.local ^',
    '  user=web ^',
    '  password=PW ^',
    '  realm=REALM ^',
    '  PatientID=123456 ^',
    '  IssuerOfPatientID=9509KBT ^',
    '  remote=CITRIX-01 ^',
    '  //'
  ].join('\n'));
});

test('adds browser and raw debug level to Companion App commands', () => {
  const result = buildCompanion('companion-study', {
    appName: 'du-proxy-app.exe',
    loginserver: 'deepunity.example.local',
    user: 'web',
    password: 'PW',
    browser: 'CHROME',
    debuglevel: 'DEBUG',
    studyUID: '1.2.3'
  }, 'single-line');

  assert.match(result, / browser=CHROME /);
  assert.match(result, / DEBUG \/\/$/);
  assert.doesNotMatch(result, /debuglevel=/);
});

test('keeps app_usr out of generic test Companion App commands', () => {
  const result = buildCompanion('companion-study', {
    appName: 'du-proxy-app.exe',
    loginserver: 'deepunity.example.local',
    user: 'test-user',
    password: 'test-password',
    studyUID: '1.2.3',
    urlAuditUserEnabled: true
  }, 'single-line');

  assert.equal(
    result,
    'du-proxy-app.exe loginserver=deepunity.example.local user=test-user password=test-password studyUID=1.2.3 //'
  );
  assert.doesNotMatch(result, /app_usr=/);
});

test('adds app_usr in exact order to special SVF Companion App commands', () => {
  const result = buildExternalCompanion({
    appName: 'O:\\orbis\\admin\\du-proxy-app.exe',
    loginserver: 'deepunity.example.local',
    diagnostPath: 'C:\\Program Files\\Dedalus\\DeepUnity',
    urlAuditUserEnabled: true,
    realm: 'ORBIS',
    IssuerOfPatientID: '9509KBT',
    browser: 'EDGE',
    remote: '%'
  }, '%ENC_USER%', '%ENC_PWD%', {
    PatientID: '%PATIENTID%',
    studyUID: '%STUDYUID%'
  });

  assert.equal(
    result,
    'O:\\orbis\\admin\\du-proxy-app.exe path="C:\\Program Files\\Dedalus\\DeepUnity" loginserver=deepunity.example.local user="%ENC_USER%" password="%ENC_PWD%" app_usr="%ENC_USER%" realm=ORBIS IssuerOfPatientID=9509KBT browser=EDGE remote=% PatientID="%PATIENTID%" studyUID="%STUDYUID%" //'
  );
});

test('preserves external RIS audit variable in special Companion App commands', () => {
  const result = buildExternalCompanion({
    appName: 'du-proxy-app.exe',
    loginserver: 'deepunity.example.local',
    urlAuditUserEnabled: true
  }, '${external.user}', '%HERSTELLER_PWD%', {
    PatientID: '[patient-id]'
  });

  assert.equal(
    result,
    'du-proxy-app.exe loginserver=deepunity.example.local user=${external.user} password="%HERSTELLER_PWD%" app_usr=${external.user} PatientID=[patient-id] //'
  );
});

test('quotes Companion App values containing spaces', () => {
  const result = buildCompanion('companion-diagnost', {
    appName: 'du-proxy-app.exe',
    loginserver: 'deepunity.example.local',
    user: 'web',
    password: 'PW',
    PatientID: '123456',
    IssuerOfPatientID: '9509KBT',
    diagnostParameter: 'path',
    diagnostPath: 'C:\\Program Files\\Dedalus\\DeepUnity'
  }, 'single-line');

  assert.match(
    result,
    /^du-proxy-app\.exe path="C:\\Program Files\\Dedalus\\DeepUnity" loginserver=deepunity\.example\.local /
  );
});

test('always quotes Companion App path value', () => {
  const result = buildCompanion('companion-diagnost', {
    appName: 'du-proxy-app.exe',
    loginserver: 'deepunity.example.local',
    user: 'web',
    password: 'PW',
    PatientID: '123456',
    diagnostParameter: 'path',
    diagnostPath: 'C:\\DeepUnity'
  }, 'single-line');

  assert.match(result, /^du-proxy-app\.exe path="C:\\DeepUnity" loginserver=deepunity\.example\.local /);
});

test('omits optional DeepUnity folder path when empty', () => {
  const result = buildCompanion('companion-diagnost', {
    appName: 'du-proxy-app.exe',
    loginserver: 'deepunity.example.local',
    user: 'web',
    password: 'PW',
    PatientID: '123456',
    IssuerOfPatientID: '9509KBT',
    diagnostParameter: 'path',
    diagnostPath: ''
  }, 'single-line');

  assert.doesNotMatch(result, /path=/);
});

test('adds terminal KIS remote marker to Companion App commands', () => {
  const result = buildCompanion('companion-study', {
    appName: 'du-proxy-app.exe',
    loginserver: 'deepunity.example.local',
    user: 'web',
    password: 'PW',
    studyUID: '1.2.3',
    remote: '%'
  }, 'single-line');

  assert.match(result, / remote=% \/\/$/);
});

test('adds encrypted prefix to SVF credential placeholders', () => {
  assert.equal(svfCredentialPlaceholder('%USER%', true, 'ENC_'), '%ENC_USER%');
  assert.equal(svfCredentialPlaceholder('%PWD%', true, 'ENC_'), '%ENC_PWD%');
  assert.equal(svfCredentialPlaceholder('%benutzercode', true), '%enc_benutzercode');
  assert.equal(svfCredentialPlaceholder('%passwort', true), '%enc_passwort');
  assert.equal(svfCredentialPlaceholder('%USER%', false), '%USER%');
});

test('normalizes multiple accession numbers', () => {
  assert.equal(
    normalizeAccessions('RAD-1; RAD-2\nRAD-3, RAD-4'),
    'RAD-1,RAD-2,RAD-3,RAD-4'
  );
});

test('builds Companion App executable path from directory', () => {
  assert.equal(
    companionExecutablePath('O:\\orbis\\admin'),
    'O:\\orbis\\admin\\du-proxy-app.exe'
  );
  assert.equal(
    companionExecutablePath('O:\\orbis\\admin\\du-proxy-app.exe'),
    'O:\\orbis\\admin\\du-proxy-app.exe'
  );
  assert.equal(
    companionExecutablePath('/opt/orbis/admin'),
    '/opt/orbis/admin/du-proxy-app.exe'
  );
});

test('rejects unsafe custom parameter names', () => {
  assert.throws(() => validateParameterName('path&calc'), /unzulässige Zeichen/);
});

test('keeps manufacturer-defined external RIS variables unchanged', () => {
  assert.equal(externalVariableValue('parameter'), 'parameter');
  assert.equal(externalVariableValue('%HERSTELLER_USER%'), '%HERSTELLER_USER%');
  assert.equal(externalVariableValue('${patient.id}'), '${patient.id}');
  assert.equal(externalVariableValue('[order-number]'), '[order-number]');
});

test('preserves manufacturer-defined external RIS variables in URL templates', () => {
  const url = new URL('https://viewer.example.local/du-auth-proxy/viewer');
  url.searchParams.append('user', '%HERSTELLER_USER%');
  url.searchParams.append('PatientID', '${patient.id}');

  assert.equal(
    preserveUrlTemplateValues(url.toString(), ['%HERSTELLER_USER%', '${patient.id}']),
    'https://viewer.example.local/du-auth-proxy/viewer?user=%HERSTELLER_USER%&PatientID=${patient.id}'
  );
});

test('rejects control characters in text values', () => {
  assert.throws(() => validatePlainText('safe\nunsafe', 'Testfeld'), /Steuerzeichen/);
});

test('rejects server URLs with paths, queries or credentials', () => {
  assert.throws(() => buildUrl('viewer-study', {
    server: 'https://auth.example.com/ignored/path',
    user: 'web',
    password: 'PW',
    studyUID: '1.2.3'
  }), /keinen Pfad/);

  assert.throws(() => buildUrl('viewer-study', {
    server: 'https://user:pw@auth.example.com',
    user: 'web',
    password: 'PW',
    studyUID: '1.2.3'
  }), /Benutzerdaten/);
});

test('rejects unsafe URL protocols and malformed hosts', () => {
  assert.throws(() => buildUrl('viewer-study', {
    server: 'javascript:alert(1)',
    user: 'web',
    password: 'PW',
    studyUID: '1.2.3'
  }), /HTTP und HTTPS|gültige URL|Hostname/);

  assert.throws(() => buildUrl('viewer-study', {
    server: 'auth example.local',
    user: 'web',
    password: 'PW',
    studyUID: '1.2.3'
  }), /Hostname/);
});

test('rejects line breaks in Companion App commands and paths', () => {
  assert.throws(() => companionExecutablePath('O:\\orbis\ncalc'), /Steuerzeichen/);

  assert.throws(() => buildCompanion('companion-study', {
    appName: 'du-proxy-app.exe',
    loginserver: 'deepunity.example.local',
    user: 'web',
    password: 'PW\ncalc',
    studyUID: '1.2.3'
  }, 'single-line'), /Steuerzeichen/);
});

test('rejects loginserver URLs with paths in Companion App commands', () => {
  assert.throws(() => buildCompanion('companion-study', {
    appName: 'du-proxy-app.exe',
    loginserver: 'https://deepunity.example.local/path',
    user: 'web',
    password: 'PW',
    studyUID: '1.2.3'
  }, 'single-line'), /keinen Pfad/);
});

test('builds every documented URL scenario', () => {
  const base = {
    server: 'example.test',
    user: 'web',
    password: 'PW',
    studyUID: '1.2.3.4',
    PatientID: '12345',
    IssuerOfPatientID: '4060KSR',
    AccessionNumber: 'RAD-1',
    ModalitiesInStudy: 'CT,MR',
    StudyDateTime: 'TODAY'
  };

  for (const scenario of [
    'viewer-study',
    'viewer-patient',
    'viewer-accession',
    'studysearch-empty',
    'studysearch-filtered'
  ]) {
    assert.doesNotThrow(() => buildUrl(scenario, base));
  }
});

test('omits IssuerOfPatientID from URL calls when empty', () => {
  const result = buildUrl('viewer-patient', {
    server: 'example.test',
    user: 'web',
    password: 'PW',
    PatientID: '12345',
    IssuerOfPatientID: ''
  });

  assert.match(result, /PatientID=12345/);
  assert.doesNotMatch(result, /IssuerOfPatientID/);
});

test('builds every documented Companion App scenario', () => {
  const base = {
    appName: 'du-proxy-app',
    loginserver: 'example.test',
    user: 'web',
    password: 'PW',
    studyUID: '1.2.3.4',
    PatientID: '12345',
    IssuerOfPatientID: '4060KSR',
    AccessionNumber: 'RAD-1,RAD-2',
    remote: 'CITRIX-01',
    diagnostParameter: 'path',
    diagnostPath: 'C:\\Program Files\\Dedalus\\DeepUnity'
  };

  for (const scenario of [
    'companion-study',
    'companion-patient',
    'companion-accession',
    'companion-multi-accession',
    'companion-remote',
    'companion-diagnost',
    'companion-custom'
  ]) {
    assert.doesNotThrow(() => buildCompanion(scenario, base, 'multi-line'));
  }
});

test('omits IssuerOfPatientID from Companion App calls when empty', () => {
  const result = buildCompanion('companion-patient', {
    appName: 'du-proxy-app',
    loginserver: 'example.test',
    user: 'web',
    password: 'PW',
    PatientID: '12345',
    IssuerOfPatientID: ''
  }, 'single-line');

  assert.match(result, /PatientID=12345/);
  assert.doesNotMatch(result, /IssuerOfPatientID/);
});

test('builds Info4U PACS parameter list from existing server fields', () => {
  const result = buildInfo4UPacsParameters({
    loginserver: 'dicomservices.example.local',
    server: 'https://viewer.example.local',
    urlSharedUser: 'du.webviewer.rl',
    urlSharedPassword: 'secret',
    IssuerOfPatientID: '4060KSR'
  });

  assert.deepEqual(result, [
    ['URL', 'https://viewer.example.local/du-auth-proxy/viewer'],
    ['Deep Unity Viewer Authentifizierungsserver', 'viewer.example.local'],
    ['Deep Unity Viewer Authentifizierungsserver Client', 'du.webviewer.rl'],
    ['Deep Unity Viewer Authentifizierungsserver Client Secret', 'secret'],
    ['Deep Unity Viewer Issuer', '4060KSR']
  ]);
});
