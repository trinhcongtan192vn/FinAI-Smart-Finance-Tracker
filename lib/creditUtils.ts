
import { CreditCardDetails } from "../types";

export interface CreditCardStatus {
  utilization: number; // 0-100
  available: number;
  daysToDue: number;
  statementDate: Date;
  dueDate: Date;
  statusColor: string; // 'green' | 'yellow' | 'red'
  isGracePeriod: boolean;
  minimumPayment: number;
  isStatementOpen: boolean; // True if we passed statement day but before due date (Payment Window)
  billingCycleLabel: string;
}

export const getCreditCardStatus = (
  currentBalance: number,
  details: CreditCardDetails
): CreditCardStatus => {
  const now = new Date();
  const currentDay = now.getDate();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // 1. Calculate Minimum Payment (Usually 5% of outstanding balance)
  const minimumPayment = Math.round(currentBalance * 0.05);

  // 2. Logic for Due Date & Statement Date
  
  // Current month's statement day
  let statementDate = new Date(currentYear, currentMonth, details.statement_day);
  
  // If today is BEFORE statement day, the relevant statement was LAST month's
  if (currentDay < details.statement_day) {
      statementDate = new Date(currentYear, currentMonth - 1, details.statement_day);
  }

  let dueDate = new Date(currentYear, currentMonth, details.due_day);
  
  // Logic for Due Date Relative to Statement
  // Usually Due Date is 15-45 days AFTER Statement Date.
  
  // Scenario A: Statement Day 20, Due Day 5 (Next Month)
  if (details.due_day < details.statement_day) {
      // If we are past statement day (e.g. 25th), Due date is next month (5th)
      if (currentDay >= details.statement_day) {
          dueDate = new Date(currentYear, currentMonth + 1, details.due_day);
      } else {
          // If we are before statement day (e.g. 15th), Due date is this month (5th) 
          // (Relating to statement from previous month)
          dueDate = new Date(currentYear, currentMonth, details.due_day);
      }
  } else {
      // Scenario B: Statement Day 5, Due Day 25 (Same Month)
      // If we are past statement day (10th), Due date is this month (25th)
      if (currentDay >= details.statement_day) {
          dueDate = new Date(currentYear, currentMonth, details.due_day);
      } else {
          // Before statement day, Due date was last month? Or we look forward?
          // Usually cycle implies forward looking.
          // If today 2nd. Next Stmt 5th. Due 25th.
          dueDate = new Date(currentYear, currentMonth, details.due_day);
      }
  }

  const diffTime = dueDate.getTime() - now.getTime();
  const daysToDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const available = Math.max(0, details.credit_limit - currentBalance);
  const utilization = details.credit_limit > 0 
    ? (currentBalance / details.credit_limit) * 100 
    : 0;

  let statusColor = 'green';
  if (utilization > 80) statusColor = 'red';
  else if (utilization > 30) statusColor = 'yellow';

  // Grace Period / Payment Window Logic
  // We are in "Statement Open" mode if Today >= StatementDate AND CurrentBalance > 0
  // This implies the statement has been issued and user needs to pay.
  const isStatementOpen = now >= statementDate && currentBalance > 1000;

  const isGracePeriod = currentBalance > 0 && daysToDue > 0 && daysToDue <= 45;

  const billingCycleLabel = `Kỳ ${statementDate.toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit'})} - ${dueDate.toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit'})}`;

  return {
    utilization,
    available,
    daysToDue,
    statementDate,
    dueDate,
    statusColor,
    isGracePeriod,
    minimumPayment,
    isStatementOpen,
    billingCycleLabel
  };
};
