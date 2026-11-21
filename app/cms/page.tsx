'use client';

import { useEffect, useState, useRef } from 'react';
import { getApps, saveApp, deleteApp, AppItem, saveSiteSettings, getSiteSettings, SiteSettings } from '@/lib/db';
import { getGithubConfig, saveGithubConfig, GithubConfig } from '@/lib/github';
import Navbar from '@/components/Navbar';
import { Trash2, Edit2, Plus, Loader2, Image as ImageIcon, File as FileIcon, LayoutGrid, Github, Settings as SettingsIcon, CheckCircle2, X } from 'lucide-react';
import { CMSAppImage } from '@/components/CMSAppImage';
import { convertGithubUrlToRaw } from '@/lib/githubParser';
import { getAppFiles } from '@/lib/appFiles';
import { formatFileSize, isWithinGithubReleaseAssetCount, isWithinGithubReleaseLimit, MAX_APP_IMAGE_BYTES, MAX_GITHUB_RELEASE_ASSET_COUNT } from '@/lib/uploadUtils';

export default function CMS() {
  const [apps, setApps] = useState<AppItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  
  // App Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageSelectionError, setImageSelectionError] = useState('');
  const [appFiles, setAppFiles] = useState<{ file: File; customName: string }[]>([]);
  const [fileSelectionError, setFileSelectionError] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [githubUrlError, setGithubUrlError] = useState('');
  
  // Settings Form State
  const [siteName, setSiteName] = useState('');
  const [titleFontSize, setTitleFontSize] = useState<number>(20);
  const [headerFontSize, setHeaderFontSize] = useState<number>(16);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  // GitHub Config State
  const [githubConfig, setGithubConfigState] = useState<GithubConfig>({ username: '', repo: '', token: '' });
  const [isGithubConfigured, setIsGithubConfigured] = useState(false);
  const [savingGithub, setSavingGithub] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'apps' | 'settings' | 'github'>('github');

  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const config = getGithubConfig();
    if (config && config.token) {
      setGithubConfigState(config);
      setIsGithubConfigured(true);
      setActiveTab('apps');
      loadData();
    } else {
      setLoading(false);
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [appsResult, settingsResult] = await Promise.allSettled([
        getApps(),
        getSiteSettings(),
      ]);
      if (appsResult.status === 'rejected') throw appsResult.reason;

      setApps(appsResult.value);
      if (settingsResult.status === 'fulfilled' && settingsResult.value) {
        setSiteName(settingsResult.value.siteName);
        if (settingsResult.value.titleFontSize) setTitleFontSize(settingsResult.value.titleFontSize);
        if (settingsResult.value.headerFontSize) setHeaderFontSize(settingsResult.value.headerFontSize);
      } else if (settingsResult.status === 'rejected') {
        console.warn('Failed to load site settings; app list is still available:', settingsResult.reason);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleGithubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGithub(true);
    try {
      saveGithubConfig(githubConfig);
      setIsGithubConfigured(true);
      setActiveTab('apps');
      await loadData();
    } catch (error: any) {
      console.error('Failed to save GitHub config:', error);
      alert(error.message || 'حدث خطأ أثناء حفظ إعدادات GitHub');
    } finally {
      setSavingGithub(false);
    }
  };

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const newSettings = await saveSiteSettings({ 
        siteName, 
        titleFontSize, 
        headerFontSize 
      }, logoFile);
      setSiteName(newSettings.siteName);
      if (newSettings.titleFontSize) setTitleFontSize(newSettings.titleFontSize);
      if (newSettings.headerFontSize) setHeaderFontSize(newSettings.headerFontSize);
      alert('تم حفظ الإعدادات بنجاح');
      setLogoFile(null);
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      alert(error.message || 'حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGithubUrlError('');

    const normalizedName = name.trim();
    if (!normalizedName) {
      alert('يرجى إدخال اسم التطبيق.');
      return;
    }
    if (!editingId && (!imageFile || (appFiles.length === 0 && !githubUrl.trim()))) {
      alert('يرجى اختيار صورة وملف واحد على الأقل للتطبيق (أو إدخال رابط GitHub مباشر).');
      return;
    }
    if (appFiles.some(({ file }) => !isWithinGithubReleaseLimit(file.size))) {
      setFileSelectionError('يجب أن يكون كل ملف أصغر من 2 GiB وفق حد GitHub Releases.');
      return;
    }
    if (!isWithinGithubReleaseAssetCount(appFiles.length)) {
      setFileSelectionError('يسمح GitHub بما يصل إلى 1000 أصل في الإصدار الواحد. أزل بعض الملفات قبل الرفع.');
      return;
    }

    let parsedGithubUrl: string | null = null;
    if (githubUrl.trim()) {
      parsedGithubUrl = convertGithubUrlToRaw(githubUrl.trim());
      if (!parsedGithubUrl) {
        setGithubUrlError('الرابط غير صالح. أدخل رابط HTTPS لملف GitHub أو لإحدى إصدارات المستودع.');
        return;
      }
    }

    setSaving(true);
    setUploadProgress(0);
    try {
      const updatedApps = await saveApp(
        { name: normalizedName, description, githubUrl: parsedGithubUrl || undefined },
        imageFile, 
        appFiles, 
        editingId || undefined,
        (progress) => setUploadProgress(progress)
      );
      setApps(updatedApps);
      resetForm();
      alert('تم حفظ التطبيق ونشره بنجاح! سيظهر على الموقع خلال لحظات.');
    } catch (error: any) {
      console.error('Failed to save app:', error);
      alert(error.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
      setUploadProgress(0);
    }
  };

  const handleEdit = (app: AppItem) => {
    setEditingId(app.id);
    setName(app.name);
    setDescription(app.description || '');
    setGithubUrl(app.githubUrl || '');
    setGithubUrlError('');
    setImageFile(null);
    setImageSelectionError('');
    setAppFiles([]);
    setFileSelectionError('');
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (fileInputRef.current) fileInputRef.current.value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا التطبيق؟')) return;
    try {
      const updatedApps = await deleteApp(id);
      setApps(updatedApps);
      if (editingId === id) resetForm();
    } catch (error) {
      console.error('Failed to delete app:', error);
      alert('حدث خطأ أثناء الحذف');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setGithubUrl('');
    setGithubUrlError('');
    setImageFile(null);
    setImageSelectionError('');
    setAppFiles([]);
    setFileSelectionError('');
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 border-b border-gray-200 dark:border-gray-800 pb-4">
          <button
            onClick={() => setActiveTab('github')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'github' ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            style={{ fontSize: `${headerFontSize}px` }}
          >
            <Github className="w-5 h-5" />
            إعدادات الاتصال
          </button>
          <button
            onClick={() => isGithubConfigured && setActiveTab('settings')}
            disabled={!isGithubConfigured}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'settings' ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'} ${!isGithubConfigured && 'opacity-50 cursor-not-allowed'}`}
            style={{ fontSize: `${headerFontSize}px` }}
          >
            <SettingsIcon className="w-5 h-5" />
            المظهر والإعدادات
          </button>
          <button
            onClick={() => isGithubConfigured && setActiveTab('apps')}
            disabled={!isGithubConfigured}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'apps' ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'} ${!isGithubConfigured && 'opacity-50 cursor-not-allowed'}`}
            style={{ fontSize: `${headerFontSize}px` }}
          >
            <LayoutGrid className="w-5 h-5" />
            إدارة التطبيقات
          </button>
        </div>

        {/* GitHub Config Tab */}
        {activeTab === 'github' && (
          <div className="max-w-2xl mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 sm:p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Github className="w-8 h-8 text-gray-900 dark:text-white" />
              </div>
              <h2 className="font-bold text-gray-900 dark:text-white mb-2" style={{ fontSize: `${headerFontSize}px` }}>ربط المستودع</h2>
              <p className="text-gray-500 dark:text-gray-400">قم بربط لوحة التحكم بمستودع GitHub الخاص بك لحفظ الملفات والبيانات مباشرة.</p>
            </div>

            <form onSubmit={handleGithubSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">GitHub Username</label>
                <input
                  type="text"
                  required
                  value={githubConfig.username}
                  onChange={(e) => setGithubConfigState({...githubConfig, username: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="مثال: techtouchai"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Repository Name</label>
                <input
                  type="text"
                  required
                  value={githubConfig.repo}
                  onChange={(e) => setGithubConfigState({...githubConfig, repo: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="مثال: techtouchAI"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">رمز وصول GitHub محدود الصلاحيات</label>
                <input
                  type="password"
                  required
                  value={githubConfig.token}
                  onChange={(e) => setGithubConfigState({...githubConfig, token: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="أدخل رمز الوصول"
                  dir="ltr"
                  autoComplete="new-password"
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  أنشئ رمزاً مخصصاً لهذا المستودع وبأقل صلاحيات لازمة لقراءة وكتابة المحتوى وإدارة الإصدارات.
                </p>
                <p role="alert" className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                  تنبيه أمني: الموقع ثابت ويحفظ الرمز في localStorage داخل المتصفح، لذلك يستطيع أي JavaScript يعمل في الصفحة الوصول إليه. لا تستخدم رمزاً واسع الصلاحيات؛ الحل الآمن النهائي هو نقل طلبات GitHub إلى خادم خلفي وحفظ السر في متغير بيئة.
                </p>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={savingGithub}
                  className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-3 rounded-xl font-medium hover:bg-gray-800 dark:hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {savingGithub ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                  حفظ واتصال
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 sm:p-8">
            <h2 className="font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2" style={{ fontSize: `${headerFontSize}px` }}>
              <SettingsIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              المظهر والإعدادات
            </h2>

            <form onSubmit={handleSettingsSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم الموقع (اختياري)</label>
                <input
                  type="text"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="اتركه فارغاً لإخفائه"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">حجم خط العناوين (px)</label>
                  <input
                    type="number"
                    value={titleFontSize}
                    onChange={(e) => setTitleFontSize(parseInt(e.target.value) || 24)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    min="12"
                    max="100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">حجم خط الإعدادات (px)</label>
                  <input
                    type="number"
                    value={headerFontSize}
                    onChange={(e) => setHeaderFontSize(parseInt(e.target.value) || 18)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    min="12"
                    max="100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">شعار الموقع (اختياري)</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-700 border-dashed rounded-xl hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors cursor-pointer bg-gray-50 dark:bg-gray-800" onClick={() => logoInputRef.current?.click()}>
                  <div className="space-y-1 text-center">
                    <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600 dark:text-gray-400 justify-center">
                      <span className="relative rounded-md font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                        {logoFile ? logoFile.name : 'اختر صورة الشعار'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG, SVG حتى 2MB</p>
                  </div>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={logoInputRef}
                  onChange={(e) => {
                    if (e.target.files?.[0]) setLogoFile(e.target.files[0]);
                  }}
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="w-full bg-indigo-600 text-white px-4 py-3 rounded-xl font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {savingSettings ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                  حفظ الإعدادات
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Apps Tab */}
        {activeTab === 'apps' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form Section */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 sticky top-24">
                <h2 className="font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2" style={{ fontSize: `${headerFontSize}px` }}>
                  {editingId ? <Edit2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> : <Plus className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
                  {editingId ? 'تعديل التطبيق' : 'إضافة تطبيق جديد'}
                </h2>
                
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم التطبيق *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                      placeholder="أدخل اسم التطبيق"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الوصف (اختياري)</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
                      placeholder="وصف مختصر للتطبيق"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">صورة التطبيق *</label>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => imageInputRef.current?.click()}
                      aria-describedby="image-upload-help"
                      className="mt-1 w-full flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-700 border-dashed rounded-xl hover:border-indigo-500 dark:hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors bg-gray-50 dark:bg-gray-800 disabled:opacity-60"
                    >
                      <span className="space-y-1 text-center">
                        <ImageIcon className="mx-auto h-12 w-12 text-gray-400" aria-hidden="true" />
                        <span className="block text-sm text-indigo-600 dark:text-indigo-400 font-medium" dir="ltr">
                          {imageFile ? imageFile.name : 'اختر صورة'}
                        </span>
                        <span id="image-upload-help" className="block text-xs text-gray-500 dark:text-gray-400">PNG, JPG, GIF — حتى 10 MiB</span>
                      </span>
                    </button>
                    {imageSelectionError && <p role="alert" className="mt-2 text-sm text-red-500">{imageSelectionError}</p>}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={imageInputRef}
                      disabled={saving}
                      onChange={(event) => {
                        const file = event.currentTarget.files?.[0];
                        event.currentTarget.value = '';
                        if (!file) return;

                        if (!file.type.startsWith('image/')) {
                          setImageSelectionError('اختر ملف صورة صالحاً.');
                          return;
                        }
                        if (file.size > MAX_APP_IMAGE_BYTES) {
                          setImageSelectionError('حجم الصورة يتجاوز الحد المسموح به وهو 10 MiB.');
                          return;
                        }

                        setImageFile(file);
                        setImageSelectionError('');
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">رابط تحميل مباشر من GitHub (اختياري)</label>
                    <input
                      type="url"
                      value={githubUrl}
                      onChange={(e) => {
                        setGithubUrl(e.target.value);
                        if (githubUrlError) setGithubUrlError('');
                      }}
                      className={`w-full px-4 py-2 bg-white dark:bg-gray-900 border ${githubUrlError ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 dark:border-gray-700 focus:ring-indigo-500 focus:border-indigo-500'} text-gray-900 dark:text-white rounded-xl focus:ring-2 outline-none transition-all`}
                      placeholder="https://github.com/user/repo/blob/main/file.apk"
                      dir="ltr"
                    />
                    {githubUrlError && <p role="alert" className="mt-1 text-sm text-red-500">{githubUrlError}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">أو رفع ملفات التطبيق من الجهاز</label>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => fileInputRef.current?.click()}
                      aria-describedby="app-files-help"
                      className="mt-1 w-full flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-700 border-dashed rounded-xl hover:border-indigo-500 dark:hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors bg-gray-50 dark:bg-gray-800 disabled:opacity-60"
                    >
                      <span className="space-y-1 text-center">
                        <FileIcon className="mx-auto h-12 w-12 text-gray-400" aria-hidden="true" />
                        <span className="block text-sm text-indigo-600 dark:text-indigo-400 font-medium">
                          {appFiles.length > 0 ? `${appFiles.length} ملفات محددة` : 'اختر ملفات'}
                        </span>
                        <span id="app-files-help" className="block text-xs text-gray-500 dark:text-gray-400">APK, ZIP, RAR, EXE وغيرها — كل ملف أقل من 2 GiB، وحتى {MAX_GITHUB_RELEASE_ASSET_COUNT} ملفاً لكل إصدار</span>
                      </span>
                    </button>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">الرفع يستخدم GitHub Releases؛ لا يوجد حد 100MB من الموقع، لكن لا يمكن تجاوز حد GitHub. الملفات الأكبر تحتاج تخزيناً خارجياً.</p>
                    {fileSelectionError && <p role="alert" className="mt-2 text-sm text-red-500">{fileSelectionError}</p>}
                    {appFiles.length > 0 && (
                      <div className="mt-3 space-y-3">
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-300">
                          إجمالي المحدد: {formatFileSize(appFiles.reduce((total, item) => total + item.file.size, 0))}
                        </p>
                        {appFiles.map((item, index) => (
                          <div key={`${item.file.name}-${item.file.lastModified}-${item.file.size}-${index}`} className="bg-gray-100 dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between gap-3 mb-2">
                              <span className="min-w-0 text-xs text-gray-500 dark:text-gray-400 truncate" dir="ltr">{item.file.name}</span>
                              <span className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(item.file.size)}</span>
                                <button
                                  type="button"
                                  disabled={saving}
                                  onClick={() => setAppFiles((currentFiles) => currentFiles.filter((_, currentIndex) => currentIndex !== index))}
                                  className="p-1 rounded-md text-gray-500 hover:text-red-600 dark:hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                                  aria-label={`إزالة الملف ${item.file.name}`}
                                >
                                  <X className="w-4 h-4" aria-hidden="true" />
                                </button>
                              </span>
                            </div>
                            <input
                              type="text"
                              value={item.customName}
                              disabled={saving}
                              onChange={(event) => {
                                setAppFiles((currentFiles) => currentFiles.map((currentFile, currentIndex) =>
                                  currentIndex === index ? { ...currentFile, customName: event.target.value } : currentFile,
                                ));
                              }}
                              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm disabled:opacity-60"
                              placeholder="اسم الملف (مثال: نسخة للأندرويد)"
                              aria-label={`اسم العرض للملف ${item.file.name}`}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      ref={fileInputRef}
                      disabled={saving}
                      onChange={(event) => {
                        const selectedFiles = Array.from(event.currentTarget.files || []);
                        event.currentTarget.value = '';
                        if (selectedFiles.length === 0) return;

                        const rejectedFiles = selectedFiles.filter((file) => !isWithinGithubReleaseLimit(file.size));
                        const acceptedFiles = selectedFiles.filter((file) => isWithinGithubReleaseLimit(file.size));
                        const seenFiles = new Set(appFiles.map(({ file }) => `${file.name}:${file.size}:${file.lastModified}`));
                        const newFiles: { file: File; customName: string }[] = [];
                        for (const file of acceptedFiles) {
                          const signature = `${file.name}:${file.size}:${file.lastModified}`;
                          if (!seenFiles.has(signature)) {
                            seenFiles.add(signature);
                            newFiles.push({ file, customName: file.name });
                          }
                        }

                        const availableSlots = Math.max(0, MAX_GITHUB_RELEASE_ASSET_COUNT - appFiles.length);
                        const filesToAdd = newFiles.slice(0, availableSlots);
                        const selectionErrors = [];
                        if (rejectedFiles.length > 0) {
                          selectionErrors.push(`لم تتم إضافة الملفات التي تساوي أو تتجاوز 2 GiB: ${rejectedFiles.map((file) => file.name).join('، ')}`);
                        }
                        if (filesToAdd.length < newFiles.length) {
                          selectionErrors.push(`لا يمكن أن يتجاوز عدد ملفات الإصدار ${MAX_GITHUB_RELEASE_ASSET_COUNT}.`);
                        }
                        setFileSelectionError(selectionErrors.join(' '));
                        if (filesToAdd.length > 0) {
                          setAppFiles((currentFiles) => [...currentFiles, ...filesToAdd]);
                        }
                      }}
                    />
                  </div>

                  <div className="pt-4 flex flex-col gap-3">
                    {saving && appFiles.length > 0 && (
                      <div>
                        <div
                          className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 overflow-hidden"
                          role="progressbar"
                          aria-label="تقدم رفع ملفات التطبيق"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={Math.round(uploadProgress)}
                        >
                          <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-150" style={{ width: `${Math.min(100, Math.max(0, uploadProgress))}%` }} />
                        </div>
                        <p className="text-xs text-gray-500 mt-1 text-center" aria-live="polite">
                          جاري رفع الملفات... {Math.round(uploadProgress)}%
                        </p>
                      </div>
                    )}
                    {saving && appFiles.length === 0 && (
                      <p className="text-xs text-gray-500 text-center" role="status">جارٍ حفظ الصورة والبيانات على GitHub...</p>
                    )}
                    <div className="flex gap-3 w-full">
                      <button
                        type="submit"
                        disabled={saving}
                        className="flex-1 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                      >
                        {saving && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                        {saving ? 'جارٍ الرفع والحفظ...' : editingId ? 'حفظ التعديلات' : 'رفع ونشر'}
                      </button>
                      {editingId && (
                        <button
                          type="button"
                          onClick={resetForm}
                          disabled={saving}
                          className="px-4 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                        >
                          إلغاء
                        </button>
                      )}
                    </div>
                  </div>
                </form>
              </div>
            </div>

            {/* List Section */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
                <h2 className="font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2" style={{ fontSize: `${headerFontSize}px` }}>
                  <LayoutGrid className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  التطبيقات المرفوعة ({apps.length})
                </h2>

                {loading ? (
                  <div className="flex justify-center items-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
                  </div>
                ) : loadError ? (
                  <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                    <p className="text-gray-500 dark:text-gray-400 mb-3">تعذر تحميل قائمة التطبيقات. تحقق من اتصال GitHub ثم أعد المحاولة.</p>
                    <button
                      type="button"
                      onClick={() => void loadData()}
                      className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      إعادة المحاولة
                    </button>
                  </div>
                ) : apps.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                    <p className="text-gray-500 dark:text-gray-400">لا توجد تطبيقات مرفوعة حالياً</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {apps.map((app) => (
                      <div key={app.id} className="flex items-center gap-4 p-4 border border-gray-100 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                          <CMSAppImage app={app} />
                        </div>
                        <div className="flex-grow min-w-0">
                          <h3 className="font-bold text-gray-900 dark:text-white truncate">{app.name}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {getAppFiles(app).length > 0 ? `${getAppFiles(app).length} ملفات قابلة للتحميل` : 'لا توجد ملفات مرفقة'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleEdit(app)}
                            className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                            title="تعديل"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(app.id)}
                            className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            title="حذف"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
