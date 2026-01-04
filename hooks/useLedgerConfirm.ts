
import { useState } from 'react';
import { collection, writeBatch, doc, increment, getDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Transaction, Account, TransactionType, InvestmentLog } from '../types';
import { calculateNewWAC, calculateRealizedPnL } from '../lib/utils';

export const useLedgerConfirm = (
  uid: string, 
  accounts: Account[], 
  onSuccess: () => void,
  checkReaction?: (tx: Transaction | null, ctx: any) => void
) => {
  const [isSaving, setIsSaving] = useState(false);

  const confirmTransactions = async (
    pendingTransactions: Transaction[], 
    selectedIds: Set<string>
  ) => {
    if (!auth.currentUser || isSaving) return;
    
    if (selectedIds.size > 150) {
      alert("Để đảm bảo an toàn dữ liệu, vui lòng chọn tối đa 150 giao dịch mỗi lần.");
      return;
    }

    setIsSaving(true);
    const batch = writeBatch(db);
    
    try {
      const now = new Date().toISOString();
      const dateOnly = now.split('T')[0];
      const currentMonth = now.slice(0, 7); // YYYY-MM

      let currentAccounts = [...accounts];

      // Prepare context for AI Reaction (Calculate rough Net Worth)
      const totalAssets = currentAccounts.filter(a => a.group === 'ASSETS').reduce((s, a) => s + (a.current_balance || 0), 0);
      const totalDebt = currentAccounts.filter(a => a.group === 'CAPITAL' && a.category !== 'Equity Fund').reduce((s, a) => s + (a.current_balance || 0), 0);
      const netWorth = totalAssets - totalDebt;

      const getOrCreateAccountSync = (category: string, name: string, group: 'ASSETS' | 'CAPITAL') => {
        let acc = currentAccounts.find(a => a.name === name && a.category === category && a.group === group);
        if (!acc) {
            acc = currentAccounts.find(a => a.category === category && a.group === group);
        }
        if (acc) return acc.id;

        const accRef = doc(collection(db, 'users', uid, 'accounts'));
        const newAcc = {
            id: accRef.id,
            name: name,
            group: group,
            category: category,
            current_balance: 0,
            status: 'ACTIVE' as const,
            createdAt: now,
            color_code: group === 'CAPITAL' ? '#4F46E5' : null
        };
        batch.set(accRef, newAcc);
        currentAccounts.push(newAcc as any);
        return accRef.id;
      };

      const defaultCashWalletId = getOrCreateAccountSync('Cash', 'Cash Wallet', 'ASSETS');
      const defaultEquityFundId = getOrCreateAccountSync('Equity Fund', 'Spending Fund', 'CAPITAL');

      const pendingTxs = pendingTransactions.filter(t => selectedIds.has(t.id));
      
      // OPTIMIZATION: Update Transaction Count
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data();
      const usageMetadata = userData?.transactionUsage || { month: '', count: 0 };
      
      const newCount = usageMetadata.month === currentMonth 
          ? increment(pendingTxs.length) 
          : pendingTxs.length;
      
      batch.update(userRef, {
          'transactionUsage.month': currentMonth,
          'transactionUsage.count': newCount
      });

      // We will try to trigger reaction on the largest expense in this batch
      let maxExpenseTx: Transaction | null = null;

      for (const t of pendingTxs) {
        if (t.group === 'EXPENSES' && (!maxExpenseTx || Number(t.amount) > Number(maxExpenseTx.amount))) {
            maxExpenseTx = t;
        }

        let debitId = '';
        let creditId = '';
        let assetLinkId = '';
        let linkedFundId = null;
        let investmentUpdate: any = null;
        const amt = Number(t.amount);

        const getOrCreateNamedAccount = (name: string, group: 'ASSETS' | 'CAPITAL', category: string) => {
           const existing = currentAccounts.find(a => a.name.toLowerCase() === name.toLowerCase() && a.group === group);
           if (existing) return existing.id;
           
           const newRef = doc(collection(db, 'users', uid, 'accounts'));
           const newAcc = { id: newRef.id, name, group, category, current_balance: 0, status: 'ACTIVE' as const, createdAt: now };
           batch.set(newRef, newAcc);
           currentAccounts.push(newAcc as any);
           return newRef.id;
        };

        switch (t.type) {
            case TransactionType.CREDIT_SPENDING: {
                // Debit: Expense (Spending Fund decreases equity)
                // Credit: Credit Card Liability (Increases)
                debitId = defaultEquityFundId; 
                creditId = t.credit_account_id; 
                if (!creditId) {
                    // Fallback if credit ID missing
                    const firstCC = currentAccounts.find(a => a.category === 'Credit Card');
                    creditId = firstCC ? firstCC.id : getOrCreateNamedAccount('Default Credit Card', 'CAPITAL', 'Credit Card');
                }
                break;
            }

            case TransactionType.ASSET_BUY: {
                creditId = t.credit_account_id || defaultCashWalletId;
                debitId = getOrCreateNamedAccount(t.to_account_name || t.note || 'New Asset', 'ASSETS', t.category || 'Stocks');
                assetLinkId = debitId;

                const targetAcc = currentAccounts.find(a => a.id === debitId);
                const currentDetails = targetAcc?.investment_details || { total_units: 0, avg_price: 0, market_price: t.price || 0, symbol: targetAcc?.name || '', currency: 'VND' };
                const units = Number(t.units || 0);
                const price = Number(t.price || 0);
                const fees = Number(t.fees || 0);
                
                if (units > 0) {
                    const newWac = calculateNewWAC(currentDetails.total_units, currentDetails.avg_price, units, price, fees);
                    const newLog: InvestmentLog = { id: crypto.randomUUID(), date: t.date || dateOnly, type: 'BUY', units, price, fees, note: t.note };
                    
                    investmentUpdate = {
                        investment_details: {
                            ...currentDetails,
                            total_units: currentDetails.total_units + units,
                            avg_price: newWac,
                            market_price: price,
                            last_sync: now
                        },
                        investment_logs: [...(targetAcc?.investment_logs || []), newLog]
                    };
                }
                break;
            }
            
            case TransactionType.ASSET_SELL: {
                debitId = t.debit_account_id || defaultCashWalletId;
                creditId = getOrCreateNamedAccount(t.from_account_name || 'Asset Account', 'ASSETS', t.category || 'Stocks');
                assetLinkId = creditId;

                const targetAcc = currentAccounts.find(a => a.id === creditId);
                const fundToImpact = targetAcc?.linked_fund_id || defaultEquityFundId;

                if (targetAcc && targetAcc.investment_details) {
                    const units = Number(t.units || 0);
                    const price = Number(t.price || 0);
                    const fees = Number(t.fees || 0);
                    const avgPrice = targetAcc.investment_details.avg_price;
                    
                    const profit = calculateRealizedPnL(units, price, avgPrice, fees);
                    const newLog: InvestmentLog = { id: crypto.randomUUID(), date: t.date || dateOnly, type: 'SELL', units, price, fees, note: t.note };
                    
                    investmentUpdate = {
                        investment_details: {
                            ...targetAcc.investment_details,
                            total_units: Math.max(0, targetAcc.investment_details.total_units - units),
                            market_price: price,
                            last_sync: now
                        },
                        realized_pnl: increment(profit),
                        investment_logs: [...(targetAcc?.investment_logs || []), newLog]
                    };

                    if (profit !== 0) {
                        batch.update(doc(db, 'users', uid, 'accounts', fundToImpact), {
                            current_balance: increment(profit)
                        });
                    }
                }
                break;
            }
                
            case TransactionType.ASSET_REVALUATION: {
                const isGain = amt >= 0;
                const targetAccId = getOrCreateNamedAccount(t.to_account_name || 'Asset', 'ASSETS', t.category || 'Stocks');
                const targetAcc = currentAccounts.find(a => a.id === targetAccId);
                const fundToImpact = targetAcc?.linked_fund_id || defaultEquityFundId;

                debitId = isGain ? targetAccId : fundToImpact;
                creditId = isGain ? fundToImpact : targetAccId;
                assetLinkId = targetAccId;

                if (targetAcc && targetAcc.investment_details) {
                    const newMarketPrice = Number(t.price || targetAcc.investment_details.market_price);
                    const newLog: InvestmentLog = { id: crypto.randomUUID(), date: t.date || dateOnly, type: 'REVALUE', units: targetAcc.investment_details.total_units, price: newMarketPrice, note: t.note };
                    
                    investmentUpdate = {
                        investment_details: {
                            ...targetAcc.investment_details,
                            market_price: newMarketPrice,
                            last_sync: now
                        },
                        unrealized_pnl: increment(amt),
                        investment_logs: [...(targetAcc?.investment_logs || []), newLog]
                    };
                }
                break;
            }

            case TransactionType.INITIAL_BALANCE:
            case TransactionType.CAPITAL_INJECTION:
                creditId = t.credit_account_id || defaultEquityFundId;
                debitId = t.debit_account_id || defaultCashWalletId;
                assetLinkId = debitId;
                break;

            case TransactionType.INTERNAL_TRANSFER:
                creditId = t.credit_account_id || getOrCreateNamedAccount(t.from_account_name || 'Source Wallet', 'ASSETS', 'Cash');
                debitId = t.debit_account_id || getOrCreateNamedAccount(t.to_account_name || 'Target Wallet', 'ASSETS', 'Cash');
                break;

            case TransactionType.FUND_ALLOCATION:
                creditId = t.credit_account_id || getOrCreateNamedAccount(t.from_account_name || 'General Fund', 'CAPITAL', 'Equity Fund');
                debitId = t.debit_account_id || getOrCreateNamedAccount(t.to_account_name || 'Specific Fund', 'CAPITAL', 'Equity Fund');
                break;

            case TransactionType.BORROWING:
                debitId = t.debit_account_id || defaultCashWalletId;
                creditId = t.credit_account_id || getOrCreateNamedAccount(t.from_account_name || t.note || 'Lender', 'CAPITAL', 'Liability');
                assetLinkId = creditId;
                break;

            case TransactionType.DEBT_REPAYMENT:
                debitId = t.debit_account_id || getOrCreateNamedAccount(t.to_account_name || t.note || 'Loan Account', 'CAPITAL', 'Liability');
                creditId = t.credit_account_id || defaultCashWalletId;
                assetLinkId = debitId;
                break;

            case TransactionType.LENDING:
                debitId = t.debit_account_id || getOrCreateNamedAccount(t.to_account_name || t.note || 'Debtor', 'ASSETS', 'Receivables');
                creditId = t.credit_account_id || defaultCashWalletId;
                assetLinkId = debitId;
                break;

            case TransactionType.INTEREST_LOG:
                if (t.group === 'INCOME') {
                    debitId = t.debit_account_id || defaultCashWalletId;
                    creditId = t.credit_account_id || defaultEquityFundId;
                } else {
                    debitId = t.debit_account_id || defaultEquityFundId;
                    creditId = t.credit_account_id || defaultCashWalletId;
                }
                break;

            case TransactionType.DAILY_CASHFLOW:
            default:
                if (t.group === 'INCOME') {
                  debitId = t.debit_account_id || defaultCashWalletId;
                  creditId = t.credit_account_id || defaultEquityFundId;
                } else {
                  debitId = t.debit_account_id || defaultEquityFundId;
                  // If credit account is manually set (e.g. source change), use it, else default cash
                  creditId = t.credit_account_id || defaultCashWalletId;
                }
                break;
        }

        const ledgerRef = doc(collection(db, 'users', uid, 'transactions'));
        batch.set(ledgerRef, {
            ...t,
            id: ledgerRef.id,
            date: t.date || dateOnly,
            datetime: t.datetime || t.date || now,
            debit_account_id: debitId,
            credit_account_id: creditId,
            asset_link_id: assetLinkId || null,
            linked_fund_id: linkedFundId || null,
            category: t.category || 'Other',
            status: 'confirmed',
            createdAt: now,
            addedBy: auth.currentUser?.email || null
        });

        const debitAcc = currentAccounts.find(a => a.id === debitId);
        const creditAcc = currentAccounts.find(a => a.id === creditId);

        if (debitAcc) {
          const change = debitAcc.group === 'ASSETS' ? amt : -amt;
          const updateData: any = { 
            current_balance: increment(change),
            updatedAt: now
          };
          if (investmentUpdate && debitId === assetLinkId) {
              Object.assign(updateData, investmentUpdate);
          }
          batch.update(doc(db, 'users', uid, 'accounts', debitId), updateData);
        }
        
        if (creditAcc) {
          const change = creditAcc.group === 'CAPITAL' ? amt : -amt;
          const updateData: any = { 
            current_balance: increment(change),
            updatedAt: now
          };
          if (investmentUpdate && creditId === assetLinkId) {
              Object.assign(updateData, investmentUpdate);
          }
          batch.update(doc(db, 'users', uid, 'accounts', creditId), updateData);
        }
      }

      await batch.commit();

      if (maxExpenseTx && checkReaction) {
         checkReaction(maxExpenseTx, { netWorth, totalAssets, totalDebt });
      }

      setTimeout(() => {
         onSuccess();
      }, 500);

    } catch (error: any) {
      console.error("Ledger Authorization Error:", error);
      alert("Lỗi đồng bộ sổ cái: " + error.message);
    } finally { 
      setIsSaving(false); 
    }
  };

  return { confirmTransactions, isSaving };
};
