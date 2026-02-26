import { getGithubConfig, uploadToGithub, fetchFromGithub, deleteFromGithub } from './github';

export interface AppItem {
  id: string;
  name: string;
  description: string;
  imagePath: string;
  filePath: string;
  fileName: string;
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
export const getRawGithubUrl = (path: string) => {
  // We need to know the repo owner and name. 
  // Since visitors don't have the config, we should hardcode it or fetch it from a known location.
  // For now, we assume the repo is techtouchAI/techtouchAI based on the context.
  const owner = 'techtouchAI';
  const repo = 'techtouchAI';
  const timestamp = new Date().getTime();
  return `https://raw.githubusercontent.com/${owner}/${repo}/main/${path}?t=${timestamp}`;
};

export const fetchPublicData = async (path: string) => {
  const url = getRawGithubUrl(path);
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (res.ok) {
      const text = await res.text();
      return text ? JSON.parse(text) : null;
    }
  } catch (e) {
    console.error(`Failed to fetch ${url}`, e);
  }
  return null;
};

export const getApps = async (): Promise<AppItem[]> => {
  const config = getGithubConfig();
  
  // If admin is logged in, fetch from GitHub API
  if (config) {
    try {
      const content = await fetchFromGithub(config, 'public/data/apps.json');
      if (content) {
        const apps = JSON.parse(content) as AppItem[];
        return apps.sort((a, b) => b.createdAt - a.createdAt);
      }
    } catch (e) {
      console.error('GitHub fetch failed, falling back to public data', e);
    }
  }

  // For normal visitors, fetch directly from raw.githubusercontent.com
  const publicData = await fetchPublicData('public/data/apps.json');
  if (publicData) {
    return publicData.sort((a: AppItem, b: AppItem) => b.createdAt - a.createdAt);
  }

  return [];
};

export const saveApp = async (app: Omit<AppItem, 'id' | 'createdAt' | 'imagePath' | 'filePath'>, imageFile: File, appFile: File, id?: string): Promise<void> => {
  const config = getGithubConfig();
  if (!config) throw new Error('GitHub configuration missing');

  const appId = id || Date.now().toString();
  const timestamp = Date.now();

  // 1. Upload Image
  const imageExt = imageFile.name.split('.').pop();
  const imagePath = `public/data/images/${appId}.${imageExt}`;
  const imageBase64 = await fileToBase64(imageFile);
  await uploadToGithub(config, imagePath, imageBase64, `Upload image for app ${appId}`, true);

  // 2. Upload App File
  const fileExt = appFile.name.split('.').pop();
  const filePath = `public/data/files/${appId}.${fileExt}`;
  const fileBase64 = await fileToBase64(appFile);
  await uploadToGithub(config, filePath, fileBase64, `Upload file for app ${appId}`, true);

  // 3. Update apps.json
  const apps = await getApps();
  const newApp: AppItem = {
    ...app,
    id: appId,
    createdAt: timestamp,
    imagePath,
    filePath,
    fileName: appFile.name
  };

  const existingIndex = apps.findIndex(a => a.id === appId);
  if (existingIndex >= 0) {
    apps[existingIndex] = newApp;
  } else {
    apps.push(newApp);
  }

  await uploadToGithub(config, 'public/data/apps.json', JSON.stringify(apps, null, 2), `Update apps.json with ${appId}`);
};

export const deleteApp = async (id: string): Promise<void> => {
  const config = getGithubConfig();
  if (!config) throw new Error('GitHub configuration missing');

  const apps = await getApps();
  const appToDelete = apps.find(a => a.id === id);
  
  if (appToDelete) {
    try { await deleteFromGithub(config, appToDelete.imagePath, `Delete image for app ${id}`); } catch (e) {}
    try { await deleteFromGithub(config, appToDelete.filePath, `Delete file for app ${id}`); } catch (e) {}

    const updatedApps = apps.filter(a => a.id !== id);
    await uploadToGithub(config, 'public/data/apps.json', JSON.stringify(updatedApps, null, 2), `Remove app ${id} from apps.json`);
  }
};

export const saveSiteSettings = async (settings: Omit<SiteSettings, 'siteLogoPath'>, logoFile?: File | null): Promise<void> => {
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
};

export const getSiteSettings = async (): Promise<SiteSettings | null> => {
  const config = getGithubConfig();
  
  if (config) {
    try {
      const content = await fetchFromGithub(config, 'public/data/settings.json');
      if (content) return JSON.parse(content);
    } catch (e) {}
  }

  const publicData = await fetchPublicData('public/data/settings.json');
  return publicData || null;
};
