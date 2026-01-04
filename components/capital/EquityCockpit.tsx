import React from 'react';
import { Account } from '../../types';
import { EquityAllocationTreemap } from './EquityAllocationTreemap';
import { EquityGrowthChart } from './EquityGrowthChart';
import { EquitySourceAnalysis } from './EquitySourceAnalysis';

interface EquityCockpitProps {
  equityAccounts: Account[];
  assets: Account[];
  uid: string;
}

export const EquityCockpit: React.FC<EquityCockpitProps> = ({ equityAccounts, assets, uid }) => {
  return (
    <div className="flex flex-col gap-10 pb-10 animate-in fade-in duration-500">
      <section>
        <EquityAllocationTreemap equityAccounts={equityAccounts} assets={assets} />
      </section>

      <section>
        <EquityGrowthChart uid={uid} equityAccounts={equityAccounts} />
      </section>

      <section>
        <EquitySourceAnalysis uid={uid} equityAccounts={equityAccounts} />
      </section>
    </div>
  );
};