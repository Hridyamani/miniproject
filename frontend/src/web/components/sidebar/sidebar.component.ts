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
    return !['Floor Secretary', 'Wing Secretary'].includes(this.authorityRole);
  }

  // To show 'Approvals' link at all:
  // Need to be able to approve at least one thing.
  get canAccessApprovals(): boolean {
    // If they can't approve anything, hide it. Actually, everyone but Floor/Wing Secretary can approve something.
    // Wait, Hostel Secretary cannot approve Home going. Can they approve Mess cuts?
    // "Hostel Secretary: Cannot access: Home going request approval" -> maybe they access others. Let's show it by default.
    return !['Floor Secretary', 'Wing Secretary'].includes(this.authorityRole); 
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/splash']);
  }
}
