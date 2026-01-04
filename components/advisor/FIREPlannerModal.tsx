
import React, { useState, useMemo, useEffect } from 'react';
import { X, Flame, TrendingUp, ShieldCheck, Info, BarChart3, BrainCircuit, Table as TableIcon, Landmark, Save, Loader2, BookOpen, Hourglass, Target as TargetIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatCurrencyCompact } from '../../lib/utils';
import { FIREConfig, SimulationYear, MarketScenario } from '../../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

// Sub-components
import { FIREChart } from './fire/FIREChart';
import { SensitivityMatrix } from './fire/SensitivityMatrix';
import { FIRESimulationTable } from './fire/FIRESimulationTable';
import { FIREGuideOverlay } from './fire/FIREGuideOverlay';

interface FIREPlannerModalProps {
  onClose: () => void;
  uid: string;
  initialData?: FIREConfig;
}

export const SCENARIO_LABELS: Record<MarketScenario, string> = {
  [MarketScenario.STABLE]: 'Bình Thường',
  [MarketScenario.BEAR]: 'Khủng Hoảng',
  [MarketScenario.BULL]: 'Tăng Trưởng',
  [MarketScenario.VOLATILE]: 'Biến Động Mạnh',
};

const formatNumberInput = (val: number | string) => {
    if (!val && val !== 0) return '';
    return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const parseNumberInput = (val: string) => {
    if (typeof val !== 'string') return Number(val);
    return Number(val.replace(/,/g, ''));
};

/**
 * Calculates the "Natural FIRE" age:
 * When the user mathematically hits their goal if they keep working/saving.
 * This ignores the 'retirementAge' input to give an objective target.
 */
const calculateNaturalFIRE = (config: FIREConfig) => {
    const targetCushionMultiplier = config.cashCushionYears || 3;
    let currentCashCushion = Math.min(config.currentPortfolio, config.annualExpenses * targetCushionMultiplier);
    let currentYieldShield = Math.max(0, config.currentPortfolio - currentCashCushion);
    
    const startYear = new Date().getFullYear();
    const maxDuration = 70; // Simulate up to age 100+
    
    for (let i = 0; i <= maxDuration; i++) {
        const age = config.currentAge + i;
        const year = startYear + i;
        const inflationFactor = Math.pow(1 + config.inflationRate / 100, i);
        const adjustedExpenses = config.annualExpenses * inflationFactor;
        const currentFireGoal = adjustedExpenses / (config.withdrawalRate / 100);
        
        // Cross-over point check
        if (currentYieldShield + currentCashCushion >= currentFireGoal) {
            return { year, age };
        }

        // Returns calculation (Simplified for projection)
        const bondYield = (currentYieldShield * (config.bondsWeight / 100)) * (config.bondsReturn / 100);
        const cashInterest = currentCashCushion * (config.cashReturn / 100);
        const stockGrowth = (currentYieldShield * (config.stocksWeight / 100)) * (config.stocksReturn / 100);
        
        const currentIncome = config.annualIncome * inflationFactor;
        const savings = currentIncome - adjustedExpenses;
        
        // Reinvest and grow
        currentYieldShield = currentYieldShield + savings + bondYield + stockGrowth;
        // Grow cushion by inflation to maintain purchasing power
        currentCashCushion = (currentCashCushion + cashInterest) * (1 + config.inflationRate / 100);
    }
    return null;
};

export const FIREPlannerModal: React.FC<FIREPlannerModalProps> = ({ onClose, uid, initialData }) => {
  const { t } = useTranslation();
  const [config, setConfig] = useState<FIREConfig>(initialData || {
    currentAge: 30,
    retirementAge: 45,
    annualIncome: 600000000,
    annualExpenses: 300000000,
    savingsRate: 50,
    currentPortfolio: 500000000,
    withdrawalRate: 4,
    inflationRate: 3,
    stocksWeight: 60,
    bondsWeight: 40,
    stocksReturn: 10,
    bondsReturn: 5,
    cashReturn: 3,
    cashCushionYears: 3
  });

  const [scenario, setScenario] = useState<MarketScenario>(MarketScenario.STABLE);
  const [showTable, setShowTable] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Auto-calculate Savings Rate for display logic
  useEffect(() => {
    const sr = config.annualIncome > 0 ? ((config.annualIncome - config.annualExpenses) / config.annualIncome) * 100 : 0;
    if (Math.abs(sr - config.savingsRate) > 0.1) {
        setConfig(prev => ({ ...prev, savingsRate: sr }));
    }
  }, [config.annualIncome, config.annualExpenses]);

  // Main Simulation for Chart and Table (Strictly uses retirementAge to show "What-if" scenarios)
  const simulationResults = useMemo(() => {
    const baseFireNumber = config.annualExpenses / (config.withdrawalRate / 100);
    const simulation: SimulationYear[] = [];
    const targetInitialCashCushion = config.annualExpenses * config.cashCushionYears;
    let currentCashCushion = Math.min(config.currentPortfolio, targetInitialCashCushion);
    let currentYieldShield = Math.max(0, config.currentPortfolio - currentCashCushion);
    const startYear = new Date().getFullYear();
    const endAge = 100;
    const duration = endAge - config.currentAge;

    for (let i = 0; i <= duration; i++) {
        const age = config.currentAge + i;
        const year = startYear + i;
        const isRetired = age >= config.retirementAge;
        const inflationFactor = Math.pow(1 + config.inflationRate / 100, i);
        const adjustedExpenses = config.annualExpenses * inflationFactor;
        const targetCashCushion = adjustedExpenses * config.cashCushionYears;

        let stockReturnRate = config.stocksReturn / 100;
        const bondReturnRate = config.bondsReturn / 100;
        const cashReturnRate = config.cashReturn / 100;
        let marketStatus: SimulationYear['marketStatus'] = 'STABLE';

        if (scenario === MarketScenario.BEAR && age >= config.retirementAge && age < config.retirementAge + 3) {
            stockReturnRate = -0.25; 
            marketStatus = 'CRASH';
        } else if (scenario === MarketScenario.BULL) {
            stockReturnRate = (config.stocksReturn + 5) / 100;
            marketStatus = 'BULL';
        } else if (scenario === MarketScenario.VOLATILE) {
            const rand = Math.random();
            stockReturnRate = rand > 0.7 ? 0.25 : rand < 0.3 ? -0.20 : 0.05;
            marketStatus = stockReturnRate > 0.1 ? 'BULL' : stockReturnRate < 0 ? 'BEAR' : 'STABLE';
        }

        const currentBondAsset = currentYieldShield * (config.bondsWeight / 100);
        const currentStockAsset = currentYieldShield * (config.stocksWeight / 100);
        const bondYield = currentBondAsset * bondReturnRate;
        const cashInterest = currentCashCushion * cashReturnRate;
        const totalYield = bondYield + cashInterest;
        const stockGrowth = currentStockAsset * stockReturnRate;
        let status: SimulationYear['status'] = isRetired ? 'PROSPERITY' : 'ACCUMULATION';

        if (!isRetired) {
            const currentIncome = config.annualIncome * inflationFactor;
            currentYieldShield = (currentYieldShield + (currentIncome - adjustedExpenses) + bondYield + stockGrowth);
            currentCashCushion = (currentCashCushion + cashInterest) * (1 + config.inflationRate / 100);
        } else {
            const needsFromBuckets = Math.max(0, adjustedExpenses - totalYield);
            if (marketStatus === 'BEAR' || marketStatus === 'CRASH') {
                status = 'PROTECTION';
                if (currentCashCushion >= needsFromBuckets) {
                    currentCashCushion -= needsFromBuckets;
                } else {
                    currentYieldShield -= (needsFromBuckets - currentCashCushion);
                    currentCashCushion = 0;
                }
                currentYieldShield = (currentYieldShield + stockGrowth + bondYield);
            } else {
                currentYieldShield -= needsFromBuckets;
                if (currentCashCushion < targetCashCushion) {
                    const refillAmt = Math.min(stockGrowth + bondYield, targetCashCushion - currentCashCushion);
                    if (refillAmt > 0) {
                        currentYieldShield -= refillAmt;
                        currentCashCushion += refillAmt;
                    }
                }
                currentYieldShield = (currentYieldShield + stockGrowth + bondYield);
            }
        }

        const total = currentYieldShield + currentCashCushion;
        simulation.push({
            year, age, income: isRetired ? 0 : config.annualIncome * inflationFactor,
            expenses: adjustedExpenses, bondYield, cashInterest, totalYield, stockGrowth,
            yieldShield: currentYieldShield, bondAsset: currentBondAsset, stockAsset: currentStockAsset,
            cashCushion: currentCashCushion, totalPortfolio: total, isFailed: total <= 100, marketStatus, status
        });
        if (total <= 0) break;
    }
    return { fireNumber: baseFireNumber, simulation };
  }, [config, scenario]);

  // Objective FIRE Target (Ignores user's planned retirement age)
  const naturalFIRE = useMemo(() => calculateNaturalFIRE(config), [config]);

  const sensitivityMatrixData = useMemo(() => {
      const returns = [4, 6, 8, 10, 12];
      const savings = [20, 30, 40, 50, 60, 70];
      
      const matrix = returns.map(r => ({
          rate: r,
          results: savings.map(s => {
              // Internal simplified calculation for matrix cells
              let portfolio = config.currentPortfolio;
              const expenses = config.annualIncome * (1 - s / 100);
              const wdRate = config.withdrawalRate / 100;
              const infl = config.inflationRate / 100;
              const ret = r / 100;
              let years = 51;
              for (let y = 0; y <= 50; y++) {
                  const goal = (expenses * Math.pow(1 + infl, y)) / wdRate;
                  if (portfolio >= goal) { years = y; break; }
                  portfolio = (portfolio + (config.annualIncome * (s/100) * Math.pow(1+infl, y))) * (1 + ret);
              }
              return { sr: s, years };
          })
      }));
      return matrix;
  }, [config.currentPortfolio, config.annualIncome, config.withdrawalRate, config.inflationRate]);

  const handleSave = async () => {
      setIsSaving(true);
      try {
          await updateDoc(doc(db, 'users', uid), { fireConfig: config });
          setIsSaving(false);
          alert("Kế hoạch đã được lưu thành công.");
      } catch (e) {
          setIsSaving(false);
          alert("Lỗi khi lưu dữ liệu.");
      }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 outline-none">
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-md" onClick={onClose}></div>
      <div className="bg-slate-50 w-full max-w-6xl rounded-t-[2.5rem] sm:rounded-[2.5rem] relative z-10 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-500 max-h-[96vh]">
        
        {/* Header - Unified Advisor Style */}
        <div className="bg-white p-5 flex items-center justify-between border-b shrink-0 sticky top-0 z-30 shadow-sm">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-orange-600 text-white flex items-center justify-center shadow-lg shadow-orange-200">
                 <Flame size={24} />
              </div>
              <div>
                  <h3 className="text-lg font-black text-slate-900 leading-tight">FIRE Simulator</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Chiến lược Tự do tài chính & Quản trị danh mục</p>
              </div>
           </div>
           <div className="flex items-center gap-2">
               <button onClick={() => setShowGuide(true)} className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all flex items-center gap-2">
                  <BookOpen size={20} /><span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">Cách tính</span>
               </button>
               <button onClick={onClose} className="p-2.5 hover:bg-slate-100 rounded-full text-slate-400"><X size={24} /></button>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
          {showGuide && <FIREGuideOverlay onClose={() => setShowGuide(false)} />}

          <div className="p-6 space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-slate-900 text-white p-6 rounded-[2rem] shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[140px]">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/20 blur-2xl -mr-12 -mt-12"></div>
                    <div><p className="text-orange-300 text-[9px] font-black uppercase tracking-widest mb-1">Mục tiêu FIRE</p><h4 className="text-2xl font-black tracking-tighter">{formatCurrencyCompact(simulationResults.fireNumber)}</h4></div>
                    <div className="mt-4 pt-4 border-t border-white/5"><p className="text-[8px] text-slate-400 uppercase leading-relaxed">Tương đương 25 lần chi phí</p></div>
                </div>
                <div className="bg-indigo-600 text-white p-6 rounded-[2rem] shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[140px]">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 blur-2xl -mr-12 -mt-12"></div>
                    <div><p className="text-indigo-200 text-[9px] font-black uppercase tracking-widest mb-1">Thời gian Đạt được</p><h4 className="text-2xl font-black tracking-tighter">{naturalFIRE ? `${naturalFIRE.year - new Date().getFullYear()} năm nữa` : 'Chưa khả thi'}</h4></div>
                    <div className="mt-4 pt-4 border-t border-white/10"><p className="text-[8px] text-indigo-200 uppercase leading-relaxed flex items-center gap-1"><TargetIcon size={10} /> Ước tính đạt vào năm {naturalFIRE?.year || '????'}</p></div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between min-h-[140px]">
                    <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Tỷ lệ tiết kiệm</p><h4 className="text-2xl font-black text-emerald-600 tracking-tighter">{config.savingsRate.toFixed(1)}%</h4></div>
                    <p className="text-[8px] text-slate-400 font-bold uppercase mt-2">Dựa trên Thu nhập - Chi phí</p>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between min-h-[140px]">
                    <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Dự phòng mặt</p><h4 className="text-2xl font-black text-rose-500 tracking-tighter">{formatCurrencyCompact(config.annualExpenses * config.cashCushionYears)}</h4></div>
                    <p className="text-[8px] text-slate-400 font-bold uppercase mt-2">Đệm an toàn (3 năm)</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1 bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                    <div className="flex items-center gap-2 mb-2"><BrainCircuit size={16} className="text-indigo-600" /><span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Thông số kế hoạch</span></div>
                    <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Thu nhập / Năm</label><input type="text" value={formatNumberInput(config.annualIncome)} onChange={e => setConfig({...config, annualIncome: parseNumberInput(e.target.value)})} className="w-full px-4 py-3 bg-slate-50 rounded-xl font-black text-sm outline-none border border-transparent focus:border-indigo-200" /></div>
                        <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Chi phí / Năm</label><input type="text" value={formatNumberInput(config.annualExpenses)} onChange={e => setConfig({...config, annualExpenses: parseNumberInput(e.target.value)})} className="w-full px-4 py-3 bg-slate-50 rounded-xl font-black text-sm outline-none border border-transparent focus:border-indigo-200" /></div>
                        <div className="h-px bg-slate-100 my-1"></div>
                        <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest ml-1">Cấu trúc tài sản & Lợi nhuận</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Cổ phiếu (%)</label><input type="number" value={config.stocksWeight} onChange={e => setConfig({...config, stocksWeight: Number(e.target.value), bondsWeight: 100 - Number(e.target.value)})} className="w-full px-3 py-3 bg-slate-50 rounded-xl font-black text-sm outline-none text-indigo-600" /></div>
                            <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">LN Cổ phiếu (%)</label><input type="number" value={config.stocksReturn} onChange={e => setConfig({...config, stocksReturn: Number(e.target.value)})} className="w-full px-3 py-3 bg-slate-50 rounded-xl font-black text-sm outline-none text-indigo-600" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Trái phiếu (%)</label><div className="w-full px-3 py-3 bg-slate-100 rounded-xl font-black text-sm text-slate-400">{config.bondsWeight}%</div></div>
                            <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">LN Trái phiếu (%)</label><input type="number" value={config.bondsReturn} onChange={e => setConfig({...config, bondsReturn: Number(e.target.value)})} className="w-full px-3 py-3 bg-slate-50 rounded-xl font-black text-sm outline-none text-emerald-600" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Lãi tiền gửi (%)</label><input type="number" value={config.cashReturn} onChange={e => setConfig({...config, cashReturn: Number(e.target.value)})} className="w-full px-3 py-3 bg-slate-50 rounded-xl font-black text-sm outline-none text-amber-600" /></div>
                            <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Lạm phát (%)</label><input type="number" value={config.inflationRate} onChange={e => setConfig({...config, inflationRate: Number(e.target.value)})} className="w-full px-3 py-3 bg-slate-50 rounded-xl font-black text-sm outline-none" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Tuổi hiện tại</label><input type="number" value={config.currentAge} onChange={e => setConfig({...config, currentAge: Number(e.target.value)})} className="w-full px-3 py-3 bg-slate-50 rounded-xl font-black text-sm outline-none" /></div>
                            <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Tuổi nghỉ hưu</label><input type="number" value={config.retirementAge} onChange={e => setConfig({...config, retirementAge: Number(e.target.value)})} className="w-full px-3 py-3 bg-slate-50 rounded-xl font-black text-sm outline-none border border-orange-100" /></div>
                        </div>
                        <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Tài sản hiện có</label><input type="text" value={formatNumberInput(config.currentPortfolio)} onChange={e => setConfig({...config, currentPortfolio: parseNumberInput(e.target.value)})} className="w-full px-4 py-3 bg-slate-50 rounded-xl font-black text-sm outline-none border border-transparent focus:border-indigo-200" /></div>
                    </div>
                </div>

                <div className="lg:col-span-3 space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2"><BarChart3 size={14} className="text-indigo-600" /> Biểu đồ tài sản ròng tích lũy</h4>
                        <div className="flex bg-slate-200 p-1 rounded-xl gap-1">{Object.values(MarketScenario).map(s => (<button key={s} onClick={() => setScenario(s)} className={`px-3 py-1.5 text-[9px] font-black rounded-lg transition-all ${scenario === s ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-50'}`}>{SCENARIO_LABELS[s]}</button>))}</div>
                    </div>
                    <FIREChart data={simulationResults.simulation} scenario={scenario} retirementAge={config.retirementAge} />
                </div>
            </div>

            <div className="bg-emerald-50 rounded-[2rem] p-6 border border-emerald-100 flex items-center gap-5">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-emerald-500 shadow-sm border border-emerald-100 shrink-0"><Hourglass size={28} className="animate-pulse" /></div>
                <div>
                    <h4 className="text-sm font-black text-emerald-900 uppercase tracking-widest">Tiên đoán FIRE</h4>
                    <p className="text-xs font-medium text-emerald-700 leading-relaxed mt-1">
                        Dựa trên chi phí sinh hoạt {formatCurrencyCompact(config.annualExpenses)}/năm và tỷ lệ tiết kiệm hiện tại, bạn sẽ <strong>đạt mục tiêu tài chính</strong> vào năm <strong>{naturalFIRE?.year || '????'}</strong> (tại độ tuổi <strong>{naturalFIRE?.age || '??'}</strong>). 
                        {naturalFIRE && naturalFIRE.age > config.retirementAge && <span className="block mt-1 text-rose-600 font-bold">Lưu ý: Mục tiêu nghỉ hưu ở tuổi {config.retirementAge} của bạn hiện chưa khả thi về mặt toán học.</span>}
                    </p>
                </div>
            </div>

            <div className="space-y-4 pt-6">
                <div className="flex items-center justify-between">
                    <button onClick={() => setShowTable(!showTable)} className="flex items-center gap-2 text-xs font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-4 py-2.5 rounded-xl transition-all active:scale-95"><TableIcon size={16} /> {showTable ? 'Ẩn bảng chi tiết' : 'Xem dòng tiền & Phân bổ chi tiết (Tuổi 30 - 99)'}</button>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 italic"><Info size={12} className="text-indigo-400" /><span>Yield = Bond Return + Cash Interest</span></div>
                </div>
                {showTable && <FIRESimulationTable data={simulationResults.simulation} retirementAge={config.retirementAge} />}
            </div>

            <SensitivityMatrix matrix={sensitivityMatrixData} currentSavingsRate={config.savingsRate} />
          </div>
        </div>

        <div className="p-6 bg-white border-t border-slate-100 shrink-0 z-20 shadow-2xl flex gap-3">
            <button onClick={onClose} className="flex-1 h-16 bg-slate-100 text-slate-500 rounded-2xl font-black text-sm uppercase tracking-widest active:scale-[0.98] transition-all">Hủy bỏ</button>
            <button onClick={handleSave} disabled={isSaving} className="flex-[2] h-16 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-[0.98] transition-all">{isSaving ? <Loader2 size={20} className="animate-spin" /> : <ShieldCheck size={20} className="text-emerald-400" />}Lưu kế hoạch FIRE</button>
        </div>
      </div>
    </div>
  );
};
