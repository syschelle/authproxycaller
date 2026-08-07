'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildUrl,
  buildCompanion,
  normalizeAccessions,
  companionExecutablePath,
  svfCredentialPlaceholder,
  validatePlainText,
  validateParameterName
} = require('../src/builder.js');

test('builds viewer URL by StudyUID with encoded parameters', () => {
  const result = buildUrl('viewer-study', {
    server: 'deepunity.example.local',
    user: 'web user',
    password: 'p&ss',
    idp: 'ldap_IDP',
    studyUID: '1.2.3.4'
  });

  assert.equal(
    result,
    'https://deepunity.example.local/du-auth-proxy/viewer?user=web+user&password=p%26ss&idp=ldap_IDP&studyUID=1.2.3.4'
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

test('builds multiline Companion App command', () => {
  const result = buildCompanion('companion-remote', {
    appName: 'du-proxy-app',
    loginserver: 'https://deepunity.example.local',
    user: 'web',
    password: 'PW',
    idp: 'ldap_IDP',
    PatientID: '123456',
    IssuerOfPatientID: '9509KBT',
    remote: 'CITRIX-01'
  }, 'multi-line');

  assert.equal(result, [
    'du-proxy-app ^',
    '  loginserver=deepunity.example.local ^',
    '  user=web ^',
    '  password=PW ^',
    '  idp=ldap_IDP ^',
    '  PatientID=123456 ^',
    '  IssuerOfPatientID=9509KBT ^',
    '  remote=CITRIX-01'
  ].join('\n'));
});

test('quotes Companion App values containing spaces', () => {
  const result = buildCompanion('companion-diagnost', {
    appName: 'du-proxy-app.exe',
    loginserver: 'deepunity.example.local',
    user: 'web',
    password: 'PW',
    PatientID: '123456',
    IssuerOfPatientID: '9509KBT',
    diagnostParameter: 'diagnostPath',
    diagnostPath: 'C:\\Program Files\\Dedalus\\DeepUnity'
  }, 'single-line');

  assert.match(result, /diagnostPath="C:\\Program Files\\Dedalus\\DeepUnity"$/);
});

test('omits optional DeepUnity folder path when empty', () => {
  const result = buildCompanion('companion-diagnost', {
    appName: 'du-proxy-app.exe',
    loginserver: 'deepunity.example.local',
    user: 'web',
    password: 'PW',
    PatientID: '123456',
    IssuerOfPatientID: '9509KBT',
    diagnostParameter: 'diagnostPath',
    diagnostPath: ''
  }, 'single-line');

  assert.doesNotMatch(result, /diagnostPath=/);
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

  assert.match(result, / remote=%$/);
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
    diagnostParameter: 'diagnostPath',
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
