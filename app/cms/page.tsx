'use client';

import { useEffect, useState, useRef } from 'react';
import { getApps, saveApp, deleteApp, AppItem } from '@/lib/db';
import Navbar from '@/components/Navbar';
import { Trash2, Edit2, Plus, Upload, Loader2, Image as ImageIcon, File as FileIcon, LayoutGrid } from 'lucide-react';

import { CMSAppImage } from '@/components/CMSAppImage';

export default function CMS() {
  const [apps, setApps] = useState<AppItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [appFile, setAppFile] = useState<File | null>(null);
  
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadApps();
  }, []);

  const loadApps = async () => {
    try {
      const data = await getApps();
      setApps(data);
    } catch (error) {
      console.error('Failed to load apps:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || (!imageFile && !editingId) || (!appFile && !editingId)) {
      alert('يرجى تعبئة الحقول المطلوبة (الاسم، الصورة، الملف)');
      return;
    }

    setSaving(true);
    try {
      let finalImage: Blob;
      let finalFile: Blob;
      let finalFileName: string;

      if (editingId) {
        const existingApp = apps.find(a => a.id === editingId);
        if (!existingApp) throw new Error('App not found');
        
        finalImage = imageFile || existingApp.image;
        finalFile = appFile || existingApp.file;
        finalFileName = appFile ? appFile.name : existingApp.fileName;
      } else {
        finalImage = imageFile!;
        finalFile = appFile!;
        finalFileName = appFile!.name;
      }

      const newApp: AppItem = {
        id: editingId || crypto.randomUUID(),
        name,
        description,
        image: finalImage,
        file: finalFile,
        fileName: finalFileName,
        createdAt: editingId ? apps.find(a => a.id === editingId)!.createdAt : Date.now(),
      };

      await saveApp(newApp);
      await loadApps();
      resetForm();
    } catch (error) {
      console.error('Failed to save app:', error);
      alert('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (app: AppItem) => {
    setEditingId(app.id);
    setName(app.name);
    setDescription(app.description || '');
    setImageFile(null);
    setAppFile(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا التطبيق؟')) return;
    try {
      await deleteApp(id);
      await loadApps();
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
    setAppFile(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Form Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                {editingId ? <Edit2 className="w-5 h-5 text-indigo-600" /> : <Plus className="w-5 h-5 text-indigo-600" />}
                {editingId ? 'تعديل التطبيق' : 'إضافة تطبيق جديد'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">اسم التطبيق *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    placeholder="أدخل اسم التطبيق"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الوصف (اختياري)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
                    placeholder="وصف مختصر للتطبيق"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">صورة التطبيق {editingId ? '(اختياري للتغيير)' : '*'}</label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl hover:border-indigo-500 transition-colors cursor-pointer bg-gray-50" onClick={() => imageInputRef.current?.click()}>
                    <div className="space-y-1 text-center">
                      <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600 justify-center">
                        <span className="relative rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                          {imageFile ? imageFile.name : 'اختر صورة'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">PNG, JPG, GIF حتى 5MB</p>
                    </div>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={imageInputRef}
                    onChange={(e) => {
                      if (e.target.files?.[0]) setImageFile(e.target.files[0]);
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ملف التطبيق {editingId ? '(اختياري للتغيير)' : '*'}</label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl hover:border-indigo-500 transition-colors cursor-pointer bg-gray-50" onClick={() => fileInputRef.current?.click()}>
                    <div className="space-y-1 text-center">
                      <FileIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600 justify-center">
                        <span className="relative rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                          {appFile ? appFile.name : 'اختر ملف'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">APK, ZIP, RAR, EXE</p>
                    </div>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files?.[0]) setAppFile(e.target.files[0]);
                    }}
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {editingId ? 'حفظ التعديلات' : 'نشر التطبيق'}
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                    >
                      إلغاء
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* List Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-indigo-600" />
                التطبيقات المنشورة ({apps.length})
              </h2>

              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                </div>
              ) : apps.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                  <p className="text-gray-500">لا توجد تطبيقات منشورة حالياً</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {apps.map((app) => (
                    <div key={app.id} className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        <CMSAppImage app={app} />
                      </div>
                      <div className="flex-grow min-w-0">
                        <h3 className="font-bold text-gray-900 truncate">{app.name}</h3>
                        <p className="text-sm text-gray-500 truncate">{app.fileName}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleEdit(app)}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="تعديل"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(app.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
      </main>
    </>
  );
}
