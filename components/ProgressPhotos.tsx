'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getTodayDate } from '@/lib/utils';

type Photo = {
  id: string;
  storage_path: string;
  date: string;
  note: string | null;
  url: string;
};

export default function ProgressPhotos({ userId }: { userId: string }) {
  const supabase = createClient();
  const today = getTodayDate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [photoDate, setPhotoDate] = useState(today);
  const [viewPhoto, setViewPhoto] = useState<Photo | null>(null);
  const [error, setError] = useState('');

  useEffect(() => { loadPhotos(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadPhotos() {
    const { data } = await supabase
      .from('progress_photos')
      .select('id, storage_path, date, note')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (!data?.length) { setLoading(false); return; }

    const { data: signed } = await supabase.storage
      .from('progress-photos')
      .createSignedUrls(data.map(p => p.storage_path), 3600);

    const urlMap = new Map((signed ?? []).map(s => [s.path, s.signedUrl]));

    setPhotos(
      data
        .map(p => ({ ...p, url: urlMap.get(p.storage_path) ?? '' }))
        .filter(p => p.url)
    );
    setLoading(false);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploading(true);

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from('progress-photos')
      .upload(path, file, { contentType: file.type });

    if (upErr) { setError(upErr.message); setUploading(false); return; }

    await supabase.from('progress_photos').insert({
      user_id: userId,
      storage_path: path,
      date: photoDate,
    });

    await loadPhotos();
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleDelete(photo: Photo) {
    setPhotos(prev => prev.filter(p => p.id !== photo.id));
    if (viewPhoto?.id === photo.id) setViewPhoto(null);
    await supabase.storage.from('progress-photos').remove([photo.storage_path]);
    await supabase.from('progress_photos').delete().eq('id', photo.id);
  }

  function fmtDate(d: string, long = false) {
    return new Date(d + 'T00:00:00').toLocaleDateString(undefined,
      long
        ? { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }
        : { month: 'short', day: 'numeric' }
    );
  }

  return (
    <>
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div>
            <h2 className="font-semibold text-white">Progress photos</h2>
            <p className="text-xs text-slate-500 mt-0.5">{photos.length} photo{photos.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date" value={photoDate} onChange={e => setPhotoDate(e.target.value)} max={today}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={() => fileRef.current?.click()} disabled={uploading}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
              {uploading
                ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              }
              {uploading ? 'Uploading…' : 'Add photo'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          </div>
        </div>

        {error && <p className="px-5 py-2 text-red-400 text-xs break-all">{error}</p>}

        {loading ? (
          <div className="py-10 flex justify-center">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : photos.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-3xl mb-3">📸</p>
            <p className="text-slate-300 font-medium text-sm">No progress photos yet</p>
            <p className="text-slate-500 text-xs mt-1">Upload your first photo to start tracking visual progress</p>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {photos.map(photo => (
              <div
                key={photo.id}
                onClick={() => setViewPhoto(photo)}
                className="relative group cursor-pointer rounded-xl overflow-hidden bg-slate-800"
                style={{ aspectRatio: '3/4' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt={photo.date} className="w-full h-full object-cover" />

                {/* Date label always visible */}
                <div className="absolute bottom-0 left-0 right-0 px-2.5 py-2 bg-gradient-to-t from-black/70 to-transparent">
                  <p className="text-white text-[11px] font-medium">{fmtDate(photo.date)}</p>
                </div>

                {/* Delete button on hover */}
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(photo); }}
                  className="absolute top-2 right-2 bg-black/60 hover:bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {viewPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setViewPhoto(null)}
        >
          <div className="relative w-full max-w-sm" onClick={e => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={viewPhoto.url} alt={viewPhoto.date} className="w-full rounded-xl object-contain max-h-[75vh]" />
            <div className="flex items-center justify-between mt-4">
              <p className="text-white text-sm font-medium">{fmtDate(viewPhoto.date, true)}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDelete(viewPhoto)}
                  className="text-red-400 hover:text-red-300 text-xs px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors"
                >
                  Delete
                </button>
                <button
                  onClick={() => setViewPhoto(null)}
                  className="text-slate-400 hover:text-white text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Prev / Next navigation */}
            {photos.length > 1 && (() => {
              const idx = photos.findIndex(p => p.id === viewPhoto.id);
              return (
                <div className="flex justify-between mt-2">
                  <button
                    onClick={() => setViewPhoto(photos[idx + 1] ?? null)}
                    disabled={idx >= photos.length - 1}
                    className="text-slate-400 disabled:opacity-30 hover:text-white text-xs px-3 py-1.5 transition-colors"
                  >
                    ← Older
                  </button>
                  <p className="text-slate-600 text-xs self-center">{idx + 1} / {photos.length}</p>
                  <button
                    onClick={() => setViewPhoto(photos[idx - 1] ?? null)}
                    disabled={idx <= 0}
                    className="text-slate-400 disabled:opacity-30 hover:text-white text-xs px-3 py-1.5 transition-colors"
                  >
                    Newer →
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </>
  );
}
