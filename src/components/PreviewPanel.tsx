import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SignageSlide, TextTarget, FontFamily } from '../types';
import { SignageDisplay } from './SignageDisplay';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Type, 
  Check, 
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface PreviewPanelProps {
  currentSlide: SignageSlide;
  slidesCount: number;
  currentSlideIndex: number;
  onSelectSlideIndex: (index: number) => void;
  replayKey: number;
  onReplayAnimation: () => void;
  selectedTextTarget: TextTarget;
  onSelectTextTarget: (target: TextTarget) => void;
  onApplyQuickFont: (fontFamily: FontFamily) => void;
  isMobileLandscape?: boolean;
  isWideLayout?: boolean;
}

import { FONT_OPTIONS as fontOptions, TARGET_NAME_MAP as targetNameMap } from '../data/fonts';

export const PreviewPanel: React.FC<PreviewPanelProps> = ({
  currentSlide,
  slidesCount,
  currentSlideIndex,
  onSelectSlideIndex,
  replayKey,
  onReplayAnimation,
  selectedTextTarget,
  onSelectTextTarget,
  onApplyQuickFont,
  isMobileLandscape = false,
  isWideLayout = false,
}) => {
  const displayContainerRef = useRef<HTMLDivElement>(null);
  const previewHeaderRef = useRef<HTMLDivElement>(null);
  const fontBarRef = useRef<HTMLDivElement>(null);
  const warningBannerRef = useRef<HTMLDivElement>(null);

  // スケールモード: 'auto'（見切れなし自動フィット）または 'manual'（手動調整）
  const [scaleMode, setScaleMode] = useState<'auto' | 'manual'>('auto');
  const [autoScale, setAutoScale] = useState<number>(0.34);
  const [manualScale, setManualScale] = useState<number>(0.34);
  const [manualMaxBoxH, setManualMaxBoxH] = useState<number | null>(null);

  // スマホ横画面や極端に高さが低い環境ではフォントパネルを自動折りたたみ
  const isCompactViewport = typeof window !== 'undefined' && window.innerHeight < 560;
  const [isFontBarOpen, setIsFontBarOpen] = useState<boolean>(!isMobileLandscape && !isCompactViewport);

  // コンテナサイズに応じた 9:16 / 16:9 自動フィットスケールの計算（上下左右見切れゼロ保証）
  const calculateFitScale = useCallback(() => {
    const el = displayContainerRef.current;
    if (!el) return;
    const { clientWidth, clientHeight } = el;
    const styles = window.getComputedStyle(el);
    const cssPadX = (parseFloat(styles.paddingLeft) || 0) + (parseFloat(styles.paddingRight) || 0);
    const cssPadY = (parseFloat(styles.paddingTop) || 0) + (parseFloat(styles.paddingBottom) || 0);

    const safeExtraX = isMobileLandscape ? 8 : 16;
    const availableWidth = Math.max(80, clientWidth - cssPadX - safeExtraX);

    const isLandscape = currentSlide.aspect === '16:9' || currentSlide.aspect === 'horizontal';
    const baseW = isLandscape ? 960 : 540;
    const baseH = isLandscape ? 540 : 960;

    let availableHeight: number;
    if (isWideLayout) {
      // PC 2ペイン時：固定高さコンテナ内の実測高さから計算（内部absolute配置により縮小ループなし）
      const safeExtraY = 12;
      availableHeight = Math.max(100, clientHeight - cssPadY - safeExtraY);
      setManualMaxBoxH(null);
    } else {
      // スマホ・タブレット縦並び時：<main>の実際の表示領域（ヘッダーとフッターの間）から算出して100%見切れなしを保証
      const mainEl = el.closest('main');
      const mainStyles = mainEl ? window.getComputedStyle(mainEl) : null;
      const mainPadY = mainStyles
        ? (parseFloat(mainStyles.paddingTop) || 0) + (parseFloat(mainStyles.paddingBottom) || 0)
        : 24;
      const viewportH = Math.min(
        window.innerHeight,
        window.visualViewport?.height || window.innerHeight,
        document.documentElement.clientHeight || window.innerHeight
      );
      const headerH = document.querySelector('header')?.getBoundingClientRect().height || 64;
      const footerH = document.querySelector('footer')?.getBoundingClientRect().height || 76;
      const mainInnerH = mainEl
        ? Math.max(180, mainEl.clientHeight - mainPadY - 8)
        : Math.max(180, viewportH - headerH - footerH - 32);

      const previewHeaderH = previewHeaderRef.current?.getBoundingClientRect().height || 36;
      const fontBarH = isFontBarOpen && fontBarRef.current ? fontBarRef.current.getBoundingClientRect().height + 4 : 0;
      const warningH = warningBannerRef.current ? warningBannerRef.current.getBoundingClientRect().height : 0;
      const visibleChildrenCount = 2 + (isFontBarOpen ? 1 : 0) + (warningBannerRef.current ? 1 : 0);
      const gapsH = Math.max(0, visibleChildrenCount - 1) * 6;

      const remainingBoxH = Math.max(
        120,
        mainInnerH - previewHeaderH - fontBarH - warningH - gapsH - 4
      );
      setManualMaxBoxH(remainingBoxH);

      const maxCapForViewport = isFontBarOpen ? 410 : 470;
      const cappedBoxH = !isLandscape && !isMobileLandscape
        ? Math.min(remainingBoxH, Math.round(viewportH * 0.52), maxCapForViewport)
        : remainingBoxH;
      const safeExtraY = 8;
      availableHeight = Math.max(80, cappedBoxH - cssPadY - safeExtraY);
    }

    // 基準キャンバスに対する縦横の収容比率
    const scaleByW = availableWidth / baseW;
    const scaleByH = availableHeight / baseH;

    // コンテナ全体に確実に収まる比率を適用
    const fit = Math.min(scaleByW, scaleByH);
    const clampedFit = Math.round(Math.max(0.15, Math.min(fit, 2.0)) * 1000) / 1000;

    setAutoScale((prev) => (Math.abs(prev - clampedFit) < 0.001 ? prev : clampedFit));
    if (scaleMode === 'auto') {
      setManualScale((prev) => (Math.abs(prev - clampedFit) < 0.001 ? prev : clampedFit));
    }
  }, [isMobileLandscape, isWideLayout, isFontBarOpen, scaleMode, slidesCount, currentSlide.aspect]);

  useEffect(() => {
    calculateFitScale();

    if (!displayContainerRef.current) return;
    const observer = new ResizeObserver(() => {
      calculateFitScale();
    });
    observer.observe(displayContainerRef.current);
    const mainEl = displayContainerRef.current.closest('main');
    if (mainEl) {
      observer.observe(mainEl);
    }
    window.addEventListener('resize', calculateFitScale);
    window.visualViewport?.addEventListener('resize', calculateFitScale);

    // 初回マウント時やスライド・フォントバー切替時に強制再計算
    const timer = setTimeout(calculateFitScale, 50);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', calculateFitScale);
      window.visualViewport?.removeEventListener('resize', calculateFitScale);
      clearTimeout(timer);
    };
  }, [calculateFitScale, currentSlide.id, currentSlide.layoutStyle, isFontBarOpen, isWideLayout]);

  // 横画面または画面高さが低い環境でのフォントバー開閉連動
  useEffect(() => {
    if (isMobileLandscape || (!isWideLayout && window.innerHeight < 560)) {
      setIsFontBarOpen(false);
    } else {
      setIsFontBarOpen(true);
    }
  }, [isMobileLandscape, isWideLayout]);

  const activeScale = scaleMode === 'auto' ? autoScale : manualScale;

  const handleZoomIn = () => {
    setScaleMode('manual');
    setManualScale((s) => Math.min(2.0, Number((s + 0.05).toFixed(2))));
  };

  const handleZoomOut = () => {
    setScaleMode('manual');
    setManualScale((s) => Math.max(0.15, Number((s - 0.05).toFixed(2))));
  };

  const handleResetToAuto = () => {
    setScaleMode('auto');
    calculateFitScale();
  };

  return (
    <div className={`w-full ${isWideLayout ? 'h-full overflow-hidden' : ''} flex flex-col items-center min-h-0 gap-1.5 bg-white`}>
      {/* プレビュー上部ヘッダー操作バー */}
      <div
        ref={previewHeaderRef}
        className={`w-full bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-xs shrink-0 ${
          isMobileLandscape ? 'px-2 py-1' : 'px-2.5 py-1.5'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs font-black text-slate-800 flex items-center gap-1 truncate">
            <Eye className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="truncate">看板プレビュー ({currentSlideIndex + 1}/{slidesCount})</span>
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded-md shrink-0 border border-slate-200 hidden sm:inline">
            {Math.round(activeScale * 100)}%
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* 書体変更トグル */}
          <button
            onClick={() => setIsFontBarOpen((v) => !v)}
            title="書体パネルの表示切替"
            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 border transition-all cursor-pointer ${
              isFontBarOpen
                ? 'bg-blue-50 text-blue-700 border-blue-300'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Type className="w-3 h-3 text-blue-600" />
            <span className="hidden sm:inline">書体変更</span>
            {isFontBarOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {/* 自動フィット（9:16 見切れゼロ）ボタン */}
          <button
            onClick={handleResetToAuto}
            title="画面ピッタリに全体表示（見切れ防止）"
            className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer ${
              scaleMode === 'auto'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Maximize className="w-3 h-3" />
            <span>自動フィット</span>
          </button>

          {/* 縮小 */}
          <button
            onClick={handleZoomOut}
            title="縮小"
            className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          {/* 拡大 */}
          <button
            onClick={handleZoomIn}
            title="拡大"
            className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 看板文字クリック連動：フォント変更バー（折りたたみ可能） */}
      {isFontBarOpen && (
        <div
          ref={fontBarRef}
          className="w-full mb-1 bg-white border border-blue-200 rounded-xl p-1.5 shadow-xs shrink-0 transition-all"
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <Type className="w-3 h-3 text-blue-600 shrink-0" />
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-700">
                選択中: <strong className="text-blue-700">{targetNameMap[selectedTextTarget]}</strong> の書体
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-0.5">
            {fontOptions.map((f) => {
              const currentFont =
                selectedTextTarget === 'all'
                  ? currentSlide.fontFamily
                  : currentSlide.fontOverrides?.[selectedTextTarget as keyof typeof currentSlide.fontOverrides] || currentSlide.fontFamily;
              const isSelected = currentFont === f.family;
              return (
                <button
                  key={f.family}
                  onClick={() => onApplyQuickFont(f.family)}
                  className={`px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-bold shrink-0 transition-all cursor-pointer flex items-center gap-0.5 border ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                  style={{ fontFamily: `'${f.family}', sans-serif` }}
                >
                  {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  <span>{f.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {(() => {
        const isMediaOnlyEmpty =
          (currentSlide.layoutStyle === 'media-only' ||
            ((currentSlide.layoutStyle || 'split-menu') === 'split-menu' &&
              !currentSlide.headline &&
              !currentSlide.shopName &&
              !currentSlide.subheadline &&
              !currentSlide.categoryBadge &&
              !currentSlide.footerNote &&
              (currentSlide.menuItems?.length || 0) === 0 &&
              !currentSlide.showQrCode &&
              !currentSlide.subheadlineImageUrl &&
              !(currentSlide.subheadlineImages && currentSlide.subheadlineImages.length > 0) &&
              !currentSlide.shopLogoUrl)) &&
          !(currentSlide.bgType === 'image' && currentSlide.bgCustomImage) &&
          !(currentSlide.bgType === 'video' && currentSlide.bgVideoUrl);

        if (!isMediaOnlyEmpty) return null;
        return (
          <div
            ref={warningBannerRef}
            className="w-full shrink-0 bg-rose-50 border border-rose-200 rounded-xl px-3 py-1.5 text-center"
          >
            <span className="text-xs font-black text-rose-600">
              ５の「看板の背景」を設定してください
            </span>
          </div>
        );
      })()}

      {/* 
        プレビュー表示エリア：
        9:16 の縦型看板がコンテナの幅と高さの中に「絶対に見切れない（Auto Fit）」ようにスケーリングして中央配置
      */}
      <div
        ref={displayContainerRef}
        style={
          !isWideLayout && scaleMode === 'manual' && manualMaxBoxH
            ? { maxHeight: `${manualMaxBoxH}px` }
            : undefined
        }
        className={
          isWideLayout
            ? `w-full flex-1 min-h-0 bg-slate-100/70 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-inner relative ${
                scaleMode === 'manual'
                  ? `overflow-auto p-3 ${slidesCount > 1 ? 'pb-12' : ''}`
                  : `overflow-hidden pt-2 px-2 ${slidesCount > 1 ? 'pb-12' : 'pb-2'}`
              }`
            : `w-full bg-slate-100/70 rounded-2xl sm:rounded-3xl border border-slate-200 flex flex-col items-center ${
                scaleMode === 'manual' ? 'justify-start' : 'justify-center'
              } shadow-inner relative ${
                slidesCount > 1 ? 'pt-3 pb-12 px-2' : 'py-3 px-2'
              } ${scaleMode === 'manual' ? 'overflow-auto' : 'overflow-hidden'}`
        }
      >
        <div
          key={`${currentSlide.id}-${replayKey}`}
          className={
            isWideLayout
              ? `${
                  scaleMode === 'auto'
                    ? `absolute top-2 left-2 right-2 ${slidesCount > 1 ? 'bottom-12' : 'bottom-2'}`
                    : 'min-w-full min-h-full'
                } flex items-center justify-center transition-transform duration-100 ease-out`
              : 'flex items-center justify-center transition-transform duration-100 ease-out'
          }
        >
          <SignageDisplay
            slide={currentSlide}
            scale={activeScale}
            selectedTextTarget={selectedTextTarget}
            onSelectTextTarget={onSelectTextTarget}
          />
        </div>

        {/* スライド切替（複数スライド時） */}
        {slidesCount > 1 && (
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full border border-slate-300 shadow-lg z-20">
            <button
              onClick={() => {
                onSelectSlideIndex((currentSlideIndex - 1 + slidesCount) % slidesCount);
                onReplayAnimation();
              }}
              className="p-0.5 text-slate-600 hover:text-slate-900 cursor-pointer transition-colors"
              title="前の看板"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono font-bold text-slate-900">
              {currentSlideIndex + 1} / {slidesCount}
            </span>
            <button
              onClick={() => {
                onSelectSlideIndex((currentSlideIndex + 1) % slidesCount);
                onReplayAnimation();
              }}
              className="p-0.5 text-slate-600 hover:text-slate-900 cursor-pointer transition-colors"
              title="次の看板"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
