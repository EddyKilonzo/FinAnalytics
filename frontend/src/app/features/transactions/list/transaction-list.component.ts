import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { 
  lucidePlus, lucideSearch, lucideFilter, lucideMoreHorizontal, 
  lucideArrowUpRight, lucideArrowDownLeft, lucideCoffee, lucideShoppingCart, 
  lucideCar, lucideHome, lucideMonitor, lucideBriefcase, lucideEdit2, lucideTrash2, lucideSparkles
} from '@ng-icons/lucide';
import { AddTransactionComponent } from '../add/add-transaction.component';
import { TransactionService } from '../../../core/services/transaction.service';
import { ToastService } from '../../../shared/toast/toast.service';
import { getBackendErrorMessage } from '../../../core/utils/backend-error';

export interface Transaction {
  id: string;
  title: string;
  merchant: string;
  date: string;
  amount: number;
  type: 'expense' | 'income';
  category: string;
  categoryColor?: string | null;
  icon: string;
  aiSuggested?: boolean;
}

@Component({
  selector: 'app-transaction-list',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, AddTransactionComponent],
  viewProviders: [
    provideIcons({ 
      lucidePlus, lucideSearch, lucideFilter, lucideMoreHorizontal,
      lucideArrowUpRight, lucideArrowDownLeft, lucideCoffee, lucideShoppingCart,
      lucideCar, lucideHome, lucideMonitor, lucideBriefcase, lucideEdit2, lucideTrash2, lucideSparkles
    })
  ],
  templateUrl: './transaction-list.component.html',
  styleUrls: ['./transaction-list.component.css']
})
export class TransactionListComponent implements OnInit {
  private transactionService = inject(TransactionService);
  private toast = inject(ToastService);
  
  allTransactions = signal<Transaction[]>([]);
  searchQuery = signal('');
  typeFilter = signal<'all' | 'income' | 'expense'>('all');

  filteredTransactions = computed(() => {
    const list = this.allTransactions();
    const q = this.searchQuery().toLowerCase().trim();
    const type = this.typeFilter();
    let result = list;
    if (type !== 'all') {
      result = result.filter((tx) => tx.type === type);
    }
    if (q) {
      result = result.filter(
        (tx) =>
          tx.title?.toLowerCase().includes(q) ||
          tx.merchant?.toLowerCase().includes(q) ||
          tx.category?.toLowerCase().includes(q) ||
          (tx.amount != null && String(tx.amount).includes(q))
      );
    }
    return result;
  });

  isAddModalOpen = signal(false);
  editingTransaction = signal<Transaction | null>(null);

  ngOnInit() {
    this.loadTransactions();
  }

  loadTransactions() {
    this.transactionService.getTransactions({ limit: 100 }).subscribe({
      next: (response) => {
        const items: any[] = Array.isArray(response.data)
          ? response.data
          : (response.data?.transactions ?? response.data?.items ?? []);
        const mapped = items.map((tx: any) => {
          const rawCategory = tx.category?.name || (tx.type === 'income' ? 'Income' : 'Other');
          const category = rawCategory === 'Other' && tx.type === 'income' ? 'Income' : rawCategory;
          return {
            id: tx.id,
            title: tx.description,
            merchant: tx.incomeSource || tx.description,
            date: tx.date,
            amount: tx.amount,
            type: tx.type,
            category,
            categoryColor: tx.category?.color ?? this.getCategoryColor(category),
            icon: this.getIconForCategory(category),
            aiSuggested: !!tx.suggestedCategoryId,
          };
        });
        this.allTransactions.set(mapped);
      },
      error: (err) => this.toast.error(getBackendErrorMessage(err, 'Failed to load transactions.')),
    });
  }

  private getIconForCategory(category: string): string {
    const map: Record<string, string> = {
      'Food & Dining': 'lucideCoffee',
      'Groceries': 'lucideShoppingCart',
      'Transport': 'lucideCar',
      'Utilities': 'lucideHome',
      'Electronics': 'lucideMonitor',
      'Salary': 'lucideBriefcase',
      'Income': 'lucideArrowDownLeft',
      'Entertainment': 'lucideShoppingCart',
      'Health': 'lucidePlus',
      'Other': 'lucideMoreHorizontal'
    };
    return map[category] || 'lucideMoreHorizontal';
  }

  /** Fallback category color when API doesn't return one. Used in template for category tag. */
  getCategoryColor(categoryName: string): string {
    const map: Record<string, string> = {
      'Food & Dining': '#22c55e',
      'Groceries': '#10b981',
      'Transport': '#3b82f6',
      'Utilities': '#8b5cf6',
      'Electronics': '#6366f1',
      'Salary': '#059669',
      'Income': '#059669',
      'Entertainment': '#ec4899',
      'Health': '#ef4444',
      'Other': '#64748b'
    };
    return map[categoryName] || '#64748b';
  }

  openAddModal() {
    this.editingTransaction.set(null);
    this.isAddModalOpen.set(true);
  }

  openEditModal(transaction: Transaction) {
    this.editingTransaction.set(transaction);
    this.isAddModalOpen.set(true);
  }

  closeModal() {
    this.isAddModalOpen.set(false);
    this.editingTransaction.set(null);
  }

  saveTransaction(transaction: any) {
    const payload = {
      description: transaction.title || transaction.merchant,
      incomeSource: transaction.merchant ? String(transaction.merchant).trim() : undefined,
      amount: transaction.amount,
      type: transaction.type,
      date: new Date(transaction.date).toISOString(),
      categoryId: transaction.categoryId || undefined
    };

    if (this.editingTransaction()) {
      this.transactionService.updateTransaction(transaction.id, payload).subscribe({
        next: () => {
          this.toast.success('Transaction updated successfully.');
          this.loadTransactions();
          this.closeModal();
        },
        error: (err) => this.toast.error(getBackendErrorMessage(err, 'Could not update transaction.'))
      });
    } else {
      this.transactionService.createTransaction(payload).subscribe({
        next: () => {
          this.toast.success('Transaction recorded successfully.');
          this.loadTransactions();
          this.closeModal();
        },
        error: (err) => this.toast.error(getBackendErrorMessage(err, 'Could not record transaction.'))
      });
    }
  }

  deleteTransaction(id: string) {
    this.transactionService.deleteTransaction(id).subscribe({
      next: () => {
        this.toast.success('Transaction deleted.');
        this.loadTransactions();
      },
      error: (err) => this.toast.error(getBackendErrorMessage(err, 'Could not delete transaction.'))
    });
  }
}
