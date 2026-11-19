export const MAX_GITHUB_RELEASE_ASSET_BYTES = 2 * 1024 * 1024 * 1024;
export const MAX_GITHUB_RELEASE_ASSET_COUNT = 1000;
export const MAX_APP_IMAGE_BYTES = 10 * 1024 * 1024;

export function isWithinGithubReleaseLimit(fileSize: number): boolean {
  return Number.isFinite(fileSize) && fileSize >= 0 && fileSize < MAX_GITHUB_RELEASE_ASSET_BYTES;
}

export function isWithinGithubReleaseAssetCount(fileCount: number): boolean {
  return Number.isInteger(fileCount) && fileCount >= 0 && fileCount <= MAX_GITHUB_RELEASE_ASSET_COUNT;
}

export function calculateUploadProgressPercent({
  completedBytes,
  currentFileSize,
  loadedBytes,
  requestTotalBytes,
  totalBytes,
  currentFileIndex,
  totalFiles,
}: {
  completedBytes: number;
  currentFileSize: number;
  loadedBytes: number;
  requestTotalBytes: number;
  totalBytes: number;
  currentFileIndex: number;
  totalFiles: number;
}): number {
  const fileProgress = requestTotalBytes > 0
    ? Math.min(1, Math.max(0, loadedBytes / requestTotalBytes))
    : 0;
  const uploadedCurrentFileBytes = currentFileSize * fileProgress;
  const overallProgress = totalBytes > 0
    ? (completedBytes + uploadedCurrentFileBytes) / totalBytes
    : totalFiles > 0
      ? (currentFileIndex + fileProgress) / totalFiles
      : 0;

  // Keep a final 1% for committing apps.json after all binary assets have uploaded.
  return Math.min(99, Math.max(0, overallProgress * 99));
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 بايت';

  const units = ['بايت', 'ك.بايت', 'م.بايت', 'ج.بايت', 'ت.بايت'];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** unitIndex;
  const formattedValue = new Intl.NumberFormat('ar-IQ', {
    maximumFractionDigits: unitIndex === 0 ? 0 : 1,
  }).format(value);

  return `${formattedValue} ${units[unitIndex]}`;
}
