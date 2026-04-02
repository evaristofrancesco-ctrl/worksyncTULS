import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isValid, 
  parseISO 
} from "date-fns";
import { it } from "date-fns/locale";

// Arrotonda ai target aziendali se entro 20 minuti
export const getRoundedTime = (date: Date) => {
  const h = date.getHours();
  const m = date.getMinutes();
  const totalM = h * 60 + m;
  const targets = [9 * 60, 13 * 60, 17 * 60, 20 * 60 + 20]; 
  for (const target of targets) {
    if (Math.abs(totalM - target) <= 20) {
      const rounded = new Date(date);
      rounded.setHours(Math.floor(target / 60), target % 60, 0, 0);
      return rounded;
    }
  }
  return date;
};

// Converte i minuti nel formato richiesto (es. 440 min -> 7.2)
export const formatMinutesToDisplay = (totalMinutes: number) => {
  if (totalMinutes <= 0) return "0";
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const displayM = Math.round(m / 10);
  if (displayM === 0) return `${h}.0`;
  if (displayM === 6) return `${h + 1}.0`;
  return `${h}.${displayM}`;
};

export interface ReportDataInput {
  employees: any[];
  allEntries: any[];
  allRequests: any[];
  allShifts: any[];
  allHolidays: any[];
  selectedMonth: string;
  selectedYear: string;
}

