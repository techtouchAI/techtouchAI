const NAMESPACE = 'techtouchai_apps_v1';

export const incrementViews = async (appId: string): Promise<number | null> => {
  try {
    // استخدام خدمة مجانية لعداد الزيارات
    const res = await fetch(`https://api.counterapi.dev/v1/${NAMESPACE}/${appId}/up`);
    if (res.ok) {
      const data = await res.json();
      return data.count;
    }
  } catch (e) {
    // Suppress error
  }
  return null;
};

export const getViews = async (appId: string): Promise<number | null> => {
  try {
    const res = await fetch(`https://api.counterapi.dev/v1/${NAMESPACE}/${appId}`);
    if (res.ok) {
      const data = await res.json();
      return data.count;
    }
  } catch (e) {
    // Suppress error
  }
  return null;
};
