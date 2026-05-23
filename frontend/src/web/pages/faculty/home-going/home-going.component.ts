import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { TopbarComponent } from '../../../components/topbar/topbar.component';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'web-faculty-home-going',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, TopbarComponent],
  templateUrl: './home-going.component.html',
  styleUrls: ['./home-going.component.css']
})
export class FacultyHomeGoingComponent implements OnInit {
  user: any;
  homeGoingHistory: any[] = [];
  homeGoingForm = { leaveDate: this.getCurrentDateTime(), place: '' };
  minDate = new Date().toISOString().split('T')[0];
  msg = '';
  msgType = '';

  constructor(private http: HttpClient, private auth: AuthService) { }

  getCurrentDateTime(): string {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }

  ngOnInit() {
    this.user = this.auth.userValue;
    this.loadHomeGoings();
  }

  get headers() {
    return { headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.userValue?.token}` }) };
  }

  loadHomeGoings() {
    this.http.get<any>('http://localhost:5000/api/faculty/home-going', this.headers).subscribe({
      next: (res) => this.homeGoingHistory = res.history || []
    });
  }

  submitHomeGoing() {
    if (!this.homeGoingForm.leaveDate || !this.homeGoingForm.place) {
      this.msg = 'Please fill in both leave date and destination';
      this.msgType = 'error';
      return;
    }

    this.msg = '';
    this.http.post('http://localhost:5000/api/faculty/home-going', this.homeGoingForm, this.headers).subscribe({
      next: (res: any) => {
        this.msg = res.message || 'Home going recorded successfully';
        this.msgType = 'success';
        this.homeGoingForm = { leaveDate: this.getCurrentDateTime(), place: '' };
        this.loadHomeGoings();
      },
      error: (err) => {
        this.msg = err.error?.message || 'Submission failed';
        this.msgType = 'error';
      }
    });
  }

  markReturn(id: string) {
    this.msg = '';
    this.http.put(`http://localhost:5000/api/faculty/home-going/${id}/return`, {}, this.headers).subscribe({
      next: (res: any) => {
        this.msg = res.message || 'Welcome back! Return marked.';
        this.msgType = 'success';
        this.loadHomeGoings();
      },
      error: (err) => {
        this.msg = err.error?.message || 'Return marking failed';
        this.msgType = 'error';
      }
    });
  }
}
