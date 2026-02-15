export type Role = 'ADMIN' | 'EMPLOYEE';

export interface Location {
  id: string;
  name: string;
  address: string;
  city: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: Role;
  position: string;
  department: string;
  avatarUrl?: string;
  skills: string[];
  availability: string;
  joinDate: string;
  remainingLeave: number;
  locationId?: string;
  locationName?: string;
}

export interface Shift {
  id: string;
  employeeId: string;
  title: string;
  startTime: string;
  endTime: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  type: 'VACATION' | 'SICK' | 'PERSONAL';
  startDate: string;
  endDate: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  clockIn: string;
  clockOut?: string;
  status: 'PRESENT' | 'LATE' | 'ABSENT';
}
