export function convertGithubUrlToRaw(url: string): string | null {
  if (!url || typeof url !== 'string') return null;

  try {
    const parsedUrl = new URL(url.trim());

    if (parsedUrl.hostname === 'raw.githubusercontent.com') {
      return parsedUrl.toString();
    }

    if (parsedUrl.hostname !== 'github.com' && parsedUrl.hostname !== 'www.github.com') {
      return null;
    }

    const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);

    if (pathSegments.length < 3) return null;

    const user = pathSegments[0];
    const repo = pathSegments[1];
    const type = pathSegments[2];

    if (type === 'blob') {
      if (pathSegments.length < 5) return null;
      const branchAndPath = pathSegments.slice(3).join('/');
      return `https://raw.githubusercontent.com/${user}/${repo}/${branchAndPath}`;
    }

    if (type === 'releases') {
      if (pathSegments[3] === 'download' && pathSegments.length >= 6) {
        return parsedUrl.toString();
      }
    }

    return null;
  } catch (e) {
    return null;
  }
}