export const calculateMonthlyReportsData = (input: ReportDataInput) => {
  const { employees, allEntries, allRequests, allShifts, allHolidays, selectedMonth, selectedYear } = input;
  
  const selMonthInt = parseInt(selectedMonth);
  const selYearInt = parseInt(selectedYear);
  const monthStart = startOfMonth(new Date(selYearInt, selMonthInt, 1));
  const monthEnd = endOfMonth(new Date(selYearInt, selMonthInt, 1));
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  const holidayDates = new Set(allHolidays?.map(h => h.date) || []);
  const workingDaysCount = daysInMonth.filter(d => {
    const dStr = format(d, 'yyyy-MM-dd');
    return d.getDay() !== 0 && !holidayDates.has(dStr);
  }).length;

  const STD_DAY_MINUTES = 440;
  const monthlyTheoreticalMinutes = workingDaysCount * STD_DAY_MINUTES;

  const entriesMap = new Map();
  allEntries.forEach(e => {
    if (!e.checkInTime) return;
    const dateKey = e.checkInTime.split('T')[0];
    const key = `${e.employeeId}_${dateKey}`;
    const list = entriesMap.get(key) || [];
    list.push(e);
    entriesMap.set(key, list);
  });

  const requestsMap = new Map();
  allRequests.forEach(r => {
    const status = (r.status || "").toUpperCase();
    if (!(status === "APPROVATO" || status === "APPROVED" || status === "Approvato")) return;
    const key = r.employeeId;
    const list = requestsMap.get(key) || [];
    list.push(r);
    requestsMap.set(key, list);
  });

  const shiftsMap = new Map();
  allShifts.forEach(s => {
    if (!s.date) return;
    const key = `${s.employeeId}_${s.date}`;
    const list = shiftsMap.get(key) || [];
    list.push(s);
    shiftsMap.set(key, list);
  });

  const dailyGrid: any[] = [];
  
  const summary = employees.filter(emp => {
    const isFrancesco = emp.firstName?.toLowerCase() === 'francesco' && emp.lastName?.toLowerCase() === 'evaristo';
    return !isFrancesco;
  }).map(emp => {
    let totalWorkMinutes = 0;
    let totalAbsenceMinutes = 0;
    let vacationMinutes = 0;
    let sickMinutes = 0;
    let permitMinutes = 0;
    let compensatoryMinutes = 0;
    
    const rowDays = daysInMonth.map((day) => {
      const dStr = format(day, 'yyyy-MM-dd');
      const isSunday = day.getDay() === 0;
      const holiday = allHolidays?.find((h: any) => h.date === dStr);
      const dayParts: { value: string, type: string, minutes: number }[] = [];
      let dayWorkMinutes = 0;

      if (isSunday) {
        dayParts.push({ value: "DOM", type: "rest", minutes: 0 });
      } else if (holiday) {
        dayParts.push({ value: "FES", type: "holiday", minutes: 0 });
      } else {
        const dayEntries = entriesMap.get(`${emp.id}_${dStr}`) || [];
        dayEntries.forEach((e: any) => {
          if (e.checkInTime) {
            const start = getRoundedTime(new Date(e.checkInTime));
            let end;
            if (e.checkOutTime) {
              end = getRoundedTime(new Date(e.checkOutTime));
            } else if (isSameDay(day, new Date())) {
              end = new Date(); 
            }
            if (isValid(start) && end && isValid(end)) {
              const diffMs = end.getTime() - start.getTime();
              const diffMin = Math.round(diffMs / 60000);
              if (diffMin > 0 && diffMin < 840) {
                dayWorkMinutes += diffMin;
              }
            }
          }
        });

        const empRequests = requestsMap.get(emp.id) || [];
        const req = empRequests.find((r: any) => r.startDate <= dStr && (r.endDate || r.startDate) >= dStr);
        const dayShifts = shiftsMap.get(`${emp.id}_${dStr}`) || [];
        
        const hasRest = dayShifts.some((s: any) => s.type === 'REST');
        const hasSick = dayShifts.some((s: any) => s.type === 'SICK' || s.title?.toUpperCase().includes('MALATTIA')) || req?.type === "SICK";
        const hasVacation = dayShifts.some((s: any) => s.type === 'ABSENCE' && (s.title?.toUpperCase().includes('FERIE') || !s.title)) || req?.type === "VACATION";
        const hasPermit = dayShifts.some((s: any) => s.type === 'HOURLY_PERMIT' || s.title?.toUpperCase().includes('PERMESSO')) || req?.type === "PERSONAL" || req?.type === "HOURLY_PERMIT";
        const hasCompensatoryRest = dayShifts.some((s: any) => s.type === 'COMPENSATORY_REST' || s.title?.toUpperCase().includes('COMPENSATIVO')) || req?.type === "COMPENSATORY_REST";
        const hasOvertime = dayShifts.some((s: any) => s.type === 'OVERTIME');
        
        if (hasRest) { dayParts.push({ value: "R", type: "rest", minutes: 0 }); }
        if (hasCompensatoryRest) { 
          dayParts.push({ value: "RC", type: "compensatory_rest", minutes: STD_DAY_MINUTES }); 
          compensatoryMinutes += STD_DAY_MINUTES;
        }
        if (hasVacation) { dayParts.push({ value: "F", type: "vacation", minutes: STD_DAY_MINUTES }); vacationMinutes += STD_DAY_MINUTES; totalAbsenceMinutes += STD_DAY_MINUTES; }
        if (hasSick) { dayParts.push({ value: "M", type: "sick", minutes: STD_DAY_MINUTES }); sickMinutes += STD_DAY_MINUTES; totalAbsenceMinutes += STD_DAY_MINUTES; }
        if (hasPermit && !dayShifts.some((s: any) => s.type === 'HOURLY_PERMIT')) { 
          dayParts.push({ value: "P", type: "permit", minutes: STD_DAY_MINUTES }); 
          permitMinutes += STD_DAY_MINUTES; 
          totalAbsenceMinutes += STD_DAY_MINUTES; 
        }
        
        let dayPermitMin = 0;
        if (req?.type === "HOURLY_PERMIT" && req.startTime && req.endTime) {
          const [h1, m1] = req.startTime.split(':').map(Number);
          const [h2, m2] = req.endTime.split(':').map(Number);
          dayPermitMin = (h2 * 60 + m2) - (h1 * 60 + m1);
        } else {
          const shiftPermit = dayShifts.find((s: any) => s.type === 'HOURLY_PERMIT');
          if (shiftPermit) {
            const sIn = parseISO(shiftPermit.startTime);
            const sOut = parseISO(shiftPermit.endTime);
            if (isValid(sIn) && isValid(sOut)) {
              dayPermitMin = Math.round((sOut.getTime() - sIn.getTime()) / 60000);
            }
          }
        }
        if (dayPermitMin > 0) {
          dayParts.push({ value: formatMinutesToDisplay(dayPermitMin), type: "permit", minutes: dayPermitMin });
          permitMinutes += dayPermitMin;
          totalAbsenceMinutes += dayPermitMin;
        }

        if (hasOvertime) {
          dayParts.push({ value: "S", type: "overtime", minutes: 0 });
        }

        if (dayWorkMinutes > 0) {
          dayParts.push({ value: formatMinutesToDisplay(dayWorkMinutes), type: 'work', minutes: dayWorkMinutes });
          totalWorkMinutes += dayWorkMinutes;
        }
      }

      return { day, parts: dayParts, dayWorkMinutes };
    });

    dailyGrid.push({ emp, rowDays, totalWorkMinutesInMonth: totalWorkMinutes });

    return {
      id: emp.id,
      name: `${emp.firstName} ${emp.lastName}`,
      photoUrl: emp.photoUrl,
      jobTitle: emp.jobTitle,
      theoreticalMinutes: monthlyTheoreticalMinutes,
      workedMinutes: totalWorkMinutes,
      absenceMinutes: totalAbsenceMinutes,
      compensatoryMinutes: compensatoryMinutes,
      theoreticalHoursStr: formatMinutesToDisplay(monthlyTheoreticalMinutes),
      workedHoursStr: formatMinutesToDisplay(totalWorkMinutes),
      absenceHoursStr: formatMinutesToDisplay(totalAbsenceMinutes + compensatoryMinutes),
      hasAbsences: (totalAbsenceMinutes + compensatoryMinutes) > 0,
      totalNetStr: formatMinutesToDisplay((totalWorkMinutes + totalAbsenceMinutes + compensatoryMinutes) - monthlyTheoreticalMinutes)
    };
  });

  let totalMonthlyTheo = 0;
  let totalMonthlyWorked = 0;
  let totalMonthlyAbsence = 0;
  let totalMonthlyComp = 0;

  summary.forEach(s => {
    totalMonthlyTheo += s.theoreticalMinutes;
    totalMonthlyWorked += s.workedMinutes;
    totalMonthlyAbsence += s.absenceMinutes;
    totalMonthlyComp += s.compensatoryMinutes;
  });

  const totalMonthlyNet = (totalMonthlyWorked + totalMonthlyAbsence + totalMonthlyComp) - totalMonthlyTheo;

  return { 
    dailyGrid, 
    monthDays: daysInMonth, 
    summary,
    totals: {
      theo: totalMonthlyTheo / 60,
      worked: totalMonthlyWorked / 60,
      absence: totalMonthlyAbsence / 60,
      net: totalMonthlyNet / 60
    }
  };
};

