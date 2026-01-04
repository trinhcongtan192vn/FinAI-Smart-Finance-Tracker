
import React, { useState, useEffect, useMemo } from 'react';
import { X, CheckCircle2, Loader2, Landmark, Wallet, TrendingUp, AlertTriangle, ArrowRight, Plus, ChevronDown } from 'lucide-react';
import { doc, collection, writeBatch, query, where, getDocs, increment } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { Account, TransactionType, SavingsDeposit } from '../../types';
import { currencyFormatter } from '../../lib/utils';
import { AmountInput } from '../ui/AmountInput';

interface SettleSavingsModalProps {
  account: Account;
  onClose: () => void;
  onSuccess: () => void;
  targetUid: string;
  depositId?: string; // Optional: If provided, settle only this deposit
}

export const SettleSavingsModal: React.FC<SettleSavingsModalProps> = ({ account, onClose, onSuccess, targetUid, depositId }) => {
  const [loading, setLoading] = useState(false);
  const [cashAccounts, setCashAccounts] = useState<Account[]>([]);
  const [interestAmount, setInterestAmount] = useState('');
  const [destAccountId, setDestAccountId] = useState('');
  const [equityFunds, setEquityFunds] = useState<Account[]>([]);

  // Reallocation State
  const [enableAllocation, setEnableAllocation] = useState(false);
  const [sourceFundId, setSourceFundId] = useState('');
  const [targetFundId, setTargetFundId] = useState('');
  const [isNewTargetFund, setIsNewTargetFund] = useState(false);
  const [newTargetFundName, setNewTargetFundName] = useState('');

  const details = account.details!;

  // Identify the target deposit (or legacy single deposit)
  const targetDeposit = useMemo(() => {
      if (depositId && details.deposits) {
          return details.deposits.find(d => d.id === depositId);
      }
      return {
          amount: details.principal_amount,
          interest_rate: details.interest_rate,
          start_date: details.start_date,
          end_date: details.end_date,
          term_months: details.term_months
      } as SavingsDeposit;
  }, [depositId, details]);

  useEffect(() => {
    if (!targetDeposit) return;

    const end = new Date(targetDeposit.end_date);
    const start = new Date(targetDeposit.start_date);
    const now = new Date();
    
    const isMatured = now >= end;
    let calculatedInterest = 0;

    if (isMatured) {
      calculatedInterest = (targetDeposit.amount * (targetDeposit.interest_rate / 100) * targetDeposit.term_months) / 12;
    } else {
      const diffTime = Math.abs(now.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      calculatedInterest = (targetDeposit.amount * (details.early_withdrawal_rate / 100) * diffDays) / 365;
    }

    setInterestAmount(Math.round(calculatedInterest).toString());

    // Fetch dependencies
    const fetchDeps = async () => {
      // Cash
      const qCash = query(collection(db, 'users', targetUid, 'accounts'), where('category', '==', 'Cash'));
      const snapCash = await getDocs(qCash);
      const cashAccs = snapCash.docs.map(d => ({ id: d.id, ...d.data() } as Account));
      setCashAccounts(cashAccs);
      if (cashAccs.length > 0) setDestAccountId(cashAccs[0].id);

      // Funds
      const qFunds = query(collection(db, 'users', targetUid, 'accounts'), where('category', '==', 'Equity Fund'), where('status', '==', 'ACTIVE'));
      const snapFunds = await getDocs(qFunds);
      const funds = snapFunds.docs.map(d => ({ id: d.id, ...d.data() } as Account));
      setEquityFunds(funds);
      
      // Default Source Fund to linked ID or first fund
      if (account.linked_fund_id) {
          setSourceFundId(account.linked_fund_id);
      } else if (funds.length > 0) {
          setSourceFundId(funds[0].id);
      }
      
      if (funds.length > 0) {
          setTargetFundId(funds[0].id);
      }
    };
    fetchDeps();
  }, [targetDeposit, targetUid, details, account.linked_fund_id]);

  const handleSettle = async () => {
    if (!destAccountId || loading || !targetDeposit) return;
    
    if (enableAllocation) {
        if (!sourceFundId) return alert("Vui lòng chọn quỹ nguồn.");
        if (isNewTargetFund && !newTargetFundName.trim()) return alert("Vui lòng nhập tên quỹ đích mới.");
        if (!isNewTargetFund && !targetFundId) return alert("Vui lòng chọn quỹ đích.");
    }

    setLoading(true);
    try {
      const batch = writeBatch(db);
      const principal = targetDeposit.amount;
      const interest = Number(interestAmount);
      const total = principal + interest;
      const now = new Date().toISOString();
      const today = now.split('T')[0];
      
      const accountsRef = collection(db, 'users', targetUid, 'accounts');
      const txRef = collection(db, 'users', targetUid, 'transactions');
      
      // Fallback fund for interest recording (Income side)
      let interestFundId = sourceFundId;
      if (!interestFundId && equityFunds.length > 0) interestFundId = equityFunds[0].id;

      // 1. Ghi nhận Gốc: Savings (-) -> Cash Wallet (+)
      const principalTxRef = doc(txRef);
      batch.set(principalTxRef, {
        id: principalTxRef.id,
        amount: principal,
        date: today,
        datetime: now,
        note: `Tất toán gốc: ${account.name} (Khoản ${currencyFormatter.format(principal)})`,
        type: TransactionType.ASSET_INVESTMENT,
        debit_account_id: destAccountId,
        credit_account_id: account.id,
        category: 'Savings',
        group: 'ASSETS',
        status: 'confirmed',
        createdAt: now,
        addedBy: auth.currentUser?.email
      });

      // 2. Ghi nhận Lãi: Equity Fund (+) -> Cash Wallet (+)
      const interestTxRef = doc(txRef);
      batch.set(interestTxRef, {
        id: interestTxRef.id,
        amount: interest,
        date: today,
        datetime: now,
        note: `Lãi tiết kiệm: ${account.name}`,
        type: TransactionType.INTEREST_LOG,
        debit_account_id: destAccountId,
        credit_account_id: interestFundId || destAccountId, // If no fund, balance goes to wallet but not tracked as equity income properly
        category: 'Salary',
        group: 'INCOME',
        status: 'confirmed',
        createdAt: now,
        addedBy: auth.currentUser?.email
      });

      // 3. Update Cash Wallet
      batch.update(doc(accountsRef, destAccountId), {
        current_balance: increment(total)
      });

      // 4. Update Savings Account
      if (details.deposits && depositId) {
          const updatedDeposits = details.deposits.map(d => {
              if (d.id === depositId) {
                  return { ...d, status: 'SETTLED', settled_date: now, settled_interest: interest };
              }
              return d;
          });
          const allSettled = updatedDeposits.every(d => d.status === 'SETTLED' || (d as any).status === 'SETTLED');
          
          batch.update(doc(accountsRef, account.id), {
              current_balance: increment(-principal),
              'details.principal_amount': increment(-principal),
              'details.deposits': updatedDeposits,
              updatedAt: now,
              status: allSettled ? 'CLOSED' : 'ACTIVE'
          });
      } else {
          // Legacy
          batch.update(doc(accountsRef, account.id), {
            current_balance: 0,
            status: 'CLOSED',
            updatedAt: now
          });
      }

      if (interestFundId) {
        batch.update(doc(accountsRef, interestFundId), {
            current_balance: increment(interest)
        });
      }

      // 5. Handle Equity Reallocation (If enabled)
      // This moves the PRINCIPAL amount from Source Fund (e.g. Long term) to Target Fund (e.g. Spending)
      // Mirroring the cash movement from Savings (Illiquid) to Cash (Liquid)
      if (enableAllocation && sourceFundId) {
          let finalTargetId = targetFundId;
          
          // Create new fund if requested
          if (isNewTargetFund) {
              const newFundRef = doc(accountsRef);
              finalTargetId = newFundRef.id;
              batch.set(newFundRef, {
                id: newFundRef.id,
                name: newTargetFundName.trim(),
                group: 'CAPITAL',
                category: 'Equity Fund',
                current_balance: 0, 
                status: 'ACTIVE',
                createdAt: now,
                color_code: '#10b981', 
                target_ratio: 0,
                description: `Quỹ đích từ tất toán: ${account.name}`
              });
          }

          if (finalTargetId && finalTargetId !== sourceFundId) {
             const allocTxRef = doc(txRef);
             const sourceName = equityFunds.find(f => f.id === sourceFundId)?.name || 'Quỹ nguồn';
             const targetName = isNewTargetFund ? newTargetFundName : equityFunds.find(f => f.id === finalTargetId)?.name;

             batch.set(allocTxRef, {
                id: allocTxRef.id,
                amount: principal,
                date: today,
                datetime: now,
                note: `Điều chuyển vốn sau tất toán: ${sourceName} -> ${targetName}`,
                type: TransactionType.FUND_ALLOCATION,
                debit_account_id: sourceFundId,
                credit_account_id: finalTargetId,
                category: 'Equity Fund',
                group: 'CAPITAL',
                status: 'confirmed',
                createdAt: now,
                addedBy: auth.currentUser?.email
             });

             batch.update(doc(accountsRef, sourceFundId), { current_balance: increment(-principal) });
             batch.update(doc(accountsRef, finalTargetId), { current_balance: increment(principal) });
          }
      }

      await batch.commit();
      onSuccess();
    } catch (error: any) {
      console.error(error);
      alert("Lỗi: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const isEarly = targetDeposit ? new Date() < new Date(targetDeposit.end_date) : false;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300" onClick={() => !loading && onClose()}></div>
      
      <div className="bg-white w-full max-w-md rounded-[2.5rem] relative z-10 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh]">
        
        <div className="p-8 pb-4 flex flex-col items-center text-center shrink-0">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-5 rotate-3">
               <CheckCircle2 size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-900">Xác nhận tất toán</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Dòng tiền sẽ được thu hồi về ví chính</p>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto no-scrollbar flex-1">
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col gap-4 shadow-inner">
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Thu hồi tiền gốc</span>
                    <span className="text-base font-black text-slate-900">{currencyFormatter.format(targetDeposit?.amount)}</span>
                </div>
                <div className="h-px bg-slate-200/50 w-full"></div>
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Tiền lãi nhận được</span>
                    <span className="text-lg font-black text-emerald-600">+{currencyFormatter.format(Number(interestAmount))}</span>
                </div>
                {isEarly && (
                  <div className="flex items-center gap-2 text-[10px] font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl w-fit mt-1">
                      <AlertTriangle size={12} /> Rút trước hạn (Lãi {details.early_withdrawal_rate}%)
                  </div>
                )}
            </div>

            <div className="space-y-4 pt-2">
                <AmountInput 
                  label="Điều chỉnh số lãi thực nhận"
                  value={interestAmount}
                  onChange={setInterestAmount}
                />

                <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nhận tiền tại tài khoản</label>
                    <div className="relative">
                      <select 
                          value={destAccountId}
                          onChange={e => setDestAccountId(e.target.value)}
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-900 outline-none appearance-none focus:ring-4 focus:ring-indigo-50 transition-all"
                      >
                          {cashAccounts.map(acc => (
                              <option key={acc.id} value={acc.id}>{acc.name} ({currencyFormatter.format(acc.current_balance)})</option>
                          ))}
                      </select>
                      <Wallet size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                    </div>
                </div>

                {/* Fund Reallocation Section */}
                <div className="bg-indigo-50/50 p-4 rounded-3xl border border-indigo-100 space-y-4">
                   <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="enableAllocation" 
                        checked={enableAllocation} 
                        onChange={e => setEnableAllocation(e.target.checked)}
                        className="w-5 h-5 rounded-md border-indigo-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <label htmlFor="enableAllocation" className="text-xs font-bold text-indigo-900 cursor-pointer select-none">
                         Đồng thời điều chuyển nguồn vốn?
                      </label>
                   </div>
                   
                   {enableAllocation && (
                      <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-end animate-in fade-in slide-in-from-top-2">
                         <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-black text-indigo-400 uppercase">Từ quỹ (Gốc)</label>
                            <select 
                              value={sourceFundId} 
                              onChange={e => setSourceFundId(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-bold outline-none"
                            >
                               {equityFunds.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                            </select>
                         </div>
                         
                         <div className="pb-2 text-indigo-400"><ArrowRight size={16} /></div>
                         
                         <div className="flex flex-col gap-1">
                            <div className="flex justify-between items-center">
                               <label className="text-[9px] font-black text-indigo-400 uppercase">Đến quỹ (Đích)</label>
                               <button onClick={() => setIsNewTargetFund(!isNewTargetFund)} className="text-[8px] font-black uppercase text-indigo-600 underline">
                                  {isNewTargetFund ? 'Chọn có sẵn' : 'Tạo mới'}
                               </button>
                            </div>
                            
                            {isNewTargetFund ? (
                               <div className="relative">
                                  <input 
                                     type="text" 
                                     value={newTargetFundName} 
                                     onChange={(e) => setNewTargetFundName(e.target.value)} 
                                     placeholder="Tên quỹ mới"
                                     className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-bold outline-none placeholder:font-normal"
                                  />
                                  <Plus size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-300 pointer-events-none" />
                               </div>
                            ) : (
                               <select 
                                 value={targetFundId} 
                                 onChange={e => setTargetFundId(e.target.value)}
                                 className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-bold outline-none"
                               >
                                  {equityFunds.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                               </select>
                            )}
                         </div>
                      </div>
                   )}
                </div>
            </div>
        </div>

        <div className="p-6 pt-0 mt-2 flex flex-col gap-3 shrink-0">
            <button 
                onClick={handleSettle}
                disabled={loading || !destAccountId}
                className="w-full h-16 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl shadow-slate-200 flex items-center justify-center gap-3 active:scale-95 transition-all"
            >
                {loading ? <Loader2 size={24} className="animate-spin text-emerald-400" /> : <TrendingUp size={20} className="text-emerald-400" />}
                {loading ? "Đang xử lý..." : "Xác nhận & Nhận tiền"}
            </button>
            <button 
                onClick={onClose}
                disabled={loading}
                className="w-full py-3 text-xs font-black text-slate-300 uppercase tracking-widest"
            >
                Quay lại
            </button>
        </div>
      </div>
    </div>
  );
};
