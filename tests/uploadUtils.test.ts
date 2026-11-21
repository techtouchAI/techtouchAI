import assert from 'node:assert/strict';
import test from 'node:test';
import { getAppFiles } from '../lib/appFiles.ts';
import {
  calculateUploadProgressPercent,
  formatFileSize,
  isWithinGithubReleaseAssetCount,
  isWithinGithubReleaseLimit,
  MAX_GITHUB_RELEASE_ASSET_BYTES,
  MAX_GITHUB_RELEASE_ASSET_COUNT,
} from '../lib/uploadUtils.ts';

test('accepts release assets strictly below GitHub’s documented 2 GiB limit', () => {
  assert.equal(isWithinGithubReleaseLimit(MAX_GITHUB_RELEASE_ASSET_BYTES - 1), true);
  assert.equal(isWithinGithubReleaseLimit(MAX_GITHUB_RELEASE_ASSET_BYTES), false);
  assert.equal(isWithinGithubReleaseLimit(-1), false);
  assert.equal(isWithinGithubReleaseLimit(Number.POSITIVE_INFINITY), false);
});

test('enforces GitHub’s 1000-asset per-release count without rejecting the boundary', () => {
  assert.equal(isWithinGithubReleaseAssetCount(MAX_GITHUB_RELEASE_ASSET_COUNT), true);
  assert.equal(isWithinGithubReleaseAssetCount(MAX_GITHUB_RELEASE_ASSET_COUNT + 1), false);
  assert.equal(isWithinGithubReleaseAssetCount(1.5), false);
});

test('weights progress by bytes and reserves one percent for the metadata commit', () => {
  const progress = calculateUploadProgressPercent({
    completedBytes: 0,
    currentFileSize: 90,
    loadedBytes: 45,
    requestTotalBytes: 90,
    totalBytes: 100,
    currentFileIndex: 0,
    totalFiles: 2,
  });

  assert.ok(Math.abs(progress - 44.55) < 1e-9);
  assert.equal(calculateUploadProgressPercent({
    completedBytes: 0,
    currentFileSize: 100,
    loadedBytes: 100,
    requestTotalBytes: 100,
    totalBytes: 100,
    currentFileIndex: 0,
    totalFiles: 1,
  }), 99);
});

test('formats file sizes with Arabic units and handles empty sizes', () => {
  assert.equal(formatFileSize(0), '0 بايت');
  assert.equal(formatFileSize(1024).endsWith('ك.بايت'), true);
  assert.equal(formatFileSize(1024 * 1024).endsWith('م.بايت'), true);
});

test('includes legacy single-file fields when the current file array is empty', () => {
  assert.deepEqual(
    getAppFiles({ files: [], filePath: 'public/apps/app.apk', fileName: 'app.apk' }),
    [{ path: 'public/apps/app.apk', name: 'app.apk' }],
  );
});

test('includes the direct GitHub URL on the app details page and avoids duplicates', () => {
  const githubUrl = 'https://github.com/example/app/releases/download/v1/app.apk';

  assert.deepEqual(getAppFiles({ files: [], githubUrl }), [
    { path: githubUrl, name: 'تحميل مباشر' },
  ]);
  assert.deepEqual(
    getAppFiles({ files: [{ path: githubUrl, name: 'APK' }], githubUrl }),
    [{ path: githubUrl, name: 'APK' }],
  );
});
