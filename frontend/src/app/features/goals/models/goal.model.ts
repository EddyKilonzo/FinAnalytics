export interface Goal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  icon: string;
  colorClass: string;
  status: 'active' | 'completed' | 'paused';
}
