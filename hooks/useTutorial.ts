
import { useState, useEffect, useCallback } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { TutorialStep } from '../components/ui/TutorialOverlay';
import { TutorialState } from '../types';

const HOME_STEPS: TutorialStep[] = [
  {
    targetId: 'nav-new-entry',
    title: 'Chat với AI',
    content: 'Chỉ cần nhập "Ăn trưa 50k" hoặc "Lương 20tr", AI sẽ tự động phân loại và ghi sổ giúp bạn.',
    position: 'top'
  }
];

const ASSETS_STEPS: TutorialStep[] = [
  {
    targetId: 'assets-overview',
    title: 'Tổng quan Tài sản',
    content: 'Xem tổng giá trị ròng (Net Worth) và phân bổ danh mục đầu tư của bạn.',
    position: 'bottom'
  }
];

const CAPITAL_STEPS: TutorialStep[] = [
  {
    targetId: 'capital-overview',
    title: 'Cấu trúc Vốn',
    content: 'Kiểm soát tỷ lệ đòn bẩy tài chính và quản lý rủi ro nợ vay.',
    position: 'bottom'
  }
];

const ADVISOR_STEPS: TutorialStep[] = [
  {
    targetId: 'advisor-settings-btn',
    title: 'Hồ sơ Tài chính',
    content: 'Cập nhật khẩu vị rủi ro và mục tiêu tài chính tại đây để AI tư vấn chính xác hơn.',
    position: 'bottom'
  }
];

export const useTutorial = (uid: string, tutorialState?: TutorialState) => {
  const [activeSteps, setActiveSteps] = useState<TutorialStep[] | null>(null);
  const [flowKey, setFlowKey] = useState<keyof TutorialState | null>(null);

  const triggerHome = useCallback(() => {
    if (tutorialState && !tutorialState.hasSeenHome) {
      setActiveSteps(HOME_STEPS);
      setFlowKey('hasSeenHome');
    }
  }, [tutorialState]);

  const triggerAssets = useCallback(() => {
    if (tutorialState && !tutorialState.hasSeenAssets) {
      setActiveSteps(ASSETS_STEPS);
      setFlowKey('hasSeenAssets');
    }
  }, [tutorialState]);

  const triggerCapital = useCallback(() => {
    if (tutorialState && !tutorialState.hasSeenCapital) {
      setActiveSteps(CAPITAL_STEPS);
      setFlowKey('hasSeenCapital');
    }
  }, [tutorialState]);

  const triggerAdvisor = useCallback(() => {
    if (tutorialState && !tutorialState.hasSeenAdvisor) {
      setActiveSteps(ADVISOR_STEPS);
      setFlowKey('hasSeenAdvisor');
    }
  }, [tutorialState]);

  const completeTutorial = async () => {
    setActiveSteps(null);
    if (uid && flowKey) {
      try {
        await updateDoc(doc(db, 'users', uid), {
          [`tutorialState.${flowKey}`]: true
        });
      } catch (e) {
        console.error("Failed to save tutorial state", e);
      }
    }
  };

  const skipTutorial = async () => {
    // If skipped, we mark as seen so it doesn't annoy user again
    await completeTutorial();
  };

  return {
    activeSteps,
    triggerHome,
    triggerAssets,
    triggerCapital,
    triggerAdvisor,
    completeTutorial,
    skipTutorial
  };
};
