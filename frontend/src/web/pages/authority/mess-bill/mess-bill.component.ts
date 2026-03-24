import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { TopbarComponent } from '../../../components/topbar/topbar.component';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'web-mess-bill',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, TopbarComponent],
  templateUrl: './mess-bill.component.html',
  styleUrls: ['./mess-bill.component.css']
})
export class MessBillComponent implements OnInit {
  stage = 1; // 1:A, 2:B, 3:C, 4:D, 5:E
  loading = false;

  // STAGE A: Bills
  billingMonth: string = (new Date().getFullYear()) + '-' + (new Date().getMonth() + 1).toString().padStart(2, '0');
  bills: any[] = [];
  newItem = { type: '', shop: '', category: 'common', amount: 0, file: null };
  previousMonthLeftOut: number = 0;

  // STAGE B: Common Expenses
  commonExpenses: any[] = [];
  newExpense = { type: '', amount: 0 };

  // STAGE C: Stock Valuation
  extraStockAmount: number = 0;

  // STAGE D: Data
  allInmates: any[] = []; 

  // STAGE E: Results
  finalReport: any[] = [];

  constructor(private http: HttpClient, private auth: AuthService) {}

  ngOnInit() {}

  get headers() {
    return { headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.userValue?.token}` }) };
  }

  get selectedMonth() { return this.billingMonth.split('-')[1]; }
  get selectedYear() { return this.billingMonth.split('-')[0]; }

  // Section A Actions
  addBill() {
    if (this.newItem.type && this.newItem.amount > 0) {
      this.bills.push({ ...this.newItem });
      this.newItem = { type: '', shop: '', category: 'common', amount: 0, file: null };
    }
  }
  removeBill(i: number) { this.bills.splice(i, 1); }

  onFileChange(event: any) {
    if (event.target.files && event.target.files.length > 0) {
      this.newItem.file = event.target.files[0];
    }
  }

  // Section B Actions
  addExpense() {
    if (this.newExpense.type && this.newExpense.amount > 0) {
      this.commonExpenses.push({ ...this.newExpense });
      this.newExpense = { type: '', amount: 0 };
    }
  }
  removeExpense(i: number) { this.commonExpenses.splice(i, 1); }



  // Navigation
  goToB() { if (this.bills.length > 0) this.stage = 2; else alert('Add at least one bill'); }
  goToC() { this.stage = 3; }
  goToD() {
    this.loading = true;
    this.http.get<any>(`http://localhost:5000/api/authority/mess-bill-data?month=${this.selectedMonth}&year=${this.selectedYear}`, this.headers)
      .subscribe({
        next: (res) => {
          this.allInmates = res.data || [];
          this.previousMonthLeftOut = res.previousLeftOut || 0;
          this.stage = 4;
          this.loading = false;
        },
        error: () => {
          alert('Failed to load inmate data');
          this.loading = false;
        }
      });
  }

  dailyMilkRate: number = 0;

  // Section E: Final Calculation
  calculateFinal() {
    const totalInmates = this.allInmates.length || 1;
    
    // Categorized Bills from Category A
    const commonFoodBills = this.bills.filter(b => b.category === 'common').reduce((sum, b) => sum + b.amount, 0);
    const vegFoodBills = this.bills.filter(b => b.category === 'veg').reduce((sum, b) => sum + b.amount, 0);
    const nonVegFoodBills = this.bills.filter(b => b.category === 'non-veg').reduce((sum, b) => sum + b.amount, 0);

    // Stock Adjustment (Apply to common food cost as it's general)
    const adjustedCommonFood = (this.previousMonthLeftOut + commonFoodBills) - this.extraStockAmount;

    // Fixed Common Expenses from Category B
    const totalFixedCommonExp = this.commonExpenses.reduce((sum, e) => sum + e.amount, 0);
    const commonBillShare = totalFixedCommonExp / totalInmates;

    // Mess Days Aggregates for Rate Calculation
    const totalAllMessDays = this.allInmates.reduce((sum, i) => sum + (i.messDays || 0), 0) || 1;
    const totalVegMessDays = this.allInmates.filter(i => i.foodType === 'veg').reduce((sum, i) => sum + (i.messDays || 0), 0) || 1;
    const totalNonVegMessDays = this.allInmates.filter(i => i.foodType === 'non-veg').reduce((sum, i) => sum + (i.messDays || 0), 0) || 1;

    // Per-Day Rates
    const commonDailyRate = adjustedCommonFood / totalAllMessDays;
    const vegDailyRate = vegFoodBills / totalVegMessDays;
    const nonVegDailyRate = nonVegFoodBills / totalNonVegMessDays;

    this.finalReport = this.allInmates.map(i => {
      const categoryRate = i.foodType === 'veg' ? vegDailyRate : nonVegDailyRate;
      
      const messBill = (commonDailyRate + categoryRate) * (i.messDays || 0);
      const milkBill = this.dailyMilkRate * (i.milkTakenDays || 0);
      const totalAmount = messBill + commonBillShare + milkBill;
      
      return {
        ...i,
        commonDailyRate,
        categoryRate,
        perDayRate: commonDailyRate + categoryRate,
        commonBillShare,
        messBill,
        milkBill,
        totalAmount
      };
    });

    // Save current leftovers to backend
    this.saveInventory(this.extraStockAmount);

    this.stage = 5;
  }

  saveInventory(amount: number) {
    const data = {
      month: this.selectedMonth,
      year: this.selectedYear,
      leftOutAmount: amount
    };
    this.http.post('http://localhost:5000/api/authority/mess-inventory', data, this.headers).subscribe({
      next: () => {},
      error: () => {}
    });
  }

  printReport() {
    let csv = 'Name,Role,Food,Mess Days,Mess Bill (₹),Common Share (₹),Milk Bill (₹),Total Bill (₹)\n';
    this.finalReport.forEach(r => {
      csv += `${r.name},${r.role},${r.foodType},${r.messDays},${r.messBill.toFixed(2)},${r.commonBillShare.toFixed(2)},${r.milkBill.toFixed(2)},${r.totalAmount.toFixed(2)}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mess-bill-${this.billingMonth}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }
}
