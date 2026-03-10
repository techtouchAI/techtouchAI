import { Octokit } from 'octokit';

export interface GithubConfig {
  username: string;
  repo: string;
  token: string;
}

export const getGithubConfig = (): GithubConfig | null => {
  if (typeof window === 'undefined') return null;
  const config = localStorage.getItem('github_config');
  return config ? JSON.parse(config) : null;
};

export const saveGithubConfig = (config: GithubConfig) => {
  localStorage.setItem('github_config', JSON.stringify(config));
};

// Helper to safely encode utf-8 to base64
const encodeBase64 = (str: string) => {
  const bytes = new TextEncoder().encode(str);
  let binString = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binString += String.fromCharCode(bytes[i]);
  }
  return btoa(binString);
};

// Helper to safely decode base64 to utf-8
const decodeBase64 = (base64: string) => {
  const cleanBase64 = base64.replace(/\n/g, '');
  const binString = atob(cleanBase64);
  const bytes = new Uint8Array(binString.length);
  for (let i = 0; i < binString.length; i++) {
    bytes[i] = binString.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
};

export const uploadToGithub = async (
  config: GithubConfig,
  path: string,
  content: string, // Base64 encoded content for files, or string for JSON
  message: string,
  isBase64: boolean = false
) => {
  const octokit = new Octokit({ auth: config.token });

  try {
    // Check if file exists to get its sha for updating
    let sha: string | undefined;
    try {
      const { data } = await octokit.rest.repos.getContent({
        owner: config.username,
        repo: config.repo,
        path,
      });
      if (!Array.isArray(data) && data.type === 'file') {
        sha = data.sha;
      }
    } catch (error: any) {
      if (error.status !== 404) throw error;
    }

    // Create or update file
    await octokit.rest.repos.createOrUpdateFileContents({
      owner: config.username,
      repo: config.repo,
      path,
      message,
      content: isBase64 ? content : encodeBase64(content),
      sha,
    });

    return true;
  } catch (error) {
    console.error('GitHub API Error:', error);
    throw error;
  }
};

export const deleteFromGithub = async (
  config: GithubConfig,
  path: string,
  message: string
) => {
  const octokit = new Octokit({ auth: config.token });

  try {
    // Get file sha
    const { data } = await octokit.rest.repos.getContent({
      owner: config.username,
      repo: config.repo,
      path,
    });

    if (!Array.isArray(data) && data.type === 'file') {
      await octokit.rest.repos.deleteFile({
        owner: config.username,
        repo: config.repo,
        path,
        message,
        sha: data.sha,
      });
    }
    return true;
  } catch (error) {
    console.error('GitHub API Error:', error);
    throw error;
  }
};

export const fetchFromGithub = async (config: GithubConfig, path: string) => {
  const url = `https://api.github.com/repos/${config.username}/${config.repo}/contents/${path}?t=${Date.now()}`;
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/vnd.github.v3+json',
        'If-None-Match': '',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
      cache: 'no-store',
    });
    
    if (res.ok) {
      const data = await res.json();
      if (!Array.isArray(data) && data.type === 'file' && data.content) {
        return decodeBase64(data.content);
      }
    }
    return null;
  } catch (error) {
    console.error('GitHub API Error:', error);
    return null;
  }
};

export const createRelease = async (config: GithubConfig, tag: string, name: string) => {
  const octokit = new Octokit({ auth: config.token });
  try {
    // Try to get the release first
    try {
      const { data } = await octokit.rest.repos.getReleaseByTag({
        owner: config.username,
        repo: config.repo,
        tag,
      });
      return data;
    } catch (e: any) {
      if (e.status !== 404) throw e;
    }

    // If not found, create it
    const { data } = await octokit.rest.repos.createRelease({
      owner: config.username,
      repo: config.repo,
      tag_name: tag,
      name: name,
      body: 'Auto-generated release for app assets.',
      draft: false,
      prerelease: false,
    });
    return data;
  } catch (error: any) {
    console.error('Create Release Error:', error);
    throw new Error(`فشل إنشاء الإصدار (Release) في GitHub. تأكد من أن الـ Token يمتلك صلاحية "Releases". التفاصيل: ${error.message}`);
  }
};

export const uploadReleaseAsset = async (config: GithubConfig, uploadUrl: string, file: File, fileName: string) => {
  const cleanUrl = uploadUrl.split('{')[0];
  const url = `${cleanUrl}?name=${encodeURIComponent(fileName)}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.token}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': file.type || 'application/octet-stream',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    body: file
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Upload Asset Error:', response.status, errorText);
    throw new Error(`فشل رفع الملف: ${response.statusText}`);
  }
  return response.json();
};

export const deleteReleaseByTag = async (config: GithubConfig, tag: string) => {
  const octokit = new Octokit({ auth: config.token });
  try {
    const { data: release } = await octokit.rest.repos.getReleaseByTag({
      owner: config.username,
      repo: config.repo,
      tag,
    });
    
    await octokit.rest.repos.deleteRelease({
      owner: config.username,
      repo: config.repo,
      release_id: release.id,
    });

    await octokit.rest.git.deleteRef({
      owner: config.username,
      repo: config.repo,
      ref: `tags/${tag}`,
    });
  } catch (error: any) {
    if (error.status !== 404) {
      console.error('Error deleting release:', error);
    }
  }
};
