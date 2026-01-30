/**
 * Game page
 * Integrated with Run State Management System
 * Now includes Digestion Sequence and Upgrade Selection screens
 */
'use client';

export const dynamic = 'force-dynamic';
export const ssr = false;

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import GameCanvas from '@/components/GameCanvas';
import DeathScreen, { type DeathStats } from '@/components/DeathScreen';
import DigestionScreen from '@/components/DigestionScreen';
import UpgradeSelectionScreen from '@/components/UpgradeSelectionScreen';
import EvolutionScreen from '@/components/EvolutionScreen';
import { UIButton, UIPanel } from '@/components/ui';
import { EssenceManager } from '@/lib/meta/essence';
import {
  clearRunState,
  loadRunState,
  saveRunState,
  useReroll,
  applyUpgrade,
  progressToNextLevel
} from '@/lib/game/run-state';
import type { RunState } from '@/lib/game/types';

export default function GamePage() {
  const router = useRouter();
  const [showEndScreen, setShowEndScreen] = useState(false);
  const [showDeathScreen, setShowDeathScreen] = useState(false);
  const [showDigestionScreen, setShowDigestionScreen] = useState(false);
  const [showUpgradeScreen, setShowUpgradeScreen] = useState(false);
  const [showEvolutionScreen, setShowEvolutionScreen] = useState(false);
  const [deathStats, setDeathStats] = useState<DeathStats | null>(null);
  const [endScore, setEndScore] = useState(0);
  const [endEssence, setEndEssence] = useState(0);
  const [currentRunState, setCurrentRunState] = useState<RunState | null>(null);
  const [pendingLevelUps, setPendingLevelUps] = useState<string[]>([]);
  const [currentUpgradeType, setCurrentUpgradeType] = useState<string>('shallow');
  const essenceManager = new EssenceManager();

  const handleLevelComplete = () => {
    // Load current run state
    const runState = loadRunState();
    if (!runState) return;

    setCurrentRunState(runState);

    // Show digestion screen with collected essence
    setShowDigestionScreen(true);
  };

  const handleLevelUpCollected = (essenceType: string) => {
    // Add to pending level-ups queue
    setPendingLevelUps((prev) => [...prev, essenceType]);
  };

  const handleDigestionComplete = () => {
    setShowDigestionScreen(false);

    // If there are pending level-ups, show upgrade selection
    if (pendingLevelUps.length > 0) {
      setCurrentUpgradeType(pendingLevelUps[0]);
      setShowUpgradeScreen(true);
    } else {
      // No level-ups, proceed to next level
      proceedToNextLevel();
    }
  };

  const handleUpgradeSelected = (upgradeId: string) => {
    // Apply upgrade to run state
    let runState = loadRunState();
    if (!runState) return;

    runState = applyUpgrade(runState, upgradeId);
    saveRunState(runState);
    setCurrentRunState(runState);

    // Remove processed level-up
    const remainingLevelUps = pendingLevelUps.slice(1);
    setPendingLevelUps(remainingLevelUps);

    // If more level-ups pending, show next upgrade selection
    if (remainingLevelUps.length > 0) {
      setCurrentUpgradeType(remainingLevelUps[0]);
      // Screen stays open, new upgrades will be generated
    } else {
      // All upgrades selected, show evolution screen
      setShowUpgradeScreen(false);

      // Increment evolution level before showing evolution screen
      runState.evolutionLevel += 1;
      saveRunState(runState);
      setCurrentRunState(runState);

      setShowEvolutionScreen(true);
    }
  };

  const handleReroll = () => {
    const runState = loadRunState();
    if (!runState) return;

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const updated = useReroll(runState);
    if (updated) {
      saveRunState(updated);
      setCurrentRunState(updated);
    }
  };

  const handleEvolutionComplete = () => {
    setShowEvolutionScreen(false);
    proceedToNextLevel();
  };

  const proceedToNextLevel = () => {
    let runState = loadRunState();
    if (!runState) return;

    runState = progressToNextLevel(runState);
    saveRunState(runState);

    // Reset screens and reload game with new level
    setShowDigestionScreen(false);
    setShowUpgradeScreen(false);
    setShowEvolutionScreen(false);
    setPendingLevelUps([]);

    // Reload page to start next level (GameCanvas will read updated runState)
    setCurrentRunState(runState);
    window.location.reload();
  };

  const handleGameEnd = (score: number, essence: number) => {
    setEndScore(score);
    setEndEssence(essence);
    setShowEndScreen(true);
    // Run state is already cleared by GameCanvas on game over
  };

  const handleReturnToMenu = () => {
    clearRunState();
    router.push('/');
  };

  const handleContinue = () => {
    router.push('/');
  };

  const handlePlayAgain = () => {
    // Clear run state to start fresh
    clearRunState();
    setShowEndScreen(false);
    setShowDeathScreen(false);
    setDeathStats(null);
    window.location.reload();
  };

  return (
    <div className="relative w-full h-screen bg-black">
      <GameCanvas
        onGameEnd={handleGameEnd}
        onGameOver={(stats) => {
          setDeathStats(stats);
          setShowDeathScreen(true);
          clearRunState();
        }}
        onLevelComplete={handleLevelComplete}
      />


      {/* Death Screen */}
      {showDeathScreen && deathStats && (
        <DeathScreen stats={deathStats} onReturnToMenu={handleReturnToMenu} />
      )}

      {/* Digestion Screen */}
      {showDigestionScreen && currentRunState && (
        <DigestionScreen
          collectedEssence={currentRunState.collectedEssence}
          onLevelUpCollected={handleLevelUpCollected}
          onComplete={handleDigestionComplete}
        />
      )}

      {/* Upgrade Selection Screen */}
      {showUpgradeScreen && currentRunState && (
        <UpgradeSelectionScreen
          essenceType={currentUpgradeType}
          rerollsRemaining={currentRunState.rerollsRemaining}
          onUpgradeSelected={handleUpgradeSelected}
          onReroll={handleReroll}
        />
      )}

      {/* Evolution Screen */}
      {showEvolutionScreen && currentRunState && (
        <EvolutionScreen
          runState={currentRunState}
          selectedUpgrades={currentRunState.selectedUpgrades}
          onContinue={handleEvolutionComplete}
        />
      )}

      {/* Level Complete Screen */}
      {showEndScreen && !showDeathScreen && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
          <UIPanel variant="cyan" className="max-w-md w-full mx-4 bg-gradient-to-br from-blue-900 to-indigo-900">
            <h2 className="text-3xl font-bold text-white mb-4 text-center dv-title">Run Complete!</h2>
            <div className="space-y-4 mb-6">
              <div className="flex justify-between">
                <span className="text-blue-200">Score:</span>
                <span className="text-white font-bold">{endScore.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-200">Essence Earned:</span>
                <span className="text-yellow-400 font-bold">+{endEssence}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-200">Total Essence:</span>
                <span className="text-yellow-400 font-bold">{essenceManager.getAmount().toLocaleString()}</span>
              </div>
            </div>
            <div className="flex gap-4">
              <UIButton
                variant="secondary"
                onClick={handleContinue}
                className="flex-1"
              >
                Continue
              </UIButton>
              <UIButton
                variant="primary"
                onClick={handlePlayAgain}
                className="flex-1"
              >
                Play Again
              </UIButton>
            </div>
          </UIPanel>
        </div>
      )}
    </div>
  );
}
