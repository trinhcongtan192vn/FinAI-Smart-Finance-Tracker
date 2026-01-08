
import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const useTransactionLimit = (uid: string) => {
  const [limit, setLimit] = useState<number>(300);
  const [currentUsage, setCurrentUsage] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;

    const userRef = doc(db, 'users', uid);

    // Listen to user profile changes directly
    // This is much cheaper than counting transactions in a collection
    const unsub = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const userLimit = data.monthlyTransactionLimit ?? 300;

        // Check stored usage
        const usageData = data.transactionUsage || { month: '', count: 0 };
        const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"

        // If the stored month matches current month, use the count. Otherwise 0.
        const effectiveCount = usageData.month === currentMonth ? usageData.count : 0;

        setLimit(userLimit);
        setCurrentUsage(effectiveCount);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching transaction limit profile:", error);
      setLoading(false);
    });

    return () => unsub();
  }, [uid]);

  return {
    currentUsage,
    limit,
    isLimitReached: limit > -1 && currentUsage >= limit,
    loading
  };
};
