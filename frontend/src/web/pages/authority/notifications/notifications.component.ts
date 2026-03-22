import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { TopbarComponent } from '../../../components/topbar/topbar.component';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'web-authority-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, TopbarComponent],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.css']
})
export class NotificationsComponent {
  notification = {
    title: '',
    message: '',
    targetRole: 'all',
    type: 'general'
  };
  notifications: any[] = [];
  publishing = false;


  constructor(private http: HttpClient, private auth: AuthService) { }

  ngOnInit() { this.loadNotifications(); }

  get headers() {
    return { headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.userValue?.token}` }) };
  }

  loadNotifications() {
    this.http.get<any>('http://localhost:5000/api/authority/notifications', this.headers).subscribe({
      next: res => this.notifications = res.notifications || [],
      error: () => { }
    });
  }

  selectedFile: File | null = null;

  publish() {
    if (!this.notification.title || !this.notification.message) return;
    this.publishing = true;

    const formData = new FormData();
    formData.append('title', this.notification.title);
    formData.append('message', this.notification.message);
    formData.append('targetRole', this.notification.targetRole);
    formData.append('type', this.notification.type);
    if (this.selectedFile) {
      formData.append('pdf', this.selectedFile);
    }

    this.http.post('http://localhost:5000/api/authority/publish-notification', formData, {
      headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.userValue?.token}` })
    }).subscribe({
      next: () => {
        alert('Notification published successfully!');
        this.notification = { title: '', message: '', targetRole: 'all', type: 'general' };
        this.selectedFile = null;
        this.publishing = false;
        this.loadNotifications();
      },
      error: () => {
        alert('Failed to publish notification');
        this.publishing = false;
      }
    });
  }

  onFileSelected(event: any) {
    if (event.target.files.length > 0) {
      this.selectedFile = event.target.files[0];
    }
  }

  deleteNotification(id: string) {
    if (!confirm('Delete this notification?')) return;
    this.http.delete(`http://localhost:5000/api/authority/notifications/${id}`, this.headers).subscribe({
      next: () => this.loadNotifications(),
      error: () => alert('Failed to delete notification.')
    });
  }
}

