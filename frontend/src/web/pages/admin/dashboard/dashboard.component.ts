import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { TopbarComponent } from '../../../components/topbar/topbar.component';
import { AuthService } from '../../../services/auth.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'web-admin-dashboard',
  standalone: true,
  imports: [CommonModule, SidebarComponent, TopbarComponent, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  stats: any;
  returnTracking: any[] = [];
  isLoading = true;
  isRefreshing = false;
  private pollInterval: any;

  constructor(private http: HttpClient, public auth: AuthService) { }

  ngOnInit() {
    this.refreshData();
    // Refresh every 30 seconds
    this.pollInterval = setInterval(() => {
      this.loadStats();
      this.loadReturnTracking();
    }, 30000);
  }

  ngOnDestroy() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  get headers() {
    return { headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.userValue?.token}` }) };
  }

  refreshData() {
    this.isRefreshing = true;
    this.loadStats();
    this.loadReturnTracking();
    setTimeout(() => this.isRefreshing = false, 1000);
  }

  loadStats() {
    this.http.get<any>('http://localhost:5000/api/admin/dashboard-stats', this.headers).subscribe({
      next: (res) => {
        this.stats = res.stats;
        this.isLoading = false;
      },
      error: () => this.isLoading = false
    });
  }

  loadReturnTracking() {
    this.http.get<any>('http://localhost:5000/api/admin/return-tracking', this.headers).subscribe({
      next: (res) => {
        this.returnTracking = (res.tracking || []).slice(0, 50);
      },
      error: () => { }
    });
  }
}
