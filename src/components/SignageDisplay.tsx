import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import QRCode from 'qrcode';
import { MenuItem, SignageSlide, TextTarget } from '../types';
import { Type, QrCode } from 'lucide-react';
import {
  calculateAutoHeadlinePt,
  calculateAutoSubheadlinePt,
  calculateAutoMenuItemNamePt,
  calculateAutoMenuItemDescPt,
  calculateAutoMenuItemPricePt,
} from '../utils/typography';
import { handleImageError } from '../utils/imageFallback';

interface SignageDisplayProps {
  slide: SignageSlide;
  scale?: number;
  isFullscreen?: boolean;
  selectedTextTarget?: TextTarget;
  onSelectTextTarget?: (target: TextTarget) => void;
}

export const SignageDisplay: React.FC<SignageDisplayProps> = ({
  slide,
  scale = 1,
  isFullscreen = false,
  selectedTextTarget,
  onSelectTextTarget,
}) => {
  const [qrImgError, setQrImgError] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // オフライン対応：端末内で高速にSVG/DataURLを直接生成（外部サーバー依存・通信切断バグを完全解消）
  useEffect(() => {
    let isMounted = true;
    if (slide.showQrCode && slide.qrCodeUrl) {
      QRCode.toDataURL(slide.qrCodeUrl, {
        margin: 1,
        width: 140,
        color: { dark: '#000000', light: '#ffffff' },
      })
        .then((url) => {
          if (isMounted) {
            setQrDataUrl(url);
            setQrImgError(false);
          }
        })
        .catch(() => {
          if (isMounted) {
            setQrDataUrl('');
            setQrImgError(true);
          }
        });
    } else {
      setQrDataUrl('');
      setQrImgError(false);
    }
    return () => {
      isMounted = false;
    };
  }, [slide.showQrCode, slide.qrCodeUrl]);

  // フレームクラス（20種類対応）
  const getFrameClasses = () => {
    if (isFullscreen) return 'rounded-none border-0 shadow-none';
    switch (slide.frame) {
      case 'modern-black':
        return 'border-[14px] border-slate-900 rounded-3xl shadow-2xl ring-1 ring-slate-800';
      case 'frameless':
        return 'border-0 rounded-2xl shadow-2xl';
      case 'aluminum-silver':
        return 'border-[16px] border-slate-300 rounded-2xl shadow-2xl ring-2 ring-slate-400 bg-slate-200';
      case 'pure-white':
        return 'border-[16px] border-slate-100 rounded-2xl shadow-2xl ring-2 ring-slate-300 bg-white';
      case 'natural-wood':
        return 'border-[18px] border-[#854d0e] rounded-2xl shadow-2xl ring-2 ring-[#713f12] bg-[#a16207]';
      case 'dark-walnut':
        return 'border-[18px] border-[#3e1f07] rounded-2xl shadow-2xl ring-2 ring-[#291404] bg-[#532909]';
      case 'gold-luxury':
        return 'border-[16px] border-amber-400 rounded-2xl shadow-2xl ring-2 ring-amber-500 bg-amber-200';
      case 'champagne-gold':
        return 'border-[16px] border-[#fde047] rounded-2xl shadow-2xl ring-2 ring-amber-300 bg-[#fef08a]';
      case 'bronze-antique':
        return 'border-[16px] border-[#92400e] rounded-2xl shadow-2xl ring-2 ring-[#78350f] bg-[#b45309]';
      case 'copper-orange':
        return 'border-[16px] border-[#ea580c] rounded-2xl shadow-2xl ring-2 ring-[#c2410c] bg-[#fb923c]';
      case 'rose-gold':
        return 'border-[16px] border-[#fb7185] rounded-2xl shadow-2xl ring-2 ring-[#f43f5e] bg-[#fecdd3]';
      case 'charcoal-dark':
        return 'border-[16px] border-[#334155] rounded-2xl shadow-2xl ring-2 ring-[#1e293b] bg-[#475569]';
      case 'matte-gray':
        return 'border-[16px] border-[#94a3b8] rounded-2xl shadow-2xl ring-2 ring-[#64748b] bg-[#cbd5e1]';
      case 'navy-blue':
        return 'border-[16px] border-[#1e3a8a] rounded-2xl shadow-2xl ring-2 ring-[#172554] bg-[#2563eb]';
      case 'neon-border':
        return 'border-[8px] border-cyan-400 rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.8)]';
      case 'deep-emerald':
        return 'border-[16px] border-[#047857] rounded-2xl shadow-2xl ring-2 ring-[#065f46] bg-[#059669]';
      case 'wine-burgundy':
        return 'border-[16px] border-[#881337] rounded-2xl shadow-2xl ring-2 ring-[#4c0519] bg-[#9f1239]';
      case 'pastel-pink':
        return 'border-[16px] border-[#f472b6] rounded-2xl shadow-2xl ring-2 ring-[#ec4899] bg-[#fbcfe8]';
      case 'pastel-mint':
        return 'border-[16px] border-[#34d399] rounded-2xl shadow-2xl ring-2 ring-[#10b981] bg-[#a7f3d0]';
      case 'pastel-yellow':
        return 'border-[16px] border-[#facc15] rounded-2xl shadow-2xl ring-2 ring-[#eab308] bg-[#fef08a]';
      default:
        return 'border-[14px] border-slate-900 rounded-3xl shadow-2xl';
    }
  };

  // 各パーツのフォント取得ヘルパー（特太インパクトは高視認性のRocknRoll Oneを適用）
  const getTargetFont = (target: TextTarget): string => {
    const override = slide.fontOverrides?.[target as keyof typeof slide.fontOverrides];
    const family = override || slide.fontFamily || 'Noto Sans JP';
    return `'${family}', sans-serif`;
  };

  const bannerImageUrl = slide.subheadlineImageUrl || (slide.subheadlineImages && slide.subheadlineImages[0]);
  const isPosterHeroWithPhoto = slide.layoutStyle === 'poster-hero' && Boolean(bannerImageUrl);

  // 背景が白っぽいかどうかの自動判定（白背景での文字不可視化を完全防止。ポスター写真背景時は暗色グラデーションを乗せるためfalse）
  const isLightBg = (() => {
    if (slide.bgType === 'video' || isPosterHeroWithPhoto) return false;
    const bg = (slide.bgColor || '').toLowerCase();
    const grad = (slide.bgGradient || '').toLowerCase();
    const lightBgs = ['#ffffff', '#fffbeb', '#faf5ff', '#f0fdf4', '#fdfbf7', '#f8fafc', '#fefce8', '#fff7ed', '#eff6ff', '#f1f5f9', '#fef08a'];
    if (lightBgs.includes(bg)) return true;
    if (slide.bgType === 'gradient' && (grad.includes('#fdf') || grad.includes('#fce') || grad.includes('#ffffff'))) return true;
    if (bg.startsWith('#') && bg.length === 7) {
      const r = parseInt(bg.slice(1, 3), 16);
      const g = parseInt(bg.slice(3, 5), 16);
      const b = parseInt(bg.slice(5, 7), 16);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        return (r * 299 + g * 587 + b * 114) / 1000 > 175;
      }
    }
    return false;
  })();

  // 各パーツの文字色取得ヘルパー（白っぽい背景の場合は確実に高コントラストな濃い色を適用）
  const getTargetTextColor = (target: keyof NonNullable<SignageSlide['textColorOverrides']>, defaultColor?: string): string => {
    const override = slide.textColorOverrides?.[target];
    if (override) return override;
    if (defaultColor) return defaultColor;
    if (slide.textColor) {
      // 背景が白っぽく、指定色が白系の場合は見えなくなるため濃いチャコールに自動補正
      if (isLightBg && (slide.textColor.toLowerCase() === '#ffffff' || slide.textColor.toLowerCase() === '#fff' || slide.textColor.toLowerCase() === '#f8fafc')) {
        return '#0f172a';
      }
      return slide.textColor;
    }
    return isLightBg ? '#0f172a' : '#ffffff';
  };

  // 背景に写真や動画が設定されているかどうか
  const isMediaActive = Boolean(
    (slide.bgType === 'image' && slide.bgCustomImage) ||
    (slide.bgType === 'video' && slide.bgVideoUrl) ||
    slide.bgCustomImage ||
    slide.bgVideoUrl
  );

  // 明るい色（白系）判定
  const isColorTooLight = (hexColor?: string): boolean => {
    if (!hexColor) return false;
    const c = hexColor.toLowerCase().trim();
    if (
      c === '#ffffff' ||
      c === '#fff' ||
      c === '#f8fafc' ||
      c === '#f1f5f9' ||
      c === '#fefce8' ||
      c.startsWith('rgba(255,255,255') ||
      c.startsWith('rgb(255,255,255')
    ) {
      return true;
    }
    if (c.startsWith('#') && (c.length === 7 || c.length === 4)) {
      const r = parseInt(c.length === 7 ? c.slice(1, 3) : c[1] + c[1], 16);
      const g = parseInt(c.length === 7 ? c.slice(3, 5) : c[2] + c[2], 16);
      const b = parseInt(c.length === 7 ? c.slice(5, 7) : c[3] + c[3], 16);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        return (r * 299 + g * 587 + b * 114) / 1000 > 175;
      }
    }
    return false;
  };

  // 暗い色（黒系）判定（タイル下部の黒グラデーション上での文字不可視化防止）
  const isColorTooDark = (hexColor?: string): boolean => {
    if (!hexColor) return false;
    const c = hexColor.toLowerCase().trim();
    if (c.startsWith('#') && (c.length === 7 || c.length === 4)) {
      const r = parseInt(c.length === 7 ? c.slice(1, 3) : c[1] + c[1], 16);
      const g = parseInt(c.length === 7 ? c.slice(3, 5) : c[2] + c[2], 16);
      const b = parseInt(c.length === 7 ? c.slice(5, 7) : c[3] + c[3], 16);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        return (r * 299 + g * 587 + b * 114) / 1000 < 95;
      }
    }
    return false;
  };

  // 商品カード内のテキスト色（メディア背景時はカードが白になるため、文字色が白系なら濃い色に自動調整）
  const getCardItemTextColor = (defaultColor?: string): string => {
    const rawColor = getTargetTextColor('menu', defaultColor);
    if (isMediaActive && isColorTooLight(rawColor)) {
      return '#0f172a';
    }
    return rawColor;
  };

  // 商品カード内の説明文テキスト色
  const getCardItemDescColor = (defaultColor?: string): string => {
    const rawColor = getTargetTextColor('menu', defaultColor);
    if (isMediaActive && isColorTooLight(rawColor)) {
      return '#334155';
    }
    return rawColor;
  };

  // 背景スタイル（画像は全体像が映るようにcontain）
  const getBackgroundStyle = (): React.CSSProperties => {
    if (slide.bgType === 'video' && slide.bgVideoUrl) {
      return { backgroundColor: '#000000' };
    }
    if (slide.bgType === 'image' && slide.bgCustomImage) {
      const isGrad = slide.bgColor?.startsWith('linear-gradient');
      return {
        backgroundImage: `url("${slide.bgCustomImage}")`,
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundColor: isGrad ? '#0f172a' : (slide.bgColor || '#ffffff'),
      };
    }
    if (slide.bgType === 'gradient' || (slide.bgColor?.startsWith('linear-gradient') && slide.bgType !== 'solid')) {
      const grad = slide.bgGradient || (slide.bgColor?.startsWith('linear-gradient') ? slide.bgColor : undefined) || 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)';
      return { backgroundImage: grad };
    }
    return { backgroundColor: slide.bgColor || '#ffffff' };
  };

  const getPatternClass = () => {
    if (slide.bgPattern === 'dots') return 'pattern-dots';
    if (slide.bgPattern === 'grid') return 'pattern-grid';
    if (slide.bgPattern === 'stripes') return 'pattern-stripes';
    if (slide.bgPattern === 'wood') return 'pattern-wood';
    return '';
  };

  // テキストアニメーション用 Motion バリアント（デフォルト速度：標準）
  const getTextAnimationVariants = () => {
    const speed = slide.textAnimationSpeed || 'normal';
    const mult = speed === 'slow' ? 6.0 : speed === 'fast' ? 1.0 : 3.0;

    switch (slide.textAnimation) {
      case 'slideUp':
        return {
          initial: { opacity: 0, y: 100 },
          animate: { opacity: 1, y: 0, transition: { duration: 1.5 * mult, ease: 'easeOut' as const } },
        };
      case 'slideLeft':
        return {
          initial: { opacity: 0, x: -100 },
          animate: { opacity: 1, x: 0, transition: { duration: 1.5 * mult, ease: 'easeOut' as const } },
        };
      case 'slideRight':
        return {
          initial: { opacity: 0, x: 100 },
          animate: { opacity: 1, x: 0, transition: { duration: 1.5 * mult, ease: 'easeOut' as const } },
        };
      case 'bounce':
        return {
          initial: { opacity: 0, scale: 0.3, y: -80 },
          animate: {
            opacity: 1,
            scale: [0.3, 1.2, 0.95, 1],
            y: 0,
            transition: { duration: 0.8 * mult, times: [0, 0.5, 0.8, 1] },
          },
        };
      case 'zoomIn':
        return {
          initial: { opacity: 0, scale: 0.2 },
          animate: { opacity: 1, scale: 1, transition: { duration: 0.7 * mult, ease: 'easeOut' as const } },
        };
      case 'pulse':
        return {
          initial: { scale: 1 },
          animate: {
            scale: [1, 1.1, 1, 1.14, 1],
            transition: { repeat: Infinity, duration: 2.2 * mult, ease: 'easeInOut' as const },
          },
        };
      case 'shake':
        return {
          initial: { x: 0 },
          animate: {
            x: [0, -10, 10, -8, 8, -4, 4, 0],
            transition: { repeat: Infinity, duration: 2.6 * mult, repeatDelay: 1.2 * mult },
          },
        };
      case 'flip':
        return {
          initial: { opacity: 0, rotateX: 90 },
          animate: { opacity: 1, rotateX: 0, transition: { duration: 0.8 * mult, ease: 'easeOut' as const } },
        };
      case 'neonFlicker':
        return {
          initial: { opacity: 1 },
          animate: {
            opacity: [1, 0.15, 1, 0.05, 1, 0.4, 1],
            transition: { repeat: Infinity, duration: 2.6 * mult, repeatDelay: 0.8 * mult },
          },
        };
      case 'sway':
        return {
          initial: { rotate: 0 },
          animate: {
            rotate: [-5, 5, -5],
            transition: { repeat: Infinity, duration: 3.2 * mult, ease: 'easeInOut' as const },
          },
        };
      default:
        return {
          initial: { opacity: 1 },
          animate: { opacity: 1 },
        };
    }
  };


  // テキストクリック時の選択枠スタイルヘルパー
  const getSelectableClass = (target: TextTarget) => {
    if (isFullscreen || !onSelectTextTarget) return '';
    const isSelected = selectedTextTarget === target;
    return `cursor-pointer transition-all rounded-xl relative group ${
      isSelected
        ? 'ring-2 ring-amber-400 bg-amber-400/15 shadow-[0_0_15px_rgba(251,191,36,0.35)]'
        : 'hover:ring-1 hover:ring-amber-400/60 hover:bg-white/5'
    }`;
  };



  // 店舗名のフォントサイズ選択（小・中・大）
  const getShopNameSizeClass = () => {
    switch (slide.shopNameSize) {
      case 'small':
        return 'text-[18px]';
      case 'large':
        return 'text-[28px]';
      case 'medium':
      default:
        return 'text-[22px]';
    }
  };

  // ユーザー指示「添付の部分、文字数が多くなったら改行して形を縦長に自動変更」
  const badgeText = slide.categoryBadge || '';
  const isBadgeTall = badgeText.length > 9 || badgeText.includes('\n');

  // メニュー商品数（通常最大6品・タイル形式最大12品）に応じた動的レイアウト設定
  const isTileMode = slide.layoutStyle === 'card-grid';
  const isMediaOnlyMode = slide.layoutStyle === 'media-only';
  const itemCount = slide.menuItems?.length || 0;
  const isDenseMenu = itemCount >= 5;
  const isMediumMenu = itemCount === 4;

  const isVertical = !isTileMode && !isMediaOnlyMode && slide.writingMode === 'vertical';
  const rawItems = slide.menuItems || [];
  const visibleItems = rawItems.slice(0, isTileMode ? 12 : 6);
  const visibleCount = visibleItems.length;

  // ユーザー指示「文字類は全て、自分でポイント数を入力出来るように」
  const effectiveHeadlinePt =
    slide.headlinePt && slide.headlinePt > 0
      ? slide.headlinePt
      : calculateAutoHeadlinePt(slide.headline || '', isVertical, slide.headlineSize);

  const effectiveSubheadlinePt =
    slide.subheadlinePt && slide.subheadlinePt > 0
      ? slide.subheadlinePt
      : calculateAutoSubheadlinePt(slide.subheadline || '', isVertical, slide.subheadlineSize);

  const autoItemNamePt = calculateAutoMenuItemNamePt(visibleCount, isVertical);
  const autoItemDescPt = calculateAutoMenuItemDescPt(visibleCount, isVertical);
  const autoItemPricePt = calculateAutoMenuItemPricePt(visibleCount, isVertical);

  const isLandscape = slide.aspect === '16:9' || slide.aspect === 'horizontal';
  const baseWidth = isLandscape ? 960 : 540;
  const baseHeight = isLandscape ? 540 : 960;

  const DEFAULT_TAG_COLORS = ['#ef4444', '#2563eb', '#16a34a', '#d97706', '#9333ea', '#ea580c'];

  // 商品カードの共通スタイル取得ヘルパー
  const getMenuItemCardAppearance = (item: MenuItem) => {
    const isHighlighted = Boolean(item.featured || (item.highlightBadge && item.highlightBadge !== 'なし'));
    const className = `${
      isMediaActive ? 'bg-white shadow-md' : 'backdrop-blur-sm shadow-sm'
    } ${
      isHighlighted
        ? isMediaActive
          ? 'scale-[1.01] ring-2 ring-amber-400 border-amber-400 bg-amber-50 shadow-md'
          : 'scale-[1.01] ring-2 ring-amber-400 border-amber-400 bg-amber-400/10 shadow-md'
        : isMediaActive
        ? 'bg-white border-slate-200/90 shadow-md'
        : ''
    }`;

    const style: React.CSSProperties = {
      backgroundColor: isMediaActive
        ? (isHighlighted ? '#fffbeb' : '#ffffff')
        : (isHighlighted ? undefined : `${slide.textColor}10`),
      borderColor: isMediaActive
        ? (isHighlighted ? '#f59e0b' : '#e2e8f0')
        : (isHighlighted ? '#f59e0b' : `${slide.textColor}25`),
      boxShadow: isMediaActive
        ? (item.featured ? '0 0 0 2px #f59e0b, 0 4px 12px rgba(245, 158, 11, 0.2)' : '0 4px 10px rgba(0, 0, 0, 0.08)')
        : (item.featured ? '0 0 0 2px #f59e0b' : undefined),
    };

    return { className, style };
  };

  // おすすめ枠バッジ共通レンダー
  const renderHighlightBadge = (item: MenuItem, positionClass = 'left-1/2 -translate-x-1/2', zClass = 'z-20') => {
    const label =
      item.highlightBadge && item.highlightBadge !== 'なし' && item.highlightBadge !== ''
        ? item.highlightBadge
        : item.featured
        ? 'おすすめ'
        : '';
    if (!label) return null;
    return (
      <div
        className={`absolute -top-2.5 ${positionClass} bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-[10px] sm:text-[11px] px-2.5 py-0.5 rounded-full shadow-md flex items-center justify-center ${zClass} leading-none whitespace-nowrap border border-amber-300`}
        style={{ writingMode: 'horizontal-tb', direction: 'ltr' }}
      >
        <span className="whitespace-nowrap text-center">{label}</span>
      </div>
    );
  };

  // 価格バッジ共通レンダー
  const renderMenuPrice = (item: MenuItem, pricePt: number, extraPaddingClass?: string) => {
    if (!item.price || item.price.trim().length === 0) return null;
    const hasPriceBg = Boolean(item.priceBgColor && item.priceBgColor !== 'transparent');
    return (
      <div
        className={`shrink-0 rounded-md flex items-center justify-center ${
          extraPaddingClass || (visibleCount >= 4 ? 'px-1.5 py-0.5' : 'px-2 py-0.5')
        } ${
          hasPriceBg ? 'border border-slate-300/50 shadow-xs' : 'border border-transparent'
        }`}
        style={{
          backgroundColor: hasPriceBg ? item.priceBgColor : 'transparent',
        }}
      >
        <span
          className="font-black tracking-tight whitespace-nowrap leading-none flex items-center justify-center -translate-y-[0.5px]"
          style={{
            fontSize: `${pricePt}px`,
            color:
              isMediaActive && isColorTooLight(slide.accentColor || '#1e293b')
                ? '#d97706'
                : (slide.accentColor || '#1e293b'),
          }}
        >
          {item.price}
        </span>
      </div>
    );
  };

  // 縦書き大見出し・サブコピー個別レンダー（flex-colによるvertical-rl幅0崩れ防止のためflex-row＋明示トラック幅で配置）
  const getVerticalItemsAlignClass = (align?: 'left' | 'center' | 'right') =>
    align === 'left' ? 'items-start' : align === 'right' ? 'items-end' : 'items-center';

  const renderVerticalHeadline = (
    keyPrefix: string,
    trackClass = 'flex-1 min-w-0',
    horizontalJustifyClass = 'justify-center'
  ) => {
    if (!slide.headline) return null;
    const vAlignClass = getVerticalItemsAlignClass(slide.headlineAlign);
    return (
      <div
        onClick={() => onSelectTextTarget?.('headline')}
        className={`relative p-0.5 sm:p-1 min-w-0 max-w-full max-h-full h-full overflow-hidden flex flex-row ${vAlignClass} ${horizontalJustifyClass} ${trackClass} ${getSelectableClass('headline')}`}
        title="クリックして大見出しの書体を変更"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={`${keyPrefix}-headline-${slide.id || ''}-${slide.headline || ''}-${slide.subheadline || ''}-${slide.textAnimation || 'none'}-${slide.textAnimationSpeed || 'normal'}`}
            variants={getTextAnimationVariants()}
            initial="initial"
            animate="animate"
            className={`h-full max-w-full max-h-full flex flex-row ${vAlignClass} ${horizontalJustifyClass}`}
          >
            <h1
              className="font-black tracking-tight drop-shadow-sm whitespace-pre-line break-words"
              style={{
                fontFamily: getTargetFont('headline'),
                color: getTargetTextColor('headline'),
                fontSize: `${effectiveHeadlinePt}px`,
                lineHeight: 1.35,
                maxWidth: '100%',
                textAlign: slide.headlineAlign === 'left' ? 'start' : slide.headlineAlign === 'right' ? 'end' : 'center',
                writingMode: 'vertical-rl',
                textOrientation: 'upright',
                maxHeight: '100%',
                textShadow:
                  slide.textAnimation === 'neonFlicker'
                    ? `0 0 16px ${slide.accentColor}, 0 0 32px ${slide.accentColor}`
                    : isPosterHeroWithPhoto
                    ? '0 3px 14px rgba(0,0,0,0.85)'
                    : 'none',
              }}
            >
              {slide.headline}
            </h1>
          </motion.div>
        </AnimatePresence>
        {selectedTextTarget === 'headline' && (
          <div className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 z-10 inline-flex items-center gap-1 text-[10px] bg-amber-400 text-slate-950 font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap shadow-xs">
            <Type className="w-3 h-3" /> 見出し変更中
          </div>
        )}
      </div>
    );
  };

  const renderVerticalSubheadline = (
    keyPrefix: string,
    trackClass = 'flex-1 min-w-0',
    horizontalJustifyClass = 'justify-center'
  ) => {
    if (!slide.subheadline) return null;
    const vAlignClass = getVerticalItemsAlignClass(slide.subheadlineAlign);
    return (
      <div
        onClick={() => onSelectTextTarget?.('subheadline')}
        className={`relative p-0.5 sm:p-1 min-w-0 max-w-full max-h-full h-full overflow-hidden flex flex-row ${vAlignClass} ${horizontalJustifyClass} ${trackClass} ${getSelectableClass('subheadline')}`}
        title="クリックして説明文の書体を変更"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={`${keyPrefix}-sub-${slide.id || ''}-${slide.headline || ''}-${slide.subheadline || ''}-${slide.textAnimation || 'none'}`}
            variants={getTextAnimationVariants()}
            initial="initial"
            animate="animate"
            className={`h-full max-w-full max-h-full flex flex-row ${vAlignClass} ${horizontalJustifyClass}`}
          >
            <p
              className="font-medium opacity-85 whitespace-pre-line break-words"
              style={{
                fontFamily: getTargetFont('subheadline'),
                color: getTargetTextColor('subheadline'),
                fontSize: `${effectiveSubheadlinePt}px`,
                lineHeight: 1.35,
                maxWidth: '100%',
                textAlign: slide.subheadlineAlign === 'left' ? 'start' : slide.subheadlineAlign === 'right' ? 'end' : 'center',
                writingMode: 'vertical-rl',
                textOrientation: 'upright',
                maxHeight: '100%',
                textShadow: isPosterHeroWithPhoto ? '0 2px 10px rgba(0,0,0,0.85)' : 'none',
              }}
            >
              {slide.subheadline}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  };

  // 縦書き大見出し・サブコピー共通レンダー（両方ある場合は左右トラックに分割して衝突・重なりを完全防止）
  const renderVerticalCopyPair = (keyPrefix: string, gapPx: number) => {
    const hasHeadline = Boolean(slide.headline);
    const hasSubheadline = Boolean(slide.subheadline);
    if (!hasHeadline && !hasSubheadline) return null;

    return (
      <div
        className="flex-1 min-h-0 w-full flex flex-row-reverse items-stretch justify-center h-full max-h-full overflow-hidden px-1"
        style={{ gap: `${Math.max(10, gapPx)}px` }}
      >
        {hasHeadline &&
          renderVerticalHeadline(
            keyPrefix,
            hasSubheadline ? 'flex-[1.25] min-w-0' : 'flex-1 min-w-0',
            hasSubheadline ? 'justify-start' : 'justify-center'
          )}
        {hasSubheadline &&
          renderVerticalSubheadline(
            keyPrefix,
            hasHeadline ? 'flex-1 min-w-0' : 'flex-1 min-w-0',
            hasHeadline ? 'justify-end' : 'justify-center'
          )}
      </div>
    );
  };

  return (
    /* 外側コンテナ：スケール後の正確なピクセル専有サイズを確保 */
    <div
      className="relative flex items-center justify-center select-none"
      style={{
        width: `${baseWidth * scale}px`,
        height: `${baseHeight * scale}px`,
      }}
    >
      {/* 基準キャンバス本体 (9:16は540x960、16:9は960x540) */}
      <div
        style={{
          width: `${baseWidth}px`,
          height: `${baseHeight}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          fontFamily: `'${slide.fontFamily}', sans-serif`,
        }}
        className={`absolute top-0 left-0 overflow-hidden flex flex-col ${getFrameClasses()}`}
      >
        {/* 背景レイヤー：ポスター形式時は8番の写真を大きな背景に配置 */}
        {isPosterHeroWithPhoto ? (
          <div className="absolute inset-0 z-0 overflow-hidden bg-slate-950">
            <img
              src={bannerImageUrl}
              alt="ポスター背景写真"
              referrerPolicy="no-referrer"
              onError={handleImageError}
              className="w-full h-full object-cover object-center"
            />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.08) 28%, rgba(0,0,0,0.18) 52%, rgba(0,0,0,0.82) 82%, rgba(0,0,0,0.92) 100%)',
              }}
            />
          </div>
        ) : (
          <>
            {/* 背景動画レイヤー（全体像が映るようにcontain） */}
            {slide.bgType === 'video' && slide.bgVideoUrl && (
              <div className="absolute inset-0 z-0 bg-black flex items-center justify-center">
                <video
                  src={slide.bgVideoUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  onError={(e) => {
                    const parent = e.currentTarget.parentElement;
                    if (parent) parent.style.display = 'none';
                  }}
                  className="w-full h-full object-contain pointer-events-none"
                />
              </div>
            )}

            {/* 背景色・グラデーション・画像レイヤー */}
            {slide.bgType !== 'video' && (
              <div
                className="absolute inset-0 z-0 transition-colors duration-500"
                style={getBackgroundStyle()}
              />
            )}

            {/* パターン模様オーバーレイ */}
            {slide.bgPattern && slide.bgPattern !== 'none' && slide.bgType !== 'video' && (
              <div
                className={`absolute inset-0 z-0 pointer-events-none ${getPatternClass()}`}
              />
            )}
          </>
        )}

        {/* コンテンツエリア */}
        <div
          className={`relative z-10 flex-1 flex flex-col justify-between ${
            isLandscape ? 'px-3.5 pt-2 pb-0.5 gap-1.5' : 'p-4 gap-2'
          } overflow-hidden h-full min-h-0`}
          style={{ color: isLightBg && (slide.textColor === '#ffffff' || !slide.textColor) ? '#0f172a' : (slide.textColor || '#ffffff') }}
        >
          {/* 
            ヘッダー部：
            ユーザー指示：
            1. 店舗名・ブランド名とお店の種類・営業時間などは左右表示
            2. 各項目でテキストは中央揃え＆改行対応
            3. 店舗名・ブランド名のフォントの大きさを選べるように＆画像を添付できるように（お店のロゴ）
            4. お店の種類・営業時間などは文字数が多くなったら改行して形を縦長に自動変更
          */}
          {(slide.shopName || slide.shopLogoUrl || slide.categoryBadge) && (
            <div
              className={`shrink-0 flex items-center gap-3 border-b ${
                isLandscape ? 'pb-1 mb-0.5' : 'pb-3 mb-2.5'
              } w-full ${
                !slide.categoryBadge
                  ? slide.shopNameAlign === 'right'
                    ? 'justify-end'
                    : slide.shopNameAlign === 'center'
                    ? 'justify-center'
                    : 'justify-start'
                  : 'justify-between'
              }`}
              style={{ borderColor: isLightBg ? 'rgba(15,23,42,0.18)' : `${slide.textColor || '#ffffff'}25` }}
            >
              {/* 店舗名・ブランド名 ＆ お店のロゴ（左揃え・中央揃え・右揃え独立設定対応） */}
              {(slide.shopName || slide.shopLogoUrl) ? (
                <div
                  onClick={() => onSelectTextTarget?.('shopName')}
                  className={`flex items-center gap-2.5 p-1 ${
                    slide.shopNameAlign === 'right'
                      ? 'justify-end text-right'
                      : slide.shopNameAlign === 'center'
                      ? 'justify-center text-center'
                      : 'justify-start text-left'
                  } ${slide.categoryBadge ? 'flex-1' : ''} ${getSelectableClass('shopName')}`}
                  style={{
                    fontFamily: getTargetFont('shopName'),
                    justifyContent:
                      slide.shopNameAlign === 'right'
                        ? 'flex-end'
                        : slide.shopNameAlign === 'center'
                        ? 'center'
                        : 'flex-start',
                  }}
                  title="クリックして店舗名の書体を変更"
                >
                  {/* お店のロゴ画像（透明背景でベゼルなし縮小表示） */}
                  {slide.shopLogoUrl ? (
                    <div className="w-[64px] h-[64px] rounded-lg bg-transparent flex items-center justify-center overflow-hidden shrink-0">
                      <img
                        src={slide.shopLogoUrl}
                        alt="Logo"
                        referrerPolicy="no-referrer"
                        onError={handleImageError}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : null}

                  <span
                    className={`font-bold tracking-wider opacity-95 whitespace-pre-line leading-tight ${
                      isLandscape ? 'max-w-[650px]' : 'max-w-[340px]'
                    } ${
                      slide.shopNameAlign === 'right'
                        ? 'text-right'
                        : slide.shopNameAlign === 'center'
                        ? 'text-center'
                        : 'text-left'
                    } ${slide.shopNamePt ? '' : getShopNameSizeClass()}`}
                    style={{
                      textAlign: slide.shopNameAlign || 'left',
                      fontSize: slide.shopNamePt ? `${slide.shopNamePt}px` : undefined,
                      color: getTargetTextColor('shopName'),
                    }}
                  >
                    {slide.shopName || ''}
                  </span>

                  {selectedTextTarget === 'shopName' && (
                    <span className="text-[10px] bg-amber-400 text-slate-950 font-bold px-1.5 py-0.5 rounded ml-1 shrink-0">
                      選択中
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex-1" />
              )}

              {/* お店の種類・営業時間など（右上ラベル配置） */}
              {slide.categoryBadge && (
                <div
                  onClick={() => onSelectTextTarget?.('categoryBadge')}
                  className={`p-1 shrink-0 flex items-center justify-center text-center ${getSelectableClass('categoryBadge')}`}
                  style={{ fontFamily: getTargetFont('categoryBadge') }}
                  title="クリックしてお店の種類・営業時間の書体を変更"
                >
                  <div
                    className={`font-black tracking-wider shadow-sm uppercase text-center flex items-center justify-center transition-all ${
                      isBadgeTall
                        ? 'rounded-2xl px-3.5 py-2 leading-tight max-w-[150px] whitespace-pre-line break-words text-[12px]'
                        : 'rounded-full px-4 py-1.5 leading-snug whitespace-pre-line text-[13px]'
                    }`}
                    style={{
                      backgroundColor: slide.accentColor || '#fbbf24',
                      fontSize: slide.categoryBadgePt ? `${slide.categoryBadgePt}px` : undefined,
                      color:
                        slide.textColorOverrides?.categoryBadge ||
                        (() => {
                          const acc = (slide.accentColor || '#fbbf24').toLowerCase();
                          const lightAccents = ['#fef08a', '#fde047', '#facc15', '#fbbf24', '#ffffff', '#fed7aa', '#fef9c3', '#ecfccb', '#d9f99d'];
                          return lightAccents.includes(acc) ? '#0f172a' : '#ffffff';
                        })(),
                    }}
                  >
                    <span className="text-center whitespace-pre-line">{slide.categoryBadge}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* タイル形式（card-grid）・ポスター形式（poster-hero）・縦書き・横書きのレイアウト分岐 */}
          {slide.layoutStyle === 'card-grid' ? (
            <div className="flex-1 flex flex-col gap-2 min-h-0 h-full overflow-hidden py-0.5">
              {/* タイトル・説明文（タイル形式では8番の写真画像は非表示・選択不可） */}
              {(slide.headline || slide.subheadline) && (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`tile-headline-${slide.id || ''}-${slide.headline || ''}-${slide.textAnimation || 'none'}-${slide.textAnimationSpeed || 'normal'}`}
                    variants={getTextAnimationVariants()}
                    initial="initial"
                    animate="animate"
                    className="shrink-0 flex flex-col justify-center px-2 overflow-hidden"
                  >
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                        {slide.headline && (
                          <div
                            onClick={() => onSelectTextTarget?.('headline')}
                            className={`w-full p-0.5 ${getSelectableClass('headline')}`}
                            style={{ textAlign: slide.headlineAlign || 'center' }}
                            title="クリックして大見出しの書体を変更"
                          >
                            <h1
                              className="font-black tracking-tight drop-shadow-sm whitespace-pre-line break-words w-full block"
                              style={{
                                fontFamily: getTargetFont('headline'),
                                color: getTargetTextColor('headline'),
                                fontSize: `${
                                  slide.headlinePt && slide.headlinePt > 0
                                    ? slide.headlinePt
                                    : Math.min(effectiveHeadlinePt, visibleCount >= 7 ? 16 : visibleCount >= 5 ? 18 : 22)
                                }px`,
                                lineHeight: 1.18,
                                textAlign: slide.headlineAlign || 'center',
                              }}
                            >
                              {slide.headline}
                            </h1>
                          </div>
                        )}

                        {slide.subheadline && (
                          <div
                            onClick={() => onSelectTextTarget?.('subheadline')}
                            className={`w-full p-0.5 ${getSelectableClass('subheadline')}`}
                            style={{ textAlign: slide.subheadlineAlign || 'center' }}
                            title="クリックして説明文の書体を変更"
                          >
                            <p
                              className="font-medium opacity-85 whitespace-pre-line break-words w-full block line-clamp-2"
                              style={{
                                fontFamily: getTargetFont('subheadline'),
                                color: getTargetTextColor('subheadline'),
                                fontSize: `${
                                  slide.subheadlinePt && slide.subheadlinePt > 0
                                    ? slide.subheadlinePt
                                    : Math.min(effectiveSubheadlinePt, 13)
                                }px`,
                                lineHeight: 1.25,
                                textAlign: slide.subheadlineAlign || 'center',
                              }}
                            >
                              {slide.subheadline}
                            </p>
                          </div>
                        )}
                    </div>
                  </motion.div>
                </AnimatePresence>
              )}

              {/* タイルメニューグリッド（最大横4列・縦3行、最大12商品対応） */}
              {visibleCount > 0 && (() => {
                const tileGridClass =
                  visibleCount === 1
                    ? 'grid-cols-1 grid-rows-1'
                    : visibleCount === 2
                    ? isLandscape
                      ? 'grid-cols-2 grid-rows-1'
                      : 'grid-cols-1 grid-rows-2'
                    : visibleCount <= 4
                    ? 'grid-cols-2 grid-rows-2'
                    : visibleCount <= 6
                    ? isLandscape
                      ? 'grid-cols-3 grid-rows-2'
                      : 'grid-cols-2 grid-rows-3'
                    : visibleCount <= 8
                    ? 'grid-cols-4 grid-rows-2'
                    : !isLandscape && visibleCount === 10
                    ? 'grid-cols-3 grid-rows-5'
                    : 'grid-cols-4 grid-rows-3';

                const hasHeroFirstTile =
                  visibleCount === 3 ||
                  visibleCount === 5 ||
                  visibleCount === 7 ||
                  visibleCount === 9 ||
                  visibleCount === 10 ||
                  visibleCount === 11;

                const explicitMenuColor = slide.textColorOverrides?.menu;
                const tileNameColor =
                  explicitMenuColor && !isColorTooDark(explicitMenuColor) ? explicitMenuColor : '#ffffff';
                const tileDescColor =
                  explicitMenuColor && !isColorTooDark(explicitMenuColor) ? explicitMenuColor : 'rgba(255,255,255,0.82)';
                const tilePriceColor =
                  slide.accentColor && !isColorTooDark(slide.accentColor) ? slide.accentColor : '#fbbf24';
                const isDenseTile = visibleCount >= 7;
                const isCompactLandscapeTile = isLandscape && visibleCount >= 5;

                return (
                  <div
                    onClick={() => onSelectTextTarget?.('menu')}
                    className={`flex-1 min-h-0 grid ${tileGridClass} ${
                      isDenseTile ? 'gap-1.5' : 'gap-2.5'
                    } px-0.5 py-0.5 items-stretch ${getSelectableClass('menu')}`}
                    style={{ fontFamily: getTargetFont('menu') }}
                    title="クリックしてメニュー商品の書体を変更"
                  >
                    {visibleItems.map((item, idx) => {
                      const isHeroTile = idx === 0 && hasHeroFirstTile;
                      const isPortraitWideHero =
                        !isLandscape && (visibleCount === 7 || visibleCount === 10 || visibleCount === 11);
                      const heroSpanClass = isHeroTile
                        ? visibleCount === 9
                          ? 'col-span-2 row-span-2'
                          : isPortraitWideHero
                          ? visibleCount === 10
                            ? 'col-span-2 row-span-3'
                            : 'col-span-2'
                          : visibleCount === 10
                          ? 'row-span-3'
                          : 'row-span-2'
                        : '';

                      const tileNamePt =
                        item.namePt ||
                        slide.menuItemNamePt ||
                        (isHeroTile
                          ? visibleCount <= 5
                            ? isLandscape
                              ? 18
                              : 19
                            : visibleCount === 9 || isPortraitWideHero
                            ? 16
                            : 15
                          : visibleCount <= 2
                          ? 20
                          : visibleCount <= 4
                          ? isLandscape
                            ? 14
                            : 15
                          : visibleCount <= 6
                          ? isLandscape
                            ? 12
                            : 13
                          : isLandscape || visibleCount === 10
                          ? 11
                          : 10);
                      const tileDescPt =
                        item.descPt ||
                        slide.menuItemDescPt ||
                        (isHeroTile ? 11 : visibleCount <= 2 ? 12 : visibleCount <= 6 ? 10 : 9);
                      const tilePricePt =
                        item.pricePt ||
                        slide.menuItemPricePt ||
                        (isHeroTile
                          ? visibleCount <= 5
                            ? 20
                            : visibleCount === 9 || isPortraitWideHero
                            ? 18
                            : 16
                          : visibleCount <= 2
                          ? 22
                          : visibleCount <= 4
                          ? isLandscape
                            ? 16
                            : 17
                          : visibleCount <= 6
                          ? isLandscape
                            ? 13
                            : 14
                          : isLandscape || visibleCount === 10
                          ? 12
                          : 11);
                      const highlightLabel =
                        item.highlightBadge && item.highlightBadge !== 'なし' && item.highlightBadge !== ''
                          ? item.highlightBadge
                          : item.featured
                          ? 'おすすめ'
                          : '';
                      const isHighlighted = Boolean(highlightLabel);

                      return (
                        <motion.div
                          key={item.id || idx}
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.03 + idx * 0.03, duration: 0.16 }}
                          className={`relative w-full h-full min-h-0 rounded-xl overflow-hidden border transition-all ${heroSpanClass} ${
                            isHighlighted
                              ? 'ring-2 ring-amber-400 border-amber-400 shadow-lg'
                              : 'shadow-md'
                          }`}
                          style={{
                            borderColor: isHighlighted ? '#f59e0b' : `${tilePriceColor}55`,
                            backgroundColor: '#0c0a09',
                          }}
                        >
                          {/* 1. 画像レイヤー：枠全体まで表示しつつ全体表示（object-contain） */}
                          <div className="absolute inset-0 z-0 bg-slate-950/90 flex items-center justify-center">
                            {item.imageUrl && (
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                referrerPolicy="no-referrer"
                                onError={handleImageError}
                                className="w-full h-full object-contain"
                              />
                            )}
                          </div>

                          {/* 2. 上部タグ＆おすすめ枠バッジレイヤー */}
                          {item.tag && (
                            <div
                              className={`absolute z-20 rounded font-black text-white shadow-md tracking-wider whitespace-nowrap leading-tight ${
                                isDenseTile && !isHeroTile
                                  ? 'top-1.5 left-1.5 px-1.5 py-0.5 text-[8px] sm:text-[9px]'
                                  : 'top-2 left-2 px-2 py-0.5 text-[10px] sm:text-[11px]'
                              }`}
                              style={{
                                backgroundColor: item.tagColor || DEFAULT_TAG_COLORS[idx % 6],
                              }}
                            >
                              {item.tag}
                            </div>
                          )}

                          {highlightLabel && (
                            <div
                              className={`absolute z-20 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black rounded-full shadow-md leading-tight whitespace-nowrap border border-amber-200 ${
                                isDenseTile && !isHeroTile
                                  ? 'top-1.5 right-1.5 px-1.5 py-0.5 text-[8px] sm:text-[9px]'
                                  : 'top-2 right-2 px-2.5 py-0.5 text-[10px] sm:text-[11px]'
                              }`}
                            >
                              {highlightLabel}
                            </div>
                          )}

                          {/* 3. 最下部テキスト・価格オーバーレイレイヤー（画像の上に表示） */}
                          <div
                            className={`absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/95 via-black/75 to-transparent ${
                              isDenseTile && !isHeroTile
                                ? 'pt-4 pb-1.5 px-1.5 gap-x-1.5 gap-y-0.5'
                                : isCompactLandscapeTile
                                ? 'pt-5 pb-1.5 px-2 gap-2'
                                : 'pt-8 pb-2 px-2.5 gap-2'
                            } flex flex-wrap items-end justify-between`}
                          >
                            <div className="min-w-[60%] flex-1 flex flex-col items-start text-left">
                              <span
                                className="font-bold break-words leading-tight whitespace-pre-line line-clamp-2 drop-shadow-sm"
                                style={{
                                  fontSize: `${tileNamePt}px`,
                                  color: tileNameColor,
                                }}
                              >
                                {item.name || '商品名未入力'}
                              </span>
                              {item.description && (
                                <p
                                  className="opacity-85 break-words leading-tight whitespace-pre-line mt-0.5 line-clamp-1"
                                  style={{
                                    fontSize: `${tileDescPt}px`,
                                    color: tileDescColor,
                                  }}
                                >
                                  {item.description}
                                </p>
                              )}
                            </div>

                            {item.price && item.price.trim().length > 0 && (
                              <div
                                className={`ml-auto shrink-0 rounded-md flex items-center justify-center ${
                                  item.priceBgColor && item.priceBgColor !== 'transparent'
                                    ? 'px-1.5 py-0.5 border border-white/20 shadow-xs'
                                    : ''
                                }`}
                                style={{
                                  backgroundColor:
                                    item.priceBgColor && item.priceBgColor !== 'transparent'
                                      ? item.priceBgColor
                                      : 'transparent',
                                }}
                              >
                                <span
                                  className="font-black tracking-tight whitespace-nowrap leading-none drop-shadow-sm"
                                  style={{
                                    fontSize: `${tilePricePt}px`,
                                    color: tilePriceColor,
                                  }}
                                >
                                  {item.price}
                                </span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          ) : slide.layoutStyle === 'poster-hero' ? (
            /* ポスター形式（8番の大きな写真を背景に表示し、メニュー11番は使わずタイトル・説明を大胆に配置） */
            slide.writingMode === 'vertical' ? (
              <div className="relative flex-1 min-h-0 w-full h-full overflow-hidden py-2 px-2">
                {(['left', 'center', 'right'] as const).map((slot) => {
                  const headlineH = slide.headlineHorizontalAlign || 'center';
                  const subheadlineH = slide.subheadlineHorizontalAlign || 'center';
                  const hasHeadline = Boolean(slide.headline && headlineH === slot);
                  const hasSubheadline = Boolean(slide.subheadline && subheadlineH === slot);
                  if (!hasHeadline && !hasSubheadline) return null;
                  const gapPx = Math.max(14, Math.round((effectiveHeadlinePt || 30) * 0.6));
                  const bothInSlot = hasHeadline && hasSubheadline;
                  const slotWrapperPos =
                    bothInSlot && slot === 'left'
                      ? 'inset-y-0 left-0 w-[85%]'
                      : bothInSlot && slot === 'right'
                      ? 'inset-y-0 right-0 w-[85%]'
                      : 'inset-0';
                  const singleJustify =
                    slot === 'left' ? 'justify-start' : slot === 'right' ? 'justify-end' : 'justify-center';

                  return (
                    <div
                      key={slot}
                      className={`absolute ${slotWrapperPos} flex flex-row-reverse items-stretch pointer-events-none px-1`}
                      style={{ gap: `${gapPx}px` }}
                    >
                      {hasHeadline &&
                        renderVerticalHeadline(
                          `poster-v-${slot}`,
                          bothInSlot ? 'flex-[1.25] min-w-0 pointer-events-auto' : 'flex-1 min-w-0 pointer-events-auto',
                          bothInSlot ? 'justify-start' : singleJustify
                        )}
                      {hasSubheadline &&
                        renderVerticalSubheadline(
                          `poster-v-${slot}`,
                          'flex-1 min-w-0 pointer-events-auto',
                          bothInSlot ? 'justify-end' : singleJustify
                        )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="relative flex-1 min-h-0 w-full h-full overflow-hidden py-2 sm:py-3 px-1 sm:px-2">
                {(['top', 'center', 'bottom'] as const).map((vSlot) => {
                  const headlineV = slide.headlineVerticalAlign || 'bottom';
                  const subheadlineV = slide.subheadlineVerticalAlign || 'bottom';
                  const hasHeadline = Boolean(slide.headline && headlineV === vSlot);
                  const hasSubheadline = Boolean(slide.subheadline && subheadlineV === vSlot);
                  if (!hasHeadline && !hasSubheadline) return null;
                  const vJustifyClass =
                    vSlot === 'top' ? 'justify-start' : vSlot === 'center' ? 'justify-center' : 'justify-end';

                  return (
                    <div
                      key={vSlot}
                      className={`absolute inset-0 flex flex-col ${vJustifyClass} pointer-events-none py-2 sm:py-3 px-1 sm:px-2`}
                    >
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={`poster-h-${vSlot}-${slide.id || ''}-${slide.headline || ''}-${slide.subheadline || ''}-${slide.textAnimation || 'none'}-${slide.textAnimationSpeed || 'normal'}`}
                          variants={getTextAnimationVariants()}
                          initial="initial"
                          animate="animate"
                          className="w-full flex flex-col gap-2"
                        >
                          {hasHeadline && (
                            <div
                              onClick={() => onSelectTextTarget?.('headline')}
                              className={`w-full p-1 pointer-events-auto ${getSelectableClass('headline')}`}
                              style={{ textAlign: slide.headlineAlign || 'center' }}
                              title="クリックして大見出しの書体を変更"
                            >
                              <h1
                                className="font-black tracking-tight whitespace-pre-line break-words w-full block"
                                style={{
                                  fontFamily: getTargetFont('headline'),
                                  color: getTargetTextColor('headline'),
                                  fontSize: `${effectiveHeadlinePt}px`,
                                  lineHeight: 1.12,
                                  textAlign: slide.headlineAlign || 'center',
                                  textShadow:
                                    slide.textAnimation === 'neonFlicker'
                                      ? `0 0 16px ${slide.accentColor}, 0 0 32px ${slide.accentColor}`
                                      : isPosterHeroWithPhoto
                                      ? '0 4px 18px rgba(0,0,0,0.8), 0 1px 4px rgba(0,0,0,0.9)'
                                      : 'none',
                                }}
                              >
                                {slide.headline}
                              </h1>
                              {selectedTextTarget === 'headline' && (
                                <div className="inline-flex items-center gap-1 text-[11px] bg-amber-400 text-slate-950 font-bold px-2 py-0.5 rounded-full mt-1">
                                  <Type className="w-3 h-3" /> 見出しの書体を変更中
                                </div>
                              )}
                            </div>
                          )}

                          {hasSubheadline && (
                            <div
                              onClick={() => onSelectTextTarget?.('subheadline')}
                              className={`w-full p-1 pointer-events-auto ${getSelectableClass('subheadline')}`}
                              style={{ textAlign: slide.subheadlineAlign || 'center' }}
                              title="クリックして説明文の書体を変更"
                            >
                              <p
                                className="font-bold whitespace-pre-line break-words w-full block"
                                style={{
                                  fontFamily: getTargetFont('subheadline'),
                                  color: getTargetTextColor('subheadline'),
                                  fontSize: `${effectiveSubheadlinePt}px`,
                                  lineHeight: 1.28,
                                  textAlign: slide.subheadlineAlign || 'center',
                                  textShadow: isPosterHeroWithPhoto ? '0 2px 10px rgba(0,0,0,0.85)' : 'none',
                                }}
                              >
                                {slide.subheadline}
                              </p>
                            </div>
                          )}
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )
          ) : slide.layoutStyle === 'media-only' ? (
            /* 背景画像・映像専用（横位置3種 × 縦位置3種でタイトル・説明を独立配置） */
            <div className="relative flex-1 min-h-0 w-full h-full overflow-hidden py-2 sm:py-3 px-1 sm:px-2">
              {(['top', 'center', 'bottom'] as const).map((vSlot) => {
                const headlineV = slide.headlineVerticalAlign || 'center';
                const subheadlineV = slide.subheadlineVerticalAlign || 'center';
                const hasHeadline = Boolean(slide.headline && headlineV === vSlot);
                const hasSubheadline = Boolean(slide.subheadline && subheadlineV === vSlot);
                if (!hasHeadline && !hasSubheadline) return null;
                const vJustifyClass =
                  vSlot === 'top' ? 'justify-start' : vSlot === 'center' ? 'justify-center' : 'justify-end';
                const hasBgMedia =
                  (slide.bgType === 'image' && Boolean(slide.bgCustomImage)) ||
                  (slide.bgType === 'video' && Boolean(slide.bgVideoUrl));

                return (
                  <div
                    key={vSlot}
                    className={`absolute inset-0 flex flex-col ${vJustifyClass} pointer-events-none py-2 sm:py-3 px-1 sm:px-2`}
                  >
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={`media-h-${vSlot}-${slide.id || ''}-${slide.headline || ''}-${slide.subheadline || ''}-${slide.textAnimation || 'none'}-${slide.textAnimationSpeed || 'normal'}`}
                        variants={getTextAnimationVariants()}
                        initial="initial"
                        animate="animate"
                        className="w-full flex flex-col gap-2"
                      >
                        {hasHeadline && (
                          <div
                            onClick={() => onSelectTextTarget?.('headline')}
                            className={`w-full p-1 pointer-events-auto ${getSelectableClass('headline')}`}
                            style={{ textAlign: slide.headlineAlign || 'center' }}
                            title="クリックして大見出しの書体を変更"
                          >
                            <h1
                              className="font-black tracking-tight whitespace-pre-line break-words w-full block"
                              style={{
                                fontFamily: getTargetFont('headline'),
                                color: getTargetTextColor('headline'),
                                fontSize: `${effectiveHeadlinePt}px`,
                                lineHeight: 1.15,
                                textAlign: slide.headlineAlign || 'center',
                                textShadow:
                                  slide.textAnimation === 'neonFlicker'
                                    ? `0 0 16px ${slide.accentColor}, 0 0 32px ${slide.accentColor}`
                                    : hasBgMedia
                                    ? '0 4px 18px rgba(0,0,0,0.8), 0 1px 4px rgba(0,0,0,0.9)'
                                    : 'none',
                              }}
                            >
                              {slide.headline}
                            </h1>
                            {selectedTextTarget === 'headline' && (
                              <div className="inline-flex items-center gap-1 text-[11px] bg-amber-400 text-slate-950 font-bold px-2 py-0.5 rounded-full mt-1">
                                <Type className="w-3 h-3" /> 見出しの書体を変更中
                              </div>
                            )}
                          </div>
                        )}

                        {hasSubheadline && (
                          <div
                            onClick={() => onSelectTextTarget?.('subheadline')}
                            className={`w-full p-1 pointer-events-auto ${getSelectableClass('subheadline')}`}
                            style={{ textAlign: slide.subheadlineAlign || 'center' }}
                            title="クリックして説明文の書体を変更"
                          >
                            <p
                              className="font-bold whitespace-pre-line break-words w-full block"
                              style={{
                                fontFamily: getTargetFont('subheadline'),
                                color: getTargetTextColor('subheadline'),
                                fontSize: `${effectiveSubheadlinePt}px`,
                                lineHeight: 1.28,
                                textAlign: slide.subheadlineAlign || 'center',
                                textShadow: hasBgMedia ? '0 2px 10px rgba(0,0,0,0.85)' : 'none',
                              }}
                            >
                              {slide.subheadline}
                            </p>
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          ) : slide.writingMode === 'vertical' ? (
            <div className="flex-1 flex flex-row items-stretch justify-between gap-3 min-h-0 h-full py-0.5 overflow-hidden">
              {/* 1. 商品エリア */}
              <div className={`${isLandscape ? 'w-[65%] min-w-0' : 'w-[50%] min-w-0'} flex flex-col justify-between gap-2 min-h-0 h-full`}>
                {visibleCount > 0 && (
                  <div
                    onClick={() => onSelectTextTarget?.('menu')}
                    className={`flex-1 ${
                      isLandscape
                        ? visibleCount === 1
                          ? 'grid grid-cols-1 grid-rows-1 w-full'
                          : visibleCount === 2
                          ? 'grid grid-cols-2 grid-rows-1 w-full'
                          : visibleCount === 3
                          ? 'grid grid-cols-3 grid-rows-1 w-full'
                          : visibleCount === 4
                          ? 'grid grid-cols-4 grid-rows-1 w-full'
                          : visibleCount === 5
                          ? 'grid grid-cols-5 grid-rows-1 w-full'
                          : 'grid grid-cols-6 grid-rows-1 w-full'
                        : visibleCount === 1
                        ? 'flex justify-center items-stretch'
                        : visibleCount === 2
                        ? 'grid grid-cols-2 grid-rows-1'
                        : visibleCount === 3
                        ? 'grid grid-cols-3 grid-rows-1'
                        : 'grid grid-cols-3 grid-rows-2'
                    } gap-2.5 min-h-0 pt-5 pb-1 px-1 items-stretch ${getSelectableClass('menu')}`}
                    style={{
                      direction: 'rtl',
                      fontFamily: getTargetFont('menu'),
                    }}
                    title="クリックしてメニュー商品の書体を変更"
                  >
                    {visibleItems.map((item, idx) => {
                      const itemEffectiveNamePt = item.namePt || slide.menuItemNamePt || (
                        isLandscape
                          ? visibleCount === 1 ? autoItemNamePt + 4 : visibleCount <= 3 ? autoItemNamePt + 2 : visibleCount <= 4 ? autoItemNamePt + 1 : autoItemNamePt
                          : visibleCount <= 3 ? autoItemNamePt + 2 : autoItemNamePt
                      );
                      const itemEffectiveDescPt = item.descPt || slide.menuItemDescPt || (
                        isLandscape
                          ? visibleCount === 1 ? autoItemDescPt + 2 : visibleCount <= 3 ? autoItemDescPt + 1 : autoItemDescPt
                          : visibleCount <= 3 ? autoItemDescPt + 2 : autoItemDescPt
                      );
                      const itemEffectivePricePt = item.pricePt || slide.menuItemPricePt || (
                        isLandscape
                          ? visibleCount === 1 ? autoItemPricePt + 4 : visibleCount <= 3 ? autoItemPricePt + 2 : autoItemPricePt + 1
                          : visibleCount <= 3 ? autoItemPricePt + 2 : autoItemPricePt
                      );

                      const cardAppearance = getMenuItemCardAppearance(item);

                      return (
                        <motion.div
                          key={item.id || idx}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.04 + idx * 0.03, duration: 0.15 }}
                          className={`relative rounded-xl border transition-all flex flex-col items-center justify-between overflow-visible ${
                            isLandscape
                              ? visibleCount === 1
                                ? 'w-full h-full p-2.5 sm:p-3.5 gap-1.5'
                                : visibleCount <= 3
                                ? 'w-full h-full p-2 sm:p-2.5 gap-1'
                                : 'w-full h-full p-1 sm:p-1.5 gap-0.5'
                              : visibleCount === 1
                              ? 'w-full max-w-[320px] h-full p-4 gap-3 mx-auto'
                              : visibleCount >= 4
                              ? 'p-1 sm:p-1.5 gap-0.5'
                              : 'p-2 sm:p-2.5 gap-1.5'
                          } ${cardAppearance.className}`}
                          style={{
                            ...cardAppearance.style,
                            direction: 'ltr',
                          }}
                        >
                          {renderHighlightBadge(item, 'left-1/2 -translate-x-1/2', 'z-30')}
                          {visibleItems.some((i) => Boolean(i.imageUrl)) && (
                            <div
                              className={`w-full ${
                                isLandscape
                                  ? visibleCount === 1
                                    ? 'h-[172px] sm:h-[210px] max-w-[420px]'
                                    : visibleCount === 2
                                    ? 'h-[142px] sm:h-[172px] max-w-[330px]'
                                    : visibleCount === 3
                                    ? 'h-[120px] sm:h-[142px] max-w-[270px]'
                                    : visibleCount <= 4
                                    ? 'h-[98px] sm:h-[117px] max-w-[210px]'
                                    : 'h-[78px] sm:h-[93px] max-w-[165px]'
                                  : visibleCount === 1
                                  ? 'h-[172px] sm:h-[202px] max-w-[360px]'
                                  : visibleCount <= 2
                                  ? 'h-[142px] sm:h-[165px] max-w-[300px]'
                                  : visibleCount <= 4
                                  ? 'h-[120px] sm:h-[142px] max-w-[240px]'
                                  : 'h-[98px] sm:h-[112px]'
                              } flex items-center justify-center overflow-hidden shrink-0 self-center`}
                            >
                              {item.imageUrl && (
                                <img
                                  src={item.imageUrl}
                                  alt={item.name}
                                  referrerPolicy="no-referrer"
                                  onError={handleImageError}
                                  className="w-auto h-auto max-w-full max-h-full object-contain rounded-lg drop-shadow-xs"
                                />
                              )}
                            </div>
                          )}

                          {!isLandscape && item.tag && (
                            <div
                              className="shrink-0 rounded text-white font-bold text-[9px] sm:text-[10px] px-2 py-0.5 shadow-xs tracking-wider flex items-center justify-center whitespace-nowrap leading-none my-1"
                              style={{
                                backgroundColor: item.tagColor || DEFAULT_TAG_COLORS[idx % 6],
                                writingMode: 'horizontal-tb',
                                direction: 'ltr',
                              }}
                            >
                              {item.tag}
                            </div>
                          )}

                          <div className={`flex-1 w-full flex flex-row-reverse items-stretch justify-center ${visibleCount >= 4 ? 'gap-0.5' : visibleCount === 1 ? 'gap-3' : 'gap-1.5'} min-h-0 py-0.5 overflow-hidden`}>
                            {isLandscape && item.tag && (
                              <div
                                className={`shrink-0 rounded text-white font-bold ${
                                  visibleCount === 1
                                    ? 'text-[11px] px-2 py-1'
                                    : visibleCount >= 4
                                    ? 'text-[7px] px-0.5 py-0.5'
                                    : 'text-[9px] px-1.5 py-1'
                                } shadow-xs tracking-wider flex items-center justify-center whitespace-nowrap self-start`}
                                style={{
                                  backgroundColor: item.tagColor || DEFAULT_TAG_COLORS[idx % 6],
                                  writingMode: 'vertical-rl',
                                  textOrientation: 'upright',
                                }}
                              >
                                {item.tag}
                              </div>
                            )}

                            <div className="shrink-0 flex items-start self-start h-full max-h-full overflow-hidden">
                              <span
                                className="font-bold break-words leading-tight whitespace-pre-line"
                                style={{
                                  fontSize: `${itemEffectiveNamePt}px`,
                                  color: getCardItemTextColor(),
                                  writingMode: 'vertical-rl',
                                  textOrientation: 'upright',
                                  letterSpacing: visibleCount >= 4 ? '0.01em' : '0.04em',
                                  maxHeight: '100%',
                                }}
                              >
                                {item.name || '商品名未入力'}
                              </span>
                            </div>

                            {item.description && (
                              <p
                                className="opacity-80 break-words leading-tight whitespace-pre-line self-start h-full overflow-hidden shrink min-w-0"
                                style={{
                                  fontSize: `${itemEffectiveDescPt}px`,
                                  color: getCardItemDescColor(),
                                  writingMode: 'vertical-rl',
                                  textOrientation: 'upright',
                                  letterSpacing: visibleCount >= 4 ? '0em' : '0.02em',
                                  maxHeight: '100%',
                                  maxWidth: visibleCount >= 5 ? '38px' : visibleCount === 4 ? '46px' : undefined,
                                }}
                              >
                                {item.description}
                              </p>
                            )}
                          </div>

                          {/* 価格エリア（商品枠の中での中央寄せ） */}
                          <div className="shrink-0 pt-0.5 pb-0.5 w-full flex flex-col items-center justify-center gap-0.5">
                            {renderMenuPrice(item, itemEffectivePricePt)}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 2 & 3. コピー＆画像エリア（横画面は画面右35%、縦画面は画面右50%を占有） */}
              {isLandscape ? (
                <div className="w-[35%] min-w-0 flex flex-col items-center justify-start h-full max-h-full py-0.5 overflow-hidden pr-0 pl-1">
                  {/* 看板画像：大見出しおよびサブコピーの一番上の位置（最上部）に配置 */}
                  {bannerImageUrl && (
                    <div className="w-full h-[28%] max-h-[160px] min-h-[75px] shrink-0 flex items-center justify-center mb-1.5 px-0.5">
                      <img
                        src={bannerImageUrl}
                        alt="看板画像"
                        referrerPolicy="no-referrer"
                        onError={handleImageError}
                        className="max-w-full max-h-full w-auto h-auto object-contain rounded-xl drop-shadow-sm"
                      />
                    </div>
                  )}

                  {renderVerticalCopyPair(
                    'v-landscape',
                    Math.max(16, Math.round((effectiveHeadlinePt || 30) * 0.9))
                  )}
                </div>
              ) : (
                <div className="w-[50%] min-w-0 flex flex-col items-center justify-start h-full max-h-full py-0.5 overflow-hidden pr-0 pl-1">
                  {/* 看板画像：右側上部スペース一杯（余白枠なし） */}
                  {bannerImageUrl && (
                    <div className="w-full h-[20%] shrink-0 flex items-center justify-center mb-1.5 px-0.5">
                      <img
                        src={bannerImageUrl}
                        alt="看板画像"
                        referrerPolicy="no-referrer"
                        onError={handleImageError}
                        className="max-w-full max-h-full w-auto h-auto object-contain rounded-xl drop-shadow-sm"
                      />
                    </div>
                  )}

                  {renderVerticalCopyPair(
                    'v-portrait',
                    Math.max(6, Math.min(16, Math.round((effectiveHeadlinePt || 30) * 0.25)))
                  )}
                </div>
              )}
            </div>
          ) : isLandscape ? (
            /* 横画面・横書き時のレイアウト（上38%：画像を左側、タイトル・説明を右側に配置 / 下62%：商品リスト） */
            <div className="flex-1 flex flex-col justify-between gap-1 min-h-0 h-full py-0 overflow-hidden">
              {(bannerImageUrl || slide.headline || slide.subheadline || visibleCount === 0) && (
                <div
                  className={`${visibleCount > 0 ? 'h-[38%]' : 'h-full'} min-h-0 flex ${
                    bannerImageUrl ? 'flex-row items-center gap-4 px-2' : 'flex-col items-center justify-center px-1'
                  } shrink-0 overflow-hidden`}
                >
                  {/* 看板画像：横画面・横書きでは左側に配置 */}
                  {bannerImageUrl && (
                    <div
                      className={`${
                        visibleCount > 0
                          ? 'max-w-[32%] h-full py-1'
                          : 'max-w-[42%] h-[82%] max-h-[380px]'
                      } shrink-0 flex items-center justify-center`}
                    >
                      <img
                        src={bannerImageUrl}
                        alt="看板画像"
                        referrerPolicy="no-referrer"
                        onError={handleImageError}
                        className="max-w-full max-h-full w-auto h-auto object-contain rounded-xl drop-shadow-sm transition-all duration-200"
                      />
                    </div>
                  )}

                  {/* 大見出し＆サブコピー */}
                  {(slide.headline || slide.subheadline) && (
                    <div
                      className={`flex-1 min-w-0 min-h-0 ${
                        bannerImageUrl ? 'h-full px-2 sm:px-3' : 'w-full px-4 sm:px-8'
                      } flex flex-col justify-center overflow-hidden`}
                    >
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={`ls-headline-${slide.id || ''}-${slide.headline || ''}-${slide.textAnimation || 'none'}-${slide.textAnimationSpeed || 'normal'}`}
                          variants={getTextAnimationVariants()}
                          initial="initial"
                          animate="animate"
                          className="w-full flex flex-col justify-center"
                        >
                          {slide.headline && (
                            <div
                              onClick={() => onSelectTextTarget?.('headline')}
                              className={`w-full p-0.5 ${getSelectableClass('headline')}`}
                              style={{ textAlign: slide.headlineAlign || 'center' }}
                              title="クリックして大見出しの書体を変更"
                            >
                              <h1
                                className="font-black tracking-tight drop-shadow-sm whitespace-pre-line break-words w-full block"
                                style={{
                                  fontFamily: getTargetFont('headline'),
                                  color: getTargetTextColor('headline'),
                                  fontSize: `${effectiveHeadlinePt}px`,
                                  lineHeight: 1.15,
                                  textAlign: slide.headlineAlign || 'center',
                                }}
                              >
                                {slide.headline}
                              </h1>
                            </div>
                          )}

                          {slide.subheadline && (
                            <div
                              onClick={() => onSelectTextTarget?.('subheadline')}
                              className={`w-full p-0.5 ${getSelectableClass('subheadline')}`}
                              style={{
                                marginTop: `${Math.max(2, Math.min(6, Math.round(effectiveHeadlinePt * 0.15)))}px`,
                                textAlign: slide.subheadlineAlign || 'center',
                              }}
                              title="クリックして説明文の書体を変更"
                            >
                              <p
                                className="font-medium opacity-85 whitespace-pre-line break-words w-full block"
                                style={{
                                  fontFamily: getTargetFont('subheadline'),
                                  color: getTargetTextColor('subheadline'),
                                  fontSize: `${effectiveSubheadlinePt}px`,
                                  lineHeight: 1.25,
                                  textAlign: slide.subheadlineAlign || 'center',
                                }}
                              >
                                {slide.subheadline}
                              </p>
                            </div>
                          )}
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              )}

              {/* メニュー商品リスト（下62%スペースいっぱいにカードを配置し、バッジや価格が重ならないよう調整） */}
              {visibleCount > 0 && (
                <div
                  onClick={() => onSelectTextTarget?.('menu')}
                  className={`grid ${
                    visibleCount === 1
                      ? 'grid-cols-1 grid-rows-1 max-w-[360px] mx-auto'
                      : visibleCount === 2
                      ? 'grid-cols-2 grid-rows-1 max-w-[680px] mx-auto'
                      : visibleCount === 3
                      ? 'grid-cols-3 grid-rows-1 max-w-[880px] mx-auto'
                      : visibleCount === 4
                      ? 'grid-cols-4 grid-rows-1'
                      : visibleCount === 5
                      ? 'grid-cols-5 grid-rows-1'
                      : 'grid-cols-6 grid-rows-1'
                  } gap-3 h-[62%] min-h-0 pt-3.5 pb-1 px-1 items-stretch ${getSelectableClass('menu')}`}
                  style={{ fontFamily: getTargetFont('menu') }}
                  title="クリックしてメニュー商品の書体を変更"
                >
                  {visibleItems.map((item, idx) => {
                    const itemEffectiveNamePt = item.namePt || slide.menuItemNamePt || (
                      visibleCount <= 2 ? autoItemNamePt + 1 : autoItemNamePt
                    );
                    const itemEffectiveDescPt = item.descPt || slide.menuItemDescPt || autoItemDescPt;
                    const itemEffectivePricePt = item.pricePt || slide.menuItemPricePt || (
                      visibleCount <= 2 ? autoItemPricePt + 1 : autoItemPricePt
                    );
                    const cardAppearance = getMenuItemCardAppearance(item);

                    return (
                      <motion.div
                        key={item.id || idx}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.04 + idx * 0.03, duration: 0.15 }}
                        className={`relative rounded-xl border transition-all flex flex-col items-center justify-between overflow-visible w-full h-full ${
                          visibleCount <= 2
                            ? 'p-2 sm:p-2.5 pb-2 gap-1'
                            : visibleCount === 3
                            ? 'p-1.5 sm:p-2 pb-1.5 gap-1'
                            : 'p-1 sm:p-1.5 pb-1.5 gap-0.5'
                        } ${cardAppearance.className}`}
                        style={cardAppearance.style}
                      >
                        {renderHighlightBadge(item, 'left-1/2 -translate-x-1/2', 'z-20')}

                        {/* 商品画像（余白枠なしで写真ぴったりに表示） */}
                        {item.imageUrl && (
                          <div
                            className={`w-full ${
                              visibleCount <= 2
                                ? 'h-[54%] max-h-[160px] min-h-[85px] max-w-[330px]'
                                : visibleCount === 3
                                ? 'h-[50%] max-h-[144px] min-h-[75px] max-w-[285px]'
                                : visibleCount === 4
                                ? 'h-[46%] max-h-[120px] min-h-[66px] max-w-[225px]'
                                : 'h-[42%] max-h-[102px] min-h-[56px] max-w-[195px]'
                            } flex items-center justify-center overflow-hidden shrink-0 self-center`}
                          >
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              referrerPolicy="no-referrer"
                              onError={handleImageError}
                              className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg drop-shadow-xs"
                            />
                          </div>
                        )}

                        {/* タグバッジ */}
                        {item.tag && (
                          <div
                            className="shrink-0 rounded text-white font-bold text-[9px] sm:text-[10px] px-2 py-0.5 shadow-xs tracking-wider flex items-center justify-center whitespace-nowrap leading-none my-0.5"
                            style={{
                              backgroundColor: item.tagColor || DEFAULT_TAG_COLORS[idx % 6],
                            }}
                          >
                            {item.tag}
                          </div>
                        )}

                        {/* 商品名 ＆ 説明文 */}
                        <div className="shrink min-h-0 w-full min-w-0 flex flex-col items-center justify-center text-center px-1 overflow-hidden">
                          <span
                            className="font-bold text-center break-words leading-tight whitespace-pre-line block"
                            style={{
                              fontSize: `${itemEffectiveNamePt}px`,
                              lineHeight: 1.18,
                              color: getCardItemTextColor(),
                            }}
                          >
                            {item.name || '商品名未入力'}
                          </span>
                          {item.description && (
                            <p
                              className={`opacity-80 text-center break-words leading-tight whitespace-pre-line mt-0.5 ${
                                visibleCount >= 3 ? 'line-clamp-1' : 'line-clamp-2'
                              }`}
                              style={{
                                fontSize: `${itemEffectiveDescPt}px`,
                                lineHeight: 1.18,
                                color: getCardItemDescColor(),
                              }}
                            >
                              {item.description}
                            </p>
                          )}
                        </div>

                        {/* 価格 */}
                        <div className="shrink-0 pt-0 pb-0.5 w-full flex flex-col items-center justify-center">
                          {renderMenuPrice(item, itemEffectivePricePt)}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* 縦画面・横書き時のレイアウト */
            <>
              {(bannerImageUrl || slide.headline || slide.subheadline) && (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`h-headline-${slide.id || ''}-${slide.headline || ''}-${slide.textAnimation || 'none'}-${slide.textAnimationSpeed || 'normal'}`}
                    variants={getTextAnimationVariants()}
                    initial="initial"
                    animate="animate"
                    className="text-center py-0.5 my-0 shrink-0"
                  >
                    {/* 看板画像 (1個) - 縦画面の横書き：余白枠なしで写真ぴったりに表示 */}
                    {bannerImageUrl && (() => {
                      const bannerMaxClass = visibleCount === 0
                        ? 'max-h-[240px] sm:max-h-[300px] max-w-[500px]'
                        : visibleCount === 1
                        ? 'max-h-[170px] sm:max-h-[210px] max-w-[460px]'
                        : visibleCount === 2
                        ? 'max-h-[145px] sm:max-h-[185px] max-w-[440px]'
                        : visibleCount <= 4
                        ? 'max-h-[120px] sm:max-h-[150px] max-w-[400px]'
                        : 'max-h-[95px] sm:max-h-[120px] max-w-[360px]';

                      return (
                        <div className="w-full flex items-center justify-center mb-2.5 mt-0 shrink-0 px-2">
                          <img
                            src={bannerImageUrl}
                            alt="看板画像"
                            referrerPolicy="no-referrer"
                            onError={handleImageError}
                            className={`w-auto h-auto max-w-full ${bannerMaxClass} object-contain rounded-xl drop-shadow-sm transition-all duration-200`}
                          />
                        </div>
                      );
                    })()}

                    {/* 大見出し */}
                    {slide.headline && (
                      <div
                        onClick={() => onSelectTextTarget?.('headline')}
                        className={`w-full p-0.5 px-3 ${getSelectableClass('headline')}`}
                        style={{ textAlign: slide.headlineAlign || 'center' }}
                        title="クリックして大見出しの書体を変更"
                      >
                        <h1
                          className="font-black tracking-tight mb-0.5 drop-shadow-sm whitespace-pre-line break-words w-full block"
                          style={{
                            fontFamily: getTargetFont('headline'),
                            color: getTargetTextColor('headline'),
                            fontSize: `${effectiveHeadlinePt}px`,
                            lineHeight: 1.12,
                            textAlign: slide.headlineAlign || 'center',
                            textShadow:
                              slide.textAnimation === 'neonFlicker'
                                ? `0 0 16px ${slide.accentColor}, 0 0 32px ${slide.accentColor}`
                                : 'none',
                          }}
                        >
                          {slide.headline}
                        </h1>
                        {selectedTextTarget === 'headline' && (
                          <div className="inline-flex items-center gap-1 text-[11px] bg-amber-400 text-slate-950 font-bold px-2 py-0.5 rounded-full mt-1">
                            <Type className="w-3 h-3" /> 見出しの書体を変更中
                          </div>
                        )}
                      </div>
                    )}

                    {/* サブコピー */}
                    {slide.subheadline && (
                      <div
                        onClick={() => onSelectTextTarget?.('subheadline')}
                        className={`w-full p-0.5 px-3 mt-0.5 ${getSelectableClass('subheadline')}`}
                        style={{ textAlign: slide.subheadlineAlign || 'center' }}
                        title="クリックして説明文の書体を変更"
                      >
                        <p
                          className="font-medium opacity-85 whitespace-pre-line break-words w-full block"
                          style={{
                            fontFamily: getTargetFont('subheadline'),
                            color: getTargetTextColor('subheadline'),
                            fontSize: `${effectiveSubheadlinePt}px`,
                            lineHeight: 1.2,
                            textAlign: slide.subheadlineAlign || 'center',
                          }}
                        >
                          {slide.subheadline}
                        </p>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              )}

              {/* メニュー商品リスト（横書き時：空いているスペースいっぱいに均等配置、1個は大、2個はやや大） */}
              {visibleCount > 0 && (
                <div
                  onClick={() => onSelectTextTarget?.('menu')}
                  className={`py-0.5 px-0.5 rounded-2xl flex-1 flex flex-col ${
                    visibleCount === 2 ? 'justify-between gap-3' : 'justify-between gap-1.5'
                  } min-h-0 h-full`}
                  style={{ fontFamily: getTargetFont('menu') }}
                  title="クリックしてメニュー商品の書体を変更"
                >
                  {visibleItems.map((item, idx) => {
                    const itemEffectiveNamePt = item.namePt || slide.menuItemNamePt || autoItemNamePt;
                    const itemEffectiveDescPt = item.descPt || slide.menuItemDescPt || autoItemDescPt;
                    const itemEffectivePricePt = item.pricePt || slide.menuItemPricePt || autoItemPricePt;
                    const cardAppearance = getMenuItemCardAppearance(item);

                    return (
                      <motion.div
                        key={item.id || idx}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.04 + idx * 0.03, duration: 0.15 }}
                        className={`relative rounded-xl border transition-all flex items-center justify-between flex-1 min-h-0 overflow-visible ${
                          visibleCount === 1
                            ? 'py-3 px-4 gap-4 max-h-[320px]'
                            : visibleCount === 2
                            ? 'py-2.5 px-3.5 gap-3'
                            : isDenseMenu
                            ? 'py-1 px-2 gap-1.5'
                            : isMediumMenu
                            ? 'py-1.5 px-2 gap-2'
                            : 'py-2 px-2.5 gap-2.5'
                        } ${cardAppearance.className}`}
                        style={cardAppearance.style}
                      >
                        {renderHighlightBadge(item, 'left-2', 'z-20')}

                        {visibleItems.some((i) => Boolean(i.imageUrl)) && (
                          <div
                            className={`${
                              visibleCount === 1
                                ? 'w-[168px] h-[144px] sm:h-[168px]'
                                : visibleCount === 2
                                ? 'w-[132px] h-[108px] sm:h-[132px]'
                                : isDenseMenu
                                ? 'w-[72px] h-[72px] max-h-full'
                                : 'w-[96px] h-[84px] sm:h-[96px] max-h-full'
                            } flex items-center justify-center overflow-hidden shrink-0 self-center`}
                          >
                            {item.imageUrl && (
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                referrerPolicy="no-referrer"
                                onError={handleImageError}
                                className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg drop-shadow-xs"
                              />
                            )}
                          </div>
                        )}

                        <div className="flex-1 min-w-0 pr-1 flex flex-col justify-center self-center">
                          <div className="flex flex-col items-start gap-0.5">
                            <span
                              className="font-bold break-words leading-tight whitespace-pre-line"
                              style={{
                                fontSize: `${itemEffectiveNamePt}px`,
                                color: getCardItemTextColor(),
                              }}
                            >
                              {item.name || '商品名未入力'}
                            </span>
                          </div>
                          {item.description && (
                            <p
                              className="opacity-80 break-words leading-tight whitespace-pre-line mt-0.5 line-clamp-2"
                              style={{
                                fontSize: `${itemEffectiveDescPt}px`,
                                color: getCardItemDescColor(),
                              }}
                            >
                              {item.description}
                            </p>
                          )}
                        </div>

                        {/* 右端エリア（タグと価格）：横書き時はタグを値段の上に配置 */}
                        <div className="flex flex-col items-end justify-center gap-1 shrink-0 self-center">
                          {item.tag && (
                            <span
                              className="text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded text-white shadow-xs shrink-0 whitespace-nowrap tracking-wider flex items-center justify-center leading-none"
                              style={{
                                backgroundColor: item.tagColor || DEFAULT_TAG_COLORS[idx % 6],
                              }}
                            >
                              {item.tag}
                            </span>
                          )}
                          {renderMenuPrice(item, itemEffectivePricePt, 'px-2 py-0.5 rounded-lg')}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* 足元部：QRコード & 足元の文字 */}
          {(slide.footerNote || slide.showQrCode) && (
            <div
              className={`shrink-0 ${
                isLandscape ? 'pt-0 pb-0 mt-0.5' : 'pt-1.5 pb-0.5 mt-auto'
              } border-t flex items-center justify-between gap-2.5 text-xs`}
              style={{ borderColor: `${slide.textColor}25` }}
            >
              {/* 足元の文字 */}
              {slide.footerNote ? (
                <div
                  onClick={() => onSelectTextTarget?.('footer')}
                  className={`flex-1 ${isLandscape ? 'py-0 px-0.5' : 'p-1'} min-w-0 ${getSelectableClass('footer')}`}
                  style={{ fontFamily: getTargetFont('footer') }}
                  title="クリックして足元の文字の書体を変更"
                >
                  <p 
                    className="opacity-80 leading-snug whitespace-pre-line break-words"
                    style={{
                      fontSize: slide.footerNotePt ? `${slide.footerNotePt}px` : isLandscape ? '12px' : '13px',
                      color: getTargetTextColor('footer'),
                    }}
                  >
                    {slide.footerNote}
                  </p>
                  {selectedTextTarget === 'footer' && (
                    <span className="text-[10px] bg-amber-400 text-slate-950 font-bold px-1.5 py-0.5 rounded inline-block mt-0.5">
                      足元の文字の書体変更中
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex-1" />
              )}

              {/* QRコードカード（添付画像優先 ＆ 完全オフライン対応・外部通信不要） */}
              {slide.showQrCode && (
                <div className={`flex items-center gap-2 shrink-0 bg-white text-slate-950 ${
                  isLandscape ? 'px-2 py-0.5 rounded-xl max-w-[145px]' : 'p-2 rounded-2xl max-w-[155px]'
                } shadow-md border border-slate-300 z-10`}>
                  {slide.qrCustomImageUrl ? (
                    <img
                      src={slide.qrCustomImageUrl}
                      alt="添付QRコード"
                      referrerPolicy="no-referrer"
                      onError={handleImageError}
                      className={`${isLandscape ? 'w-[36px] h-[36px]' : 'w-[48px] h-[48px]'} object-contain rounded-lg shrink-0`}
                    />
                  ) : qrDataUrl && !qrImgError ? (
                    <img
                      src={qrDataUrl}
                      alt="QRコード"
                      referrerPolicy="no-referrer"
                      onError={() => setQrImgError(true)}
                      className={`${isLandscape ? 'w-[36px] h-[36px]' : 'w-[48px] h-[48px]'} object-contain rounded-lg shrink-0`}
                    />
                  ) : (
                    <div className={`${isLandscape ? 'w-[36px] h-[36px]' : 'w-[48px] h-[48px]'} bg-slate-100 flex items-center justify-center rounded-lg shrink-0`}>
                      <QrCode className={`${isLandscape ? 'w-4 h-4' : 'w-6 h-6'} text-slate-800`} />
                    </div>
                  )}
                  <div className="text-[10.5px] font-bold leading-tight min-w-0 flex-1 text-slate-900 break-words whitespace-pre-line">
                    {slide?.qrCodeLabel || '読み取り'}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
