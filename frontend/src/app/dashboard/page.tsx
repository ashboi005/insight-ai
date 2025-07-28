"use client"

import { useState, useEffect } from "react"
import MainLayout from "@/components/ui/layout/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { Trash2, CheckCircle, Clock } from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"

interface Task {
  id: string
  description: string
  completed: boolean
  createdAt: string
}

interface AnalyticsData {
  name: string
  value: number
  color: string
}

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([])

  useEffect(() => {
    // Mock data - replace with actual API calls
    const mockTasks: Task[] = [
      {
        id: "1",
        description: "Follow up with client about project requirements",
        completed: false,
        createdAt: "2024-01-15",
      },
      { id: "2", description: "Schedule team meeting for next week", completed: true, createdAt: "2024-01-14" },
      { id: "3", description: "Review and approve budget proposal", completed: false, createdAt: "2024-01-13" },
      { id: "4", description: "Update project documentation", completed: true, createdAt: "2024-01-12" },
      { id: "5", description: "Prepare presentation for stakeholders", completed: false, createdAt: "2024-01-11" },
    ]

    setTasks(mockTasks)

    // Calculate analytics
    const completed = mockTasks.filter((task) => task.completed).length
    const pending = mockTasks.filter((task) => !task.completed).length

    setAnalyticsData([
      { name: "Completed", value: completed, color: "#22c55e" },
      { name: "Pending", value: pending, color: "#f59e0b" },
    ])
  }, [])

  const toggleTaskCompletion = async (taskId: string) => {
    try {
      // Mock API call - replace with actual PUT /tasks/{task_id}
      await new Promise((resolve) => setTimeout(resolve, 300))

      setTasks((prevTasks) =>
        prevTasks.map((task) => (task.id === taskId ? { ...task, completed: !task.completed } : task)),
      )

      toast.success("Task status has been updated successfully.")

      // Recalculate analytics
      const updatedTasks = tasks.map((task) => (task.id === taskId ? { ...task, completed: !task.completed } : task))
      const completed = updatedTasks.filter((task) => task.completed).length
      const pending = updatedTasks.filter((task) => !task.completed).length

      setAnalyticsData([
        { name: "Completed", value: completed, color: "#22c55e" },
        { name: "Pending", value: pending, color: "#f59e0b" },
      ])
    } catch (error) {
      toast.error("Failed to update task status.")
    }
  }

  const deleteTask = async (taskId: string) => {
    try {
      // Mock API call - replace with actual DELETE /tasks/{task_id}
      await new Promise((resolve) => setTimeout(resolve, 300))

      setTasks((prevTasks) => prevTasks.filter((task) => task.id !== taskId))

      toast.success("Task has been deleted successfully.")
    } catch (error) {
      toast.error("Failed to delete task.")
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Overview of your tasks and progress</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Analytics Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
                Task Analytics
              </CardTitle>
              <CardDescription>Visual breakdown of your task completion status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analyticsData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {analyticsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center space-x-6 mt-4">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-600">
                    Completed ({analyticsData.find((d) => d.name === "Completed")?.value || 0})
                  </span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-600">
                    Pending ({analyticsData.find((d) => d.name === "Pending")?.value || 0})
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Task List Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="mr-2 h-5 w-5 text-blue-500" />
                Task List
              </CardTitle>
              <CardDescription>Manage your generated tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {tasks.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No tasks available. Generate some tasks from transcripts!
                  </p>
                ) : (
                  tasks.map((task) => (
                    <div key={task.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                      <Checkbox checked={task.completed} onCheckedChange={() => toggleTaskCompletion(task.id)} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${task.completed ? "line-through text-gray-500" : "text-gray-900"}`}>
                          {task.description}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteTask(task.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}
