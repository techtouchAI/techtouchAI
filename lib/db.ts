import { getGithubConfig, uploadToGithub, fetchFromGithub, deleteFromGithub, createRelease, uploadReleaseAsset, deleteReleaseByTag } from './github';
import { calculateUploadProgressPercent, isWithinGithubReleaseAssetCount, isWithinGithubReleaseLimit } from './uploadUtils';

export interface AppFile {
  path: string;
  name: string;
  size?: number;
}

export interface AppItem {
  id: string;
  name: string;
  description: string;
  imagePath: string;
  filePath?: string;
  fileName?: string;
  files?: AppFile[];
  githubUrl?: string;
  releaseTag?: string;
  createdAt: number;
}

export interface SiteSettings {
  siteName: string;
  siteLogoPath: string;
  titleFontSize?: number;
  headerFontSize?: number;
}

// Convert small image uploads for GitHub Contents API; app binaries stay raw in Release Assets.
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the Data URL prefix (e.g., "data:image/png;base64,")
      resolve(result.split(',')[1]);
    };
    reader.onerror = error => reject(error);
  });
};

// Get raw GitHub URL for public access
export const getRepoInfo = () => {
  let owner = 'techtouchAI';
  let repo = 'techtouchAI';
  
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;

    if (hostname.includes('github.io')) {
      const match = hostname.match(/([a-zA-Z0-9-]+)\.github\.io/);
      if (match) owner = match[1];
      const pathParts = pathname.split('/').filter(Boolean);
      repo = pathParts.length > 0 ? pathParts[0] : `${owner}.github.io`;
    }

    const config = getGithubConfig();
    if (config?.username && config.repo) {
      owner = config.username;
      repo = config.repo;
    }
  }
  return { owner, repo };
};

export const getRawGithubUrl = (path: string, branch: string = 'main') => {
  const { owner, repo } = getRepoInfo();
  const timestamp = Date.now();
  const encodedPath = path.split('/').filter(Boolean).map(encodeURIComponent).join('/');
  return `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(branch)}/${encodedPath}?t=${timestamp}`;
};

