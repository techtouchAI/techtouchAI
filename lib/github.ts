import axios from 'axios';

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

const getAuthHeaders = () => {
  let secret = '';
  if (typeof window !== 'undefined') {
    secret = localStorage.getItem('admin_secret') || '';
  }
  return {
    'Authorization': `Bearer ${secret}`
  };
};

export const uploadToGithub = async (
  path: string,
  content: string, // Base64 encoded content for files, or string for JSON
  message: string,
  isBase64: boolean = false
) => {
  try {
    const response = await axios.post('/api/github/content', {
      path,
      content: isBase64 ? content : encodeBase64(content),
      message,
    }, {
      headers: getAuthHeaders()
    });
    return response.data.success;
  } catch (error: any) {
    console.error('GitHub API Error (Upload):', error);
    throw new Error(error.response?.data?.error || 'حدث خطأ غير متوقع أثناء الرفع عبر الخادم.');
  }
};

export const deleteFromGithub = async (
  path: string,
  message: string
) => {
  try {
    const response = await axios.delete('/api/github/content', {
      data: { path, message },
      headers: getAuthHeaders()
    });
    return response.data.success;
  } catch (error: any) {
    console.error('GitHub API Error (Delete):', error);
    throw error;
  }
};

export const fetchFromGithub = async (path: string) => {
  try {
    const response = await axios.get(`/api/github/content?path=${encodeURIComponent(path)}`, {
      headers: getAuthHeaders()
    });
    const data = response.data.data;
    if (!Array.isArray(data) && data.type === 'file' && data.content) {
      return decodeBase64(data.content);
    }
    return null;
  } catch (error: any) {
    console.error('GitHub API Error (Fetch):', error);
    return null;
  }
};

export const createRelease = async (tag: string, name: string) => {
  try {
    const response = await axios.post('/api/github/release', {
      tag,
      name,
    }, {
      headers: getAuthHeaders()
    });
    return response.data.data;
  } catch (error: any) {
    console.error('Create Release Error:', error);
    throw new Error(error.response?.data?.error || 'فشل إنشاء الإصدار (Release) عبر الخادم.');
  }
};

export const uploadReleaseAsset = async (uploadUrl: string, file: File, fileName: string, onProgress?: (progress: number) => void): Promise<any> => {
  try {
    const url = `/api/github/asset?uploadUrl=${encodeURIComponent(uploadUrl)}&fileName=${encodeURIComponent(fileName)}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/octet-stream',
      ...getAuthHeaders()
    };

    const response = await axios.post(url, file, {
      headers,
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
    throw new Error(error.response?.data?.error || "حدث خطأ في الشبكة أثناء الرفع عبر الخادم.");
  }
};

export const deleteReleaseByTag = async (tag: string) => {
  try {
    await axios.delete(`/api/github/release?tag=${encodeURIComponent(tag)}`, {
      headers: getAuthHeaders()
    });
  } catch (error: any) {
    console.error('Error deleting release:', error);
  }
};
