import { Employee, Shift, LeaveRequest, AttendanceRecord, Location } from './types';

export const mockLocations: Location[] = [
  { id: 'loc-1', name: 'Sede Centrale', address: 'Via Roma 123', city: 'Milano' },
  { id: 'loc-2', name: 'Filiale Nord', address: 'Via Milano 45', city: 'Torino' },
  { id: 'loc-3', name: 'Hub Creativo', address: 'Piazza Dante 10', city: 'Firenze' },
];

export const mockEmployees: Employee[] = [
  {
    id: 'emp-1',
    name: 'Sarah Johnson',
    email: 'sarah.j@tulas.com',
    role: 'ADMIN',
    position: 'Responsabile HR',
    department: 'People Operations',
    avatarUrl: 'https://picsum.photos/seed/sarah/200/200',
    skills: ['Management', 'Communication', 'Payroll'],
    availability: 'Lun-Ven, 9:00-17:00',
    joinDate: '2022-01-15',
    remainingLeave: 15,
    locationId: 'loc-1',
    locationName: 'Sede Centrale',
  },
  {
    id: 'emp-2',
    name: 'Michael Chen',
    email: 'm.chen@tulas.com',
    role: 'EMPLOYEE',
    position: 'Sviluppatore Senior',
    department: 'Engineering',
    avatarUrl: 'https://picsum.photos/seed/michael/200/200',
    skills: ['React', 'Node.js', 'PostgreSQL'],
    availability: 'Flessibile',
    joinDate: '2022-03-20',
    remainingLeave: 12,
    locationId: 'loc-1',
    locationName: 'Sede Centrale',
  },
  {
    id: 'emp-3',
    name: 'Elena Rodriguez',
    email: 'elena.r@tulas.com',
    role: 'EMPLOYEE',
    position: 'UX Designer',
    department: 'Product',
    avatarUrl: 'https://picsum.photos/seed/elena/200/200',
    skills: ['Figma', 'Prototyping', 'User Research'],
    availability: 'Lun-Ven, 10:00-18:00',
    joinDate: '2023-05-10',
    remainingLeave: 18,
    locationId: 'loc-3',
    locationName: 'Hub Creativo',
  },
];

export const mockShifts: Shift[] = [
  {
    id: 'shift-1',
    employeeId: 'emp-2',
    title: 'Sprint di Sviluppo',
    startTime: new Date(new Date().setHours(9, 0)).toISOString(),
    endTime: new Date(new Date().setHours(17, 0)).toISOString(),
    status: 'SCHEDULED',
  },
  {
    id: 'shift-2',
    employeeId: 'emp-3',
    title: 'Revisione Progetto',
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
    reason: 'Viaggio di famiglia in Italia',
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
