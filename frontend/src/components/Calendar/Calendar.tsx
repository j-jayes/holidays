/**
 * TeamCalendar — Excel-style Gantt timeline.
 *
 * - 6 months of date columns starting today, horizontally scrollable.
 * - One row per team member; rows grouped by business unit.
 * - Weekends and public holidays highlighted red.
 * - Drag across any row to select a date range -> opens leave-request modal.
 * - CU filter tabs at the top.
 */
import { useState, useMemo, useRef } from "react";
import dayjs from "dayjs";
import type { LeaveRequest, PublicHoliday, User, BusinessUnit } from "../../types";

// Scroll padding so today's column isn't flush against the left frozen column
const TODAY_SCROLL_OFFSET = 120;

const MONTHS_AHEAD = 6;
const NAME_W = 180; // px — left "name" column
const DAY_W  = 26;  // px — each day column

// Weekday letter indexed by dayjs .day() (0=Sun)
const DOW = ["S", "M", "T", "W", "T", "F", "S"] as const;

// Hex fill colours: [approved, pending]
const LEAVE_HEX: Record<string, [string, string]> = {
  A:  ["#ff875a", "#ffd0bb"], // nexer-orange / light  — Vacation
  FL: ["#190878", "#d9e6f0"], // nexer-blue / light-blue — Parental
  C:  ["#5a1ea0", "#e8d8f7"], // nexer-purple / light  — Comp time
};

interface DayInfo {
  date: string;
  dayNum: number;
  dow: number;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName?: string;
  isToday: boolean;
}
interface MonthGroup { label: string; colSpan: number }

interface Props {
  leaveRequests: LeaveRequest[];
  publicHolidays: PublicHoliday[];
  users: User[];
  businessUnits: BusinessUnit[];
  onRangeSelect: (start: string, end: string, preselectedUserId?: string) => void;
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}
function avatarBg(id: string): string {
  const g = ["from-[#ff875a] to-[#ff5028]","from-[#aa4bf5] to-[#5a1ea0]","from-[#190878] to-[#5a1ea0]","from-[#5a1ea0] to-[#190878]","from-[#ff5028] to-[#aa4bf5]","from-[#aa4bf5] to-[#190878]"];
  return g[id.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % g.length];
}

type Row =
  | { kind: "sep";  buId: string; buName: string }
  | { kind: "user"; user: User;   alt: boolean };

