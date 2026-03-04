import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideX, lucideDollarSign, lucideCalendar, lucideTag, lucideAlignLeft, lucideStore, lucideCoffee, lucideShoppingCart, lucideCar, lucideHome, lucideMonitor, lucideBriefcase, lucidePlus, lucideMoreHorizontal, lucideSparkles, lucideLoader2 } from '@ng-icons/lucide';
import { CategoryService } from '../../../core/services/category.service';

@Component({
  selector: 'app-add-transaction',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgIconComponent],
  viewProviders: [
    provideIcons({ lucideX, lucideDollarSign, lucideCalendar, lucideTag, lucideAlignLeft, lucideStore, lucideCoffee, lucideShoppingCart, lucideCar, lucideHome, lucideMonitor, lucideBriefcase, lucidePlus, lucideMoreHorizontal, lucideSparkles, lucideLoader2 })
  ],
  templateUrl: './add-transaction.component.html',
  styleUrls: ['./add-transaction.component.css']
})
export class AddTransactionComponent implements OnInit {
  @Input() transaction: any = null;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<any>();

  private categoryService = inject(CategoryService);

  transactionForm!: FormGroup;

  categories: { id: string, name: string }[] = [];

  isPredicting = false;
  aiSuggestedCategoryId: string | null = null;
  predictTimeout: any;

  constructor(private fb: FormBuilder) {}

  ngOnInit() {
    this.initForm();
    this.loadCategories();
    
    if (this.transaction) {
      this.transactionForm.patchValue({
        ...this.transaction,
        date: this.formatDateForInput(this.transaction.date)
      });
      // Try to find matching category by name if transaction has category string instead of ID
      if (this.transaction.category && !this.transaction.categoryId) {
        const cat = this.categories.find(c => c.name === this.transaction.category);
        if (cat) {
          this.transactionForm.patchValue({ categoryId: cat.id });
        }
      }
    }

    // Listen for changes on title/merchant to auto-predict category
    this.transactionForm.get('title')?.valueChanges.subscribe(val => this.triggerAiPrediction(val));
    this.transactionForm.get('merchant')?.valueChanges.subscribe(val => this.triggerAiPrediction(val));
  }

  private loadCategories() {
    this.categoryService.getCategories().subscribe(res => {
      this.categories = res.data;
      
      // If editing, wait for categories to load to match categoryId by name if needed
      if (this.transaction && this.transaction.category && !this.transaction.categoryId) {
        const cat = this.categories.find(c => c.name === this.transaction.category);
        if (cat) {
          this.transactionForm.patchValue({ categoryId: cat.id });
        }
      } else if (!this.transaction && this.categories.length > 0) {
        // Set default category
        const defaultCat = this.categories.find(c => c.name === 'Food & Dining') || this.categories[0];
        this.transactionForm.patchValue({ categoryId: defaultCat.id });
      }
    });
  }

  /** Keyword → category name (must match seeded category names). */
  private static readonly PREDICTION_RULES: { keywords: string[]; categoryName: string }[] = [
    { keywords: ['coffee', 'starbucks', 'cafe', 'restaurant', 'lunch', 'dinner', 'breakfast', 'food', 'grocer', 'supermarket', 'nakumatt', 'tuskys', 'naivas', 'market', 'milk', 'bread', 'vegetables'], categoryName: 'Food & Dining' },
    { keywords: ['uber', 'lyft', 'bolt', 'matatu', 'boda', 'boda-boda', 'fuel', 'petrol', 'gas', 'parking', 'transport', 'taxi', 'fare'], categoryName: 'Transport' },
    { keywords: ['movie', 'netflix', 'spotify', 'cinema', 'streaming', 'gaming', 'game', 'hobby', 'music'], categoryName: 'Entertainment' },
    { keywords: ['party', 'club', 'bar', 'out', 'event', 'gift', 'friends', 'social'], categoryName: 'Social' },
    { keywords: ['electric', 'water', 'internet', 'airtime', 'data', 'safaricom', 'airtel', 'telkom', 'paybill', 'm-pesa', 'mpesa', 'bill', 'utility', 'token'], categoryName: 'Utilities' },
    { keywords: ['pharmacy', 'doctor', 'clinic', 'hospital', 'health', 'medicine', 'gym', 'fitness'], categoryName: 'Health' },
    { keywords: ['school', 'tuition', 'helb', 'books', 'course', 'university', 'college', 'education', 'stationery'], categoryName: 'Education' },
    { keywords: ['clothes', 'clothing', 'shoes', 'fashion', 'tailor'], categoryName: 'Clothing' },
    { keywords: ['rent', 'housing', 'house', 'landlord', 'room'], categoryName: 'Rent & Housing' },
    { keywords: ['savings', 'save', 'chama', 'm-shwari', 'mshwari', 'investment', 'transfer to save'], categoryName: 'Savings' },
    { keywords: ['salary', 'payroll', 'income', 'freelance', 'payment received', 'helb disbursement', 'stipend'], categoryName: 'Income' },
  ];

  private triggerAiPrediction(text: string) {
    if (!text || text.length < 3 || this.categories.length === 0) return;
    
    if (this.predictTimeout) clearTimeout(this.predictTimeout);
    this.isPredicting = true;
    this.aiSuggestedCategoryId = null;

    this.predictTimeout = setTimeout(() => {
      const lowerText = text.toLowerCase().trim();
      let categoryName: string | null = null;

      for (const rule of AddTransactionComponent.PREDICTION_RULES) {
        if (rule.keywords.some(kw => lowerText.includes(kw))) {
          categoryName = rule.categoryName;
          break;
        }
      }

      // Only suggest when we matched a real category; don't force "Other"
      if (categoryName) {
        const predictedCategory = this.categories.find(c => c.name === categoryName);
        if (predictedCategory) {
          this.transactionForm.get('categoryId')?.setValue(predictedCategory.id);
          this.aiSuggestedCategoryId = predictedCategory.id;
        }
      }
      this.isPredicting = false;
    }, 500);
  }

  private initForm() {
    this.transactionForm = this.fb.group({
      id: [''],
      title: ['', Validators.required],
      merchant: ['', Validators.required],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      type: ['expense', Validators.required],
      categoryId: ['', Validators.required],
      date: [this.formatDateForInput(new Date().toISOString()), Validators.required]
    });
  }

  private formatDateForInput(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toISOString().slice(0, 16);
  }

  onSubmit() {
    if (this.transactionForm.valid) {
      const formValue = this.transactionForm.value;
      if (this.aiSuggestedCategoryId === formValue.categoryId) {
        formValue.aiSuggested = true;
      }
      this.save.emit(formValue);
    } else {
      this.transactionForm.markAllAsTouched();
    }
  }

  onClose() {
    this.close.emit();
  }

  setTransactionType(type: 'expense' | 'income') {
    this.transactionForm.get('type')?.setValue(type);
  }
}
