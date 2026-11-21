import { getRawGithubUrl } from './db';

function isAbsoluteWebUrl(path: string): boolean {
  return /^https?:\/\//i.test(path);
}

export async function downloadAppFile(path: string, name: string): Promise<void> {
  try {
    let url: string;

    if (isAbsoluteWebUrl(path)) {
      url = new URL(path).toString();
    } else {
      const repositoryPath = path.replace(/^\/+/, '');
      url = getRawGithubUrl(repositoryPath, 'main');

      try {
        const response = await fetch(url, { method: 'HEAD' });
        if (response.status === 404) {
          url = getRawGithubUrl(repositoryPath, 'master');
        }
      } catch {
        // Use the default branch URL when the browser cannot perform a cross-origin HEAD request.
      }
    }

    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    console.error('Failed to start app file download:', error);
    window.alert(error instanceof Error ? error.message : 'تعذر فتح رابط التحميل.');
  }
}
