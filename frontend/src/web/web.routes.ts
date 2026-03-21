import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

export const WEB_ROUTES: Routes = [
  { path: '', redirectTo: '/splash', pathMatch: 'full' },
  { path: 'splash', loadComponent: () => import('./pages/splash/splash.component').then(m => m.SplashComponent) },
  { path: 'role-select', loadComponent: () => import('./pages/role-selection/role-selection.component').then(m => m.RoleSelectComponent) },
  { path: 'login', loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent) },
  { path: 'reset-password/:token', loadComponent: () => import('./pages/reset-password/reset-password.component').then(m => m.ResetPasswordComponent) },

  {
    path: 'student',
    canActivate: [AuthGuard],
    data: { role: 'student' },
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./pages/student/dashboard/dashboard.component').then(m => m.StudentDashboardComponent) },
      { path: 'profile', loadComponent: () => import('./pages/student/profile/profile.component').then(m => m.StudentProfileComponent) },
      { path: 'attendance', loadComponent: () => import('./pages/student/attendance/attendance.component').then(m => m.AttendanceComponent) },
      { path: 'mess-cut', loadComponent: () => import('./pages/student/mess-cut/mess-cut.component').then(m => m.MessCutComponent) },
      { path: 'outgoing', loadComponent: () => import('./pages/student/outgoing/outgoing.component').then(m => m.OutgoingComponent) },
      { path: 'home-going', loadComponent: () => import('./pages/student/home-going/home-going.component').then(m => m.HomeGoingComponent) },
      { path: 'return', loadComponent: () => import('./pages/student/return/return.component').then(m => m.ReturnComponent) },
      { path: 'notifications', loadComponent: () => import('./pages/student/notifications/view-notifications.component').then(m => m.ViewNotificationsComponent) },
    ]
  },
  {
    path: 'admin',
    canActivate: [AuthGuard],
    data: { role: 'admin' },
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./pages/admin/dashboard/dashboard.component').then(m => m.AdminDashboardComponent) },
      { path: 'users', loadComponent: () => import('./pages/admin/user-management/user-management.component').then(m => m.UserManagementComponent) },
      { path: 'notifications', loadComponent: () => import('./pages/admin/notifications/notifications.component').then(m => m.NotificationsComponent) },
      { path: 'security', loadComponent: () => import('./pages/admin/security-settings/security-settings.component').then(m => m.SecuritySettingsComponent) },
      { path: 'archive', loadComponent: () => import('./pages/admin/archive/archive.component').then(m => m.ArchiveComponent) },
      { path: 'tracking-history', loadComponent: () => import('./pages/admin/tracking-history/tracking-history.component').then(m => m.TrackingHistoryComponent) },
    ]
  },
  {
    path: 'authority',
    canActivate: [AuthGuard],
    data: { role: 'authority' },
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./pages/authority/dashboard/dashboard.component').then(m => m.AuthorityDashboardComponent) },
      { path: 'requests', loadComponent: () => import('./pages/authority/request-approval/request-approval.component').then(m => m.RequestApprovalComponent) },
      { path: 'notifications', loadComponent: () => import('./pages/authority/notifications/notifications.component').then(m => m.NotificationsComponent) },
      { path: 'student-profiles', loadComponent: () => import('./pages/authority/profiles/student-profiles.component').then(m => m.StudentProfilesComponent) },
      { path: 'faculty-profiles', loadComponent: () => import('./pages/authority/profiles/faculty-profiles.component').then(m => m.FacultyProfilesComponent) },
      { path: 'attendance', loadComponent: () => import('./pages/admin/attendance/attendance-report.component').then(m => m.AdminAttendanceComponent) },
      { path: 'hostel-closing', loadComponent: () => import('./pages/admin/hostel-closing/hostel-closing.component').then(m => m.HostelClosingComponent) },
      { path: 'mess-bill', loadComponent: () => import('./pages/authority/mess-bill/mess-bill.component').then(m => m.MessBillComponent) },
    ]
  },
  {
    path: 'faculty',
    canActivate: [AuthGuard],
    data: { role: 'faculty' },
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./pages/faculty/dashboard/dashboard.component').then(m => m.FacultyDashboardComponent) },
      { path: 'attendance', loadComponent: () => import('./pages/faculty/attendance/attendance.component').then(m => m.FacultyAttendanceComponent) },
      { path: 'mess-cut', loadComponent: () => import('./pages/faculty/mess-cut/mess-cut.component').then(m => m.FacultyMessCutComponent) },
      { path: 'home-going', loadComponent: () => import('./pages/faculty/home-going/home-going.component').then(m => m.FacultyHomeGoingComponent) },
      { path: 'notifications', loadComponent: () => import('./pages/faculty/notifications/notifications.component').then(m => m.FacultyNotificationsComponent) },
    ]
  },
  { path: '**', redirectTo: '/splash' }
];
