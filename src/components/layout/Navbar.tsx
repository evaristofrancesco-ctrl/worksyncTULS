"use client"

import { Bell, Search, User, LogOut, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function Navbar({ userName, role }: { userName: string, role: string }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-6">
      <div className="flex w-full items-center gap-4">
        <div className="relative flex-1 max-w-md hidden md:block">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search for employees, shifts..."
            className="pl-8 bg-muted/50 border-none h-9 w-full md:w-[300px] lg:w-[400px]"
          />
        </div>
        <div className="ml-auto flex items-center gap-4">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-2 right-2 flex h-2 w-2 rounded-full bg-accent" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-full flex items-center gap-2 pl-1 pr-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={`https://picsum.photos/seed/${userName}/100/100`} />
                  <AvatarFallback>{userName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start text-xs hidden sm:flex">
                  <span className="font-semibold">{userName}</span>
                  <span className="text-muted-foreground capitalize">{role.toLowerCase()}</span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}