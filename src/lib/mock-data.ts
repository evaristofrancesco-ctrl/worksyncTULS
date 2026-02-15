import { Employee, Shift, LeaveRequest, AttendanceRecord } from './types';

export const mockEmployees: Employee[] = [
  {
    id: 'emp-1',
    name: 'Sarah Johnson',
    email: 'sarah.j@worksync.com',
    role: 'ADMIN',
    position: 'HR Manager',
    department: 'People Operations',
    avatarUrl: 'https://picsum.photos/seed/sarah/200/200',
    skills: ['Management', 'Communication', 'Payroll'],
    availability: 'Mon-Fri, 9:00-17:00',
    joinDate: '2022-01-15',
    remainingLeave: 15,
  },
  {
    id: 'emp-2',
    name: 'Michael Chen',
    email: 'm.chen@worksync.com',
    role: 'EMPLOYEE',
    position: 'Senior Developer',
    department: 'Engineering',
    avatarUrl: 'https://picsum.photos/seed/michael/200/200',
    skills: ['React', 'Node.js', 'PostgreSQL'],
    availability: 'Flexible',
    joinDate: '2022-03-20',
    remainingLeave: 12,
  },
  {
    id: 'emp-3',
    name: 'Elena Rodriguez',
    email: 'elena.r@worksync.com',
    role: 'EMPLOYEE',
    position: 'UX Designer',
    department: 'Product',
    avatarUrl: 'https://picsum.photos/seed/elena/200/200',
    skills: ['Figma', 'Prototyping', 'User Research'],
    availability: 'Mon-Fri, 10:00-18:00',
    joinDate: '2023-05-10',
    remainingLeave: 18,
  },
];

export const mockShifts: Shift[] = [
  {
    id: 'shift-1',
    employeeId: 'emp-2',
    title: 'Development Sprint',
    startTime: new Date(new Date().setHours(9, 0)).toISOString(),
    endTime: new Date(new Date().setHours(17, 0)).toISOString(),
    status: 'SCHEDULED',
  },
  {
    id: 'shift-2',
    employeeId: 'emp-3',
    title: 'Design Review',
    startTime: new Date(new Date().setHours(10, 0)).toISOString(),
    endTime: new Date(new Date().setHours(14, 0)).toISOString(),
    status: 'SCHEDULED',
  },
];

export const mockLeaveRequests: LeaveRequest[] = [
  {
    id: 'leave-1',
    employeeId: 'emp-2',
    type: 'VACATION',
    startDate: '2024-05-01',
    endDate: '2024-05-05',
    status: 'PENDING',
    reason: 'Family trip to Italy',
  },
];

export const mockAttendance: AttendanceRecord[] = [
  {
    id: 'att-1',
    employeeId: 'emp-2',
    date: new Date().toISOString().split('T')[0],
    clockIn: '08:55',
    status: 'PRESENT',
  },
];