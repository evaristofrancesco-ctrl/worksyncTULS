"use client"

import { useState } from "react"
import { Calendar, Plus, Sparkles, UserCheck, AlertTriangle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { aiShiftOptimization, Employee, Shift, AiShiftOptimizationOutput } from "@/ai/flows/ai-shift-optimization-flow"
import { mockEmployees, mockShifts } from "@/lib/mock-data"
import { Badge } from "@/components/ui/badge"

export default function ShiftsPage() {
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [optimizationResult, setOptimizationResult] = useState<AiShiftOptimizationOutput | null>(null)
  const [showResultDialog, setShowResultDialog] = useState(false)

  const handleAiOptimize = async () => {
    setIsOptimizing(true)
    try {
      // Map mock data to GenAI types
      const inputEmployees: Employee[] = mockEmployees.map(e => ({
        id: e.id,
        name: e.name,
        roles: [e.position],
        skills: e.skills,
        availability: e.availability
      }))

      const inputShifts: Shift[] = mockShifts.map(s => ({
        id: s.id,
        name: s.title,
        startTime: s.startTime,
        endTime: s.endTime,
        requiredRoles: ["Senior Developer", "UX Designer"],
        requiredSkills: [],
        minCoverage: 1
      }))

      const result = await aiShiftOptimization({
        employees: inputEmployees,
        shifts: inputShifts
      })
      
      setOptimizationResult(result)
      setShowResultDialog(true)
    } catch (error) {
      console.error("Optimization failed:", error)
    } finally {
      setIsOptimizing(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Shift Management</h1>
          <p className="text-muted-foreground">Schedule and optimize your team's workflow.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleAiOptimize} disabled={isOptimizing} className="gap-2 border-accent text-accent hover:bg-accent hover:text-white">
            <Sparkles className={`h-4 w-4 ${isOptimizing ? 'animate-pulse' : ''}`} />
            {isOptimizing ? 'Optimizing...' : 'AI Optimizer'}
          </Button>
          <Button className="gap-2 bg-primary">
            <Plus className="h-4 w-4" />
            New Shift
          </Button>
        </div>
      </div>

      <Tabs defaultValue="calendar" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
        </TabsList>
        
        <TabsContent value="calendar" className="pt-6">
          <Card className="min-h-[600px] flex items-center justify-center bg-muted/20 border-dashed">
            <div className="text-center space-y-4">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <h3 className="text-lg font-semibold">Interactive Calendar Coming Soon</h3>
                <p className="text-muted-foreground max-w-xs mx-auto">Full drag-and-drop scheduling interface currently in development.</p>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="list" className="pt-6">
          <div className="grid gap-4">
            {mockShifts.map((shift) => (
              <Card key={shift.id}>
                <CardContent className="flex items-center justify-between p-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {new Date(shift.startTime).getDate()}
                    </div>
                    <div>
                      <p className="font-semibold">{shift.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(shift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                        {new Date(shift.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Michael Chen</span>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Confirmed
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              AI Shift Optimization Results
            </DialogTitle>
            <DialogDescription>
              We've analyzed employee availability, roles, and skills to suggest the following assignments.
            </DialogDescription>
          </DialogHeader>

          {optimizationResult && (
            <div className="space-y-6 my-4">
              <div className="p-4 bg-muted/50 rounded-lg border">
                <p className="text-sm italic text-muted-foreground">"{optimizationResult.optimizationSummary}"</p>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Suggested Assignments</h4>
                {optimizationResult.optimizedAssignments.map((assignment, idx) => (
                  <div key={idx} className="flex items-start gap-4 p-3 border rounded-lg hover:border-primary/50 transition-colors">
                    <div className="mt-1 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold">Shift ID: {assignment.shiftId}</span>
                        <Badge variant="secondary">Emp: {assignment.employeeId}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{assignment.justification}</p>
                    </div>
                  </div>
                ))}
              </div>

              {optimizationResult.unassignedShifts.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-red-500">Unassigned Shifts</h4>
                  {optimizationResult.unassignedShifts.map((id, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <span className="text-sm font-medium text-red-700">Unable to fill: {id}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowResultDialog(false)}>Discard</Button>
            <Button onClick={() => setShowResultDialog(false)} className="bg-primary">Apply Suggestions</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}