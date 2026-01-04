
import React, { useState, useEffect, useMemo } from 'react';
import { X, Loader2, Save, PiggyBank, Info } from 'lucide-react';
import { collection, doc, writeBatch, query, where, getDocs, increment, setDoc } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { currencyFormatter, generateFutureEvents } from '../../lib/utils';
import { Account, TransactionType, SavingsDeposit } from '../../types';
import { AddSavingsForm } from './forms/AddSavingsForm';

interface AddSavingsModalProps {
  onClose: () => void;
  targetUid: string;
}

export const AddSavingsModal: React.FC<AddSavingsModalProps> = ({ onClose, targetUid }) => {
  const [loading, setLoading] = useState(false);
  const [cashAccounts, setCashAccounts] = useState<Account[]>([]);
  const [equityFunds, setEquityFunds] = useState<Account[]>([]);
  
  // Accounting Mode
  const [isInitialBalance, setIsInitialBalance] = useState(false);

  // Equity Selection
  const [useNewFund, setUseNewFund] = useState(false);
  const [selectedFundId, setSelectedFundId] = useState('');
  const [newFundName, setNewFundName] = useState('');

  // Linking
  const [linkedFundId, setLinkedFundId] = useState('');

  // Fund Transfer
  const [enableFundTransfer, setEnableFundTransfer] = useState(false);
  const [sourceFundId, setSourceFundId] = useState('');
  const [targetFundId, setTargetFundId] = useState('');
  const [isNewTargetFund, setIsNewTargetFund] = useState(false);
  const [newTargetFundName, setNewTargetFundName] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    provider: '',
    amount: '',
    rate: '5.5',
    term: '6',
    startDate: new Date().toISOString().split('T')[0],
    earlyRate: '0.1',
    sourceAccountId: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      // 1. Fetch Cash Accounts
      const qCash = query(collection(db, 'users', targetUid, 'accounts'), where('category', '==', 'Cash'));
      const snapCash = await getDocs(qCash);
      const cashAccs = snapCash.docs.map(d => ({ id: d.id, ...d.data() } as Account));
      setCashAccounts(cashAccs);
      if (cashAccs.length > 0) setFormData(prev => ({ ...prev, sourceAccountId: cashAccs[0].id }));

      // 2. Fetch Equity Funds
      const qFunds = query(collection(db, 'users', targetUid, 'accounts'), where('category', '==', 'Equity Fund'), where('status', '==', 'ACTIVE'));
      const snapFunds = await getDocs(qFunds);
      const funds = snapFunds.docs.map(d => ({ id: d.id, ...d.data() } as Account));
      setEquityFunds(funds);
      
      if (funds.length > 0) {
        setSourceFundId(funds[0].id);
        setTargetFundId(funds.length > 1 ? funds[1].id : funds[0].id);
        setSelectedFundId(funds[0].id);
      }
    };
    fetchData();
  }, [targetUid]);

  const maturityDate = useMemo(() => {
    if (!formData.startDate || !formData.term) return '';
    const date = new Date(formData.startDate);
    date.setMonth(date.getMonth() + Number(formData.term));
    return date.toISOString().split('T')[0];
  }, [formData.startDate, formData.term]);

  const expectedInterest = useMemo(() => {
    const p = Number(formData.amount) || 0;
    const r = Number(formData.rate) || 0;
    const t = Number(formData.term) || 0;
    return Math.round((p * (r / 100) * t) / 12);
  }, [formData.amount, formData.rate, formData.term]);

  const handleSave = async () => {
    if (!formData.amount || !formData.name) return;
    
    if (isInitialBalance) {
        if (useNewFund && !newFundName.trim()) return alert("Vui lòng nhập tên quỹ vốn mới.");
        if (!useNewFund && !selectedFundId) return alert("Vui lòng chọn quỹ vốn đối ứng.");
    } else {
        if (!formData.sourceAccountId) return alert("Vui lòng chọn ví thanh toán.");
        if (enableFundTransfer) {
            if (!sourceFundId) return alert("Vui lòng chọn quỹ nguồn.");
            if (isNewTargetFund && !newTargetFundName.trim()) return alert("Vui lòng nhập tên quỹ mới.");
            if (!isNewTargetFund && !targetFundId) return alert("Vui lòng chọn quỹ đích.");
        }
    }

    setLoading(true);
    try {
      const batch = writeBatch(db);
      const amount = Number(formData.amount);
      const now = new Date().toISOString();
      const accountsRef = collection(db, 'users', targetUid, 'accounts');
      const transactionsRef = collection(db, 'users', targetUid, 'transactions');

      let finalTargetFundId = '';
      if (isInitialBalance) {
          if (useNewFund) {
             const newFundRef = doc(accountsRef);
             finalTargetFundId = newFundRef.id;
             batch.set(newFundRef, {
                id: newFundRef.id,
                name: newFundName.trim(),
                group: 'CAPITAL',
                category: 'Equity Fund',
                current_balance: amount, 
                status: 'ACTIVE',
                createdAt: now,
                color_code: '#10b981', 
                target_ratio: 0,
                description: `Vốn đối ứng tiết kiệm: ${formData.name}`
             });
          } else {
             finalTargetFundId = selectedFundId;
             batch.update(doc(accountsRef, selectedFundId), {
                 current_balance: increment(amount)
             });
          }
      } else {
          if (enableFundTransfer && isNewTargetFund) {
              const newFundRef = doc(accountsRef);
              finalTargetFundId = newFundRef.id;
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
                description: `Quỹ tích lũy từ tiết kiệm: ${formData.name}`
              });
          } else if (enableFundTransfer) {
              finalTargetFundId = targetFundId;
          } else {
              finalTargetFundId = linkedFundId;
          }
      }

      const newDeposit: SavingsDeposit = {
          id: crypto.randomUUID(),
          amount: amount,
          interest_rate: Number(formData.rate),
          term_months: Number(formData.term),
          start_date: formData.startDate,
          end_date: maturityDate,
          status: 'ACTIVE'
      };

      // Generate Scheduled Events
      const scheduledEvents = generateFutureEvents(
        amount,
        Number(formData.rate),
        formData.startDate,
        Number(formData.term),
        'END_OF_TERM', // Default for savings to show maturity date
        'INFLOW',
        `Tất toán sổ: ${formData.name}`
      );

      const savingsRef = doc(accountsRef);
      const savingsData: Account = {
        id: savingsRef.id,
        name: formData.name,
        group: 'ASSETS',
        category: 'Savings',
        current_balance: amount,
        accrued_interest: 0,
        status: 'ACTIVE',
        createdAt: now,
        details: {
          provider_name: formData.provider,
          principal_amount: amount,
          interest_rate: Number(formData.rate),
          term_months: Number(formData.term),
          start_date: formData.startDate,
          end_date: maturityDate,
          interest_type: 'COMPOUND_AT_MATURITY',
          early_withdrawal_rate: Number(formData.earlyRate),
          deposits: [newDeposit]
        },
        scheduled_events: scheduledEvents
      };
      
      if (finalTargetFundId) {
          savingsData.linked_fund_id = finalTargetFundId;
      }

      batch.set(savingsRef, savingsData);
      
      const txRef = doc(transactionsRef);
      const commonTx = {
        id: txRef.id,
        amount: amount,
        date: formData.startDate,
        datetime: now,
        category: 'Savings',
        group: 'ASSETS',
        status: 'confirmed',
        createdAt: now,
        addedBy: auth.currentUser?.email,
        asset_link_id: savingsRef.id,
        related_detail_id: newDeposit.id
      };

      if (isInitialBalance) {
         batch.set(txRef, {
            ...commonTx,
            note: `Ghi nhận sổ tiết kiệm: ${formData.name}`,
            type: TransactionType.INITIAL_BALANCE,
            debit_account_id: savingsRef.id,
            credit_account_id: finalTargetFundId,
         });
      } else {
         batch.set(txRef, {
            ...commonTx,
            note: `Mở sổ tiết kiệm: ${formData.name}`,
            type: TransactionType.ASSET_INVESTMENT,
            debit_account_id: savingsRef.id,
            credit_account_id: formData.sourceAccountId,
         });
         batch.update(doc(accountsRef, formData.sourceAccountId), {
            current_balance: increment(-amount)
         });
      }

      if (!isInitialBalance && enableFundTransfer && sourceFundId && finalTargetFundId) {
         if (sourceFundId !== finalTargetFundId) {
             const allocTxRef = doc(transactionsRef);
             const sourceFundName = equityFunds.find(f => f.id === sourceFundId)?.name;
             const targetFundName = isNewTargetFund ? newTargetFundName : equityFunds.find(f => f.id === finalTargetFundId)?.name;

             batch.set(allocTxRef, {
                id: allocTxRef.id,
                amount: amount,
                date: formData.startDate,
                datetime: now,
                note: `Phân bổ vốn tiết kiệm: ${sourceFundName} -> ${targetFundName}`,
                type: TransactionType.FUND_ALLOCATION,
                debit_account_id: sourceFundId,
                credit_account_id: finalTargetFundId,
                category: 'Equity Fund',
                group: 'CAPITAL',
                status: 'confirmed',
                createdAt: now,
                addedBy: auth.currentUser?.email
             });

             batch.update(doc(accountsRef, sourceFundId), { current_balance: increment(-amount) });
             batch.update(doc(accountsRef, finalTargetFundId), { current_balance: increment(amount) });
         }
      }

      await batch.commit();
      onClose();
    } catch (error: any) {
      console.error(error);
      alert("Lỗi: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !loading && onClose()}></div>
      <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] relative z-10 shadow-2xl flex flex-col max-h-[95vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
        
        <div className="p-6 pb-2 flex items-center justify-between border-b">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
              <PiggyBank size={32} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">Tiền gửi & Tiết kiệm</h3>
              <p className="text-sm font-medium text-slate-400">Quản lý tích lũy an toàn</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 text-slate-400 hover:bg-slate-50 rounded-full transition-colors"><X size={24} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
          
          <AddSavingsForm 
            formData={formData}
            setFormData={setFormData}
            isInitialBalance={isInitialBalance}
            setIsInitialBalance={setIsInitialBalance}
            useNewFund={useNewFund}
            setUseNewFund={setUseNewFund}
            selectedFundId={selectedFundId}
            setSelectedFundId={setSelectedFundId}
            newFundName={newFundName}
            setNewFundName={setNewFundName}
            enableFundTransfer={enableFundTransfer}
            setEnableFundTransfer={setEnableFundTransfer}
            sourceFundId={sourceFundId}
            setSourceFundId={setSourceFundId}
            targetFundId={targetFundId}
            setTargetFundId={setTargetFundId}
            isNewTargetFund={isNewTargetFund}
            setIsNewTargetFund={setIsNewTargetFund}
            newTargetFundName={newTargetFundName}
            setNewTargetFundName={setNewTargetFundName}
            linkedFundId={linkedFundId}
            setLinkedFundId={setLinkedFundId}
            equityFunds={equityFunds}
            cashAccounts={cashAccounts}
          />

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3">
            <Info size={20} className="text-slate-400 shrink-0 mt-0.5" />
            <div className="text-[11px] font-medium text-slate-500 leading-relaxed">
              {isInitialBalance 
                ? "Ghi nhận tài sản và tăng vốn chủ sở hữu (Cân đối sổ cái)." 
                : "Dự kiến nhận "}
              {!isInitialBalance && <strong>{currencyFormatter.format(expectedInterest)}</strong>}
              {!isInitialBalance && ` lãi khi đáo hạn ${maturityDate ? `(${new Date(maturityDate).toLocaleDateString('vi-VN')})` : ''}.`}
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t">
          <button 
            onClick={handleSave} 
            disabled={loading || !formData.amount || !formData.name || (!isInitialBalance && !formData.sourceAccountId)} 
            className="w-full h-16 bg-slate-900 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-xl active:scale-95 disabled:opacity-50 transition-all"
          >
            {loading ? <Loader2 size={24} className="animate-spin text-indigo-400" /> : <Save size={20} className="text-indigo-400" />}
            {loading ? "Đang xử lý..." : "Xác nhận gửi tiền"}
          </button>
        </div>
      </div>
    </div>
  );
};
