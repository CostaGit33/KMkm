import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../android');
const manifest = await readFile(path.join(root, 'app/src/main/AndroidManifest.xml'), 'utf8');
const variables = await readFile(path.join(root, 'variables.gradle'), 'utf8');
const appGradle = await readFile(path.join(root, 'app/build.gradle'), 'utf8');

test('Android mantém o identificador oficial do Mais1km', () => {
  assert.match(appGradle, /applicationId\s+['"]online\.novaagencian8n\.mais1km['"]/);
  assert.match(appGradle, /namespace\s*=\s*['"]online\.novaagencian8n\.mais1km['"]/);
});

test('Android usa SDK 36 e minSdk compatível com a configuração do projeto', () => {
  assert.match(variables, /compileSdkVersion\s*=\s*36/);
  assert.match(variables, /targetSdkVersion\s*=\s*36/);
  assert.match(variables, /minSdkVersion\s*=\s*24/);
});

test('manifesto restringe backup e tráfego HTTP sem TLS', () => {
  assert.match(manifest, /android:allowBackup="false"/);
  assert.match(manifest, /android:usesCleartextTraffic="false"/);
  assert.doesNotMatch(manifest, /android:allowBackup="true"/);
});

test('manifesto declara App Links verificados e permissões usadas pelo produto', () => {
  assert.match(manifest, /android:autoVerify="true"/);
  assert.match(manifest, /android:host="mais1km\.novaagencian8n\.online"/);
  assert.match(manifest, /android:pathPrefix="\/t\/"/);
  assert.match(manifest, /android\.permission\.NFC/);
  assert.match(manifest, /android\.permission\.ACCESS_FINE_LOCATION/);
  assert.match(manifest, /android:required="false"/);
});

test('release exige assinatura quando a flag de proteção está ativada', () => {
  assert.match(appGradle, /REQUIRE_ANDROID_RELEASE_SIGNING/);
  assert.match(appGradle, /ANDROID_KEYSTORE_PATH/);
  assert.match(appGradle, /ANDROID_KEYSTORE_PASSWORD/);
  assert.match(appGradle, /ANDROID_KEY_ALIAS/);
  assert.match(appGradle, /ANDROID_KEY_PASSWORD/);
  assert.match(appGradle, /ANDROID_VERSION_CODE/);
  assert.match(appGradle, /ANDROID_VERSION_NAME/);
});