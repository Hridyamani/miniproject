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

  // STAGE C: Left Out Items
  leftOutItems: any[] = [];
  newLeftOut = { item: '', amount: 0 };

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

  // Section C Actions
  addLeftOut() {
    if (this.newLeftOut.item && this.newLeftOut.amount > 0) {
      this.leftOutItems.push({ ...this.newLeftOut });
      this.newLeftOut = { item: '', amount: 0 };
    }
  }
  removeLeftOut(i: number) { this.leftOutItems.splice(i, 1); }

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
    const totalBills = this.bills.reduce((sum, b) => sum + b.amount, 0);
    const totalCommonExp = this.commonExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalLeftOut = this.leftOutItems.reduce((sum, l) => sum + l.amount, 0);

    // Mess Consumption (excluding milk)
    const totalMessConsumption = (this.previousMonthLeftOut + totalBills + totalCommonExp) - totalLeftOut;
    
    // Total Mess Days of ALL inmates
    const totalAllMessDays = this.allInmates.reduce((sum, i) => sum + (i.messDays || 0), 0) || 1;
    
    // Daily Mess Rate
    const dailyMessRate = totalMessConsumption / totalAllMessDays;

    this.finalReport = this.allInmates.map(i => {
      const messBill = dailyMessRate * (i.messDays || 0);
      const milkBill = this.dailyMilkRate * (i.milkTakenDays || 0);
      const totalAmount = messBill + milkBill;
      
      return {
        ...i,
        dailyMessRate,
        messBill,
        milkBill,
        totalAmount
      };
    });

    // Save current leftovers to backend
    this.saveInventory(totalLeftOut);

    this.stage = 5;
  }

  saveInventory(amount: number) {
    const data = {
      month: this.selectedMonth,
      year: this.selectedYear,
      leftOutAmount: amount
    };
    this.http.post('http://localhost:5000/api/authority/mess-inventory', data, this.headers).subscribe({
      next: () => console.log('Monthly leftovers saved'),
      error: err => console.error('Failed to save leftovers:', err.error?.message)
    });
  }

  printReport() {
    let csv = 'Name,Role,Mess Days,Milk Days,Mess Bill (₹),Milk Bill (₹),Total Bill (₹)\n';
    this.finalReport.forEach(r => {
      csv += `${r.name},${r.role},${r.messDays},${r.milkTakenDays},${r.messBill.toFixed(2)},${r.milkBill.toFixed(2)},${r.totalAmount.toFixed(2)}\n`;
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
