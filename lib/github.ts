import { Octokit } from 'octokit';

export interface GithubConfig {
  username: string;
  repo: string;
  token: string;
}

export const getGithubConfig = (): GithubConfig | null => {
  if (typeof window === 'undefined') return null;

  try {
    const storedConfig = localStorage.getItem('github_config');
    if (!storedConfig) return null;

    const config = JSON.parse(storedConfig) as Partial<GithubConfig>;
    if (typeof config.username !== 'string' || typeof config.repo !== 'string' || typeof config.token !== 'string') {
      return null;
    }

    return { username: config.username, repo: config.repo, token: config.token };
  } catch {
    return null;
  }
};

export const saveGithubConfig = (config: GithubConfig) => {
  localStorage.setItem('github_config', JSON.stringify(config));
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
  } catch (error: any) {
    console.error('GitHub API Error:', error);
    if (error.status === 404) {
      throw new Error(`خطأ 404 (المستودع غير موجود): تأكد من صحة اسم المستخدم (${config.username}) واسم المستودع (${config.repo}) في الإعدادات، وتأكد أن الـ Token يمتلك صلاحية "repo".`);
    } else if (error.status === 403) {
      throw new Error(`خطأ 403 (مرفوض): الـ Token لا يمتلك الصلاحيات الكافية. يرجى التأكد من منحه صلاحية "repo" كاملة.`);
    } else if (error.status === 409) {
      throw new Error(`خطأ 409 (تعارض): المستودع فارغ تماماً. يرجى إنشاء ملف واحد على الأقل (مثل README.md) في المستودع أولاً.`);
    }
    throw new Error(error.message || 'حدث خطأ غير متوقع أثناء الاتصال بـ GitHub.');
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

export const uploadReleaseAsset = (
  config: GithubConfig,
  uploadUrl: string,
  file: File,
  fileName: string,
  onProgress?: (loadedBytes: number, totalBytes: number) => void,
): Promise<any> => {
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

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', url);
    request.setRequestHeader('Authorization', `Bearer ${config.token}`);
    request.setRequestHeader('Accept', 'application/vnd.github+json');
    request.setRequestHeader('X-GitHub-Api-Version', '2022-11-28');
    request.setRequestHeader('Content-Type', contentType);

    request.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        onProgress?.(event.loaded, event.total);
      }
    });

    request.addEventListener('load', () => {
      let response: { message?: string } | null = null;
      try {
        response = request.responseText ? JSON.parse(request.responseText) : null;
      } catch {
        response = null;
      }

      if (request.status >= 200 && request.status < 300) {
        onProgress?.(file.size, file.size);
        if (response) {
          resolve(response);
        } else {
          reject(new Error('استقبلنا استجابة غير صالحة من GitHub بعد رفع الملف.'));
        }
        return;
      }

      const providerMessage = response?.message;
      let message = providerMessage
        ? `رفض GitHub رفع الملف: ${providerMessage}`
        : `فشل رفع الملف إلى GitHub (HTTP ${request.status}).`;

      if (request.status === 401 || request.status === 403) {
        message = 'رفض GitHub الرفع بسبب الصلاحيات أو إعدادات المستودع. تحقق من صلاحيات Contents وReleases للرمز المستخدم.';
      } else if (request.status === 404) {
        message = 'لم يعثر GitHub على الإصدار أو مسار رفع الملف. أعد المحاولة بعد إعادة تحميل لوحة التحكم.';
      } else if (request.status === 413) {
        message = 'رفض GitHub الملف لأنه بلغ حد الحجم؛ يجب أن يكون كل ملف أصغر من 2 GiB.';
      } else if (request.status === 422) {
        message = 'رفض GitHub الملف (422). قد يكون الاسم مستخدماً مسبقاً في هذا الإصدار أو تجاوز الإصدار حد عدد الملفات.';
      } else if (request.status >= 500) {
        message = `واجه GitHub خطأً مؤقتاً أثناء الرفع (HTTP ${request.status}). قد تحتاج إلى إعادة المحاولة؛ الرفع غير قابل للاستئناف.`;
      }

      reject(new Error(message));
    });

    request.addEventListener('error', () => {
      reject(new Error('انقطع الاتصال أثناء الرفع. تحقق من الشبكة ثم أعد المحاولة؛ GitHub لا يستأنف هذا الرفع تلقائياً.'));
    });
    request.addEventListener('abort', () => {
      reject(new Error('تم إيقاف رفع الملف قبل اكتماله.'));
    });
    request.addEventListener('timeout', () => {
      reject(new Error('انتهت مهلة الاتصال أثناء الرفع. أعد المحاولة على اتصال مستقر.'));
    });

    // Send the File directly; avoid Base64/ArrayBuffer copies for large assets.
    request.send(file);
  });
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
