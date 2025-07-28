"use client"

import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"

interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

interface DialogContentProps {
  className?: string
  children: React.ReactNode
}

interface DialogHeaderProps {
  className?: string
  children: React.ReactNode
}

interface DialogTitleProps {
  className?: string
  children: React.ReactNode
}

interface DialogDescriptionProps {
  className?: string
  children: React.ReactNode
}

interface DialogTriggerProps {
  asChild?: boolean
  children: React.ReactNode
  onClick?: () => void
}

const DialogContext = React.createContext<{
  open: boolean
  setOpen: (open: boolean) => void
}>({
  open: false,
  setOpen: () => {}
})

const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const isOpen = open !== undefined ? open : internalOpen
  const setOpen = onOpenChange || setInternalOpen

  return (
    <DialogContext.Provider value={{ open: isOpen, setOpen }}>
      {children}
    </DialogContext.Provider>
  )
}

const DialogTrigger: React.FC<DialogTriggerProps> = ({ children, onClick }) => {
  const { setOpen } = React.useContext(DialogContext)
  
  return (
    <div onClick={() => {
      setOpen(true)
      onClick?.()
    }}>
      {children}
    </div>
  )
}

const DialogContent: React.FC<DialogContentProps> = ({ className, children }) => {
  const { open, setOpen } = React.useContext(DialogContext)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={() => setOpen(false)}
      />
      
      {/* Content */}
      <div className={cn(
        "relative bg-white rounded-lg shadow-lg p-6 w-full max-w-md mx-4",
        className
      )}>
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-2 top-2 p-1"
          onClick={() => setOpen(false)}
        >
          <X className="h-4 w-4" />
        </Button>
        {children}
      </div>
    </div>
  )
}

const DialogHeader: React.FC<DialogHeaderProps> = ({ className, children }) => (
  <div className={cn("flex flex-col space-y-2 text-center sm:text-left mb-4", className)}>
    {children}
  </div>
)

const DialogTitle: React.FC<DialogTitleProps> = ({ className, children }) => (
  <h2 className={cn("text-lg font-semibold", className)}>
    {children}
  </h2>
)

const DialogDescription: React.FC<DialogDescriptionProps> = ({ className, children }) => (
  <p className={cn("text-sm text-gray-600", className)}>
    {children}
  </p>
)

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
}
