import { useState, useEffect, useRef } from 'react';
import { StepNumber, SignageFolder, AppError, SignageSlide } from './types';
import { WIZARD_STEPS } from './data/wizardSteps';
import { StepNavigation } from './components/StepNavigation';
import { SignageWizard } from './components/SignageWizard';
import { PreviewPanel } from './components/PreviewPanel';
import { FullscreenPlayer } from './components/FullscreenPlayer';
import { ErrorAlertModal } from './components/ErrorAlertModal';
import { useOrientation } from './hooks/useOrientation';
import { useSignageFolders } from './hooks/useSignageFolders';
import { useSignageEditor } from './hooks/useSignageEditor';
import { 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Edit3, 
  MonitorPlay
} from 'lucide-react';

export default function App() {
  // グローバルエラー管理（原因と解決方法を明示）
  const [globalError, setGlobalError] = useState<AppError | null>(null);

  // 画面の向き＆デバイス判定フック
  const { windowWidth } = useOrientation();

  // 現在のステップ番号（WIZARD_STEPSの総数に連動）
  const [currentStepNumber, setCurrentStepNumber] = useState<StepNumber>(1);
  const totalSteps = WIZARD_STEPS.length;

  // 全画面サイネージプレイヤー状態
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [fullscreenSlides, setFullscreenSlides] = useState<SignageSlide[]>([]);

  // スマホ縦画面時専用の切り替えタブ（'edit' | 'preview'）
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit');

  // フォルダ管理カスタムフック
  const {
    folders,
    activeFolderId,
    activeFolder,
    setActiveFolderId,
    createFolder,
    deleteFolder,
    duplicateFolder,
    saveFolderSlides,
  } = useSignageFolders(setGlobalError);

  // 看板スライド編集カスタムフック
  const {
    slides,
    currentSlide,
    currentSlideIndex,
    setCurrentSlideIndex,
    isPlaying,
    setIsPlaying,
    replayKey,
    replayAnimation,
    updateCurrentSlide,
    applyTemplate,
    addSlide,
    deleteSlide,
    duplicateSlide,
    selectedTextTarget,
    setSelectedTextTarget,
    applyQuickFont,
    loadSlides,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useSignageEditor(setGlobalError);

  // 初回マウント時：選択中フォルダのスライドをエディタに同期ロード
  useEffect(() => {
    if (activeFolder && activeFolder.slides.length > 0) {
      loadSlides(activeFolder.slides);
    }
  }, []);

  // 1つ変えたら自動保存（Auto-save）
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const isInitialMount = useRef(true);
  const lastSavedJsonRef = useRef<string>('');
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const currentJson = JSON.stringify(slides);

    // 初回マウント時はスライドの初期JSONを記録して自動保存をスキップ
    if (isInitialMount.current) {
      isInitialMount.current = false;
      lastSavedJsonRef.current = currentJson;
      return;
    }

    // 内容が変わっていなければ自動保存しない
    if (currentJson === lastSavedJsonRef.current) {
      return;
    }

    if (activeFolderId) {
      setIsSaving(true);
      setIsSaved(false);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);

      const timer = setTimeout(() => {
        saveFolderSlides(activeFolderId, slides);
        lastSavedJsonRef.current = currentJson;
        setIsSaving(false);
        setIsSaved(true);

        savedTimerRef.current = setTimeout(() => {
          setIsSaved(false);
        }, 1200);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [slides, activeFolderId, saveFolderSlides]);

  // 手動上書き保存ハンドラ
  const handleSaveOverwrite = () => {
    if (!activeFolderId) return;
    const success = saveFolderSlides(activeFolderId, slides);
    if (success) {
      lastSavedJsonRef.current = JSON.stringify(slides);
      setIsSaving(false);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 1200);
    }
  };

  // 新規フォルダ作成
  const handleCreateFolder = (name: string, templateSlide?: Partial<SignageSlide>) => {
    const result = createFolder(name, templateSlide);
    if (result) {
      lastSavedJsonRef.current = JSON.stringify([result.initialSlide]);
      setIsSaving(false);
      setIsSaved(false);
      loadSlides([result.initialSlide]);
      setCurrentSlideIndex(0);
      setCurrentStepNumber(2);
    }
  };

  // フォルダを開いて編集
  const handleOpenFolder = (folder: SignageFolder) => {
    lastSavedJsonRef.current = JSON.stringify(folder.slides);
    setIsSaving(false);
    setIsSaved(false);
    setActiveFolderId(folder.id);
    loadSlides(folder.slides);
    setCurrentSlideIndex(0);
    setCurrentStepNumber(2);
  };

  // フォルダ削除ハンドラ（アクティブフォルダ削除時は確実にスライドを同期破棄または切り替え）
  const handleDeleteFolder = (folderId: string) => {
    deleteFolder(folderId);
    if (activeFolderId === folderId) {
      const remainingFolders = folders.filter((f) => f.id !== folderId);
      if (remainingFolders.length > 0) {
        const nextFolder = remainingFolders[0];
        setActiveFolderId(nextFolder.id);
        loadSlides(nextFolder.slides);
        setCurrentSlideIndex(0);
        lastSavedJsonRef.current = JSON.stringify(nextFolder.slides);
      } else {
        setActiveFolderId(null);
        loadSlides([]);
        setFullscreenSlides([]);
        setCurrentSlideIndex(0);
        lastSavedJsonRef.current = '';
        setCurrentStepNumber(1);
      }
    }
  };

  // 全画面再生
  const handleOpenFullscreen = () => {
    if (!activeFolderId || slides.length === 0) return;
    setFullscreenSlides(slides);
    setIsFullscreen(true);
  };

  // 選択中の形式に応じて利用不可のステップ
  const disabledSteps: StepNumber[] =
    currentSlide?.layoutStyle === 'card-grid'
      ? [8]
      : currentSlide?.layoutStyle === 'poster-hero'
      ? [5, 11]
      : currentSlide?.layoutStyle === 'media-only'
      ? [8, 9, 10, 11, 14]
      : [];

  const disabledStepReasons: Partial<Record<StepNumber, string>> = {
    5: 'ポスター形式では「5. 背景」は選択できません',
    8: 'タイル形式・背景画像専用では「8. 写真・画像」は選択できません',
    9: '背景画像・映像専用では「9. タイトル」は選択できません',
    10: '背景画像・映像専用では「10. 説明やキャッチフレーズ」は選択できません',
    11: 'ポスター形式・背景画像専用では「11. メニュー」は選択できません',
    14: '背景画像・映像専用では「14. 文字のアニメーション」は選択できません',
  };

  const wizardContainerRef = useRef<HTMLDivElement>(null);

  // 画面および編集エリアの最上部へ自動スクロール
  const scrollToTop = (behavior: ScrollBehavior = 'smooth') => {
    window.scrollTo({ top: 0, behavior });
    document.documentElement.scrollTo({ top: 0, behavior });
    document.body.scrollTo({ top: 0, behavior });
    if (wizardContainerRef.current) {
      wizardContainerRef.current.scrollTo({ top: 0, behavior });
    }
  };

  // ステップが切り替わったら確実に画面最上部に自動遷移
  useEffect(() => {
    scrollToTop('smooth');
    // レンダリング遅延後にも再度確実に最上部へ
    const timer = setTimeout(() => {
      scrollToTop('smooth');
    }, 50);
    return () => clearTimeout(timer);
  }, [currentStepNumber]);

  // 前のページへ戻る（無効ステップは自動スキップ）
  const handlePrevStep = () => {
    setCurrentStepNumber((prev) => {
      let next = prev - 1;
      while (next > 1 && disabledSteps.includes(next as StepNumber)) {
        next -= 1;
      }
      return Math.max(1, next) as StepNumber;
    });
    scrollToTop('smooth');
  };

  // 次のページへ進む（無効ステップは自動スキップ）
  const handleNextStep = () => {
    if (currentStepNumber === 1 && !activeFolderId) {
      // 看板未作成・未選択時は進めない
      return;
    }
    let next = currentStepNumber + 1;
    while (next <= totalSteps && disabledSteps.includes(next as StepNumber)) {
      next += 1;
    }
    if (next <= totalSteps) {
      setCurrentStepNumber(next as StepNumber);
    } else {
      // 最終ステップで「全画面で再生」
      handleOpenFullscreen();
    }
    scrollToTop('smooth');
  };

  // レスポンシブ幅判定：PCは大画面2ペイン、タブレット・スマホは縦並びまたはタブ切替
  const isWideLayout = windowWidth >= 1020;

  return (
    <div className="min-h-screen w-full bg-white text-slate-900 flex flex-col font-sans select-none">
      {/* 
        上部ヘッダー：
        ・左上看板ボタンから○枚目を直接選べるドロップダウン
        ・常に最上部に表示される Undo/Redo 矢印ボタン
        ・ただの数字（1, 2, 3... 16）の横スライドナビゲーション（看板作成前は2〜16番は選択不可）
      */}
      <StepNavigation
        currentStepNumber={currentStepNumber}
        totalSteps={totalSteps}
        onSelectStepNumber={(num) => {
          if (!activeFolderId && num > 1) return;
          if (disabledSteps.includes(num)) return;
          setCurrentStepNumber(num);
        }}
        onOpenFullscreen={handleOpenFullscreen}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
        onSaveOverwrite={handleSaveOverwrite}
        isSaving={isSaving}
        isSaved={isSaved}
        currentSlideIndex={currentSlideIndex}
        slidesCount={slides.length}
        isFolderReady={!!activeFolderId && slides.length > 0}
        onSelectSlideIndex={setCurrentSlideIndex}
        onAddSlide={addSlide}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        onDeleteSlide={deleteSlide}
        onDuplicateSlide={duplicateSlide}
        disabledSteps={disabledSteps}
        disabledStepReasons={disabledStepReasons}
      />



      {/* 
        メインコンテンツエリア：
        - 1024px以上 (LG): 左右2ペイン（エディタ ＆ プレビュー）
        - 768px〜1024px (MD): 縦に並べて両方表示
        - 768px以下 (SM): タブ切り替え（エディタ or プレビュー）
      */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-3 sm:p-5 pb-28">
        <div className={`flex flex-col ${isWideLayout ? 'lg:flex-row' : ''} gap-6 h-full min-h-0`}>
          {/* 左側 / 上部：1ページ1項目の選択画面（SignageWizard） */}
          <div ref={wizardContainerRef} className="flex-1 min-h-0 overflow-y-auto">
            <SignageWizard
              currentStepNumber={currentStepNumber}
              currentSlide={currentSlide}
              currentSlideIndex={currentSlideIndex}
              slides={slides}
              folders={folders}
              activeFolderId={activeFolderId}
              activeFolderName={activeFolder?.name}
              onUpdateSlide={updateCurrentSlide}
              onApplyTemplate={applyTemplate}
              onAddSlide={addSlide}
              onDeleteSlide={deleteSlide}
              onDuplicateSlide={duplicateSlide}
              onSelectSlideIndex={setCurrentSlideIndex}
              onCreateFolder={handleCreateFolder}
              onDeleteFolder={handleDeleteFolder}
              onDuplicateFolder={duplicateFolder}
              onOpenFolder={handleOpenFolder}
              onOpenFullscreen={handleOpenFullscreen}
              onGoToStep={(num) => setCurrentStepNumber(num)}
              onError={(err) => setGlobalError(err)}
            />
          </div>

          {/* 右側 / 下部：看板プレビュー */}
          <div className={`${isWideLayout ? 'lg:w-[380px] xl:w-[440px]' : 'w-full max-w-2xl mx-auto'} flex flex-col shrink-0 min-h-[500px]`}>
              <div className={`${isWideLayout ? 'sticky top-16 h-[calc(100vh-140px)]' : 'h-full'} flex flex-col`}>
                {activeFolderId ? (
                  <PreviewPanel
                    currentSlide={currentSlide}
                    slidesCount={slides.length}
                    currentSlideIndex={currentSlideIndex}
                    onSelectSlideIndex={setCurrentSlideIndex}
                    replayKey={replayKey}
                    onReplayAnimation={replayAnimation}
                    selectedTextTarget={selectedTextTarget}
                    onSelectTextTarget={setSelectedTextTarget}
                    onApplyQuickFont={applyQuickFont}
                  />
                ) : (
                  <div className="flex-1 bg-slate-50 rounded-3xl border border-slate-200 flex flex-col items-center justify-center p-6 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center">
                      <Eye className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-black text-slate-500">
                      看板が選択されていません
                    </span>
                    <p className="text-xs text-slate-400">
                      上のフォームから看板を作成または選択すると、ここにプレビューが表示されます。
                    </p>
                  </div>
                )}
          </div>
        </div>
      </div>
    </main>

      {/* 
        最下部固定フッターバー（シニア向け）：
        「ページ ◯ / 14」の大きな表示 ＆ 「← まえへ」「つぎへ →」の大きなボタン
      */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t-2 border-slate-200 shadow-xl px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          {/* まえへ ボタン */}
          <button
            type="button"
            onClick={handlePrevStep}
            disabled={currentStepNumber === 1}
            className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl font-black text-sm sm:text-base flex items-center gap-1.5 transition-all cursor-pointer border ${
              currentStepNumber === 1
                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-50'
                : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300 shadow-xs active:scale-95'
            }`}
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
            <span>まえへ</span>
          </button>

          {/* 中央：大きなページ数表示 */}
          <div className="text-center">
            <span className="text-xs sm:text-sm font-bold text-slate-500 block">
              現在の進み具合
            </span>
            <div className="text-lg sm:text-2xl font-black text-slate-900 font-mono tracking-tight">
              ページ <span className="text-blue-600 text-xl sm:text-3xl">{currentStepNumber}</span> / {totalSteps}
            </div>
          </div>

          {/* つぎへ ボタン */}
          <button
            type="button"
            onClick={handleNextStep}
            disabled={currentStepNumber === 1 && !activeFolderId}
            title={currentStepNumber === 1 && !activeFolderId ? '看板の名前を入力して新しく作成してください' : ''}
            className={`px-5 sm:px-7 py-2.5 sm:py-3 rounded-2xl font-black text-sm sm:text-base flex items-center gap-1.5 transition-all shadow-md active:scale-95 text-white ${
              currentStepNumber === 1 && !activeFolderId
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-60 shadow-none'
                : currentStepNumber === totalSteps
                ? 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer'
                : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
            }`}
          >
            <span>
              {currentStepNumber === 1 && !activeFolderId
                ? '看板を作ると進めます'
                : currentStepNumber === totalSteps
                ? '全画面で再生'
                : 'つぎへ'}
            </span>
            {currentStepNumber === totalSteps ? (
              <MonitorPlay className="w-5 h-5 stroke-[2.5]" />
            ) : (
              <ChevronRight className="w-5 h-5 stroke-[2.5]" />
            )}
          </button>
        </div>
      </footer>

      {/* 全画面サイネージプレイヤー */}
      {isFullscreen && (
        <FullscreenPlayer
          slides={fullscreenSlides.length > 0 ? fullscreenSlides : slides}
          initialIndex={0}
          onClose={() => setIsFullscreen(false)}
        />
      )}

      {/* エラーアラートモーダル */}
      <ErrorAlertModal
        error={globalError}
        onClose={() => setGlobalError(null)}
      />
    </div>
  );
}
