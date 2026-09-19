#!/usr/bin/env node
// Patches the freshly generated android/ project (expo prebuild) for a release build:
//   - release signing from KK_KEYSTORE_* env (or the debug key with --allow-debug-signing)
//   - one APK per ABI + a universal APK
//   - versionCode from -Pkk.versionCode
// android/ is generated and git-ignored, so this runs after every prebuild. Fails loudly if the
// template changed and a patch no longer applies.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const allowDebug = process.argv.includes('--allow-debug-signing');
const file = join(process.cwd(), 'android', 'app', 'build.gradle');
let gradle = readFileSync(file, 'utf8');

function replaceOnce(from, to, label) {
  if (!gradle.includes(from)) {
    console.error(`patch-android-release: anchor not found for "${label}" — Expo template changed?`);
    process.exit(1);
  }
  gradle = gradle.replace(from, to);
}

if (!allowDebug) {
  for (const name of ['KK_KEYSTORE_PATH', 'KK_KEYSTORE_PASSWORD', 'KK_KEY_ALIAS', 'KK_KEY_PASSWORD']) {
    if (!process.env[name]) {
      console.error(`patch-android-release: ${name} is not set (release signing is required).`);
      process.exit(1);
    }
  }
}

replaceOnce(
  'versionCode 1\n',
  "versionCode Integer.parseInt((findProperty('kk.versionCode') ?: '1').toString())\n",
  'versionCode',
);

if (!allowDebug) {
  replaceOnce(
    '    signingConfigs {\n        debug {',
    `    signingConfigs {
        release {
            storeFile file(System.getenv('KK_KEYSTORE_PATH'))
            storePassword System.getenv('KK_KEYSTORE_PASSWORD')
            keyAlias System.getenv('KK_KEY_ALIAS')
            keyPassword System.getenv('KK_KEY_PASSWORD')
        }
        debug {`,
    'signingConfigs',
  );
  const before = gradle;
  gradle = gradle.replace(
    /(release \{\n(?:\s*\/\/[^\n]*\n)*\s*)signingConfig signingConfigs\.debug/,
    '$1signingConfig signingConfigs.release',
  );
  if (gradle === before) {
    console.error('patch-android-release: anchor not found for "release signingConfig"');
    process.exit(1);
  }
}

replaceOnce(
  '    androidResources {',
  `    splits {
        abi {
            enable true
            reset()
            include 'arm64-v8a', 'armeabi-v7a', 'x86_64'
            universalApk true
        }
    }
    androidResources {`,
  'splits',
);

writeFileSync(file, gradle);
console.log(`patch-android-release: patched ${file} (${allowDebug ? 'debug signing' : 'release signing'})`);
