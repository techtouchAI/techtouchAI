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
      content: isBase64 ? content : btoa(unescape(encodeURIComponent(content))),
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
  const octokit = new Octokit({ auth: config.token });

  try {
    const { data } = await octokit.rest.repos.getContent({
      owner: config.username,
      repo: config.repo,
      path,
    });

    if (!Array.isArray(data) && data.type === 'file' && data.content) {
      return decodeURIComponent(escape(atob(data.content)));
    }
    return null;
  } catch (error: any) {
    if (error.status === 404) return null;
    console.error('GitHub API Error:', error);
    throw error;
  }
};
