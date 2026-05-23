import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthorityService } from '../../../services/authority.service';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { TopbarComponent } from '../../../components/topbar/topbar.component';

@Component({
  selector: 'app-room-allocation',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, TopbarComponent, RouterModule],
  templateUrl: './room-allocation.component.html',
  styleUrls: ['./room-allocation.component.css']
})
export class RoomAllocationComponent implements OnInit {
  rooms: any[] = [];
  unallocatedStudents: any[] = [];
  waitlist: any[] = [];
  stats: any = {
    totalRooms: 0,
    totalCapacity: 0,
    occupiedSlots: 0,
    availableSlots: 0,
    unallocatedStudents: 0
  };
  
  roomSearchTerm: string = '';
  autoAllocateStrategy: string = 'same_dept';
  filterBlock: string = '';
  loading: boolean = false;

  showAddRoomModal: boolean = false;
  showAssignModal: boolean = false;
  showVacateModal: boolean = false;

  newRoom: any = {
    roomNo: '',
    type: 'Double',
    capacity: 2,
    block: ''
  };

  selectedRoom: any = null;
  selectedStudentId: string = '';

  constructor(private authorityService: AuthorityService) { }

  ngOnInit(): void {
    this.refreshData();
  }

  refreshData() {
    this.loading = true;
    this.authorityService.getRooms().subscribe(res => {
      this.rooms = res.rooms;
      this.loading = false;
    });
    
    this.authorityService.getUnallocatedStudents().subscribe(res => {
      this.unallocatedStudents = res.students;
    });

    this.authorityService.getWaitlist().subscribe(res => {
      this.waitlist = res.waitlist;
    });

    this.authorityService.getAllocationStats().subscribe(res => {
      this.stats = res.stats;
    });
  }

  filteredRooms() {
    return this.rooms.filter(r => 
      r.roomNo.toLowerCase().includes(this.roomSearchTerm.toLowerCase()) &&
      (!this.filterBlock || r.block?.toLowerCase().includes(this.filterBlock.toLowerCase()))
    );
  }

  openAddRoomModal() {
    this.newRoom = { roomNo: '', type: 'Double', capacity: 2, block: '' };
    this.showAddRoomModal = true;
  }

  saveRoom() {
    if (!this.newRoom.roomNo || !this.newRoom.capacity) {
      alert('Room number and capacity are required');
      return;
    }
    this.authorityService.addRoom(this.newRoom).subscribe(res => {
      if (res.success) {
        this.showAddRoomModal = false;
        this.refreshData();
      }
    });
  }

  openAssignStudentModal(room: any) {
    this.selectedRoom = room;
    this.selectedStudentId = '';
    this.showAssignModal = true;
  }

  confirmAssignment() {
    if (!this.selectedStudentId || !this.selectedRoom) return;
    this.authorityService.assignStudent(this.selectedStudentId, this.selectedRoom._id).subscribe(res => {
      if (res.success) {
        this.showAssignModal = false;
        this.refreshData();
      }
    });
  }

  quickAssignDialog(student: any) {
    this.selectedStudentId = student._id;
    // Auto-select first available room
    const available = this.rooms.find(r => r.occupants.length < r.capacity);
    if (available) {
        this.selectedRoom = available;
        this.showAssignModal = true;
    } else {
        alert('No available rooms found');
    }
  }

  vacateRoomDialog(room: any) {
    this.selectedRoom = room;
    this.showVacateModal = true;
  }

  confirmVacate(studentId: string) {
    if (confirm('Are you sure you want to vacate this student?')) {
        this.authorityService.vacateRoom(studentId).subscribe(res => {
            if (res.success) {
                // If the room becomes empty, update selectedRoom locally or close modal
                if (this.selectedRoom.occupants.length === 1) {
                    this.showVacateModal = false;
                } else {
                    this.selectedRoom.occupants = this.selectedRoom.occupants.filter((o: any) => o._id !== studentId);
                }
                this.refreshData();
            }
        });
    }
  }

  runAutoAllocate() {
    if (confirm(`Run auto-allocation using ${this.autoAllocateStrategy} strategy?`)) {
      this.loading = true;
      this.authorityService.runAutoAllocate(this.autoAllocateStrategy, this.filterBlock).subscribe(res => {
        if (res.success) {
          alert(`Successfully allocated ${res.allocatedCount} students`);
          this.refreshData();
        }
        this.loading = false;
      }, err => {
        alert(err.error?.message || 'Error running auto-allocation');
        this.loading = false;
      });
    }
  }

  viewRoomDetails(room: any) {
    // Placeholder for more detailed view or history
    alert(`Room ${room.roomNo} Details:\nType: ${room.type}\nFloor: ${room.block || 'N/A'}\nOccupants: ${room.occupants.length}/${room.capacity}`);
  }
}
