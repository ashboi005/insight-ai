"use client"

import { useState, useEffect } from "react"
import MainLayout from "@/components/ui/layout/main-layout"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { Trash2, CheckCircle, Clock, Loader2 } from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { tasksAPI, Task, TaskAnalytics } from "@/lib/api"
import { useAuth } from "@/context/AuthContext"

interface AnalyticsData {
  name: string
  value: number
  color: string
}

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const { user } = useAuth()

  const loadData = async () => {
    try {
      setIsLoading(true)
      
      // Load recent tasks and analytics in parallel
      const [recentTasks, analytics] = await Promise.all([
        tasksAPI.getAll({ limit: 10, myTeamOnly: false }),
        tasksAPI.getAnalytics(false)
      ])

      setTasks(recentTasks)

      // Convert analytics to chart data
      const chartData: AnalyticsData[] = [
        { name: "Completed", value: analytics.overall_stats.completed_tasks, color: "#22c55e" },
        { name: "In Progress", value: analytics.overall_stats.in_progress_tasks, color: "#3b82f6" },
        { name: "Pending", value: analytics.overall_stats.pending_tasks, color: "#f59e0b" },
      ].filter(item => item.value > 0) // Only show non-zero values

      setAnalyticsData(chartData)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const toggleTaskCompletion = async (taskId: number, currentStatus: string) => {
    try {
      setIsUpdating(taskId.toString())
      
      const updatedTask = await tasksAPI.toggleComplete(taskId, currentStatus)
      
      // Update the task in the local state
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId ? updatedTask : task
        )
      )
      
      toast.success("Task status updated successfully")
      
      // Reload analytics to get updated counts
      const analytics = await tasksAPI.getAnalytics(false)
      const chartData: AnalyticsData[] = [
        { name: "Completed", value: analytics.overall_stats.completed_tasks, color: "#22c55e" },
        { name: "In Progress", value: analytics.overall_stats.in_progress_tasks, color: "#3b82f6" },
        { name: "Pending", value: analytics.overall_stats.pending_tasks, color: "#f59e0b" },
      ].filter(item => item.value > 0)
      
      setAnalyticsData(chartData)
    } catch (error) {
      console.error('Failed to update task:', error)
      toast.error('Failed to update task status')
    } finally {
      setIsUpdating(null)
    }
  }

  const deleteTask = async (taskId: number) => {
    if (!confirm('Are you sure you want to delete this task?')) {
      return
    }

    try {
      await tasksAPI.delete(taskId)
      
      // Remove the task from the local state
      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId))
      
      toast.success("Task deleted successfully")
      
      // Reload analytics to get updated counts
      const analytics = await tasksAPI.getAnalytics(false)
      const chartData: AnalyticsData[] = [
        { name: "Completed", value: analytics.overall_stats.completed_tasks, color: "#22c55e" },
        { name: "In Progress", value: analytics.overall_stats.in_progress_tasks, color: "#3b82f6" },
        { name: "Pending", value: analytics.overall_stats.pending_tasks, color: "#f59e0b" },
      ].filter(item => item.value > 0)
      
      setAnalyticsData(chartData)
    } catch (error) {
      console.error('Failed to delete task:', error)
      toast.error('Failed to delete task')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600'
      case 'in_progress':
        return 'text-blue-600'
      default:
        return 'text-gray-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />
      case 'in_progress':
        return <Clock className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-2">
              Welcome back, {user?.first_name}! Here's your task overview.
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
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
                  {analyticsData.length > 0 ? (
                    <>
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
                      <div className="flex justify-center space-x-6 mt-4 flex-wrap">
                        {analyticsData.map((item, index) => (
                          <div key={index} className="flex items-center">
                            <div 
                              className="w-3 h-3 rounded-full mr-2" 
                              style={{ backgroundColor: item.color }}
                            ></div>
                            <span className="text-sm text-gray-600">
                              {item.name} ({item.value})
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-gray-500">
                      No task data available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Task List Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="mr-2 h-5 w-5 text-blue-500" />
                    Recent Tasks
                  </CardTitle>
                  <CardDescription>Your latest generated tasks</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {tasks.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">
                        No tasks available. Upload some transcripts to generate tasks!
                      </p>
                    ) : (
                      tasks.map((task) => (
                        <div key={task.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                          <Checkbox 
                            checked={task.status === 'completed'} 
                            onCheckedChange={() => toggleTaskCompletion(task.id, task.status)}
                            disabled={isUpdating === task.id.toString()}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className={getStatusColor(task.status)}>
                                {getStatusIcon(task.status)}
                              </span>
                              <span className={`text-xs font-medium ${getStatusColor(task.status)}`}>
                                {task.status.replace('_', ' ').toUpperCase()}
                              </span>
                              <span className="text-xs text-gray-400">
                                {task.priority.toUpperCase()}
                              </span>
                            </div>
                            <p className={`text-sm ${task.status === 'completed' ? "line-through text-gray-500" : "text-gray-900"}`}>
                              {task.title}
                            </p>
                            {task.description && (
                              <p className="text-xs text-gray-500 mt-1 truncate">
                                {task.description}
                              </p>
                            )}
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
          )}
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
