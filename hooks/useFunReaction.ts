
import { useState, useCallback } from 'react';
import { doc, getDoc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { REACTION_TEMPLATES, getRandomMessage } from '../lib/reactions';
import { Transaction } from '../types';
import { useReaction } from '../components/providers/ReactionProvider';

// 1 Hour Cooldown between reactions to prevent annoyance
const COOLDOWN_MS = 60 * 60 * 1000; 

export const useFunReaction = (uid: string) => {
  const { showReaction } = useReaction();

  const checkAndTrigger = useCallback(async (
    transaction: Partial<Transaction> | null,
    context: {
      netWorth?: number;
      totalAssets?: number;
      totalDebt?: number;
    }
  ) => {
    if (!uid) return;

    try {
      console.log(`[FunReaction] Checking triggers for user ${uid}...`);
      
      // 1. Fetch User Settings & History
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        console.log("[FunReaction] User doc not found.");
        return;
      }
      const userData = userSnap.data();

      // B1: Check if Fun Mode is enabled (Default to true if undefined, or specific field)
      if (userData.funMode === false) {
        console.log("[FunReaction] Fun mode disabled.");
        return; 
      }

      // B2: Frequency Capping
      const lastReactionTime = userData.lastReactionAt ? new Date(userData.lastReactionAt).getTime() : 0;
      const now = Date.now();
      if (now - lastReactionTime < COOLDOWN_MS) {
        console.log("[FunReaction] Cooldown active. Skipping.");
        return; 
      }

      let matchedTemplateId: string | null = null;

      // B3 & B4: Logic Engine & Context Checks
      
      // --- Scenario A: Transaction Based (Expense/Asset) ---
      if (transaction) {
        const amt = Number(transaction.amount || 0);
        const cat = transaction.category || '';
        const note = (transaction.note || '').toLowerCase();
        
        console.log(`[FunReaction] Analyzing transaction: ${cat} - ${amt}`);

        // High Expense Coffee
        // Context: Only if Net Worth < 5 Billion VND (Rich people don't care about 70k)
        const isRich = (context.netWorth || 0) > 5000000000; 
        
        // Extended Regex for Vietnamese coffee/tea culture
        const coffeeRegex = /cafe|cà phê|coffee|starbucks|highlands|phúc long|katinat|phê la|trà sữa|milktea/i;
        
        if (!isRich && (cat === 'Dining' || cat === 'Enjoyment') && coffeeRegex.test(note)) {
           if (amt > 70000) matchedTemplateId = 'HIGH_EXPENSE_COFFEE';
        }

        // High Expense Meal
        const foodRegex = /ăn|bữa|nhậu|buffet|dining|dinner|lunch/i;
        if (!isRich && cat === 'Dining' && foodRegex.test(note) && amt > 1000000) {
           matchedTemplateId = 'HIGH_EXPENSE_MEAL';
        }

        // First Asset
        if (transaction.type === 'ASSET_BUY' || transaction.type === 'ASSET_INVESTMENT') {
           // If previously total assets were near zero (heuristic)
           if ((context.totalAssets || 0) < 1000000) {
              matchedTemplateId = 'FIRST_ASSET';
           }
        }
      } 
      
      // --- Scenario B: State Based (Dashboard Load) ---
      else {
         // Debt King: Debt > 50% Assets
         if (context.totalAssets && context.totalDebt) {
            const ratio = context.totalAssets > 0 ? context.totalDebt / context.totalAssets : 0;
            if (ratio > 0.5) matchedTemplateId = 'DEBT_KING';
         }
      }

      // Execute Trigger
      if (matchedTemplateId) {
        console.log(`[FunReaction] Triggered: ${matchedTemplateId}`);
        const template = REACTION_TEMPLATES.find(t => t.trigger_type === matchedTemplateId);
        
        if (template) {
          const msg = getRandomMessage(template);
          
          // Trigger Global Reaction (UI)
          showReaction(msg, template.mood);

          // Log History & Update Cooldown (Database)
          // We wrap this in a separate try/catch so UI isn't affected by permission errors
          try {
            await updateDoc(userRef, { lastReactionAt: new Date().toISOString() });
            await addDoc(collection(db, 'users', uid, 'reaction_logs'), {
               trigger: matchedTemplateId,
               message: msg,
               timestamp: new Date().toISOString(),
               transactionId: transaction?.id || null
            });
            console.log("[FunReaction] Logged to database.");
          } catch (writeErr: any) {
            // Suppress permission errors for Viewers, log others
            if (writeErr.code === 'permission-denied') {
               console.warn("[FunReaction] Could not log reaction (Permission Denied). This is expected for Viewers.");
            } else {
               console.error("[FunReaction] Failed to log reaction:", writeErr);
            }
          }
        }
      } else {
        console.log("[FunReaction] No trigger matched.");
      }

    } catch (err) {
      console.error("FunReaction Error:", err);
    }
  }, [uid, showReaction]);

  return { checkAndTrigger };
};
