import type { AppFile, AppItem } from './db';

/**
 * Returns the downloadable files for an app while supporting the legacy
 * single-file fields and the optional direct GitHub URL used by older entries.
 */
export function getAppFiles(
  app: Pick<AppItem, 'files' | 'filePath' | 'fileName' | 'githubUrl'>,
): AppFile[] {
  const files = app.files?.length
    ? [...app.files]
    : app.filePath && app.fileName
      ? [{ path: app.filePath, name: app.fileName }]
      : [];

  if (app.githubUrl && !files.some((file) => file.path === app.githubUrl)) {
    files.push({ path: app.githubUrl, name: 'تحميل مباشر' });
  }

  return files;
}
