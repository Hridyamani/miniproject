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

  get canAccessMessPages(): boolean {
    // Mess Secretary, Warden, Admin can see mess pages.
    // Floor/Wing Secretary cannot.
    if (['Floor Secretary', 'Wing Secretary'].includes(this.authorityRole)) return false;
    return true;
  }

  get canAccessApprovals(): boolean {
    // Mess Secretary, Hostel Secretary, Floor/Wing Secretary cannot see approvals.
    if (['Mess Secretary', 'Hostel Secretary', 'Floor Secretary', 'Wing Secretary'].includes(this.authorityRole)) return false;
    return true;
  }

  get canAccessProfiles(): boolean {
    // Mess Secretary, Floor/Wing Secretary cannot see profile pages.
    if (['Mess Secretary', 'Floor Secretary', 'Wing Secretary'].includes(this.authorityRole)) return false;
    return true;
  }

  get canAccessAttendance(): boolean {
    // Everyone in authority can see attendance.
    return true;
  }

  get canAccessHostelClosing(): boolean {
    // Floor/Wing/Mess Secretary cannot see hostel closing.
    if (['Floor Secretary', 'Wing Secretary', 'Mess Secretary'].includes(this.authorityRole)) return false;
    return true;
  }

  get isFloorWingSecretary(): boolean {
    return ['Floor Secretary', 'Wing Secretary'].includes(this.authorityRole);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/splash']);
  }
}
