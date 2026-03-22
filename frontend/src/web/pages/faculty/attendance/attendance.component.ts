import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { TopbarComponent } from '../../../components/topbar/topbar.component';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'web-faculty-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, TopbarComponent],
  templateUrl: './attendance.component.html',
  styleUrls: ['./attendance.component.css']
})
export class FacultyAttendanceComponent implements OnInit {
  user: any;
  today = new Date();
  attendanceHistory: any[] = [];
  hasMarkedToday = false;

  constructor(private http: HttpClient, private auth: AuthService) { }

  ngOnInit() {
    this.user = this.auth.userValue;
    this.loadAttendance();
  }

  get headers() {
    return { headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.userValue?.token}` }) };
  }

  loadAttendance() {
    this.http.get<any>('http://localhost:5000/api/faculty/attendance', this.headers).subscribe({
      next: (res) => {
        this.attendanceHistory = res.history || [];
        const todayStr = new Date().toISOString().split('T')[0];
        this.hasMarkedToday = this.attendanceHistory.some(a =>
          new Date(a.date).toISOString().split('T')[0] === todayStr
        );
      }
    });
  }

  markAttendance(status: string) {
    this.http.post('http://localhost:5000/api/faculty/attendance', { status }, this.headers).subscribe({
      next: () => {
        this.loadAttendance();
      },
      error: (err) => alert((err as any).error?.message || 'Failed to mark attendance')
    });
  }
}