export default function Calendar({ leaveRequests, publicHolidays, users, businessUnits, onRangeSelect }: Props) {
  const today = useMemo(() => dayjs().startOf("day"), []);
  const [selectedBu,  setSelectedBu]  = useState("all");
  const [dragStart,   setDragStart]   = useState<string | null>(null);
  const [dragEnd,     setDragEnd]     = useState<string | null>(null);
  const [dragUid,     setDragUid]     = useState<string | null>(null);
  const [hoveredRow,  setHoveredRow]  = useState<string | null>(null);
  const dragging    = useRef(false);
  const scrollRef   = useRef<HTMLDivElement>(null);

  // ── Generate date range ──────────────────────────────────────────────────
  const { days, monthGroups } = useMemo(() => {
    const holidayMap = new Map(publicHolidays.map((h) => [h.date, h.localName]));
    const rangeEnd = today.add(MONTHS_AHEAD, "month");
    const days: DayInfo[] = [];
    let d = today;
    while (d.isBefore(rangeEnd)) {
      const dow = d.day();
      const dateStr = d.format("YYYY-MM-DD");
      days.push({
        date: dateStr,
        dayNum: d.date(),
        dow,
        isWeekend: dow === 0 || dow === 6,
        isHoliday: holidayMap.has(dateStr),
        holidayName: holidayMap.get(dateStr),
        isToday: d.isSame(today, "day"),
      });
      d = d.add(1, "day");
    }
    const monthGroups: MonthGroup[] = [];
    for (const day of days) {
      const label = dayjs(day.date).format("MMM YYYY");
      if (!monthGroups.length || monthGroups[monthGroups.length - 1].label !== label) {
        monthGroups.push({ label, colSpan: 0 });
      }
      monthGroups[monthGroups.length - 1].colSpan++;
    }
    return { days, monthGroups };
  }, [publicHolidays, today]);

  // ── Per-user leave lookup ────────────────────────────────────────────────
  const userLeaveMap = useMemo(() => {
    const map = new Map<string, Map<string, { leaveType: string; status: string }>>();
    leaveRequests.forEach((req) => {
      if (!map.has(req.userId)) map.set(req.userId, new Map());
      const um = map.get(req.userId)!;
      let d = dayjs(req.startDate);
      const end = dayjs(req.endDate);
      while (!d.isAfter(end)) {
        um.set(d.format("YYYY-MM-DD"), { leaveType: req.leaveType, status: req.status });
        d = d.add(1, "day");
      }
    });
    return map;
  }, [leaveRequests]);

  // ── Filtered + grouped rows ──────────────────────────────────────────────
  const rows = useMemo((): Row[] => {
    const base = selectedBu === "all" ? users : users.filter((u) => u.businessUnitId === selectedBu);
    const sorted = [...base].sort((a, b) =>
      a.businessUnitId !== b.businessUnitId
        ? a.businessUnitId.localeCompare(b.businessUnitId)
        : a.displayName.localeCompare(b.displayName)
    );
    const result: Row[] = [];
    let lastBu = "";
    let altIdx = 0;
    for (const user of sorted) {
      if (user.businessUnitId !== lastBu) {
        lastBu = user.businessUnitId;
        altIdx = 0;
        const buName = businessUnits.find((b) => b.id === user.businessUnitId)?.name ?? user.businessUnitId;
        result.push({ kind: "sep", buId: user.businessUnitId, buName });
      }
      result.push({ kind: "user", user, alt: altIdx % 2 !== 0 });
      altIdx++;
    }
    return result;
  }, [users, selectedBu, businessUnits]);

  // ── Selection helpers ────────────────────────────────────────────────────
  const selLo = dragStart && dragEnd ? [dragStart, dragEnd].sort()[0] : null;
  const selHi = dragStart && dragEnd ? [dragStart, dragEnd].sort()[1] : null;
  const inSel = (date: string, uid: string) =>
    !!(selLo && selHi && date >= selLo && date <= selHi && dragUid === uid);

  // ── Mouse event delegation ───────────────────────────────────────────────
  const getCell = (e: React.MouseEvent) =>
    (e.target as HTMLElement).closest<HTMLElement>("td[data-date]");

  const handleMouseDown = (e: React.MouseEvent) => {
    const td = getCell(e);
    if (!td) return;
    e.preventDefault();
    dragging.current = true;
    setDragStart(td.dataset.date!);
    setDragEnd(td.dataset.date!);
    setDragUid(td.dataset.uid ?? null);
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return;
    const td = getCell(e);
    if (td?.dataset.date) setDragEnd(td.dataset.date);
  };
  const handleMouseUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    if (dragStart && dragEnd) {
      const [s, en] = [dragStart, dragEnd].sort();
      onRangeSelect(s, en, dragUid ?? undefined);
    }
    setDragStart(null);
    setDragEnd(null);
    setDragUid(null);
  };

  // ── Jump to today ────────────────────────────────────────────────────────
  const todayIndex = days.findIndex((d) => d.isToday);
  const scrollToToday = () => {
    if (!scrollRef.current) return;
    const offset = NAME_W + todayIndex * DAY_W - TODAY_SCROLL_OFFSET;
    scrollRef.current.scrollTo({ left: Math.max(0, offset), behavior: "smooth" });
  };

  const totalW = NAME_W + days.length * DAY_W;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">

      {/* ── Filter bar ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-100 shrink-0 flex-wrap">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 flex-wrap">
          {[{ id: "all", name: "All teams" }, ...businessUnits].map((bu) => (
            <button
              key={bu.id}
              onClick={() => setSelectedBu(bu.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap
                ${selectedBu === bu.id ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
            >
              {bu.name}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3 flex-wrap">
          {[
          { bg: "#ff875a", label: "Approved" },
            { bg: "#ffd0bb", label: "Pending" },
            { bg: "#d9e6f0", label: "Parental" },
            { bg: "#5a1ea0", label: "Comp time" },
            { bg: "#ffd5cf", label: "Holiday / Weekend" },
          ].map(({ bg, label }) => (
            <span key={label} className="flex items-center gap-1 text-xs text-gray-500">
              <span className="inline-block w-3 h-3 rounded-sm shrink-0" style={{ background: bg }} />
              {label}
            </span>
          ))}
          <span className="text-xs text-gray-400 pl-1">Drag to book</span>
        </div>

        {/* Jump to today */}
        <button
          onClick={scrollToToday}
          className="ml-2 shrink-0 px-3 py-1 rounded-lg text-xs font-medium bg-nexer-light-blue text-nexer-blue hover:bg-[#c3d8ea] transition-colors"
        >
          Today
        </button>
      </div>

      {/* ── Scrollable table ──────────────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="overflow-auto"
        style={{ cursor: "cell" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <table
          className="border-collapse"
          style={{ tableLayout: "fixed", width: totalW, minWidth: "100%" }}
        >
          <colgroup>
            <col style={{ width: NAME_W, minWidth: NAME_W }} />
            {days.map((d) => <col key={d.date} style={{ width: DAY_W, minWidth: DAY_W }} />)}
          </colgroup>

          <thead className="sticky top-0 z-20">
            {/* Month labels */}
            <tr>
              <th
                className="sticky left-0 z-30 border-b border-r border-gray-200"
                style={{ background: "#f0f0f0" }}
              />
              {monthGroups.map((mg) => (
                <th
                  key={mg.label}
                  colSpan={mg.colSpan}
                  className="border-b border-l border-gray-200 text-left px-1.5 py-1"
                  style={{ background: "#f0f0f0", fontSize: 11, fontWeight: 600, color: "#4b5563", whiteSpace: "nowrap" }}
                >
                  {mg.label}
                </th>
              ))}
            </tr>

            {/* Day numbers */}
            <tr>
              <th
                className="sticky left-0 z-30 border-b border-r border-gray-200 text-left px-3"
                  style={{ background: "#ffffff", fontSize: 10, fontWeight: 400, color: "#919191", paddingTop: 3, paddingBottom: 3 }}
              >
                Employee
              </th>
              {days.map((d) => (
                <th
                  key={d.date}
                  className="text-center border-b border-r border-gray-100 leading-none"
                  style={{
                    fontSize: 10,
                    fontWeight: d.isToday ? 800 : 500,
                    paddingTop: 2,
                    paddingBottom: 2,
                    background: d.isToday ? "#d9e6f0" : d.isHoliday ? "#ffd5cf" : d.isWeekend ? "#fff4f0" : "#ffffff",
                    color: d.isToday ? "#190878" : d.isHoliday || d.isWeekend ? "#ff5028" : "#919191",
                  }}
                >
                  {d.dayNum}
                </th>
              ))}
            </tr>

            {/* Weekday letters */}
            <tr>
              <th
                className="sticky left-0 z-30 border-b border-r border-gray-200"
                style={{ background: "#ffffff" }}
              />
              {days.map((d) => (
                <th
                  key={d.date}
                  className="text-center border-b border-r border-gray-100 leading-none"
                  style={{
                    fontSize: 9,
                    fontWeight: 400,
                    paddingTop: 1,
                    paddingBottom: 2,
                    background: d.isToday ? "#d9e6f0" : d.isHoliday ? "#ffd5cf" : d.isWeekend ? "#fff4f0" : "#f0f0f0",
                    color: d.isHoliday || d.isWeekend ? "#ff5028" : "#c8c8c8",
                  }}
                >
                  {DOW[d.dow]}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => {
              if (row.kind === "sep") {
                return (
                  <tr key={`sep-${row.buId}`}>
                    <td
                      colSpan={days.length + 1}
                      className="border-b border-t border-gray-200 px-3"
                      style={{
                        background: "#f0f0f0",
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#919191",
                        letterSpacing: "0.07em",
                        textTransform: "uppercase",
                        paddingTop: 4,
                        paddingBottom: 4,
                      }}
                    >
                      {row.buName}
                    </td>
                  </tr>
                );
              }

              const { user, alt } = row;
              const userLeave = userLeaveMap.get(user.id);
              const isHovered = hoveredRow === user.id;
              const rowBg = isHovered ? "#d9e6f0" : alt ? "#f0f0f0" : "#ffffff";

              return (
                <tr
                  key={user.id}
                  onMouseEnter={() => setHoveredRow(user.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  {/* Sticky name cell */}
                  <td
                    className="sticky left-0 z-10 border-b border-r border-gray-100 px-2"
                    style={{ background: rowBg }}
                  >
                    <div className="flex items-center gap-1.5 py-0.5">
                      <div
                        className={`w-5 h-5 rounded-full bg-gradient-to-br ${avatarBg(user.id)} flex items-center justify-center text-white shrink-0`}
                        style={{ fontSize: 8, fontWeight: 700 }}
                      >
                        {initials(user.displayName)}
                      </div>
                      <span
                        className="font-medium text-gray-700 truncate"
                        style={{ fontSize: 12, maxWidth: NAME_W - 44 }}
                      >
                        {user.displayName}
                      </span>
                    </div>
                  </td>

                  {/* Day cells */}
                  {days.map((d) => {
                    const leave = userLeave?.get(d.date);
                    const selected = inSel(d.date, user.id);

                    let bg: string;
                    if (selected) {
                      bg = "#aa4bf5"; // nexer-light-purple
                    } else if (leave) {
                      const [approvedHex, pendingHex] = LEAVE_HEX[leave.leaveType] ?? LEAVE_HEX.A;
                      bg = leave.status === "B" ? approvedHex : pendingHex;
                    } else if (d.isHoliday) {
                      bg = "#ffd5cf"; // nexer-warm-red tint
                    } else if (d.isWeekend) {
                      bg = "#fff4f0"; // nexer-orange tint
                    } else {
                      bg = rowBg;
                    }

                    const leaveLabel = leave
                      ? `${user.displayName} — ${leave.leaveType === "FL" ? "Parental" : leave.leaveType === "C" ? "Comp time" : "Vacation"} (${leave.status === "B" ? "approved" : "pending"})`
                      : d.isHoliday && d.holidayName
                      ? d.holidayName
                      : d.isHoliday
                      ? "Public holiday"
                      : undefined;

                    return (
                      <td
                        key={d.date}
                        data-date={d.date}
                        data-uid={user.id}
                        title={leaveLabel}
                        className="border-b border-r border-gray-100"
                        style={{
                          background: bg,
                          height: 32,
                          userSelect: "none",
                          outline: d.isToday && !leave && !selected ? "1px solid #d9e6f0" : undefined,
                          outlineOffset: "-1px",
                          borderLeft: d.isToday ? "2px solid #190878" : undefined,
                        }}
                      />
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
