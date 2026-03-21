import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { TopbarComponent } from '../../../components/topbar/topbar.component';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'web-request-approval',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, TopbarComponent],
  templateUrl: './request-approval.component.html',
  styleUrls: ['./request-approval.component.css']
})
export class RequestApprovalComponent implements OnInit {
  homeGoings: any[] = [];
  messCuts: any[] = [];

  constructor(private http: HttpClient, private auth: AuthService) { }

  get headers() {
    return { headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.userValue?.token}` }) };
  }

  get authorityRole(): string {
    return this.auth.userValue?.authorityRole || '';
  }

  get canApproveHomeGoing(): boolean {
    return !['Hostel Secretary', 'Floor Secretary', 'Wing Secretary', 'Mess Secretary'].includes(this.authorityRole);
  }

  get canApproveMessCuts(): boolean {
    return !['Floor Secretary', 'Wing Secretary', 'Hostel Secretary'].includes(this.authorityRole);
  }

  ngOnInit() { this.load(); }

  load() {
    this.http.get<any>('http://localhost:5000/api/authority/requests', this.headers).subscribe({
      next: r => {
        this.homeGoings = r.homeGoings || [];
        this.messCuts = r.messCuts || [];
      },
      error: () => { }
    });
  }

  updateHomeGoing(r: any, status: string) {
    this.http.put(`http://localhost:5000/api/authority/home-going/${r._id}`, { status, remarks: r._remarks || '' }, this.headers).subscribe({
      next: () => { this.load(); },
      error: () => alert('Action failed')
    });
  }

  updateMessCut(r: any, status: string) {
    this.http.put(`http://localhost:5000/api/authority/mess-cut/${r._id}`, { status, remarks: r._remarks || '' }, this.headers).subscribe({
      next: () => { this.load(); },
      error: () => alert('Action failed')
    });
  }
}
