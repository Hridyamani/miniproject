import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { TopbarComponent } from '../../../components/topbar/topbar.component';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'web-admin-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, TopbarComponent],
  templateUrl: './attendance-report.component.html',
  styleUrls: ['./attendance-report.component.css']
})
export class AdminAttendanceComponent implements OnInit {
  report: any[] = [];
  selectedDate = new Date().toISOString().split('T')[0];
  loading = false;

  constructor(private http: HttpClient, private auth: AuthService) { }

  ngOnInit() {
    this.loadReport();
  }

  get headers() {
    return { headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.userValue?.token}` }) };
  }

  loadReport() {
    this.loading = true;
    this.http.get<any>(`http://localhost:5000/api/admin/attendance?date=${this.selectedDate}`, this.headers).subscribe({
      next: res => {
        this.report = res.report || [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
