import { useState, useEffect, useCallback } from 'react';
import { SignageFolder, SignageSlide, AppError } from '../types';
import { SIGNAGE_TEMPLATES } from '../data/templates';
import { ensureDiverseTagColors } from '../utils/typography';
import { repairSlideImages } from '../utils/imageFallback';

const FOLDERS_STORAGE_KEY = 'signage_saved_folders_v2';
const MAX_FOLDERS = 20;

const ACTIVE_FOLDER_STORAGE_KEY = 'signage_active_folder_id_v2';

// Removed unused default folder creator

export function useSignageFolders(onError: (err: AppError) => void) {
  // 保存フォルダ一覧（初期ロード）
  const [folders, setFolders] = useState<SignageFolder[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(FOLDERS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((f: SignageFolder) => ({
            ...f,
            slides: Array.isArray(f.slides) ? f.slides.filter(Boolean).map(repairSlideImages) : [],
          }));
        }
      }
    } catch (e) {
      console.warn('Failed to parse folders from localStorage', e);
    }
    return [];
  });

  const [activeFolderId, setActiveFolderId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = localStorage.getItem(ACTIVE_FOLDER_STORAGE_KEY);
      const savedFoldersRaw = localStorage.getItem(FOLDERS_STORAGE_KEY);
      if (saved && savedFoldersRaw) {
        const parsedFolders = JSON.parse(savedFoldersRaw);
        if (Array.isArray(parsedFolders) && parsedFolders.some((f: SignageFolder) => f && f.id === saved)) {
          return saved;
        }
      }
      localStorage.removeItem(ACTIVE_FOLDER_STORAGE_KEY);
    } catch {
      // ignore
    }
    return null;
  });

  // 存在しないフォルダIDを指していた場合は自動的にnullへ補正し、ローカルストレージへ同期
  useEffect(() => {
    if (activeFolderId && !folders.some((f) => f.id === activeFolderId)) {
      setActiveFolderId(null);
      return;
    }
    try {
      if (activeFolderId) {
        localStorage.setItem(ACTIVE_FOLDER_STORAGE_KEY, activeFolderId);
      } else {
        localStorage.removeItem(ACTIVE_FOLDER_STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }, [activeFolderId, folders]);

  // 容量エラーハンドラ共通化
  const handleStorageError = useCallback((err: unknown, contextTitle: string) => {
    const isQuota =
      (err as { name?: string; code?: number })?.name === 'QuotaExceededError' ||
      (err as { name?: string; code?: number })?.code === 22 ||
      String(err).toLowerCase().includes('quota');

    onError({
      title: `${contextTitle}のエラー`,
      reason: isQuota
        ? 'ブラウザの保存領域（LocalStorage上限・通常約5MB）を超過しました。高解像度の画像データが多く保存されている可能性があります。'
        : 'ブラウザストレージへの保存中に予期せぬエラーが発生しました。',
      solution: isQuota
        ? '① 不要な看板フォルダを削除してください。\n② アップロードした画像をリサイズするか、画像URL指定をご利用ください。'
        : 'ブラウザのキャッシュやプライベートモード設定をご確認ください。',
      details: err instanceof Error ? err.message : String(err),
    });
  }, [onError]);

  // フォルダ一覧が更新されたらローカルストレージへ同期
  useEffect(() => {
    try {
      localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(folders));
    } catch (err: unknown) {
      handleStorageError(err, '看板フォルダの自動保存');
    }
  }, [folders, handleStorageError]);

  // 新規フォルダ作成
  const createFolder = useCallback((name: string, templateSlide?: Partial<SignageSlide>): { newFolder: SignageFolder; initialSlide: SignageSlide } | null => {
    if (folders.length >= MAX_FOLDERS) {
      onError({
        title: '看板フォルダ数の上限到達',
        reason: `看板フォルダの保存可能数（最大${MAX_FOLDERS}フォルダ）に達しています。`,
        solution: '不要になった既存のフォルダを削除してから、新規フォルダを作成してください。',
      });
      return null;
    }

    const baseTmpl = templateSlide || SIGNAGE_TEMPLATES.find((t) => t.id === 'blank')?.slide || SIGNAGE_TEMPLATES[0].slide;
    const initialSlide: SignageSlide = {
      id: `slide-${Date.now()}`,
      name: baseTmpl.name || '看板 1枚目',
      duration: baseTmpl.duration || 10,
      aspect: 'vertical',
      frame: baseTmpl.frame || 'modern-black',
      bgType: baseTmpl.bgType || 'solid',
      bgColor: baseTmpl.bgColor || '#1e293b',
      bgGradient: baseTmpl.bgGradient || '',
      bgPattern: baseTmpl.bgPattern || 'none',
      bgAnimation: baseTmpl.bgAnimation || 'none',
      textColor: baseTmpl.textColor || '#ffffff',
      accentColor: baseTmpl.accentColor || '#f59e0b',
      shopName: baseTmpl.shopName ?? '店舗名を入力',
      categoryBadge: baseTmpl.categoryBadge ?? 'おすすめ',
      headline: baseTmpl.headline ?? 'おすすめメニュー\n＆最新のご案内',
      subheadline: baseTmpl.subheadline ?? '当店のおすすめ商品です。\nお気軽にお立ち寄りください。',
      subheadlineImages: baseTmpl.layoutStyle === 'card-grid' ? [] : (baseTmpl.subheadlineImages || []),
      subheadlineImageUrl: baseTmpl.layoutStyle === 'card-grid' ? undefined : (baseTmpl.subheadlineImageUrl || baseTmpl.subheadlineImages?.[0]),
      menuItems: baseTmpl.layoutStyle === 'poster-hero'
        ? []
        : ensureDiverseTagColors(
            (baseTmpl.menuItems || []).slice(0, baseTmpl.layoutStyle === 'card-grid' ? 12 : 6)
          ),
      footerNote: baseTmpl.footerNote ?? '営業中 / お気軽にお立ち寄りください',
      showQrCode: baseTmpl.showQrCode ?? true,
      qrCodeUrl: baseTmpl.qrCodeUrl ?? 'https://example.com',
      qrCodeLabel: baseTmpl.qrCodeLabel ?? '読み取り',
      fontFamily: baseTmpl.fontFamily || 'Noto Sans JP',
      fontOverrides: {},
      textAnimation: baseTmpl.textAnimation || 'slideUp',
      textAnimationSpeed: baseTmpl.textAnimationSpeed || 'normal',
      writingMode: baseTmpl.layoutStyle === 'card-grid' || baseTmpl.layoutStyle === 'media-only' ? 'horizontal' : (baseTmpl.writingMode || 'horizontal'),
      layoutStyle: baseTmpl.layoutStyle || 'split-menu',
    };

    const newFolder: SignageFolder = {
      id: `folder-${Date.now()}`,
      name: name.trim() || `看板フォルダ ${folders.length + 1}`,
      slides: [initialSlide],
      updatedAt: new Date().toLocaleDateString('ja-JP', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    const nextFolders = [...folders, newFolder];
    try {
      localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(nextFolders));
      setFolders(nextFolders);
      setActiveFolderId(newFolder.id);
      return { newFolder, initialSlide };
    } catch (err: unknown) {
      handleStorageError(err, 'フォルダ作成時の保存容量');
      return null;
    }
  }, [folders, onError, handleStorageError]);

  // フォルダ削除
  const deleteFolder = useCallback((folderId: string) => {
    setFolders((prev) => prev.filter((f) => f.id !== folderId));
    if (activeFolderId === folderId) {
      setActiveFolderId(null);
    }
  }, [activeFolderId]);

  // フォルダ複製
  const duplicateFolder = useCallback((folderId: string) => {
    if (folders.length >= MAX_FOLDERS) {
      onError({
        title: '看板フォルダ数の上限到達',
        reason: `看板フォルダの保存可能数（最大${MAX_FOLDERS}フォルダ）に達しています。`,
        solution: '不要なフォルダを削除してから、複製をお試しください。',
      });
      return;
    }
    const target = folders.find((f) => f.id === folderId);
    if (!target) return;

    const duplicated: SignageFolder = {
      ...target,
      id: `folder-${Date.now()}`,
      name: `${target.name} (コピー)`,
      slides: JSON.parse(JSON.stringify(target.slides)),
      updatedAt: new Date().toLocaleDateString('ja-JP', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
    setFolders((prev) => [...prev, duplicated]);
  }, [folders, onError]);

  // フォルダ名前変更
  const renameFolder = useCallback((folderId: string, newName: string) => {
    setFolders((prev) =>
      prev.map((f) => (f.id === folderId ? { ...f, name: newName } : f))
    );
  }, []);

  // フォルダ上書き保存
  const saveFolderSlides = useCallback((folderId: string | null, currentSlides: SignageSlide[]): boolean => {
    const nowStr = new Date().toLocaleDateString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    let targetId = folderId;
    let nextFolders: SignageFolder[];

    if (folderId) {
      nextFolders = folders.map((f) =>
        f.id === folderId
          ? {
              ...f,
              slides: JSON.parse(JSON.stringify(currentSlides)),
              updatedAt: nowStr,
            }
          : f
      );
    } else {
      if (folders.length >= MAX_FOLDERS) {
        onError({
          title: '看板フォルダ数の上限到達',
          reason: `保存可能な看板フォルダの上限（最大${MAX_FOLDERS}フォルダ）に達しています。`,
          solution: '不要な看板フォルダを削除してから保存するか、既存のフォルダを選択して上書きしてください。',
        });
        return false;
      }
      const newFolder: SignageFolder = {
        id: `folder-${Date.now()}`,
        name: `看板フォルダ ${folders.length + 1}`,
        slides: JSON.parse(JSON.stringify(currentSlides)),
        updatedAt: nowStr,
      };
      nextFolders = [...folders, newFolder];
      targetId = newFolder.id;
    }

    try {
      localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(nextFolders));
      setFolders(nextFolders);
      if (targetId) setActiveFolderId(targetId);
      return true;
    } catch (err: unknown) {
      handleStorageError(err, '上書き保存の容量上限');
      return false;
    }
  }, [folders, onError, handleStorageError]);

  const clearAllFolders = useCallback(() => {
    try {
      localStorage.removeItem(FOLDERS_STORAGE_KEY);
      localStorage.removeItem(ACTIVE_FOLDER_STORAGE_KEY);
      setFolders([]);
      setActiveFolderId(null);
    } catch {
      // ignore
    }
  }, []);

  const activeFolder = folders.find((f) => f.id === activeFolderId) || null;

  return {
    folders,
    activeFolderId,
    activeFolder,
    setActiveFolderId,
    createFolder,
    deleteFolder,
    duplicateFolder,
    renameFolder,
    saveFolderSlides,
    clearAllFolders,
  };
}
