import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'web-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  @Input() role: string = 'student';

  constructor(private authService: AuthService, private router: Router) { }

  get userName(): string {
    return this.authService.userValue?.name || 'User';
  }

  get authorityRole(): string {
    return this.authService.userValue?.authorityRole || '';
  }

  get canAccessApprovals(): boolean {
    const role = this.authorityRole;
    return ['Warden', 'Resident Tutor', 'Matron'].includes(role);
  }

  get canAccessMessPages(): boolean {
    const role = this.authorityRole;
    return ['Mess Secretary', 'Hostel Secretary', 'Matron'].includes(role);
  }

  get canAccessStudentAttendance(): boolean {
    return true; // All authority users
  }

  get canAccessFacultyAttendance(): boolean {
    const role = this.authorityRole;
    return !['Floor Secretary', 'Wing Secretary'].includes(role);
  }

  get canAccessHostelClosing(): boolean {
    const role = this.authorityRole;
    return ['Warden', 'Resident Tutor', 'Matron', 'Hostel Secretary'].includes(role);
  }

  get canAccessAnnouncements(): boolean {
    const role = this.authorityRole;
    return !['Floor Secretary', 'Wing Secretary'].includes(role);
  }

  get canAccessRoomAllocation(): boolean {
    const role = this.authorityRole;
    return ['Warden', 'Hostel Secretary', 'Resident Tutor'].includes(role);
  }

  get isFloorWingSecretary(): boolean {
    return ['Floor Secretary', 'Wing Secretary'].includes(this.authorityRole);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/splash']);
  }
}
