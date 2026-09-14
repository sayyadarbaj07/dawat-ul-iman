/**
 * Validates and calculates salary for a given month based on attendance.
 *
 * Rules:
 * 1. Daily Salary = Monthly Salary / 30 (Fixed 30-day divisor)
 * 2. Sunday is compulsory weekly off (No deduction)
 * 3. 1 Allowed Leave per month.
 * 4. Extra leaves (beyond 1) deduct 1 daily salary.
 * 5. Absences deduct 1 daily salary.
 * 6. Late is treated as Present for salary purposes.
 * 7. Incomplete attendance triggers an error.
 */

const calculateSalary = ({
  monthlySalary,
  joiningDate,
  deactivationDate,
  month, // 1-12
  year,
  attendanceRecords, // Array of { date, status }
}) => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // Last day of the month

  // Determine active period
  let activeStart = startDate;
  if (joiningDate && new Date(joiningDate) > activeStart) {
    activeStart = new Date(joiningDate);
    activeStart.setHours(0, 0, 0, 0);
  }

  let activeEnd = endDate;
  if (deactivationDate && new Date(deactivationDate) < activeEnd) {
    activeEnd = new Date(deactivationDate);
    activeEnd.setHours(23, 59, 59, 999);
  }

  // Active days in this month
  const totalDaysInMonth = endDate.getDate();
  let expectedWorkingDays = 0;
  let sundaysCount = 0;

  let applicableDays = 0;

  for (let d = 1; d <= totalDaysInMonth; d++) {
    const current = new Date(year, month - 1, d);
    
    // Is within active employment period?
    if (current >= activeStart && current <= activeEnd) {
      applicableDays++;
      if (current.getDay() === 0) { // Sunday
        sundaysCount++;
      } else {
        expectedWorkingDays++;
      }
    }
  }

  const dailySalary = monthlySalary / 30;

  let presentCount = 0;
  let absentCount = 0;
  let leaveCount = 0;
  let lateCount = 0;
  let notMarkedCount = 0;

  // Function to strip time from date for comparison
  const isSameDay = (d1, d2) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  // Process attendance for active working days (non-Sunday)
  for (let d = 1; d <= totalDaysInMonth; d++) {
    const current = new Date(year, month - 1, d);
    
    // Only check attendance for active, non-Sunday days
    if (current >= activeStart && current <= activeEnd && current.getDay() !== 0) {
      const record = attendanceRecords.find((r) => isSameDay(new Date(r.date), current));
      
      if (!record) {
        notMarkedCount++;
      } else {
        switch (record.status) {
          case "Present":
            presentCount++;
            break;
          case "Absent":
            absentCount++;
            break;
          case "Leave":
            leaveCount++;
            break;
          case "Late":
            lateCount++; // Late is treated as present for salary
            break;
          default:
            notMarkedCount++;
        }
      }
    }
  }

  if (notMarkedCount > 0) {
    throw new Error(`INCOMPLETE_ATTENDANCE: ${notMarkedCount} working days are not marked.`);
  }

  const allowedLeave = 1;
  const extraLeave = Math.max(0, leaveCount - allowedLeave);
  
  const leaveDeduction = extraLeave * dailySalary;
  const absentDeduction = absentCount * dailySalary;
  const totalDeduction = leaveDeduction + absentDeduction;

  const isFullMonth = (activeStart.getTime() === startDate.getTime() && activeEnd.getTime() === endDate.getTime());
  const baseSalary = isFullMonth ? monthlySalary : (applicableDays * dailySalary);
  const payableSalary = Math.max(0, Math.round(baseSalary - totalDeduction));

  return {
    monthlySalarySnapshot: monthlySalary,
    dailySalary: Math.round(dailySalary), // Round for display
    applicableDays,
    allowedLeave,
    leaveTaken: leaveCount,
    extraLeave,
    absentDays: absentCount,
    sundays: sundaysCount,
    lateDays: lateCount,
    notMarkedDays: notMarkedCount,
    leaveDeduction: Math.round(leaveDeduction),
    absentDeduction: Math.round(absentDeduction),
    totalDeduction: Math.round(totalDeduction),
    payableSalary,
  };
};

module.exports = {
  calculateSalary,
};
