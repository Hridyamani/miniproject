import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { TopbarComponent } from '../../../components/topbar/topbar.component';
import { AuthService } from '../../../services/auth.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'web-student-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, TopbarComponent, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class StudentDashboardComponent implements OnInit {
  user: any;
  attendanceDays = 0;
  messCutDays = 0;
  homeGoingStatus: string = 'No Requests';
  notifications: any[] = [];
  
  foodWindow: any = null;
  newFoodType: string = 'non-veg';

  constructor(private authService: AuthService, private http: HttpClient) { }

  ngOnInit() {
    this.user = this.authService.userValue;
    this.newFoodType = this.user?.foodType || 'non-veg';
    this.loadProfile();
    this.loadStats();
    this.loadNotifications();
  }

  get headers() {
    return { headers: new HttpHeaders({ Authorization: `Bearer ${this.authService.userValue?.token}` }) };
  }

  get isFoodWindowOpen(): boolean {
    if (!this.foodWindow || !this.foodWindow.startDate || !this.foodWindow.endDate) return false;
    const now = new Date();
    const start = new Date(this.foodWindow.startDate);
    const end = new Date(this.foodWindow.endDate);
    start.setHours(0, 0, 0, 0); // Need to sync these!
    end.setHours(23, 59, 59, 999);
    return now >= start && now <= end;
  }

  loadProfile() {
    this.http.get<any>('http://localhost:5000/api/student/profile', this.headers).subscribe({
      next: res => {
        this.user = res.user;
        this.foodWindow = res.foodPreferenceWindow;
        if (!this.user.nextFoodType) {
          this.newFoodType = this.user.foodType;
        } else {
          this.newFoodType = this.user.nextFoodType;
        }
      }
    });
  }

  updateFoodPreference() {
    if (!['veg', 'non-veg'].includes(this.newFoodType)) return;
    this.http.put<any>('http://localhost:5000/api/student/food-preference', { foodType: this.newFoodType }, this.headers)
      .subscribe({
        next: res => {
          alert(res.message);
          this.loadProfile();
        },
        error: err => alert(err.error?.message || 'Failed to update preference')
      });
  }

  loadStats() {
    // Attendance
    this.http.get<any>('http://localhost:5000/api/student/attendance', this.headers).subscribe({
      next: res => {
        if (res.attendance && res.attendance.length > 0) {
          this.attendanceDays = res.attendance.filter((a: any) => a.status === 'present').length;
        }
      }
    });

    // Mess Cut
    this.http.get<any>('http://localhost:5000/api/student/mess-cut', this.headers).subscribe({
      next: res => {
        const approved = res.messCuts.filter((m: any) => m.status === 'approved');
        this.messCutDays = approved.reduce((sum: number, m: any) => {
          const start = new Date(m.startDate);
          const end = new Date(m.endDate);
          const diffTime = Math.abs(end.getTime() - start.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          return sum + diffDays;
        }, 0);
      }
    });

    // Homegoings
    this.http.get<any>('http://localhost:5000/api/student/home-going', this.headers).subscribe({
      next: res => {
        if (res.homeGoings && res.homeGoings.length > 0) {
          const latest = res.homeGoings[0];
          this.homeGoingStatus = latest.status.charAt(0).toUpperCase() + latest.status.slice(1);
        } else {
          this.homeGoingStatus = 'No Requests';
        }
      }
    });
  }

  loadNotifications() {
    this.http.get<any>('http://localhost:5000/api/student/notifications', this.headers).subscribe({
      next: res => {
        this.notifications = res.notifications || [];
      }
    });
  }
}
