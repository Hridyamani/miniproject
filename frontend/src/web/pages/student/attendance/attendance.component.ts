import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { TopbarComponent } from '../../../components/topbar/topbar.component';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'web-attendance',
  standalone: true,
  imports: [CommonModule, SidebarComponent, TopbarComponent],
  templateUrl: './attendance.component.html',
  styleUrls: ['./attendance.component.css']
})
export class AttendanceComponent implements OnInit {
  attendanceRecords: any[] = [];
  closedDays: any[] = [];

  attendancePercent = 0;
  viewDate = new Date();
  monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  monthDays: number[] = [];
  emptyDays: number[] = [];

  constructor(private http: HttpClient, private auth: AuthService) { }

  ngOnInit() {
    this.loadAttendance();
    this.generateCalendar();
  }

  get headers() {
    return { headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.userValue?.token}` }) };
  }

  loadAttendance() {
    this.http.get<any>('http://localhost:5000/api/student/attendance', this.headers).subscribe({
      next: res => {
        this.attendanceRecords = res.attendance || [];
        this.closedDays = res.closedDays || [];
        this.calculatePercentage();
      }
    });
  }

  calculatePercentage() {
    const total = this.attendanceRecords.length;
    if (total === 0) return;
    const present = this.attendanceRecords.filter(r => r.status === 'present').length;
    this.attendancePercent = Math.round((present / total) * 100);
  }

  generateCalendar() {
    const year = this.viewDate.getFullYear();
    const month = this.viewDate.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    this.emptyDays = Array(firstDay).fill(0);
    this.monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }

  prevMonth() {
    this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() - 1, 1);
    this.generateCalendar();
  }

  nextMonth() {
    this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() + 1, 1);
    this.generateCalendar();
  }

  getAttendanceStatus(day: number) {
    const d = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth(), day);
    return this.attendanceRecords.find(r => {
      const rd = new Date(r.date);
      return rd.toDateString() === d.toDateString();
    });
  }

  getAttendanceClass(day: number) {
    const d = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth(), day);
    const dateStr = d.toDateString();

    const isClosed = this.closedDays.some(cd => new Date(cd.date).toDateString() === dateStr);
    if (isClosed) return 'day-closed';

    const record = this.getAttendanceStatus(day);
    if (!record) return '';
    return record.status === 'present' ? 'day-present' : 'day-absent';
  }
}
