'use client';

import React from 'react';
import {
  LayoutDashboard,
  Users,
  Calendar,
  TrendingUp,
  MessageSquare,
  Settings,
  Bell,
  ChevronDown,
  CheckCircle2,
  CalendarDays,
  FileCheck,
} from 'lucide-react';

export function HeroStudentTablet() {
  const subjects = [
    { name: 'Math', current: 85, previous: 65 },
    { name: 'English', current: 75, previous: 58 },
    { name: 'Physics', current: 92, previous: 72 },
    { name: 'Chemistry', current: 80, previous: 66 },
    { name: 'Biology', current: 88, previous: 74 },
  ];

  return (
    <div className="relative mx-auto w-full select-none">
      {/* Outer Hardware Tablet Frame with subtle drop shadow and glossy bezel */}
      <div className="relative rounded-[22px] border-[4px] border-[#18313a] bg-[#07171d] p-1.5 sm:p-2 shadow-[0_25px_60px_rgba(0,0,0,0.85),0_0_40px_rgba(13,245,196,0.15)] ring-1 ring-white/10 backdrop-blur-2xl">
        {/* Tablet Top Camera Notch */}
        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
          <span className="h-1 w-1 rounded-full bg-black/80 ring-1 ring-white/10" />
        </div>

        {/* Tablet Inner Screen Container */}
        <div className="rounded-[14px] bg-[#081b22] border border-teal-500/20 overflow-hidden text-[11px] text-slate-200">
          {/* Top Tablet Navigation Bar */}
          <div className="flex items-center justify-between border-b border-teal-500/15 bg-[#06161b]/95 px-2.5 py-1">
            <div className="flex items-center gap-1.5">
              {/* Mini Brand Logo */}
              <div className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gradient-to-tr from-[#0df5c4] to-[#0d9488] shadow-xs">
                <span className="text-[8px] font-black text-[#042426]">O</span>
              </div>
              <span className="font-bold tracking-tight text-white text-[9.5px]">OgroniEdu</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                className="relative text-slate-400 hover:text-white transition-colors"
                aria-label="Notifications"
              >
                <Bell className="h-2.5 w-2.5" />
                <span className="absolute -top-0.5 -right-0.5 h-1 w-1 rounded-full bg-[#0df5c4]" />
              </button>

              <div className="flex items-center gap-1 rounded-full bg-[#0d2a33] px-1.5 py-0.5 border border-teal-500/30">
                <div className="h-3 w-3 rounded-full bg-[#0df5c4] text-[#042426] flex items-center justify-center font-bold text-[7px]">
                  R
                </div>
                <span className="text-[8px] font-semibold text-slate-200">Student</span>
                <ChevronDown className="h-2 w-2 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Main Layout: Left Sidebar + Content Area */}
          <div className="grid grid-cols-12 min-h-[180px]">
            {/* Tablet Sidebar */}
            <div className="col-span-3 border-r border-teal-500/15 bg-[#06151a]/95 p-1.5 space-y-0.5">
              <div className="flex items-center gap-1 rounded-md bg-[#0df5c4]/15 text-[#0df5c4] px-1.5 py-0.5 font-bold border border-[#0df5c4]/30 shadow-xs">
                <LayoutDashboard className="h-2.5 w-2.5 shrink-0" />
                <span className="text-[8.5px] truncate">Dashboard</span>
              </div>
              <div className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-slate-400 hover:text-slate-200 transition-colors">
                <Users className="h-2.5 w-2.5 shrink-0" />
                <span className="text-[8.5px] truncate">My Tutors</span>
              </div>
              <div className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-slate-400 hover:text-slate-200 transition-colors">
                <Calendar className="h-2.5 w-2.5 shrink-0" />
                <span className="text-[8.5px] truncate">Sessions</span>
              </div>
              <div className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-slate-400 hover:text-slate-200 transition-colors">
                <TrendingUp className="h-2.5 w-2.5 shrink-0" />
                <span className="text-[8.5px] truncate">Progress</span>
              </div>
              <div className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-slate-400 hover:text-slate-200 transition-colors">
                <MessageSquare className="h-2.5 w-2.5 shrink-0" />
                <span className="text-[8.5px] truncate">Messages</span>
              </div>
              <div className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-slate-400 hover:text-slate-200 transition-colors pt-1">
                <Settings className="h-2.5 w-2.5 shrink-0" />
                <span className="text-[8.5px] truncate">Settings</span>
              </div>
            </div>

            {/* Tablet Main Screen Content */}
            <div className="col-span-9 p-2 space-y-1.5 bg-[#081b22]">
              {/* Top Row: Greeting & Next Session */}
              <div className="grid grid-cols-12 gap-1.5">
                {/* Greeting & 2 Stat Cards */}
                <div className="col-span-7 space-y-1">
                  <div>
                    <h4 className="font-extrabold text-white text-[11px] leading-tight">
                      Good morning, Rahim!
                    </h4>
                    <p className="text-[8px] text-teal-300/80">
                      Keep going! You&apos;re making great progress.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-1">
                    {/* Total Sessions */}
                    <div className="rounded-md border border-teal-500/20 bg-[#0c242c] p-1 space-y-0.5">
                      <div className="flex items-center gap-1 text-[7.5px] text-teal-300">
                        <CalendarDays className="h-2 w-2" />
                        <span className="truncate">Sessions</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs font-black text-white">24</span>
                        <span className="text-[7px] font-bold text-emerald-400 bg-emerald-500/10 px-0.5 rounded">
                          +12%
                        </span>
                      </div>
                    </div>

                    {/* Assignment Completed */}
                    <div className="rounded-md border border-teal-500/20 bg-[#0c242c] p-1 space-y-0.5">
                      <div className="flex items-center gap-1 text-[7.5px] text-teal-300">
                        <FileCheck className="h-2 w-2" />
                        <span className="truncate">Assignment</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs font-black text-white">18</span>
                        <span className="text-[7px] font-bold text-emerald-400 bg-emerald-500/10 px-0.5 rounded">
                          +28%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Next Session Card */}
                <div className="col-span-5 rounded-lg border border-teal-500/30 bg-gradient-to-br from-[#0c262e] to-[#073038] p-1.5 flex flex-col justify-between">
                  <div>
                    <div className="text-[7px] uppercase tracking-wider text-teal-400 font-bold">
                      Next Session
                    </div>
                    <div className="font-bold text-white text-[9px]">Today, 5:00 PM</div>
                    <div className="text-[7.5px] text-slate-300 truncate">Math • Online</div>
                  </div>
                  <button
                    type="button"
                    className="mt-0.5 w-full rounded bg-[#0df5c4]/20 hover:bg-[#0df5c4]/30 text-[#0df5c4] border border-[#0df5c4]/40 py-0.5 text-[7.5px] font-bold transition-all text-center cursor-pointer"
                  >
                    View Details
                  </button>
                </div>
              </div>

              {/* Lower Section: Subject Performance Bar Chart + Recent Activity */}
              <div className="grid grid-cols-12 gap-1.5">
                {/* Subject Performance Chart */}
                <div className="col-span-7 rounded-lg border border-teal-500/20 bg-[#0c242c] p-1.5 space-y-1">
                  <div className="flex items-center justify-between text-[8px]">
                    <span className="font-bold text-white">Subject Performance</span>
                    <div className="flex items-center gap-1.5 text-[7px] text-slate-400">
                      <span className="flex items-center gap-0.5">
                        <span className="h-1 w-1 rounded-full bg-[#0df5c4]" /> Cur
                      </span>
                      <span className="flex items-center gap-0.5">
                        <span className="h-1 w-1 rounded-full bg-[#1b434e]" /> Prev
                      </span>
                    </div>
                  </div>

                  {/* Dual Bar Columns with Interactive Micro-Tooltips */}
                  <div className="flex items-end justify-between gap-1 pt-0.5 h-11 px-1 border-b border-teal-500/20">
                    {subjects.map((sub) => (
                      <div
                        key={sub.name}
                        className="group relative flex flex-col items-center gap-0.5 flex-1 cursor-pointer"
                      >
                        {/* Hover Tooltip */}
                        <div className="absolute -top-5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-30 bg-[#062026] text-[#0df5c4] font-bold text-[6.5px] px-1 py-0.2 rounded border border-teal-500/40 shadow-xs whitespace-nowrap">
                          {sub.current}%
                        </div>

                        <div className="flex items-end gap-0.5 w-full justify-center h-8">
                          {/* Current bar */}
                          <div
                            style={{ height: `${sub.current}%` }}
                            className="w-1.5 rounded-t bg-gradient-to-t from-[#0d9488] to-[#0df5c4] shadow-xs group-hover:brightness-125 transition-all"
                          />
                          {/* Previous bar */}
                          <div
                            style={{ height: `${sub.previous}%` }}
                            className="w-1 rounded-t bg-[#1b434e] group-hover:bg-[#235360] transition-colors"
                          />
                        </div>
                        <span className="text-[6.5px] text-slate-400 group-hover:text-slate-200 font-medium truncate transition-colors">
                          {sub.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Activity List */}
                <div className="col-span-5 rounded-lg border border-teal-500/20 bg-[#0c242c] p-1.5 space-y-0.5">
                  <div className="flex items-center justify-between text-[8px]">
                    <span className="font-bold text-white">Recent Activity</span>
                    <span className="text-[7px] text-teal-400 hover:underline cursor-pointer">
                      View All
                    </span>
                  </div>

                  <div className="space-y-1 text-[7.5px]">
                    <div className="flex items-start gap-1">
                      <CheckCircle2 className="h-2 w-2 text-[#0df5c4] shrink-0 mt-0.5" />
                      <div className="leading-tight">
                        <div className="font-semibold text-slate-200">Assignment Done</div>
                        <div className="text-[6.5px] text-slate-400">Math • 2h ago</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-1">
                      <MessageSquare className="h-2 w-2 text-purple-400 shrink-0 mt-0.5" />
                      <div className="leading-tight">
                        <div className="font-semibold text-slate-200">New Message</div>
                        <div className="text-[6.5px] text-slate-400">From Tutor • 4h</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-1">
                      <CheckCircle2 className="h-2 w-2 text-cyan-400 shrink-0 mt-0.5" />
                      <div className="leading-tight">
                        <div className="font-semibold text-slate-200">Progress Saved</div>
                        <div className="text-[6.5px] text-slate-400">English • 1d ago</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
