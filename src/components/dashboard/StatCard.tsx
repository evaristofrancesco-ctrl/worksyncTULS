import { Card, CardContent } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"

interface StatCardProps {
  title: string
  value: string | number
  description: string
  icon: LucideIcon
  trend?: {
    value: number
    positive: boolean
  }
}

export function StatCard({ title, value, description, icon: Icon, trend }: StatCardProps) {
  return (
    <Card className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow duration-300">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/80 mb-1">{title}</p>
            <h3 className="text-2xl font-black text-[#1e293b] tracking-tight">{value}</h3>
          </div>
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          {trend && (
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${trend.positive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {trend.positive ? '+' : '-'}{Math.abs(trend.value)}%
            </span>
          )}
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-tighter">{description}</p>
        </div>
      </CardContent>
    </Card>
  )
}