export const generateExcelHTML = (processedData: any, monthLabel: string, year: string) => {
  const { dailyGrid, monthDays, summary } = processedData;
  if (!dailyGrid || dailyGrid.length === 0) return "";

  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <style>
        table { border-collapse: collapse; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        th, td { border: 1px solid #cbd5e1; padding: 4px; font-size: 10px; text-align: center; }
        .header-main { background-color: #1e293b; color: white; font-weight: bold; font-size: 14px; height: 40px; }
        .header-day { background-color: #f1f5f9; font-weight: bold; color: #64748b; }
        .header-sun { background-color: #ef4444; color: white; font-weight: bold; }
        .header-holiday { background-color: #fbbf24; color: #92400e; font-weight: bold; }
        .emp-name { text-align: left; font-weight: bold; background-color: #ffffff; min-width: 150px; }
        .cell-sun { background-color: #ef4444; color: white; }
        .cell-holiday { background-color: #fef3c7; color: #92400e; }
        .type-work { color: #1e293b; font-weight: bold; }
        .type-vacation { background-color: #10b981; color: white; font-weight: bold; }
        .type-sick { background-color: #2563eb; color: white; font-weight: bold; }
        .type-permit { background-color: #94a3b8; color: white; font-weight: bold; }
        .type-rc { background-color: #f59e0b; color: white; font-weight: bold; }
        .summary-header { background-color: #f8fafc; font-weight: bold; }
        .summary-total { font-weight: bold; font-size: 11px; }
        .net-positive { color: #10b981; }
        .net-negative { color: #ef4444; }
      </style>
    </head>
    <body>
      <table>
        <tr><th colspan="${monthDays.length + 2}" class="header-main">REPORT PRESENZE TU.L.S. - ${monthLabel.toUpperCase()} ${year}</th></tr>
        <tr>
          <th class="header-day">Collaboratore</th>
          ${monthDays.map((d: any) => {
            const isSun = d.getDay() === 0;
            return `<th class="${isSun ? 'header-sun' : 'header-day'}">${format(d, 'eee', { locale: it }).toUpperCase()}</th>`;
          }).join('')}
          <th class="header-day">TOT ORE</th>
        </tr>
        <tr>
          <th class="header-day">Giorno</th>
          ${monthDays.map((d: any) => {
            const isSun = d.getDay() === 0;
            return `<th class="${isSun ? 'header-sun' : 'header-day'}">${format(d, 'd')}</th>`;
          }).join('')}
          <th class="header-day"></th>
        </tr>
  `;

  dailyGrid.forEach((row: any) => {
    html += `<tr><td class="emp-name">${row.emp.firstName} ${row.emp.lastName}</td>`;
    row.rowDays.forEach((d: any) => {
      const isSun = d.day.getDay() === 0;
      let cellClass = isSun ? 'cell-sun' : '';
      let content = "";
      
      if (d.parts && d.parts.length > 0) {
        content = d.parts.map((p: any) => {
          let pStyle = "";
          if (p.type === 'vacation') pStyle = 'type-vacation';
          else if (p.type === 'sick') pStyle = 'type-sick';
          else if (p.type === 'permit') pStyle = 'type-permit';
          else if (p.type === 'compensatory_rest') pStyle = 'type-rc';
          return `<span class="${pStyle}">${p.value}</span>`;
        }).join(' ');
      }
      html += `<td class="${cellClass}">${content}</td>`;
    });
    html += `<td class="summary-total">${formatMinutesToDisplay(row.totalWorkMinutesInMonth)}</td></tr>`;
  });

  html += `
        <tr><td colspan="${monthDays.length + 2}" style="height: 20px;"></td></tr>
        <tr class="header-main"><th colspan="${monthDays.length + 2}">RIEPILOGO ANALITICO MENSILE</th></tr>
        <tr class="summary-header">
          <td colspan="2">Collaboratore</td>
          <td>Ore Lavorative</td>
          <td>Ore Effettive</td>
          <td>Assenze (h)</td>
          <td>Netto</td>
          <td colspan="${monthDays.length - 4}"></td>
        </tr>
  `;

  summary.forEach((s: any) => {
    const net = parseFloat(s.totalNetStr);
    const netClass = net >= 0 ? 'net-positive' : 'net-negative';
    html += `
      <tr>
        <td colspan="2" class="emp-name">${s.name}</td>
        <td>${s.theoreticalHoursStr}</td>
        <td>${s.workedHoursStr}</td>
        <td>${s.absenceHoursStr}</td>
        <td class="summary-total ${netClass}">${net > 0 ? '+' : ''}${s.totalNetStr}</td>
        <td colspan="${monthDays.length - 4}"></td>
      </tr>
    `;
  });

  html += `</table></body></html>`;
  return html;
};
