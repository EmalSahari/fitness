'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import type { MealType } from '@/lib/types';

interface ScannedFood {
  name: string;
  calories: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  per100g: { kcal: number; protein: number | null; carbs: number | null; fat: number | null };
  productServingG: number | null; // serving size in grams from product data
}

interface Props {
  onAdd: (food: { name: string; calories: number; protein: number | null; carbs: number | null; fat: number | null; mealType: MealType }) => void;
  onClose: () => void;
  hideMealType?: boolean;
}

type ServingUnit = 'g' | 'ml' | 'tbsp' | 'tsp' | 'stk';

const UNIT_TO_G: Record<ServingUnit, number> = {
  g: 1,
  ml: 1,
  tbsp: 15,
  tsp: 5,
  stk: 100, // overridden by productServingG when available
};

const UNIT_LABELS: Record<ServingUnit, string> = {
  g: 'g',
  ml: 'ml',
  tbsp: 'spsk',
  tsp: 'tske',
  stk: 'stk',
};

function parseServingGrams(servingSize: string | undefined): number | null {
  if (!servingSize) return null;
  const match = servingSize.match(/(\d+(?:\.\d+)?)\s*g/i);
  return match ? parseFloat(match[1]) : null;
}

export default function BarcodeScanner({ onAdd, onClose, hideMealType = false }: Props) {
  const { t } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const cancelledRef = useRef(false);

  const [status, setStatus] = useState<'idle' | 'requesting' | 'scanning' | 'fetching' | 'found' | 'error' | 'unsupported'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [product, setProduct] = useState<ScannedFood | null>(null);
  const [servingQty, setServingQty] = useState('1');
  const [servingUnit, setServingUnit] = useState<ServingUnit>('stk');
  const [mealType, setMealType] = useState<MealType>('lunch');

  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
      controlsRef.current?.stop();
    };
  }, []);

  async function startCamera() {
    if (status !== 'idle' && status !== 'error') return;
    setStatus('requesting');
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      const reader = new BrowserMultiFormatReader();

      setStatus('scanning');
      // Use decodeFromConstraints for better camera control (back camera, higher res)
      const controls = await reader.decodeFromConstraints(
        {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        videoRef.current!,
        async (result, err) => {
          if (cancelledRef.current) return;
          void err;
          if (result) {
            controls?.stop();
            setStatus('fetching');
            await lookupBarcode(result.getText());
          }
        }
      );
      controlsRef.current = controls;
    } catch {
      if (!cancelledRef.current) setStatus('unsupported');
    }
  }

  async function lookupBarcode(barcode: string) {
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
      const json = await res.json();
      if (cancelledRef.current) return;

      if (json.status !== 1 || !json.product) {
        setStatus('error');
        setErrorMsg(t('scan_no_product'));
        return;
      }

      const p = json.product;
      const n = p.nutriments ?? {};
      const kcal = Math.round(n['energy-kcal_100g'] ?? (n['energy_100g'] != null ? n['energy_100g'] / 4.184 : 0));
      const protein = n['proteins_100g'] != null ? Math.round(n['proteins_100g'] * 10) / 10 : null;
      const carbs = n['carbohydrates_100g'] != null ? Math.round(n['carbohydrates_100g'] * 10) / 10 : null;
      const fat = n['fat_100g'] != null ? Math.round(n['fat_100g'] * 10) / 10 : null;
      const name = p.product_name || p.generic_name || 'Scanned product';
      const productServingG = parseServingGrams(p.serving_size);

      setProduct({ name, calories: kcal, protein, carbs, fat, per100g: { kcal, protein, carbs, fat }, productServingG });

      // Default to 'stk' (one serving) if product has a serving size, otherwise grams
      setServingUnit(productServingG ? 'stk' : 'g');
      setServingQty('1');
      setStatus('found');
    } catch {
      if (!cancelledRef.current) {
        setStatus('error');
        setErrorMsg(t('scan_error'));
      }
    }
  }

  function getServingGrams(): number {
    const qty = parseFloat(servingQty) || 1;
    if (servingUnit === 'stk' && product?.productServingG) {
      return qty * product.productServingG;
    }
    return qty * UNIT_TO_G[servingUnit];
  }

  function scaledNutrition() {
    if (!product) return null;
    const grams = getServingGrams();
    const s = grams / 100;
    if (s <= 0) return null;
    return {
      ...product,
      calories: Math.round(product.per100g.kcal * s),
      protein: product.per100g.protein != null ? Math.round(product.per100g.protein * s * 10) / 10 : null,
      carbs: product.per100g.carbs != null ? Math.round(product.per100g.carbs * s * 10) / 10 : null,
      fat: product.per100g.fat != null ? Math.round(product.per100g.fat * s * 10) / 10 : null,
    };
  }

  function handleAdd() {
    const scaled = scaledNutrition();
    if (!scaled) return;
    onAdd({ name: scaled.name, calories: scaled.calories, protein: scaled.protein, carbs: scaled.carbs, fat: scaled.fat, mealType });
    onClose();
  }

  const QUICK_PRESETS: { label: string; qty: string; unit: ServingUnit }[] = [
    { label: '1 tske', qty: '1', unit: 'tsp' },
    { label: '1 spsk', qty: '1', unit: 'tbsp' },
    { label: '2 spsk', qty: '2', unit: 'tbsp' },
    { label: '3 spsk', qty: '3', unit: 'tbsp' },
    { label: '50g', qty: '50', unit: 'g' },
    { label: '100g', qty: '100', unit: 'g' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 pb-20 sm:pb-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div>
            <h2 className="font-semibold text-white">{t('scan_title')}</h2>
            {status === 'scanning' && <p className="text-xs text-slate-400 mt-0.5">{t('scan_subtitle')}</p>}
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Idle — tap to start */}
        {status === 'idle' && (
          <div className="flex flex-col items-center justify-center gap-4 py-10 px-6">
            <div className="w-16 h-16 rounded-full bg-blue-600/15 border border-blue-500/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-white font-medium text-sm">Scan a barcode</p>
              <p className="text-slate-500 text-xs mt-1">Point your back camera at the barcode</p>
            </div>
            <button onClick={startCamera}
              className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-6 py-2.5 rounded-xl transition-colors">
              Start camera
            </button>
          </div>
        )}

        {/* Camera view */}
        {(status === 'requesting' || status === 'scanning') && (
          <div className="relative bg-black" style={{ aspectRatio: '4/3' }}>
            <video ref={videoRef} className="w-full h-full object-cover" playsInline />
            {/* Viewfinder overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-56 h-36 border-2 border-blue-400/80 rounded-xl"
                style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)' }} />
            </div>
            <p className="absolute bottom-3 left-0 right-0 text-center text-white/70 text-xs">
              Hold steady — centre the barcode in the box
            </p>
            {status === 'requesting' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <p className="text-white text-sm">{t('scan_requesting')}</p>
              </div>
            )}
          </div>
        )}

        {status === 'fetching' && (
          <div className="flex items-center justify-center h-48 gap-3">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">Looking up product…</p>
          </div>
        )}

        {status === 'unsupported' && (
          <div className="p-6 text-center">
            <div className="text-4xl mb-3">📷</div>
            <p className="text-slate-300 text-sm">{t('scan_not_supported')}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="p-6 text-center space-y-4">
            <div className="text-4xl">😕</div>
            <p className="text-slate-300 text-sm">{errorMsg}</p>
            <button onClick={() => { controlsRef.current?.stop(); setStatus('idle'); }}
              className="text-blue-400 text-sm hover:text-blue-300">Try again</button>
          </div>
        )}

        {status === 'found' && product && (
          <div className="p-5 space-y-4">
            <div className="bg-slate-800 rounded-xl p-4">
              <p className="font-semibold text-white text-base leading-tight">{product.name}</p>
              <p className="text-xs text-slate-400 mt-1">
                Per 100g: {product.per100g.kcal} kcal
                {product.per100g.protein != null && ` · P: ${product.per100g.protein}g`}
                {product.per100g.carbs != null && ` · C: ${product.per100g.carbs}g`}
                {product.per100g.fat != null && ` · F: ${product.per100g.fat}g`}
              </p>
              {product.productServingG && (
                <p className="text-xs text-blue-400/70 mt-0.5">1 serving = {product.productServingG}g</p>
              )}
            </div>

            {/* Serving size with unit picker */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">How much did you use?</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={servingQty}
                  onChange={e => setServingQty(e.target.value)}
                  min={0.1}
                  step={0.5}
                  className="w-24 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                />
                <div className="flex flex-1 gap-1">
                  {(Object.keys(UNIT_LABELS) as ServingUnit[])
                    .filter(u => u !== 'stk' || product.productServingG != null)
                    .map(u => (
                    <button key={u} onClick={() => setServingUnit(u)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                        servingUnit === u ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}>
                      {UNIT_LABELS[u]}
                    </button>
                  ))}
                </div>
              </div>
              {/* Quick presets */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {product.productServingG && (
                  <button onClick={() => { setServingQty('1'); setServingUnit('stk'); }}
                    className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                      servingUnit === 'stk' && servingQty === '1' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}>
                    1 stk ({product.productServingG}g)
                  </button>
                )}
                {QUICK_PRESETS.map(p => (
                  <button key={p.label} onClick={() => { setServingQty(p.qty); setServingUnit(p.unit); }}
                    className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                      servingUnit === p.unit && servingQty === p.qty ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}>
                    {p.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-600 mt-1.5">
                = {Math.round(getServingGrams())}g
              </p>
            </div>

            {/* Nutrition totals */}
            {(() => {
              const s = scaledNutrition();
              if (!s) return null;
              return (
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { label: 'kcal', value: s.calories, color: 'text-white' },
                    { label: 'protein', value: s.protein, color: 'text-blue-400' },
                    { label: 'carbs', value: s.carbs, color: 'text-amber-400' },
                    { label: 'fat', value: s.fat, color: 'text-pink-400' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-slate-800 rounded-lg p-2">
                      <p className={`text-base font-bold ${color}`}>{value ?? '–'}</p>
                      <p className="text-xs text-slate-500">{label}</p>
                    </div>
                  ))}
                </div>
              );
            })()}

            {!hideMealType && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Meal type</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map(m => (
                    <button key={m} onClick={() => setMealType(m)}
                      className={`py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${mealType === m ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={handleAdd}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium py-2.5 rounded-xl transition-colors">
                {t('scan_add')}
              </button>
              <button onClick={onClose}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-sm rounded-xl transition-colors">
                {t('scan_cancel')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