export const fetchPublicData = async (path: string) => {
  const { owner, repo } = getRepoInfo();
  const timestamp = Date.now();
  let lastError: unknown;

  // 1. Prefer the GitHub API for fresh metadata.
  try {
    const apiRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}?t=${timestamp}`, {
      headers: { Accept: 'application/vnd.github.v3+json' },
      cache: 'no-store',
    });

    if (apiRes.ok) {
      const data = await apiRes.json();
      if (!Array.isArray(data) && data.type === 'file' && data.content) {
        const cleanBase64 = data.content.replace(/\n/g, '');
        const binaryString = atob(cleanBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let index = 0; index < binaryString.length; index += 1) {
          bytes[index] = binaryString.charCodeAt(index);
        }
        return JSON.parse(new TextDecoder().decode(bytes));
      }
    } else if (apiRes.status !== 404) {
      lastError = new Error(`GitHub API returned HTTP ${apiRes.status}.`);
    }
  } catch (error) {
    lastError = error;
  }

  // 2. Fall back to the deployed static file when running in a browser.
  if (typeof window !== 'undefined') {
    try {
      const basePath = window.location.pathname.startsWith(`/${repo}`) ? `/${repo}` : '';
      const relativePath = path.startsWith('public/') ? path.replace('public/', '/') : `/${path}`;
      const response = await fetch(`${basePath}${relativePath}?t=${timestamp}`, { cache: 'no-store' });

      if (response.ok) {
        const text = await response.text();
        if (text) return JSON.parse(text);
      } else if (response.status !== 404) {
        lastError = new Error(`Static data request returned HTTP ${response.status}.`);
      }
    } catch (error) {
      lastError = error;
    }
  }

  // 3. Last fallback: raw GitHub content, with support for either default branch name.
  try {
    let response = await fetch(getRawGithubUrl(path, 'main'), { cache: 'no-store' });
    if (response.status === 404) {
      response = await fetch(getRawGithubUrl(path, 'master'), { cache: 'no-store' });
    }

    if (response.ok) {
      const text = await response.text();
      return text ? JSON.parse(text) : null;
    }
    if (response.status !== 404) {
      lastError = new Error(`Raw GitHub data request returned HTTP ${response.status}.`);
    }
  } catch (error) {
    lastError = error;
  }

  if (lastError) {
    throw lastError instanceof Error ? lastError : new Error('Failed to load public GitHub data.');
  }
  return null;
};

export const getApps = async (): Promise<AppItem[]> => {
  const config = getGithubConfig();

  // If admin is logged in, fetch from GitHub API (Authenticated - 5000 req/hr)
  if (config) {
    try {
      let content = await fetchFromGithub(config, 'public/data/apps.json');
      if (!content) content = await fetchFromGithub(config, 'data/apps.json');
      if (content) {
        const apps = JSON.parse(content) as AppItem[];
        return apps.sort((a, b) => b.createdAt - a.createdAt);
      }
    } catch (e) {
      console.error('GitHub fetch failed, falling back to public data', e);
    }
  }

  // For normal visitors, fetch via the 3-tier real-time system
  let publicData = await fetchPublicData('public/data/apps.json');
  if (!publicData) publicData = await fetchPublicData('data/apps.json');
  
  if (publicData) {
    return publicData.sort((a: AppItem, b: AppItem) => b.createdAt - a.createdAt);
  }

  return [];
};

export const saveApp = async (
  app: Omit<AppItem, 'id' | 'createdAt' | 'imagePath' | 'filePath' | 'fileName' | 'files'>,
  imageFile: File | null,
  appFiles: { file: File; customName: string }[],
  id?: string,
  onProgress?: (progress: number) => void,
): Promise<AppItem[]> => {
  const config = getGithubConfig();
  if (!config) throw new Error('GitHub configuration missing');

  const oversizedFiles = appFiles.filter(({ file }) => !isWithinGithubReleaseLimit(file.size));
  if (oversizedFiles.length > 0) {
    const names = oversizedFiles.map(({ file }) => file.name).join('، ');
    throw new Error(`الملفات التالية يجب أن يكون كل منها أصغر من 2 GiB وفق حد GitHub Releases: ${names}. استخدم تخزيناً خارجياً للملفات الأكبر.`);
  }
  if (!isWithinGithubReleaseAssetCount(appFiles.length)) {
    throw new Error('يسمح GitHub بما يصل إلى 1000 أصل في الإصدار الواحد. قلّل هذه الدفعة أو استخدم تخزيناً خارجياً.');
  }

  const appId = id || Date.now().toString();
  const timestamp = Date.now();
  const apps = await getApps();
  const existingApp = apps.find((item) => item.id === appId);

  // Images remain small GitHub Contents API files; app binaries use Release Assets below.
  let imagePath = existingApp ? existingApp.imagePath : '';
  if (imageFile) {
    const imageExt = imageFile.name.split('.').pop();
    imagePath = `public/data/images/${appId}.${imageExt}`;
    const imageBase64 = await fileToBase64(imageFile);
    await uploadToGithub(config, imagePath, imageBase64, `Upload image for app ${appId}`, true);
  }

  let uploadedFiles: AppFile[] = existingApp
    ? existingApp.files?.length
      ? [...existingApp.files]
      : existingApp.filePath && existingApp.fileName
        ? [{ path: existingApp.filePath, name: existingApp.fileName }]
        : []
    : [];
  const newReleaseTag = appFiles.length > 0
    ? `app-${appId}-${timestamp}-${Math.random().toString(36).slice(2, 10)}`
    : undefined;
  if (appFiles.length > 0 && newReleaseTag) {
    try {
      const release = await createRelease(config, newReleaseTag, `Assets for ${app.name}`);
      const newUploadedFiles: AppFile[] = [];
      const totalBytes = appFiles.reduce((total, item) => total + item.file.size, 0);
      let completedBytes = 0;

      for (let index = 0; index < appFiles.length; index += 1) {
        const { file, customName } = appFiles[index];
        const extension = file.name.includes('.') ? `.${file.name.split('.').pop()}` : '';
        const safeFileName = `${appId}_${index}_${Date.now()}${extension}`;

        const asset = await uploadReleaseAsset(
          config,
          release.upload_url,
          file,
          safeFileName,
          (loadedBytes, requestTotalBytes) => {
            const progress = calculateUploadProgressPercent({
              completedBytes,
              currentFileSize: file.size,
              loadedBytes,
              requestTotalBytes,
              totalBytes,
              currentFileIndex: index,
              totalFiles: appFiles.length,
            });
            onProgress?.(progress);
          },
        );

        completedBytes += file.size;
        newUploadedFiles.push({
          path: asset.browser_download_url,
          name: customName || file.name,
          size: file.size,
        });
        if (totalBytes === 0) {
          onProgress?.(((index + 1) / appFiles.length) * 99);
        }
      }

      uploadedFiles = newUploadedFiles;
    } catch (error) {
      await deleteReleaseByTag(config, newReleaseTag);
      console.error('Error uploading release assets:', error);
      throw error instanceof Error ? error : new Error('فشل في رفع ملفات التطبيق.');
    }
  }

  const newApp: AppItem = {
    ...app,
    id: appId,
    createdAt: existingApp ? existingApp.createdAt : timestamp,
    imagePath,
    files: uploadedFiles,
    releaseTag: newReleaseTag || existingApp?.releaseTag,
  };

  const existingIndex = apps.findIndex((item) => item.id === appId);
  if (existingIndex >= 0) {
    apps[existingIndex] = newApp;
  } else {
    apps.push(newApp);
  }

  const updatedApps = apps.sort((a, b) => b.createdAt - a.createdAt);
  await uploadToGithub(
    config,
    'public/data/apps.json',
    JSON.stringify(updatedApps, null, 2),
    `Update apps.json with ${appId}`,
  );

  if (newReleaseTag && existingApp) {
    const previousReleaseTag = existingApp.releaseTag || `app-${appId}`;
    if (previousReleaseTag !== newReleaseTag) {
      // Keep the previous version available until the metadata points to the new release.
      await deleteReleaseByTag(config, previousReleaseTag);
    }
  }

  onProgress?.(100);

  return updatedApps;
};

export const deleteApp = async (id: string): Promise<AppItem[]> => {
  const config = getGithubConfig();
  if (!config) throw new Error('GitHub configuration missing');

  const apps = await getApps();
  const appToDelete = apps.find(a => a.id === id);
  
  if (appToDelete) {
    try { await deleteFromGithub(config, appToDelete.imagePath, `Delete image for app ${id}`); } catch (e) {}
    if (appToDelete.filePath) {
      try { await deleteFromGithub(config, appToDelete.filePath, `Delete file for app ${id}`); } catch (e) {}
    }
    if (appToDelete.files) {
      for (const file of appToDelete.files) {
        if (!file.path.startsWith('http')) {
          try { await deleteFromGithub(config, file.path, `Delete file for app ${id}`); } catch (e) {}
        }
      }
    }
    
    // Delete the release and its assets
    await deleteReleaseByTag(config, appToDelete.releaseTag || `app-${id}`);

    const updatedApps = apps.filter(a => a.id !== id).sort((a, b) => b.createdAt - a.createdAt);
    
    // Save directly to GitHub API
    await uploadToGithub(config, 'public/data/apps.json', JSON.stringify(updatedApps, null, 2), `Remove app ${id} from apps.json`);
    
    return updatedApps;
  }
  return apps.sort((a, b) => b.createdAt - a.createdAt);
};

export const saveSiteSettings = async (settings: Omit<SiteSettings, 'siteLogoPath'>, logoFile?: File | null): Promise<SiteSettings> => {
  const config = getGithubConfig();
  if (!config) throw new Error('GitHub configuration missing');

  let logoPath = '';
  if (logoFile) {
    const ext = logoFile.name.split('.').pop();
    logoPath = `public/data/settings/logo.${ext}`;
    const logoBase64 = await fileToBase64(logoFile);
    await uploadToGithub(config, logoPath, logoBase64, 'Update site logo', true);
  } else {
    const existingSettings = await getSiteSettings();
    logoPath = existingSettings?.siteLogoPath || '';
  }

  const newSettings: SiteSettings = {
    ...settings,
    siteLogoPath: logoPath
  };

  await uploadToGithub(config, 'public/data/settings.json', JSON.stringify(newSettings, null, 2), 'Update site settings');
  return newSettings;
};

export const getSiteSettings = async (): Promise<SiteSettings | null> => {
  const config = getGithubConfig();

  if (config) {
    try {
      let content = await fetchFromGithub(config, 'public/data/settings.json');
      if (!content) {
        content = await fetchFromGithub(config, 'data/settings.json');
      }
      if (content) return JSON.parse(content);
    } catch (e) {}
  }

  let publicData = await fetchPublicData('public/data/settings.json');
  if (!publicData) {
    publicData = await fetchPublicData('data/settings.json');
  }
  return publicData || null;
};