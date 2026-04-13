import { useState } from "react";
import dayjs, { Dayjs } from "dayjs";
import type { LeaveRequest, PublicHoliday } from "../../types";
import "./Calendar.css";

interface CalendarProps {
  leaveRequests: LeaveRequest[];
  publicHolidays: PublicHoliday[];
  onRangeSelect: (start: string, end: string) => void;
}

/**
 * Interactive monthly calendar component.
 *
 * - Colours public holidays red.
 * - Colours leave requests by status.
 * - Allows drag-to-select a date range to request leave.
 */
export default function Calendar({
  leaveRequests,
  publicHolidays,
  onRangeSelect,
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState<Dayjs>(dayjs().startOf("month"));
  const [dragStart, setDragStart] = useState<string | null>(null);
  const [dragEnd, setDragEnd] = useState<string | null>(null);

  const daysInMonth = currentMonth.daysInMonth();
  const firstDayOfWeek = currentMonth.day(); // 0 = Sunday

  const holidayDates = new Set(publicHolidays.map((h) => h.date));

  const leaveDates = new Map<string, LeaveRequest["status"]>();
  leaveRequests.forEach((req) => {
    let d = dayjs(req.startDate);
    while (!d.isAfter(dayjs(req.endDate))) {
      leaveDates.set(d.format("YYYY-MM-DD"), req.status);
      d = d.add(1, "day");
    }
  });

  const handleMouseDown = (date: string) => setDragStart(date);
  const handleMouseEnter = (date: string) => { if (dragStart) setDragEnd(date); };
  const handleMouseUp = () => {
    if (dragStart && dragEnd) {
      const [start, end] = [dragStart, dragEnd].sort();
      onRangeSelect(start, end);
    }
    setDragStart(null);
    setDragEnd(null);
  };

  const cells: JSX.Element[] = [];

  // Blank leading cells
  for (let i = 0; i < firstDayOfWeek; i++) {
    cells.push(<div key={`blank-${i}`} className="calendar-cell blank" />);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = currentMonth.date(day).format("YYYY-MM-DD");
    const isHoliday = holidayDates.has(date);
    const leaveStatus = leaveDates.get(date);

    let cellClass = "calendar-cell";
    if (isHoliday) cellClass += " holiday";
    else if (leaveStatus === "B") cellClass += " approved";
    else if (leaveStatus === "A") cellClass += " requested";
    else if (leaveStatus === "FL") cellClass += " parental";
    else if (leaveStatus === "C") cellClass += " comp-time";

    cells.push(
      <div
        key={date}
        className={cellClass}
        onMouseDown={() => handleMouseDown(date)}
        onMouseEnter={() => handleMouseEnter(date)}
        onMouseUp={handleMouseUp}
      >
        {day}
      </div>
    );
  }

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <button onClick={() => setCurrentMonth(currentMonth.subtract(1, "month"))}>‹</button>
        <span>{currentMonth.format("MMMM YYYY")}</span>
        <button onClick={() => setCurrentMonth(currentMonth.add(1, "month"))}>›</button>
      </div>
      <div className="calendar-weekdays">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="weekday-label">{d}</div>
        ))}
      </div>
      <div className="calendar-grid">{cells}</div>
      <div className="calendar-legend">
        <span className="legend-item holiday">Public Holiday</span>
        <span className="legend-item approved">Approved (B)</span>
        <span className="legend-item requested">Requested (A)</span>
        <span className="legend-item parental">Parental (FL)</span>
        <span className="legend-item comp-time">Comp Time (C)</span>
      </div>
    </div>
  );
}
