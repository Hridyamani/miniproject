import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { TopbarComponent } from '../../../components/topbar/topbar.component';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'web-tracking-history',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, TopbarComponent],
  templateUrl: './tracking-history.component.html',
  styleUrls: ['./tracking-history.component.css']
})
export class TrackingHistoryComponent implements OnInit {
  logs: any[] = [];
  selectedMonth = new Date().getMonth() + 1;
  selectedYear = new Date().getFullYear();
  loading = false;
  months = [
    { v: 1, n: 'January' }, { v: 2, n: 'February' }, { v: 3, n: 'March' },
    { v: 4, n: 'April' }, { v: 5, n: 'May' }, { v: 6, n: 'June' },
    { v: 7, n: 'July' }, { v: 8, n: 'August' }, { v: 9, n: 'September' },
    { v: 10, n: 'October' }, { v: 11, n: 'November' }, { v: 12, n: 'December' }
  ];

  constructor(private http: HttpClient, private auth: AuthService) { }

  ngOnInit() {
    this.loadHistory();
  }

  get headers() {
    return { headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.userValue?.token}` }) };
  }

  loadHistory() {
    this.loading = true;
    this.http.get<any>(`http://localhost:5000/api/admin/return-tracking?month=${this.selectedMonth}&year=${this.selectedYear}`, this.headers).subscribe({
      next: res => {
        this.logs = res.tracking || [];
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }
}
