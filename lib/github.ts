import axios from 'axios';

export interface GithubConfig {
  username: string;
  repo: string;
  token: string;
}

export const getGithubConfig = (): GithubConfig | null => {
  if (typeof window === 'undefined') return null;
  // Use sessionStorage to mitigate XSS risks (cleared on tab close)
  const config = sessionStorage.getItem('github_config');
  return config ? JSON.parse(config) : null;
};

export const saveGithubConfig = (config: GithubConfig) => {
  sessionStorage.setItem('github_config', JSON.stringify(config));
};

// Helper to safely encode utf-8 to base64
const encodeBase64 = (str: string) => {
  const bytes = new TextEncoder().encode(str);
  let binString = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binString += String.fromCharCode.apply(null, Array.from(chunk));
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
  try {
    const url = `https://api.github.com/repos/${config.username}/${config.repo}/contents/${path}`;

    // Check if file exists to get its sha for updating
    let sha: string | undefined;
    try {
      const getResponse = await axios.get(url, {
        headers: { Authorization: `Bearer ${config.token}` }
      });
      if (getResponse.data && getResponse.data.sha) {
        sha = getResponse.data.sha;
      }
    } catch (error: any) {
      if (error.response && error.response.status !== 404) {
        throw error;
      }
    }

    const payload = {
      message,
      content: isBase64 ? content : encodeBase64(content),
      ...(sha ? { sha } : {})
    };

    await axios.put(url, payload, {
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });

    return true;
  } catch (error: any) {
    console.error('GitHub API Error (Upload):', error);
    if (error.response?.status === 404) {
      throw new Error(`خطأ 404: تأكد من صحة اسم المستخدم (${config.username}) والمستودع (${config.repo}).`);
    } else if (error.response?.status === 403 || error.response?.status === 401) {
      throw new Error(`خطأ في الصلاحيات: الـ Token غير صحيح أو يفتقر إلى صلاحية "repo".`);
    }
    throw new Error(error.response?.data?.message || 'حدث خطأ أثناء الرفع إلى GitHub.');
  }
};

export const deleteFromGithub = async (
  config: GithubConfig,
  path: string,
  message: string
) => {
  try {
    const url = `https://api.github.com/repos/${config.username}/${config.repo}/contents/${path}`;

    const getResponse = await axios.get(url, {
      headers: { Authorization: `Bearer ${config.token}` }
    });

    if (getResponse.data && getResponse.data.sha) {
      await axios.delete(url, {
        headers: { Authorization: `Bearer ${config.token}` },
        data: {
          message,
          sha: getResponse.data.sha
        }
      });
    }
    return true;
  } catch (error: any) {
    if (error.response && error.response.status === 404) {
      return true; // File already gone
    }
    console.error('GitHub API Error (Delete):', error);
    throw error;
  }
};

export const fetchFromGithub = async (config: GithubConfig, path: string) => {
  try {
    const url = `https://api.github.com/repos/${config.username}/${config.repo}/contents/${path}?t=${Date.now()}`;
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/vnd.github.v3+json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    });

    const data = response.data;
    if (!Array.isArray(data) && data.type === 'file' && data.content) {
      return decodeBase64(data.content);
    }
    return null;
  } catch (error: any) {
    console.error('GitHub API Error (Fetch):', error);
    return null;
  }
};

export const createRelease = async (config: GithubConfig, tag: string, name: string) => {
  try {
    // Try to get the release first
    try {
      const getResponse = await axios.get(`https://api.github.com/repos/${config.username}/${config.repo}/releases/tags/${tag}`, {
        headers: { Authorization: `Bearer ${config.token}` }
      });
      return getResponse.data;
    } catch (error: any) {
      if (error.response && error.response.status !== 404) {
        throw error;
      }
    }

    // If not found, create it
    const createResponse = await axios.post(`https://api.github.com/repos/${config.username}/${config.repo}/releases`, {
      tag_name: tag,
      name: name,
      body: 'Auto-generated release for app assets.',
      draft: false,
      prerelease: false
    }, {
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/vnd.github+json'
      }
    });

    return createResponse.data;
  } catch (error: any) {
    console.error('Create Release Error:', error);
    throw new Error(error.response?.data?.message || 'فشل إنشاء الإصدار (Release) في GitHub.');
  }
};

export const uploadReleaseAsset = async (config: GithubConfig, uploadUrl: string, file: File, fileName: string, onProgress?: (progress: number) => void): Promise<any> => {
  const cleanUrl = uploadUrl.split('{')[0];
  const url = `${cleanUrl}?name=${encodeURIComponent(fileName)}`;

  let contentType = 'application/octet-stream';
  if (fileName.toLowerCase().endsWith('.apk')) {
    contentType = 'application/vnd.android.package-archive';
  } else if (fileName.toLowerCase().endsWith('.zip')) {
    contentType = 'application/zip';
  } else if (fileName.toLowerCase().endsWith('.rar')) {
    contentType = 'application/x-rar-compressed';
  } else if (fileName.toLowerCase().endsWith('.exe')) {
    contentType = 'application/x-msdownload';
  }

  try {
    const response = await axios.post(url, file, {
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': contentType,
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      }
    });

    return response.data;
  } catch (error: any) {
    console.error('Upload Asset Error:', error);
    let errorMsg = `فشل رفع الملف`;
    if (error.response?.status === 422) {
      errorMsg = "هذا الملف موجود بالفعل في هذا الإصدار. يرجى تغيير اسم الملف أو حذف الإصدار القديم.";
    } else if (error.response?.status === 401 || error.response?.status === 403) {
      errorMsg = "خطأ في الصلاحيات: تأكد من أن الـ Token لديه صلاحية الوصول الكامل.";
    }
    throw new Error(errorMsg);
  }
};

export const deleteReleaseByTag = async (config: GithubConfig, tag: string) => {
  try {
    const getResponse = await axios.get(`https://api.github.com/repos/${config.username}/${config.repo}/releases/tags/${tag}`, {
      headers: { Authorization: `Bearer ${config.token}` }
    });

    if (getResponse.data) {
      await axios.delete(`https://api.github.com/repos/${config.username}/${config.repo}/releases/${getResponse.data.id}`, {
        headers: { Authorization: `Bearer ${config.token}` }
      });

      await axios.delete(`https://api.github.com/repos/${config.username}/${config.repo}/git/refs/tags/${tag}`, {
        headers: { Authorization: `Bearer ${config.token}` }
      });
    }
  } catch (error: any) {
    if (error.response && error.response.status !== 404) {
      console.error('Error deleting release:', error);
    }
  }
};
