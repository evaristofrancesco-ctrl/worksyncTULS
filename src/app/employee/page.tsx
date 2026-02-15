"use client"

import { Calendar, Clock, FileText, Gift, Info } from "lucide-react"
import { StatCard } from "@/components/dashboard/StatCard"
import { ClockInOut } from "@/components/attendance/ClockInOut"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"

export default function EmployeeDashboard() {
  return (
    <div className="grid gap-8 lg:grid-cols-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="lg:col-span-8 space-y-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Personal Dashboard</h1>
          <p className="text-muted-foreground">Good morning, Michael. Here's your schedule for today.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-accent/20 bg-accent/5 overflow-hidden group">
            <CardHeader className="pb-2">
              <CardDescription className="text-accent font-bold uppercase tracking-wider text-xs">Today's Shift</CardDescription>
              <CardTitle className="text-2xl">Development Sprint</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">09:00 AM - 05:00 PM</span>
              </div>
              <div className="flex gap-2">
                <Badge className="bg-accent text-white">Engineering</Badge>
                <Badge variant="outline">Headquarters</Badge>
              </div>
              <Button className="w-full mt-6 bg-accent hover:bg-accent/90">View Details</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-primary font-bold uppercase tracking-wider text-xs">Weekly Progress</CardDescription>
              <CardTitle className="text-2xl">32.5 Hours</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Weekly Goal (40h)</span>
                  <span className="font-bold">81%</span>
                </div>
                <Progress value={81} className="h-2 bg-muted" />
              </div>
              <div className="pt-2">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  You're on track to complete your week.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {[
                { type: 'CHECKIN', time: '08:55 AM', date: 'Today', status: 'On Time' },
                { type: 'CHECKOUT', time: '05:05 PM', date: 'Yesterday', status: 'Completed' },
                { type: 'CHECKIN', time: '09:02 AM', date: 'Yesterday', status: 'Late (2m)' },
              ].map((act, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${act.type === 'CHECKIN' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                    {act.type === 'CHECKIN' ? <Clock className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{act.type === 'CHECKIN' ? 'Clock In' : 'Clock Out'}</p>
                    <p className="text-xs text-muted-foreground">{act.date} at {act.time}</p>
                  </div>
                  <Badge variant="outline">{act.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-4 space-y-8">
        <ClockInOut />

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Leave Balance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border bg-muted/30 text-center">
                <p className="text-2xl font-bold">12</p>
                <p className="text-xs text-muted-foreground">Vacation Days</p>
              </div>
              <div className="p-4 rounded-xl border bg-muted/30 text-center">
                <p className="text-2xl font-bold">5</p>
                <p className="text-xs text-muted-foreground">Sick Days</p>
              </div>
            </div>
            <Button variant="outline" className="w-full gap-2">
              <Gift className="h-4 w-4" />
              Request Time Off
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-primary text-primary-foreground border-none">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                <FileText className="h-5 w-5" />
              </div>
              <h4 className="font-bold">Announcements</h4>
            </div>
            <p className="text-sm text-primary-foreground/90 leading-relaxed mb-4">
              Company town hall scheduled for Friday at 3:00 PM. Please RSVP in the calendar.
            </p>
            <Button variant="secondary" size="sm" className="w-full font-bold">Read More</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}