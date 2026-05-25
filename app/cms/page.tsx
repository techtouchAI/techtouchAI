'use client';

import { useEffect, useState, useRef } from 'react';
import { getApps, saveApp, deleteApp, AppItem, saveSiteSettings, getSiteSettings, SiteSettings } from '@/lib/db';
import Navbar from '@/components/Navbar';
import { Trash2, Edit2, Plus, Upload, Loader2, Image as ImageIcon, File as FileIcon, LayoutGrid, Settings as SettingsIcon, CheckCircle2, Lock } from 'lucide-react';
import { CMSAppImage } from '@/components/CMSAppImage';

export default function CMS() {
  const [apps, setApps] = useState<AppItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  
  // App Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [appFiles, setAppFiles] = useState<{ file: File, customName: string }[]>([]);
  
  // Settings Form State
  const [siteName, setSiteName] = useState('');
  const [titleFontSize, setTitleFontSize] = useState<number>(20);
  const [headerFontSize, setHeaderFontSize] = useState<number>(16);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  // Admin Auth State
  const [adminSecret, setAdminSecret] = useState('');
  const [isAdminConfigured, setIsAdminConfigured] = useState(false);
  const [savingAdmin, setSavingAdmin] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'apps' | 'settings' | 'auth'>('auth');

  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const secret = localStorage.getItem("admin_secret");
    if (secret) {
      setAdminSecret(secret);
      setIsAdminConfigured(true);
      setActiveTab("apps");
      loadData();
    } else {
      setLoading(false);
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [appsData, settingsData] = await Promise.all([
        getApps(),
        getSiteSettings()
      ]);
      setApps(appsData);
      if (settingsData) {
        setSiteName(settingsData.siteName);
        if (settingsData.titleFontSize) setTitleFontSize(settingsData.titleFontSize);
        if (settingsData.headerFontSize) setHeaderFontSize(settingsData.headerFontSize);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAdmin(true);
    localStorage.setItem('admin_secret', adminSecret);
    setIsAdminConfigured(true);
    setActiveTab('apps');
    await loadData();
    setSavingAdmin(false);
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
    if (!name) return;
    if (!editingId && (!imageFile || appFiles.length === 0)) {
      alert('يرجى اختيار صورة وملف واحد على الأقل للتطبيق');
      return;
    }

    setSaving(true);
    setUploadProgress(0);
    try {
      const updatedApps = await saveApp(
        { name, description }, 
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
    setImageFile(null);
    setAppFiles([]);
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
    setImageFile(null);
    setAppFiles([]);
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Tabs */}
        <div className="flex space-x-4 space-x-reverse mb-8 border-b border-gray-200 dark:border-gray-800 pb-4">
          <button
            onClick={() => setActiveTab('auth')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'auth' ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            style={{ fontSize: `${headerFontSize}px` }}
          >
            <Lock className="w-5 h-5" />
            المصادقة
          </button>
          <button
            onClick={() => isAdminConfigured && setActiveTab('apps')}
            disabled={!isAdminConfigured}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'apps' ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'} ${!isAdminConfigured && 'opacity-50 cursor-not-allowed'}`}
            style={{ fontSize: `${headerFontSize}px` }}
          >
            <LayoutGrid className="w-5 h-5" />
            التطبيقات
          </button>
          <button
            onClick={() => isAdminConfigured && setActiveTab('settings')}
            disabled={!isAdminConfigured}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'settings' ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'} ${!isAdminConfigured && 'opacity-50 cursor-not-allowed'}`}
            style={{ fontSize: `${headerFontSize}px` }}
          >
            <SettingsIcon className="w-5 h-5" />
            المظهر والإعدادات
          </button>
        </div>

        {/* Auth Tab */}
        {activeTab === 'auth' && (
          <div className="max-w-xl mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 sm:p-8">
            <h2 className="font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2" style={{ fontSize: `${headerFontSize}px` }}>
              <Lock className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              تسجيل الدخول للإدارة
            </h2>
            <form onSubmit={handleAdminSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الرقم السري للإدارة (Admin Password)</label>
                <input
                  type="password"
                  required
                  value={adminSecret}
                  onChange={(e) => setAdminSecret(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="أدخل الرقم السري للوحة التحكم"
                  dir="ltr"
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={savingAdmin}
                  className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-3 rounded-xl font-medium hover:bg-gray-800 dark:hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {savingAdmin ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                  تسجيل الدخول
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
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-700 border-dashed rounded-xl hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors cursor-pointer bg-gray-50 dark:bg-gray-800" onClick={() => imageInputRef.current?.click()}>
                      <div className="space-y-1 text-center">
                        <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="flex text-sm text-gray-600 dark:text-gray-400 justify-center">
                          <span className="relative rounded-md font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                            {imageFile ? imageFile.name : 'اختر صورة'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG, GIF حتى 5MB</p>
                      </div>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={imageInputRef}
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          const file = e.target.files[0];
                          if (file.size > 10 * 1024 * 1024) {
                            alert('حجم الصورة كبير جداً (أكثر من 10MB). يرجى اختيار صورة أصغر لضمان سرعة الرفع.');
                            e.target.value = '';
                            return;
                          }
                          setImageFile(file);
                        }
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ملفات التطبيق *</label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-700 border-dashed rounded-xl hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors cursor-pointer bg-gray-50 dark:bg-gray-800" onClick={() => fileInputRef.current?.click()}>
                      <div className="space-y-1 text-center">
                        <FileIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="flex text-sm text-gray-600 dark:text-gray-400 justify-center">
                          <span className="relative rounded-md font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                            {appFiles.length > 0 ? `${appFiles.length} ملفات محددة` : 'اختر ملفات'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">يمكنك اختيار أكثر من ملف (APK, ZIP, RAR, EXE)</p>
                      </div>
                    </div>
                    {appFiles.length > 0 && (
                      <div className="mt-3 space-y-3">
                        {appFiles.map((f, i) => (
                          <div key={i} className="bg-gray-100 dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 truncate" dir="ltr">{f.file.name}</div>
                            <input
                              type="text"
                              value={f.customName}
                              onChange={(e) => {
                                const newFiles = [...appFiles];
                                newFiles[i].customName = e.target.value;
                                setAppFiles(newFiles);
                              }}
                              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                              placeholder="اسم الملف (مثال: نسخة للاندرويد)"
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
                      onChange={(e) => {
                        if (e.target.files) {
                          const files = Array.from(e.target.files);
                          const largeFiles = files.filter(f => f.size > 100 * 1024 * 1024);
                          if (largeFiles.length > 0) {
                            alert('لقد اخترت ملفات كبيرة جداً (أكثر من 100MB). الرفع قد يستغرق وقتاً طويلاً، يرجى التأكد من عدم إغلاق الصفحة واستقرار الإنترنت لضمان نجاح العملية.');
                          }
                          const newFiles = files.map(f => ({ file: f, customName: f.name }));
                          setAppFiles(newFiles);
                        }
                      }}
                    />
                  </div>

                  <div className="pt-4 flex flex-col gap-3">
                    {saving && uploadProgress > 0 && (
                      <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mb-2">
                        <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                        <p className="text-xs text-gray-500 mt-1 text-center">جاري الرفع... {Math.round(uploadProgress)}%</p>
                      </div>
                    )}
                    <div className="flex gap-3 w-full">
                      <button
                        type="submit"
                        disabled={saving}
                        className="flex-1 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                      >
                        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                        {editingId ? 'حفظ التعديلات' : 'رفع ونشر'}
                      </button>
                      {editingId && (
                        <button
                          type="button"
                          onClick={resetForm}
                          className="px-4 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
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
                            {app.files ? `${app.files.length} ملفات` : app.fileName}
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
