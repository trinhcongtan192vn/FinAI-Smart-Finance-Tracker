
import React, { useMemo, useState, useEffect } from 'react';
import { TrendingUp, Info } from 'lucide-react';
import { ResponsiveContainer, Sankey, Tooltip, Layer } from 'recharts';
import { currencyFormatter, formatCurrencyCompact, getCategoryLabel } from '../../lib/utils';
import { TransactionType } from '../../types';
import { useTranslation } from 'react-i18next';

interface IncomeFlowWidgetProps {
  income: number;
  expense: number;
  transactions: any[];
  categories: any[];
}

const COLORS = {
  stage1: '#0d9488', // Teal (Sources)
  stage2: '#4f46e5', // Indigo (Earned Income Hub)
  expenses: '#e11d48', // Rose
  debt: '#d97706',    // Amber
  invest: '#2563eb',  // Blue
  surplus: '#10b981', // Emerald
};

const SankeyNode = ({ x, y, width, height, index, payload, containerWidth }: any) => {
  const isRightSide = x > (containerWidth || 300) / 2;
  const isMobile = (containerWidth || 500) < 400;
  
  const labelFontSize = isMobile ? "9" : "10";
  const valueFontSize = isMobile ? "8" : "9";
  
  const offset = isMobile ? 6 : 8;
  const textAnchor = isRightSide ? 'end' : 'start';
  const textX = isRightSide ? x - offset : x + width + offset;

  return (
    <Layer key={`node-${index}`}>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={payload.color}
        fillOpacity={1}
        rx={isMobile ? 2 : 4}
      />
      <text
        x={textX}
        y={y + height / 2 - 2}
        textAnchor={textAnchor}
        fontSize={labelFontSize}
        fontWeight="800"
        fill="#1e293b"
      >
        {payload.name.length > 18 && isMobile ? `${payload.name.substring(0, 15)}...` : payload.name}
      </text>
      <text
        x={textX}
        y={y + height / 2 + 10}
        textAnchor={textAnchor}
        fontSize={valueFontSize}
        fontWeight="600"
        fill="#64748b"
      >
        {formatCurrencyCompact(payload.value)}
      </text>
    </Layer>
  );
};

