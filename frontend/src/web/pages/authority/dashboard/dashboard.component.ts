import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { TopbarComponent } from '../../../components/topbar/topbar.component';
import { AuthService } from '../../../services/auth.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'web-authority-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, TopbarComponent, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class AuthorityDashboardComponent implements OnInit {
  summary = {
    todayOutgoings: 0,
    todayHomeGoings: 0,
    activeMessCuts: 0,
    pendingHomeGoings: 0,
    pendingMessCuts: 0
  };

  students: any[] = [];
  facultyAttendance: any[] = [];
  filteredAttendanceStudents: any[] = [];
  attendanceSearch = '';
  selectedDate = new Date().toISOString().split('T')[0];
  selectedStudents = new Set<string>();
  isDayClosed = false;
  marking = false;

  constructor(private http: HttpClient, public auth: AuthService) { }

  ngOnInit() {
    this.loadSummary();
    this.loadStudents();
    this.loadAttendanceForDate();
  }

  loadAttendanceForDate() {
    this.markedStudents = {};
    this.markedMilk = {};
    this.facultyAttendance = [];

    const dateObj = new Date(this.selectedDate);
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth() + 1;

    this.http.get<any>(`http://localhost:5000/api/authority/reports?year=${year}&month=${month}`, this.headers).subscribe({
      next: (res) => {
        const history = res.attendance || [];
        const compareStr = this.selectedDate;
        history.forEach((a: any) => {
          if (new Date(a.date).toISOString().split('T')[0] === compareStr) {
            if (a.role === 'faculty') {
              this.facultyAttendance.push(a);
            } else {
              const sid = a.student?._id || a.student;
              this.markedStudents[sid] = a.status;
              this.markedMilk[sid] = !!a.milkTaken;
            }
          }
        });
        this.checkIfDateIsClosed();
      }
    });
  }

  checkIfDateIsClosed() {
    this.http.get<any>('http://localhost:5000/api/authority/closed-days', this.headers).subscribe({
      next: (res) => {
        const closedDays = res.closedDays || [];
        this.isDayClosed = closedDays.some((cd: any) => new Date(cd.date).toISOString().split('T')[0] === this.selectedDate);
      }
    });
  }

  get headers() {
    return { headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.userValue?.token}` }) };
  }

  loadSummary() {
    this.http.get<any>('http://localhost:5000/api/authority/summary', this.headers).subscribe({
      next: (res) => this.summary = res.summary || this.summary
    });
  }

  loadStudents() {
    this.http.get<any>('http://localhost:5000/api/authority/students', this.headers).subscribe({
      next: (res) => {
        this.students = res.students || [];
        this.filterAttendanceStudents();
      }
    });
  }

  filterAttendanceStudents() {
    const q = this.attendanceSearch.toLowerCase();
    this.filteredAttendanceStudents = this.students.filter(s =>
      s.name.toLowerCase().includes(q) || s.userId.toLowerCase().includes(q) || s.roomNumber?.includes(q)
    );
  }

  markedStudents: { [key: string]: string } = {};
  markedMilk: { [key: string]: boolean } = {};

  markIndividual(studentId: string, status: string, milkTaken?: boolean) {
    const mTaken = milkTaken !== undefined ? milkTaken : !!this.markedMilk[studentId];
    this.http.post('http://localhost:5000/api/authority/attendance', {
      attendance: [{ student: studentId, status, milkTaken: mTaken }],
      date: this.selectedDate
    }, this.headers).subscribe({
      next: () => {
        this.markedStudents[studentId] = status;
        this.markedMilk[studentId] = mTaken;
        this.loadSummary();
      },
      error: () => alert('Failed to mark attendance')
    });
  }

  markHostelClosed() {
    if (confirm(`Mark ${this.selectedDate} as Hostel Closed Day? This will override normal attendance view for students.`)) {
      this.http.post('http://localhost:5000/api/authority/closed-days', {
        date: this.selectedDate,
        reason: 'Holiday / Closed'
      }, this.headers).subscribe({
        next: () => {
          this.isDayClosed = true;
          alert('Hostel marked as closed for this date');
        },
        error: (err) => alert(err.error?.message || 'Failed to mark closed day')
      });
    }
  }
}
