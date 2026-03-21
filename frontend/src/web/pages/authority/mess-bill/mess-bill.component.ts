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
  // Expenses inputs
  bills: any[] = [];
  newItemName = '';
  newItemAmount = null;
  newItemCategory = 'common';
  
  milkPriceStr: string = '0';
  cookSalaryStr: string = '0';
  matronSalaryStr: string = '0';
  eventsSalaryStr: string = '0';

  billingMonth: string = (new Date().getFullYear()) + '-' + (new Date().getMonth() + 1).toString().padStart(2, '0');
  
  get selectedMonth() { return this.billingMonth.split('-')[1]; }
  get selectedYear() { return this.billingMonth.split('-')[0]; }

  // Data
  studentsData: any[] = [];
  finalBill: any[] = [];
  
  loading = false;
  stage = 1; // 1: Expenses, 2: Fetch Data & Review, 3: Final Bill

  constructor(private http: HttpClient, private auth: AuthService) {}

  ngOnInit() {}

  get headers() {
    return { headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.userValue?.token}` }) };
  }

  addBill() {
    if (this.newItemName && this.newItemAmount) {
      this.bills.push({
        name: this.newItemName,
        amount: Number(this.newItemAmount),
        category: this.newItemCategory
      });
      this.newItemName = '';
      this.newItemAmount = null;
      this.newItemCategory = 'common';
    }
  }

  removeBill(index: number) {
    this.bills.splice(index, 1);
  }

  get totalVeg() { return this.bills.filter(b => b.category === 'veg').reduce((sum, b) => sum + b.amount, 0); }
  get totalNonVeg() { return this.bills.filter(b => b.category === 'non-veg').reduce((sum, b) => sum + b.amount, 0); }
  get totalCommonFood() { return this.bills.filter(b => b.category === 'common').reduce((sum, b) => sum + b.amount, 0); }
  
  get milkPrice() { return Number(this.milkPriceStr) || 0; }
  get cookSalary() { return Number(this.cookSalaryStr) || 0; }
  get matronSalary() { return Number(this.matronSalaryStr) || 0; }
  get eventsSalary() { return Number(this.eventsSalaryStr) || 0; }
  get totalCommonExpenses() { return this.cookSalary + this.matronSalary + this.eventsSalary; }

  nextStage() {
    if (this.stage === 1) {
      this.loadData();
    } else if (this.stage === 2) {
      this.calculateBill();
    }
  }

  loadData() {
    this.loading = true;
    this.http.get<any>(`http://localhost:5000/api/authority/mess-bill-data?month=${this.selectedMonth}&year=${this.selectedYear}`, this.headers)
      .subscribe({
        next: (res) => {
          this.studentsData = res.data || [];
          this.stage = 2;
          this.loading = false;
        },
        error: () => {
          alert('Failed to load student data');
          this.loading = false;
        }
      });
  }

  calculateBill() {
    // 1. Student counts
    const vegCount = this.studentsData.filter(s => s.foodType === 'veg').length || 1; 
    const nonVegCount = this.studentsData.filter(s => s.foodType === 'non-veg').length || 1;
    const totalStudents = this.studentsData.length || 1;

    // 2. Base per day calculations (optional, but requested: "divide by student counts... gives per-day cost..."). 
    // Wait, the prompt says "divide by student counts... Multiply by mess days". 
    // But if we divide by count, it's per month cost per person, then we should divide by total mess days? 
    // Wait, the prompt: "Veg total -> divided among only veg students... Non-veg total -> non-veg... This gives per-day cost". 
    // Actually per-day cost would be Total / (Total Mess Days of all Veg students). 
    
    // Sum of mess days for each group
    const totalVegMessDays = this.studentsData.filter(s => s.foodType === 'veg').reduce((sum, s) => sum + s.messDays, 0) || 1;
    const totalNonVegMessDays = this.studentsData.filter(s => s.foodType === 'non-veg').reduce((sum, s) => sum + s.messDays, 0) || 1;
    const totalCommonMessDays = this.studentsData.reduce((sum, s) => sum + s.messDays, 0) || 1;

    const perDayVeg = this.totalVeg / totalVegMessDays;
    const perDayNonVeg = this.totalNonVeg / totalNonVegMessDays;
    const perDayCommonFood = this.totalCommonFood / totalCommonMessDays;
    
    // common bill per student (flat rate per month)
    const perStudentCommonBill = this.totalCommonExpenses / totalStudents;

    this.finalBill = this.studentsData.map(s => {
      let foodPart = (s.foodType === 'veg' ? perDayVeg : perDayNonVeg) * s.messDays;
      let commonFoodPart = perDayCommonFood * s.messDays;
      let milkAmount = this.milkPrice * (s.milkTakenDays || 0);
      let total = foodPart + commonFoodPart + milkAmount + perStudentCommonBill;

      return {
        ...s,
        foodCharge: foodPart,
        commonFoodShare: commonFoodPart,
        milkAmount: milkAmount,
        commonBillShare: perStudentCommonBill,
        totalAmount: total
      };
    });

    this.stage = 3;
  }
}
