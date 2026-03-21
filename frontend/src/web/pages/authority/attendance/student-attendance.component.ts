import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { TopbarComponent } from '../../../components/topbar/topbar.component';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'web-student-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, TopbarComponent],
  templateUrl: './student-attendance.component.html',
  styleUrls: ['./student-attendance.component.css']
})
export class StudentAttendanceComponent implements OnInit {
  students: any[] = [];
  selectedDate = new Date().toISOString().split('T')[0];
  loading = false;
  saving = false;

  constructor(private http: HttpClient, private auth: AuthService) { }

  ngOnInit() {
    this.loadStudents();
  }

  get headers() {
    return { headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.userValue?.token}` }) };
  }

  loadStudents() {
    this.loading = true;
    this.http.get<any>('http://localhost:5000/api/authority/students', this.headers).subscribe({
      next: res => {
        this.students = (res.students || []).map((s: any) => ({ ...s, status: 'present' }));
        this.loading = false;
      },
      error: () => {
        alert('Failed to load students');
        this.loading = false;
      }
    });
  }

  submitAttendance() {
    if (!confirm(`Mark attendance for ${this.students.length} students on ${this.selectedDate}?`)) return;
    this.saving = true;
    const body = {
      date: this.selectedDate,
      attendance: this.students.map(s => ({ student: s._id, status: s.status }))
    };

    this.http.post('http://localhost:5000/api/authority/attendance', body, this.headers).subscribe({
      next: () => {
        alert('Attendance submitted successfully');
        this.saving = false;
      },
      error: err => {
        alert(err.error?.message || 'Failed to submit attendance');
        this.saving = false;
      }
    });
  }
}
