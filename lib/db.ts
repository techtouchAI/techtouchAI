import { getGithubConfig, uploadToGithub, fetchFromGithub, deleteFromGithub } from './github';

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
}

// Helper to convert File to Base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = error => reject(error);
  });
};

// Get raw GitHub URL for public access
export const getRawGithubUrl = (path: string, branch: string = 'main') => {
  // We need to know the repo owner and name. 
  // Since visitors don't have the config, we should hardcode it or fetch it from a known location.
  // For now, we assume the repo is techtouchAI/techtouchAI based on the context.
  const owner = 'techtouchAI';
  const repo = 'techtouchAI';
  const timestamp = new Date().getTime();
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}?t=${timestamp}`;
};

export const fetchPublicData = async (path: string) => {
  const owner = 'techtouchAI';
  const repo = 'techtouchAI';
  
  // 1. Try to get the absolute latest data using commit SHA (Bypasses all caches)
  try {
    const shaRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits/main`, { 
      cache: 'no-store',
      headers: { 'Accept': 'application/vnd.github.v3+json' }
    });
    if (shaRes.ok) {
      const shaData = await shaRes.json();
      const sha = shaData.sha;
      const rawRes = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${sha}/${path}`);
      if (rawRes.ok) {
        const text = await rawRes.text();
        if (text) return JSON.parse(text);
      }
    }
  } catch (e) {
    console.error('Failed to fetch via SHA', e);
  }

  // 2. Fallback to GitHub Pages relative path
  try {
    if (typeof window !== 'undefined') {
      // Handle GitHub Pages basePath if present
      const basePath = window.location.pathname.startsWith('/techtouchAI') ? '/techtouchAI' : '';
      const relativePath = path.startsWith('public/') ? path.replace('public/', '/') : `/${path}`;
      const timestamp = new Date().getTime();
      
      let res = await fetch(`${basePath}${relativePath}?t=${timestamp}`, { cache: 'no-store' });
      if (res.ok) {
        const text = await res.text();
        if (text) return JSON.parse(text);
      }
    }
  } catch (e) {
    console.error(`Failed to fetch relative data for ${path}`, e);
  }

  // 3. Fallback to raw.githubusercontent.com
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
    console.error(`Failed to fetch public data for ${path}`, e);
  }
  return null;
};

export const getApps = async (): Promise<AppItem[]> => {
  const config = getGithubConfig();
  
  // If admin is logged in, fetch from GitHub API
  if (config) {
    try {
      let content = await fetchFromGithub(config, 'public/data/apps.json');
      if (!content) {
        // Fallback to old path for backward compatibility
        content = await fetchFromGithub(config, 'data/apps.json');
      }
      if (content) {
        const apps = JSON.parse(content) as AppItem[];
        return apps.sort((a, b) => b.createdAt - a.createdAt);
      }
    } catch (e) {
      console.error('GitHub fetch failed, falling back to public data', e);
    }
  }

  // For normal visitors, fetch directly from raw.githubusercontent.com
  let publicData = await fetchPublicData('public/data/apps.json');
  if (!publicData) {
    // Fallback to old path
    publicData = await fetchPublicData('data/apps.json');
  }
  
  if (publicData) {
    return publicData.sort((a: AppItem, b: AppItem) => b.createdAt - a.createdAt);
  }

  return [];
};

export const saveApp = async (app: Omit<AppItem, 'id' | 'createdAt' | 'imagePath' | 'filePath' | 'fileName' | 'files'>, imageFile: File, appFiles: File[], id?: string): Promise<AppItem[]> => {
  const config = getGithubConfig();
  if (!config) throw new Error('GitHub configuration missing');

  const appId = id || Date.now().toString();
  const timestamp = Date.now();

  // 1. Upload Image
  const imageExt = imageFile.name.split('.').pop();
  const imagePath = `public/data/images/${appId}.${imageExt}`;
  const imageBase64 = await fileToBase64(imageFile);
  await uploadToGithub(config, imagePath, imageBase64, `Upload image for app ${appId}`, true);

  // 2. Upload App Files
  const uploadedFiles: AppFile[] = [];
  for (let i = 0; i < appFiles.length; i++) {
    const file = appFiles[i];
    const fileExt = file.name.split('.').pop();
    const filePath = `public/data/files/${appId}_${i}_${Date.now()}.${fileExt}`;
    const fileBase64 = await fileToBase64(file);
    await uploadToGithub(config, filePath, fileBase64, `Upload file ${file.name} for app ${appId}`, true);
    uploadedFiles.push({ path: filePath, name: file.name });
  }

  // 3. Update apps.json
  const apps = await getApps();
  const newApp: AppItem = {
    ...app,
    id: appId,
    createdAt: timestamp,
    imagePath,
    files: uploadedFiles
  };

  const existingIndex = apps.findIndex(a => a.id === appId);
  if (existingIndex >= 0) {
    apps[existingIndex] = newApp;
  } else {
    apps.push(newApp);
  }

  await uploadToGithub(config, 'public/data/apps.json', JSON.stringify(apps, null, 2), `Update apps.json with ${appId}`);
  return apps.sort((a, b) => b.createdAt - a.createdAt);
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
        try { await deleteFromGithub(config, file.path, `Delete file for app ${id}`); } catch (e) {}
      }
    }

    const updatedApps = apps.filter(a => a.id !== id);
    await uploadToGithub(config, 'public/data/apps.json', JSON.stringify(updatedApps, null, 2), `Remove app ${id} from apps.json`);
    return updatedApps.sort((a, b) => b.createdAt - a.createdAt);
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
