
import React from 'react';
import { Landmark, Percent, Target, Plus, ChevronDown, Wallet, Link, ArrowRight } from 'lucide-react';
import { currencyFormatter } from '../../../lib/utils';
import { Account } from '../../../types';
import { AmountInput } from '../../ui/AmountInput';
import { StandardInput } from '../../ui/StandardInput';
import { DateInput } from '../../ui/DateInput';

interface AddSavingsFormProps {
  formData: any;
  setFormData: (val: any) => void;
  isInitialBalance: boolean;
  setIsInitialBalance: (val: boolean) => void;
  useNewFund: boolean;
  setUseNewFund: (val: boolean) => void;
  selectedFundId: string;
  setSelectedFundId: (val: string) => void;
  newFundName: string;
  setNewFundName: (val: string) => void;
  enableFundTransfer: boolean;
  setEnableFundTransfer: (val: boolean) => void;
  sourceFundId: string;
  setSourceFundId: (val: string) => void;
  targetFundId: string;
  setTargetFundId: (val: string) => void;
  isNewTargetFund: boolean;
  setIsNewTargetFund: (val: boolean) => void;
  newTargetFundName: string;
  setNewTargetFundName: (val: string) => void;
  linkedFundId: string;
  setLinkedFundId: (val: string) => void;
  equityFunds: Account[];
  cashAccounts: Account[];
}

export const AddSavingsForm: React.FC<AddSavingsFormProps> = (props) => {
  const { 
    formData, setFormData, isInitialBalance, setIsInitialBalance, 
    useNewFund, setUseNewFund, selectedFundId, setSelectedFundId, newFundName, setNewFundName,
    enableFundTransfer, setEnableFundTransfer, sourceFundId, setSourceFundId, targetFundId, setTargetFundId,
    isNewTargetFund, setIsNewTargetFund, newTargetFundName, setNewTargetFundName, linkedFundId, setLinkedFundId,
    equityFunds, cashAccounts
  } = props;

  const handlePositiveInput = (key: string, val: string) => {
    if (val === '' || parseFloat(val) >= 0) {
      setFormData({ ...formData, [key]: val });
    }
  };

  return (
    <div className="space-y-6">
      <AmountInput 
        label="Số tiền gửi (VND)"
        value={formData.amount}
        onChange={(val) => setFormData({...formData, amount: val})}
        autoFocus
      />

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StandardInput 
            label="Tên sổ (VD: Mua nhà)"
            value={formData.name}
            onChange={(val) => setFormData({...formData, name: val})}
            placeholder="Nhập tên gợi nhớ..."
            />
            <StandardInput 
            label="Ngân hàng"
            value={formData.provider}
            onChange={(val) => setFormData({...formData, provider: val})}
            placeholder="VD: Techcombank"
            icon={Landmark}
            />
        </div>

        <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kiểu hạch toán</label>
            <div className="flex p-1 bg-slate-100 rounded-xl">
                <button 
                onClick={() => setIsInitialBalance(false)}
                className={`flex-1 py-3 text-[10px] font-black uppercase rounded-lg transition-all ${!isInitialBalance ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-500'}`}
                >Gửi mới (Trích ví)</button>
                <button 
                onClick={() => setIsInitialBalance(true)}
                className={`flex-1 py-3 text-[10px] font-black uppercase rounded-lg transition-all ${isInitialBalance ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-500'}`}
                >Ghi gốc (Đã có)</button>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Lãi suất (%/năm)</label>
          <div className="relative">
            <input 
              type="number" 
              min="0"
              value={formData.rate} 
              onChange={e => handlePositiveInput('rate', e.target.value)}
              onKeyDown={(e) => (e.key === '-' || e.key === 'e') && e.preventDefault()}
              className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none"
            />
            <Percent size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kỳ hạn (Tháng)</label>
          <select 
            value={formData.term} 
            onChange={e => setFormData({...formData, term: e.target.value})}
            className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none appearance-none disabled:opacity-70"
          >
            {[1, 3, 6, 9, 12, 18, 24, 36].map(m => <option key={m} value={m}>{m} tháng</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <DateInput 
          label="Ngày thực hiện"
          value={formData.startDate}
          onChange={(val) => setFormData({...formData, startDate: val})}
        />
        
        {!isInitialBalance && (
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Trích từ ví</label>
            <select 
              value={formData.sourceAccountId} 
              onChange={e => setFormData({...formData, sourceAccountId: e.target.value})}
              className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none appearance-none"
            >
              {cashAccounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name} ({currencyFormatter.format(acc.current_balance)})</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="space-y-4">
         {isInitialBalance ? (
            <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2">
                <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Target size={12} /> Nguồn vốn đối ứng (Equity Link)
                    </label>
                    <button onClick={() => setUseNewFund(!useNewFund)} className="text-[9px] font-bold text-indigo-600 uppercase hover:underline">
                        {useNewFund ? 'Chọn có sẵn' : 'Tạo quỹ mới'}
                    </button>
                </div>
                
                {useNewFund ? (
                    <div className="relative group">
                        <input 
                            type="text" 
                            value={newFundName} 
                            onChange={(e) => setNewFundName(e.target.value)} 
                            placeholder="VD: Vốn gia đình, Quỹ tích lũy..." 
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-100 transition-all shadow-inner placeholder:font-normal" 
                        />
                        <Plus size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                    </div>
                ) : (
                    <div className="relative group">
                        <select 
                            value={selectedFundId} 
                            onChange={e => setSelectedFundId(e.target.value)}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-900 outline-none appearance-none cursor-pointer focus:bg-white focus:border-indigo-100 transition-all"
                        >
                            {equityFunds.map(fund => (
                                <option key={fund.id} value={fund.id}>{fund.name} ({currencyFormatter.format(fund.current_balance)})</option>
                            ))}
                        </select>
                        <ChevronDown size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                    </div>
                )}
            </div>
         ) : (
            <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                    <input 
                    type="checkbox" 
                    id="enableFundTransfer" 
                    checked={enableFundTransfer} 
                    onChange={e => setEnableFundTransfer(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="enableFundTransfer" className="text-xs font-bold text-slate-500 cursor-pointer select-none">
                    Kích hoạt điều chuyển vốn (Advanced)
                    </label>
                </div>

                {enableFundTransfer ? (
                    <div className="bg-indigo-50/50 p-4 rounded-3xl border border-indigo-100 grid grid-cols-[1fr,auto,1fr] gap-2 items-end animate-in fade-in slide-in-from-top-2">
                    <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black text-indigo-400 uppercase">Từ quỹ (Nguồn)</label>
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
                ) : (
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <Link size={12} /> Liên kết nguồn vốn (Tùy chọn)
                        </label>
                        <div className="relative">
                            <select 
                                value={linkedFundId} 
                                onChange={e => setLinkedFundId(e.target.value)}
                                className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none appearance-none cursor-pointer"
                            >
                                <option value="">-- Không liên kết --</option>
                                {equityFunds.map(f => (
                                    <option key={f.id} value={f.id}>{f.name} ({currencyFormatter.format(f.current_balance)})</option>
                                ))}
                            </select>
                            <ChevronDown size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                        </div>
                        <p className="text-[9px] text-slate-400 ml-2 italic">Chỉ đánh dấu sổ này thuộc về quỹ nào, không tạo giao dịch điều chuyển.</p>
                    </div>
                )}
            </div>
         )}
      </div>
    </div>
  );
};
