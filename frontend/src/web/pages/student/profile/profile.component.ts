import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { TopbarComponent } from '../../../components/topbar/topbar.component';
import { AuthService } from '../../../services/auth.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { FormsModule } from '@angular/forms';

@Component({
  selector: 'web-student-profile',
  standalone: true,
  imports: [CommonModule, SidebarComponent, TopbarComponent, FormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class StudentProfileComponent implements OnInit {
  user: any;
  foodPreferenceWindow: any;
  isWindowOpen = false;
  isDurationValid = true;
  validUntilDate: Date | null = null;
  durationMonths = 3;
  editingFoodType = 'non-veg';
  foodMsg = '';
  foodMsgType = '';

  constructor(private auth: AuthService, private http: HttpClient) { }

  ngOnInit() {
    this.loadProfile();
  }

  get initials(): string {
    return this.user?.name?.split(' ').map((n: any) => n[0]).join('').toUpperCase().substring(0, 2) || 'S';
  }

  loadProfile() {
    const headers = new HttpHeaders({ Authorization: `Bearer ${this.auth.userValue?.token}` });
    this.http.get<any>('http://localhost:5000/api/student/profile', { headers }).subscribe({
      next: (res) => {
        this.user = res.user;
        this.editingFoodType = this.user?.foodType || 'non-veg';
        this.foodPreferenceWindow = res.foodPreferenceWindow;
        this.checkWindow();
      },
      error: () => { }
    });
  }

  checkWindow() {
    let windowOpen = false;
    this.durationMonths = this.foodPreferenceWindow?.durationMonths || 3;

    if (this.foodPreferenceWindow && this.foodPreferenceWindow.startDate && this.foodPreferenceWindow.endDate) {
      const start = new Date(this.foodPreferenceWindow.startDate);
      const end = new Date(this.foodPreferenceWindow.endDate);
      end.setHours(23, 59, 59, 999);
      const now = new Date();
      windowOpen = (now >= start && now <= end);
    }

    if (this.user?.lastFoodTypeChangedAt) {
      const validUntil = new Date(this.user.lastFoodTypeChangedAt);
      validUntil.setMonth(validUntil.getMonth() + this.durationMonths);
      this.validUntilDate = validUntil;
      
      const now = new Date();
      if (now < validUntil) {
          this.isDurationValid = false;
      } else {
          this.isDurationValid = true;
      }
    } else {
      this.isDurationValid = true;
    }

    this.isWindowOpen = windowOpen && this.isDurationValid;
  }

  updateFoodPreference() {
    const headers = new HttpHeaders({ Authorization: `Bearer ${this.auth.userValue?.token}` });
    this.http.put('http://localhost:5000/api/student/food-preference', { foodType: this.editingFoodType }, { headers }).subscribe({
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
}
