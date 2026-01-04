
import React, { useState } from 'react';
import { X, History, Database, PiggyBank, LayoutDashboard, ArrowRightLeft, Activity, Home, Pencil, Check, Lock } from 'lucide-react';
import { Account } from '../../types';
import { LedgerTraceability } from './LedgerTraceability';
import { currencyFormatter } from '../../lib/utils';
import { SavingsDetailContent } from './SavingsDetailContent';
import { LendingDetailContent } from './LendingDetailContent';
import { InvestmentDetailContent } from './InvestmentDetailContent';
import { RealEstateDetailContent } from './RealEstateDetailContent';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface AssetActionModalProps {
  account: Account;
  type: 'BUY' | 'SELL' | 'REVALUE' | 'INTEREST' | 'PRINCIPAL' | 'HISTORY' | 'COCKPIT';
  onClose: () => void;
  targetUid: string;
}

export const AssetActionModal: React.FC<AssetActionModalProps> = ({ account, type, onClose, targetUid }) => {
  const [showLedger, setShowLedger] = useState(type === 'HISTORY');
  
  // Renaming state
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(account.name);
  const [isSavingName, setIsSavingName] = useState(false);
  
  const isSavings = account.category === 'Savings';
  const isLending = account.category === 'Receivables' || !!account.lending_details;
  const isInvestment = ['Stocks', 'Crypto', 'Gold'].includes(account.category);
  const isRealEstate = account.category === 'Real Estate';
  
  // System accounts cannot be renamed to prevent AI logic breakage
  const isSystemAccount = account.name === 'Cash Wallet';

  const getThemeColor = () => {
    if (isSavings) return 'bg-indigo-600 text-white shadow-indigo-200';
    if (isLending) return 'bg-purple-600 text-white shadow-purple-200';
    if (isInvestment) return 'bg-orange-500 text-white shadow-orange-200';
    if (isRealEstate) return 'bg-emerald-600 text-white shadow-emerald-200';
    return 'bg-slate-900 text-white shadow-slate-200';
  };

  const getIcon = () => {
    if (isSavings) return <PiggyBank size={22} />;
    if (isLending) return <ArrowRightLeft size={22} />;
    if (isInvestment) return <Activity size={22} />;
    if (isRealEstate) return <Home size={22} />;
    return <Database size={22} />;
  };

  const handleRename = async () => {
    if (!newName.trim() || newName === account.name) {
        setIsEditingName(false);
        setNewName(account.name);
        return;
    }
    setIsSavingName(true);
    try {
        await updateDoc(doc(db, 'users', targetUid, 'accounts', account.id), { name: newName.trim() });
        setIsEditingName(false);
    } catch (e) {
        alert("Lỗi đổi tên tài khoản");
    } finally {
        setIsSavingName(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 outline-none">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" 
        onClick={onClose}
      ></div>
      
      <div className="bg-slate-50 w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] relative z-10 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-full duration-500 max-h-[92vh]">
        
        {/* Sticky Header */}
        <div className="bg-white p-5 flex items-center justify-between border-b border-slate-100 shrink-0 sticky top-0 z-20 shadow-sm">
           <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg shrink-0 ${getThemeColor()}`}>
                 {getIcon()}
              </div>
              <div className="min-w-0 flex-1">
                  {isEditingName ? (
                    <div className="flex items-center gap-2 mb-1">
                        <input 
                            type="text" 
                            value={newName} 
                            onChange={(e) => setNewName(e.target.value)} 
                            className="w-full bg-slate-50 border border-indigo-200 rounded-lg px-2 py-1 text-lg font-black text-slate-900 outline-none focus:ring-2 focus:ring-indigo-100 min-w-0"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                        />
                        <button onClick={handleRename} disabled={isSavingName} className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg shrink-0 hover:bg-emerald-100 transition-colors"><Check size={16} /></button>
                        <button onClick={() => { setIsEditingName(false); setNewName(account.name); }} className="p-1.5 bg-slate-100 text-slate-400 rounded-lg shrink-0 hover:bg-slate-200 transition-colors"><X size={16} /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group mb-1">
                        <h3 className="text-lg font-black text-slate-900 truncate tracking-tight">{account.name}</h3>
                        {isSystemAccount ? (
                            <div className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200" title="Tài khoản mặc định hệ thống - Không thể đổi tên">
                                <Lock size={10} className="text-slate-400" />
                                <span className="text-[9px] font-bold text-slate-400 uppercase">Default</span>
                            </div>
                        ) : (
                            <button onClick={() => setIsEditingName(true)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-indigo-500 transition-all rounded-md hover:bg-slate-50"><Pencil size={14} /></button>
                        )}
                    </div>
                  )}
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] leading-none">
                    Chi tiết {isInvestment ? 'Đầu tư' : isLending ? 'Khoản cho vay' : isRealEstate ? 'Bất động sản' : 'Tài sản ' + account.category}
                  </p>
              </div>
           </div>
           <button 
             onClick={onClose} 
             className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-full text-slate-400 transition-all active:scale-90 shrink-0"
           >
             <X size={24} />
           </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-4 bg-slate-50 shrink-0">
            <div className="flex p-1.5 bg-white rounded-2xl shadow-sm border border-slate-100">
                <button 
                  onClick={() => setShowLedger(false)} 
                  className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${!showLedger ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  <LayoutDashboard size={14} /> Cockpit
                </button>
                <button 
                  onClick={() => setShowLedger(true)} 
                  className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${showLedger ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  <History size={14} /> Ledger Logs
                </button>
            </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar pt-4 pb-6">
           {showLedger ? (
             <div className="px-6">
                <LedgerTraceability accountId={account.id} targetUid={targetUid} />
             </div>
           ) : isSavings ? (
             <SavingsDetailContent account={account} targetUid={targetUid} onClose={onClose} />
           ) : isLending ? (
             <LendingDetailContent account={account} targetUid={targetUid} onClose={onClose} />
           ) : isInvestment ? (
             <InvestmentDetailContent account={account} targetUid={targetUid} onClose={onClose} />
           ) : isRealEstate ? (
             <RealEstateDetailContent account={account} targetUid={targetUid} onClose={onClose} />
           ) : (
             <div className="p-6 space-y-6">
                <div className="bg-slate-900 text-white p-8 rounded-[2rem] shadow-xl text-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-[50px] -mr-16 -mt-16"></div>
                  <p className="text-indigo-300 text-[10px] font-black uppercase tracking-[0.2em] mb-3 relative z-10">Giá trị ghi nhận hiện tại</p>
                  <h2 className="text-4xl font-black relative z-10 tracking-tight">{currencyFormatter.format(account.current_balance)}</h2>
                </div>

                <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-5 bg-white rounded-3xl border border-slate-100 shadow-sm text-center">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Trạng thái</p>
                          <p className="text-xs font-black text-emerald-600 uppercase">{account.status}</p>
                      </div>
                      <div className="p-5 bg-white rounded-3xl border border-slate-100 shadow-sm text-center">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Khởi tạo</p>
                          <p className="text-xs font-black text-slate-800">{new Date(account.createdAt).toLocaleDateString('vi-VN')}</p>
                      </div>
                    </div>
                </div>
             </div>
           )}
        </div>

        {/* Safety Spacer */}
        <div className="h-[env(safe-area-inset-bottom)] bg-white"></div>
      </div>
    </div>
  );
};
