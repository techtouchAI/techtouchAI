import { getGithubConfig, uploadToGithub, fetchFromGithub, deleteFromGithub, createRelease, uploadReleaseAsset, deleteReleaseByTag } from './github';

export interface AppFile {
  path: string;
  name: string;
}

export interface AppItem {
  id: string;
  name: string;
  description: string;
  imagePath: string;
  filePath?: string;
  fileName?: string;
  files?: AppFile[];
  createdAt: number;
}

export interface SiteSettings {
  siteName: string;
  siteLogoPath: string;
  titleFontSize?: number;
  headerFontSize?: number;
}

export const isSafeUrl = (url: string): boolean => {
  try {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return false;

    // Use a dummy base URL to parse relative URLs
    const parsedUrl = new URL(trimmedUrl, 'http://localhost');
    const protocol = parsedUrl.protocol.toLowerCase();

    // Block dangerous protocols
    if (['javascript:', 'data:', 'vbscript:', 'file:'].includes(protocol)) {
      return false;
    }

    // Check if it's an absolute URL
    // URL constructor parses absolute URLs with their own protocol
    // If it's absolute, it should be http: or https:
    if (trimmedUrl.includes('://')) {
      if (!['http:', 'https:'].includes(protocol)) {
        return false;
      }
    }

    return true;
  } catch (e) {
    return false;
  }
};

// Helper to convert File to Base64 natively (most reliable and performant for browser)
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
      if (match) {
        owner = match[1];
      }
      const pathParts = pathname.split('/').filter(Boolean);
      repo = pathParts.length > 0 ? pathParts[0] : `${owner}.github.io`;
    }
    
    const configStr = localStorage.getItem('github_config');
    if (configStr) {
      try {
        const config = JSON.parse(configStr);
        if (config.username && config.repo) {
          owner = config.username;
          repo = config.repo;
        }
      } catch (e) {}
    }
  }
  return { owner, repo };
};

export const getRawGithubUrl = (path: string, branch: string = 'main') => {
  const { owner, repo } = getRepoInfo();
  const timestamp = new Date().getTime();
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}?t=${timestamp}`;
};

export const fetchPublicData = async (path: string) => {
  const { owner, repo } = getRepoInfo();
  const timestamp = Date.now();

  // 1. Professional Real-time Fetch: GitHub API (Unauthenticated)
  // Guarantees 100% real-time data instantly after publish, bypassing all CDNs.
  try {
    const apiRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}?t=${timestamp}`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json'
      },
      cache: 'no-store'
    });

    if (apiRes.ok) {
      const data = await apiRes.json();
      if (!Array.isArray(data) && data.type === 'file' && data.content) {
        const cleanBase64 = data.content.replace(/\n/g, '');
        const binString = atob(cleanBase64);
        const bytes = new Uint8Array(binString.length);
        for (let i = 0; i < binString.length; i++) {
          bytes[i] = binString.charCodeAt(i);
        }
        const text = new TextDecoder().decode(bytes);
        return JSON.parse(text);
      }
    }
  } catch (e) {
    // Suppress error to avoid console clutter, it will fallback automatically
  }

  // 2. Fallback: GitHub Pages Relative Path (Updates after build 1-2 mins)
  try {
    if (typeof window !== 'undefined') {
      const basePath = window.location.pathname.startsWith(`/${repo}`) ? `/${repo}` : '';
      const relativePath = path.startsWith('public/') ? path.replace('public/', '/') : `/${path}`;
      
      let res = await fetch(`${basePath}${relativePath}?t=${timestamp}`, { cache: 'no-store' });
      if (res.ok) {
        const text = await res.text();
        if (text) return JSON.parse(text);
      }
    }
  } catch (e) {
    // Suppress error to avoid console clutter
  }

  // 3. Fallback: Raw GitHub Content (Updates after 5 mins)
  const urlMain = getRawGithubUrl(path, 'main');
  const urlMaster = getRawGithubUrl(path, 'master');
  
  try {
    let res = await fetch(urlMain, { cache: 'no-store' });
    if (!res.ok && res.status === 404) {
      res = await fetch(urlMaster, { cache: 'no-store' });
    }
    
    if (res.ok) {
      const text = await res.text();
      return text ? JSON.parse(text) : null;
    }
  } catch (e) {
    // Suppress error
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

export const saveApp = async (app: Omit<AppItem, 'id' | 'createdAt' | 'imagePath' | 'filePath' | 'fileName' | 'files'>, imageFile: File | null, appFiles: { file: File, customName: string }[], id?: string, onProgress?: (progress: number) => void): Promise<AppItem[]> => {
  const config = getGithubConfig();
  if (!config) throw new Error('GitHub configuration missing');

  const appId = id || Date.now().toString();
  const timestamp = Date.now();
  const apps = await getApps();
  const existingApp = apps.find(a => a.id === appId);

  // 1. Upload Image (only if provided)
  let imagePath = existingApp ? existingApp.imagePath : '';
  if (imageFile) {
    const imageExt = imageFile.name.split('.').pop();
    imagePath = `public/data/images/${appId}.${imageExt}`;
    const imageBase64 = await fileToBase64(imageFile);
    await uploadToGithub(config, imagePath, imageBase64, `Upload image for app ${appId}`, true);
  }

  // 2. Upload App Files via Releases API (only if provided)
  let uploadedFiles: AppFile[] = existingApp ? (existingApp.files || []) : [];
  if (appFiles.length > 0) {
    try {
      const releaseTag = `app-${appId}`;
      const release = await createRelease(config, releaseTag, `Assets for ${app.name}`);
      
      const newUploadedFiles: AppFile[] = [];
      for (let i = 0; i < appFiles.length; i++) {
        const { file, customName } = appFiles[i];
        const fileExt = file.name.split('.').pop();
        const safeFileName = `${appId}_${i}_${Date.now()}.${fileExt}`;
        
        const asset = await uploadReleaseAsset(config, release.upload_url, file, safeFileName, (progress) => {
          if (onProgress) {
            const baseProgress = (i / appFiles.length) * 100;
            const fileProgress = (progress / appFiles.length);
            onProgress(baseProgress + fileProgress);
          }
        });
        newUploadedFiles.push({ path: asset.browser_download_url, name: customName || file.name });
      }
      uploadedFiles = newUploadedFiles;
    } catch (error: any) {
      console.error("Error uploading release assets:", error);
      throw new Error(error.message || "فشل في رفع ملفات التطبيق.");
    }
  }

  // 3. Update apps.json
  const newApp: AppItem = {
    ...app,
    id: appId,
    createdAt: existingApp ? existingApp.createdAt : timestamp,
    imagePath,
    files: uploadedFiles
  };

  const existingIndex = apps.findIndex(a => a.id === appId);
  if (existingIndex >= 0) {
    apps[existingIndex] = newApp;
  } else {
    apps.push(newApp);
  }

  const updatedApps = apps.sort((a, b) => b.createdAt - a.createdAt);
  
  // Save directly to GitHub API
  await uploadToGithub(config, 'public/data/apps.json', JSON.stringify(updatedApps, null, 2), `Update apps.json with ${appId}`);
  
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
    await deleteReleaseByTag(config, `app-${id}`);

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