export const IncomeFlowWidget: React.FC<IncomeFlowWidgetProps> = ({ transactions, categories }) => {
  const { t } = useTranslation();
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const updateWidth = () => {
      const el = document.getElementById('income-flow-container');
      if (el) setContainerWidth(el.offsetWidth);
    };
    updateWidth();
    const timeout = setTimeout(updateWidth, 100);
    window.addEventListener('resize', updateWidth);
    return () => {
      window.removeEventListener('resize', updateWidth);
      clearTimeout(timeout);
    };
  }, []);

  const sankeyData = useMemo(() => {
    const now = new Date();
    const targetMonth = now.getMonth();
    const targetYear = now.getFullYear();

    // Map categories fallback
    const catInfoMap = categories.reduce((acc, c) => {
      acc[c.name] = { group: c.group };
      return acc;
    }, {} as Record<string, { group: string }>);

    // Filter transactions for current month
    // Restrict to DAILY_CASHFLOW as requested
    const periodTx = transactions.filter(t => {
      const d = new Date(t.datetime);
      return (
        t.type === TransactionType.DAILY_CASHFLOW && 
        d.getMonth() === targetMonth && 
        d.getFullYear() === targetYear
      );
    });

    if (periodTx.length === 0) return null;

    const sources: Record<string, number> = {};
    const granular: Record<string, Record<string, number>> = {
      'Expenses': {},
      'Debt': {},
      'Investments': {}
    };

    periodTx.forEach(t => {
      const amt = Number(t.amount);
      const catInfo = catInfoMap[t.category];
      const effectiveGroup = t.group || catInfo?.group || 'EXPENSES';

      // 1. INFLOWS
      if (effectiveGroup === 'INCOME') {
        sources[t.category] = (sources[t.category] || 0) + amt;
      } 
      // 2. OUTFLOWS
      else {
        let targetOutflow = 'Expenses';
        
        // Determine outflow type based on Category Group or specific Keywords
        // Relying on `effectiveGroup` (from DB category group) is safer than name checks
        if (effectiveGroup === 'CAPITAL' || t.category === 'Financial Expense' || t.category === 'Chi phí lãi vay') {
           targetOutflow = 'Debt';
        } else if (effectiveGroup === 'ASSETS' || t.category === 'Investment' || t.category === 'Tiết kiệm') {
           targetOutflow = 'Investments';
        }

        granular[targetOutflow][t.category] = (granular[targetOutflow][t.category] || 0) + amt;
      }
    });

    const totalIncome = Object.values(sources).reduce((s, v) => s + v, 0);
    const totalOutflow = Object.values(granular).reduce((s, g) => s + Object.values(g).reduce((sum, v) => sum + v, 0), 0);
    
    // Surplus Calculation
    const surplus = Math.max(0, totalIncome - totalOutflow);
    if (surplus > 1000) { 
      granular['Investments']['Cash Surplus'] = (granular['Investments']['Cash Surplus'] || 0) + surplus;
    }

    const nodes: any[] = [];
    const nodeMap: Record<string, number> = {};
    const addNode = (name: string, color: string) => {
      if (nodeMap[name] !== undefined) return nodeMap[name];
      const idx = nodes.length;
      nodes.push({ name, color });
      nodeMap[name] = idx;
      return idx;
    };

    const links: any[] = [];
    
    // Labels
    const earnedIncomeLabel = t('income_flow.earned_income');
    const expensesLabel = t('income_flow.expenses');
    const debtLabel = t('income_flow.debt');
    const investmentsLabel = t('income_flow.investments');
    const surplusLabel = t('income_flow.cash_surplus');

    // Central Node
    const hubIdx = addNode(earnedIncomeLabel, COLORS.stage2);

    // Link Sources -> Hub
    Object.entries(sources).forEach(([name, value]) => {
      if (value <= 0) return;
      const translatedName = getCategoryLabel(name, t);
      const sIdx = addNode(translatedName, COLORS.stage1);
      links.push({ source: sIdx, target: hubIdx, value, color: COLORS.stage1 + '30' });
    });

    // Link Hub -> Destinations
    const outflowMeta = [
      { key: 'Expenses', label: expensesLabel, color: COLORS.expenses },
      { key: 'Debt', label: debtLabel, color: COLORS.debt },
      { key: 'Investments', label: investmentsLabel, color: COLORS.invest }
    ];

    outflowMeta.forEach(({ key, label, color }) => {
      const groupData = granular[key];
      const groupTotal = Object.values(groupData).reduce((s, v) => s + v, 0);
      
      if (groupTotal <= 0) return;

      const stage3Idx = addNode(label, color);
      links.push({ source: hubIdx, target: stage3Idx, value: groupTotal, color: color + '40' });

      // Link Destinations -> Detail Categories
      Object.entries(groupData)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6) // Limit visuals
        .forEach(([catName, catVal]) => {
          if (catVal <= 0) return;
          const translatedName = catName === 'Cash Surplus' ? surplusLabel : getCategoryLabel(catName, t);
          const stage4Idx = addNode(translatedName, catName === 'Cash Surplus' ? COLORS.surplus : color);
          links.push({ 
            source: stage3Idx, 
            target: stage4Idx, 
            value: catVal, 
            color: (catName === 'Cash Surplus' ? COLORS.surplus : color) + '20' 
          });
        });
    });

    if (nodes.length <= 1 || links.length === 0) return null;

    return { nodes, links };
  }, [transactions, categories, t]);

  return (
    <div className="bg-white p-5 sm:p-6 rounded-[2.5rem] shadow-soft border border-indigo-50/50 flex flex-col gap-5 sm:gap-6">
      <div className="flex items-center justify-between">
         <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
               <TrendingUp size={22} />
            </div>
            <div>
               <h3 className="font-black text-slate-900 text-base leading-none">{t('income_flow.title')}</h3>
               <p className="text-[10px] font-black uppercase text-indigo-500 tracking-widest mt-1">{t('income_flow.subtitle')}</p>
            </div>
         </div>
      </div>

      <div id="income-flow-container" className="h-[480px] sm:h-[520px] w-full relative">
        {sankeyData ? (
          <ResponsiveContainer width="100%" height="100%">
            <Sankey
              data={sankeyData}
              node={<SankeyNode containerWidth={containerWidth} />} 
              link={{ stroke: '#cbd5e1', strokeOpacity: 0.2 }}
              margin={{ 
                left: containerWidth < 400 ? 5 : 10, 
                right: containerWidth < 400 ? 10 : 20,
                top: 10, 
                bottom: 10 
              }}
              nodeWidth={containerWidth < 400 ? 8 : 12}
              nodePadding={containerWidth < 400 ? 22 : 30}
            >
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const isNode = data.name !== undefined;
                    const label = isNode ? data.name : `${data.source.name} → ${data.target.name}`;
                    return (
                      <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 sm:p-4 rounded-2xl shadow-2xl border border-white/10 text-xs min-w-[140px] sm:min-w-[180px]">
                         <p className="font-black text-[9px] sm:text-[10px] uppercase tracking-widest text-indigo-300 mb-1">{label}</p>
                         <p className="text-base sm:text-lg font-black">{currencyFormatter.format(payload[0].value)}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </Sankey>
          </ResponsiveContainer>
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center text-slate-300 gap-3 border-2 border-dashed border-slate-50 rounded-[2rem]">
            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center">
              <TrendingUp size={32} className="opacity-10" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-center px-6">{t('common.no_data')}</p>
          </div>
        )}
      </div>
      
      <div className="flex flex-wrap gap-x-4 gap-y-2 pt-4 border-t border-slate-50">
        {[
          { label: t('income_flow.legend_source'), color: 'bg-teal-500' },
          { label: t('income_flow.legend_income'), color: 'bg-indigo-600' },
          { label: t('income_flow.legend_outflow'), color: 'bg-rose-500' },
          { label: t('income_flow.legend_surplus'), color: 'bg-emerald-500' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${item.color}`} />
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
