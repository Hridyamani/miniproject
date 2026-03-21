import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { TopbarComponent } from '../../../components/topbar/topbar.component';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'web-faculty-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, TopbarComponent, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  providers: []
})
export class FacultyDashboardComponent implements OnInit {
  user: any;
  notifications: any[] = [];
  stats = { attendanceCount: 0, messCutCount: 0, homeGoingCount: 0 };
  
  foodPreferenceWindow: any;
  isWindowOpen = false;
  isDurationValid = true;
  validUntilDate: Date | null = null;
  durationMonths = 3;
  editingFoodType = 'non-veg';
  foodMsg = '';
  foodMsgType = '';

  constructor(private http: HttpClient, private auth: AuthService) { }

  ngOnInit() {
    this.user = this.auth.userValue;
    this.loadProfileDetails();
    this.loadStats();
    this.loadNotifications();
  }

  loadProfileDetails() {
    this.http.get<any>('http://localhost:5000/api/faculty/profile', this.headers).subscribe({
      next: (res) => {
        this.user = res.user;
        this.editingFoodType = this.user?.foodType || 'non-veg';
        this.foodPreferenceWindow = res.foodPreferenceWindow;
        this.checkWindow();
      }
    });
  }

  checkWindow() {
    let windowOpen = false;

    if (this.foodPreferenceWindow && this.foodPreferenceWindow.startDate && this.foodPreferenceWindow.endDate) {
      const start = new Date(this.foodPreferenceWindow.startDate);
      const end = new Date(this.foodPreferenceWindow.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      const now = new Date();
      windowOpen = (now >= start && now <= end);
    }

    this.isWindowOpen = windowOpen;
  }

  updateFoodPreference() {
    this.http.put('http://localhost:5000/api/faculty/food-preference', { foodType: this.editingFoodType }, this.headers).subscribe({
      next: (res: any) => {
        this.user = res.user;
        this.foodMsg = res.message;
        this.foodMsgType = 'success';
      },
      error: (err) => {
        this.foodMsg = err.error?.message || 'Failed to update';
        this.foodMsgType = 'error';
      }
    });
  }

  get headers() {
    return { headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.userValue?.token}` }) };
  }

  loadStats() {
    this.http.get<any>('http://localhost:5000/api/faculty/attendance', this.headers).subscribe({
      next: (res) => {
        const history = res.history || [];
        this.stats.attendanceCount = history.filter((a: any) => a.status === 'present').length;
      }
    });

    this.http.get<any>('http://localhost:5000/api/faculty/mess-cut', this.headers).subscribe({
      next: (res) => {
        const history = res.history || [];
        let totalDays = 0;
        history.forEach((m: any) => {
          if (m.status === 'approved') {
            const start = new Date(m.startDate);
            const end = new Date(m.endDate);
            const diffTime = Math.abs(end.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            totalDays += diffDays;
          }
        });
        this.stats.messCutCount = totalDays;
      }
    });

    this.http.get<any>('http://localhost:5000/api/faculty/home-going', this.headers).subscribe({
      next: (res) => {
        this.stats.homeGoingCount = (res.history || []).length;
      }
    });
  }

  loadNotifications() {
    this.http.get<any>('http://localhost:5000/api/faculty/notifications', this.headers).subscribe({
      next: (res) => this.notifications = res.notifications || []
    });
  }
}
