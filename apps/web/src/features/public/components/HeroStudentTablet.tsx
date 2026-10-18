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
      <div className="relative rounded-[22px] border-[4px] border-border bg-background p-1.5 sm:p-2 shadow-sm ring-1 ring-border backdrop-blur-2xl">
        {/* Tablet Top Camera Notch */}
        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
          <span className="h-1 w-1 rounded-full bg-black/80 ring-1 ring-border" />
        </div>

        {/* Tablet Inner Screen Container */}
        <div className="rounded-[14px] bg-card border border-primary/40 overflow-hidden text-[11px] text-foreground">
          {/* Top Tablet Navigation Bar */}
          <div className="flex items-center justify-between border-b border-primary/40 bg-background/95 px-2.5 py-1">
            <div className="flex items-center gap-1.5">
              {/* Mini Brand Logo */}
              <div className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gradient-to-tr from-brand to-primary shadow-xs">
                <span className="text-[8px] font-black text-brand-foreground">O</span>
              </div>
              <span className="font-bold tracking-tight text-foreground text-[9.5px]">
                OgroniEdu
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                className="relative text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Notifications"
              >
                <Bell className="h-2.5 w-2.5" />
                <span className="absolute -top-0.5 -right-0.5 h-1 w-1 rounded-full bg-brand" />
              </button>

              <div className="flex items-center gap-1 rounded-full bg-card px-1.5 py-0.5 border border-primary/40">
                <div className="h-3 w-3 rounded-full bg-brand text-brand-foreground flex items-center justify-center font-bold text-[7px]">
                  R
                </div>
                <span className="text-[8px] font-semibold text-foreground">Student</span>
                <ChevronDown className="h-2 w-2 text-muted-foreground" />
              </div>
            </div>
          </div>

          {/* Main Layout: Left Sidebar + Content Area */}
          <div className="grid grid-cols-12 min-h-[180px]">
            {/* Tablet Sidebar */}
            <div className="col-span-3 border-r border-primary/40 bg-background/95 p-1.5 space-y-0.5">
              <div className="flex items-center gap-1 rounded-md bg-brand-soft text-primary px-1.5 py-0.5 font-bold border border-border shadow-xs">
                <LayoutDashboard className="h-2.5 w-2.5 shrink-0" />
                <span className="text-[8.5px] truncate">Dashboard</span>
              </div>
              <div className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-muted-foreground hover:text-foreground transition-colors">
                <Users className="h-2.5 w-2.5 shrink-0" />
                <span className="text-[8.5px] truncate">My Tutors</span>
              </div>
              <div className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-muted-foreground hover:text-foreground transition-colors">
                <Calendar className="h-2.5 w-2.5 shrink-0" />
                <span className="text-[8.5px] truncate">Sessions</span>
              </div>
              <div className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-muted-foreground hover:text-foreground transition-colors">
                <TrendingUp className="h-2.5 w-2.5 shrink-0" />
                <span className="text-[8.5px] truncate">Progress</span>
              </div>
              <div className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-muted-foreground hover:text-foreground transition-colors">
                <MessageSquare className="h-2.5 w-2.5 shrink-0" />
                <span className="text-[8.5px] truncate">Messages</span>
              </div>
              <div className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-muted-foreground hover:text-foreground transition-colors pt-1">
                <Settings className="h-2.5 w-2.5 shrink-0" />
                <span className="text-[8.5px] truncate">Settings</span>
              </div>
            </div>

            {/* Tablet Main Screen Content */}
            <div className="col-span-9 p-2 space-y-1.5 bg-card">
              {/* Top Row: Greeting & Next Session */}
              <div className="grid grid-cols-12 gap-1.5">
                {/* Greeting & 2 Stat Cards */}
                <div className="col-span-7 space-y-1">
                  <div>
                    <h4 className="font-extrabold text-foreground text-[11px] leading-tight">
                      Good morning, Rahim!
                    </h4>
                    <p className="text-[8px] text-primary-soft-foreground">
                      Keep going! You&apos;re making great progress.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-1">
                    {/* Total Sessions */}
                    <div className="rounded-md border border-primary/40 bg-card p-1 space-y-0.5">
                      <div className="flex items-center gap-1 text-[7.5px] text-primary-soft-foreground">
                        <CalendarDays className="h-2 w-2" />
                        <span className="truncate">Sessions</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs font-black text-foreground">24</span>
                        <span className="text-[7px] font-bold text-success-soft-foreground bg-success-soft px-0.5 rounded">
                          +12%
                        </span>
                      </div>
                    </div>

                    {/* Assignment Completed */}
                    <div className="rounded-md border border-primary/40 bg-card p-1 space-y-0.5">
                      <div className="flex items-center gap-1 text-[7.5px] text-primary-soft-foreground">
                        <FileCheck className="h-2 w-2" />
                        <span className="truncate">Assignment</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs font-black text-foreground">18</span>
                        <span className="text-[7px] font-bold text-success-soft-foreground bg-success-soft px-0.5 rounded">
                          +28%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Next Session Card */}
                <div className="col-span-5 rounded-lg border border-primary/40 bg-gradient-to-br from-card to-card p-1.5 flex flex-col justify-between">
                  <div>
                    <div className="text-[7px] uppercase tracking-wider text-primary-soft-foreground font-bold">
                      Next Session
                    </div>
                    <div className="font-bold text-foreground text-[9px]">Today, 5:00 PM</div>
                    <div className="text-[7.5px] text-muted-foreground truncate">Math • Online</div>
                  </div>
                  <button
                    type="button"
                    className="mt-0.5 w-full rounded bg-brand-soft hover:bg-brand-soft text-primary border border-border py-0.5 text-[7.5px] font-bold transition-all text-center cursor-pointer"
                  >
                    View Details
                  </button>
                </div>
              </div>

              {/* Lower Section: Subject Performance Bar Chart + Recent Activity */}
              <div className="grid grid-cols-12 gap-1.5">
                {/* Subject Performance Chart */}
                <div className="col-span-7 rounded-lg border border-primary/40 bg-card p-1.5 space-y-1">
                  <div className="flex items-center justify-between text-[8px]">
                    <span className="font-bold text-foreground">Subject Performance</span>
                    <div className="flex items-center gap-1.5 text-[7px] text-muted-foreground">
                      <span className="flex items-center gap-0.5">
                        <span className="h-1 w-1 rounded-full bg-brand" /> Cur
                      </span>
                      <span className="flex items-center gap-0.5">
                        <span className="h-1 w-1 rounded-full bg-card" /> Prev
                      </span>
                    </div>
                  </div>

                  {/* Dual Bar Columns with Interactive Micro-Tooltips */}
                  <div className="flex items-end justify-between gap-1 pt-0.5 h-11 px-1 border-b border-primary/40">
                    {subjects.map((sub) => (
                      <div
                        key={sub.name}
                        className="group relative flex flex-col items-center gap-0.5 flex-1 cursor-pointer"
                      >
                        {/* Hover Tooltip */}
                        <div className="absolute -top-5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-30 bg-card text-primary font-bold text-[6.5px] px-1 py-0.2 rounded border border-primary/40 shadow-xs whitespace-nowrap">
                          {sub.current}%
                        </div>

                        <div className="flex items-end gap-0.5 w-full justify-center h-8">
                          {/* Current bar */}
                          <div
                            style={{ height: `${sub.current}%` }}
                            className="w-1.5 rounded-t bg-gradient-to-t from-primary to-brand shadow-xs group-hover:brightness-125 transition-all"
                          />
                          {/* Previous bar */}
                          <div
                            style={{ height: `${sub.previous}%` }}
                            className="w-1 rounded-t bg-card group-hover:bg-card transition-colors"
                          />
                        </div>
                        <span className="text-[6.5px] text-muted-foreground group-hover:text-foreground font-medium truncate transition-colors">
                          {sub.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Activity List */}
                <div className="col-span-5 rounded-lg border border-primary/40 bg-card p-1.5 space-y-0.5">
                  <div className="flex items-center justify-between text-[8px]">
                    <span className="font-bold text-foreground">Recent Activity</span>
                    <span className="text-[7px] text-primary-soft-foreground hover:underline cursor-pointer">
                      View All
                    </span>
                  </div>

                  <div className="space-y-1 text-[7.5px]">
                    <div className="flex items-start gap-1">
                      <CheckCircle2 className="h-2 w-2 text-primary shrink-0 mt-0.5" />
                      <div className="leading-tight">
                        <div className="font-semibold text-foreground">Assignment Done</div>
                        <div className="text-[6.5px] text-muted-foreground">Math • 2h ago</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-1">
                      <MessageSquare className="h-2 w-2 text-interactive shrink-0 mt-0.5" />
                      <div className="leading-tight">
                        <div className="font-semibold text-foreground">New Message</div>
                        <div className="text-[6.5px] text-muted-foreground">From Tutor • 4h</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-1">
                      <CheckCircle2 className="h-2 w-2 text-info-soft-foreground shrink-0 mt-0.5" />
                      <div className="leading-tight">
                        <div className="font-semibold text-foreground">Progress Saved</div>
                        <div className="text-[6.5px] text-muted-foreground">English • 1d ago</div>
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
