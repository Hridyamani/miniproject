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
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    this.http.get<any>('http://localhost:5000/api/faculty/attendance', this.headers).subscribe({
      next: (res) => {
        const history = res.history || [];
        this.stats.attendanceCount = history.filter((a: any) => {
          const d = new Date(a.date);
          return a.status === 'present' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        }).length;
      }
    });

    this.http.get<any>('http://localhost:5000/api/faculty/mess-cut', this.headers).subscribe({
      next: (res) => {
        const history = res.history || [];
        let totalDays = 0;
        history.forEach((m: any) => {
          if (m.status === 'approved') {
            let curr = new Date(m.startDate);
            const end = new Date(m.endDate);
            curr.setHours(0, 0, 0, 0);
            end.setHours(0, 0, 0, 0);
            while (curr <= end) {
              if (curr.getMonth() === currentMonth && curr.getFullYear() === currentYear) {
                totalDays++;
              }
              curr.setDate(curr.getDate() + 1);
            }
          }
        });
        this.stats.messCutCount = totalDays;
      }
    });

    this.http.get<any>('http://localhost:5000/api/faculty/home-going', this.headers).subscribe({
      next: (res) => {
        const history = res.history || [];
        this.stats.homeGoingCount = history.filter((hg: any) => {
          const d = new Date(hg.leaveDate);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        }).length;
      }
    });
  }

  loadNotifications() {
    this.http.get<any>('http://localhost:5000/api/faculty/notifications', this.headers).subscribe({
      next: (res) => this.notifications = res.notifications || []
    });
  }
}
