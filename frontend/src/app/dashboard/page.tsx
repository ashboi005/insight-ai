"use client"

import { useState, useEffect, useCallback } from "react"
import MainLayout from "@/components/ui/layout/main-layout"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Trash2, CheckCircle, Clock, Loader2, Users, Filter, Search, Activity } from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"
import { tasksAPI, Task } from "@/lib/api"
import { useAuth } from "@/context/AuthContext"

interface AnalyticsData {
  name: string
  value: number
  color: string
}

interface PriorityData {
  name: string
  value: number
  color: string
}

type SortField = 'created_at' | 'priority' | 'status' | 'title'
type SortOrder = 'asc' | 'desc'

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([])
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([])
  const [priorityData, setPriorityData] = useState<PriorityData[]>([])
  const [teamActivity, setTeamActivity] = useState<AnalyticsData[]>([])
  const [recentActivity, setRecentActivity] = useState<Task[]>([])
  const [showTeamActivity, setShowTeamActivity] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const [totalTasksCount, setTotalTasksCount] = useState(0)
  
  // Filter and sort states
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [teamFilter, setTeamFilter] = useState<string>('all')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [showRecentActivity, setShowRecentActivity] = useState(false)
  
  // Pagination states
  const [tasksPerPage] = useState(20)
  const [hasMoreTasks, setHasMoreTasks] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  
  const { user } = useAuth()

  const loadData = useCallback(async (append: boolean = false, currentTasksLength: number = 0) => {
    try {
      if (!append) {
        setIsLoading(true)
      } else {
        setIsLoadingMore(true)
      }
      
      const skip = append ? currentTasksLength : 0
      console.log(`Loading tasks: append=${append}, skip=${skip}, limit=${tasksPerPage}, currentLength=${currentTasksLength}`)
      
      // Load recent tasks and analytics in parallel
      const [recentTasks, analytics] = await Promise.all([
        tasksAPI.getAll({ skip, limit: tasksPerPage, myTeamOnly: false }),
        !append ? tasksAPI.getAnalytics(false) : Promise.resolve(null)
      ])

      console.log(`Received ${recentTasks.length} tasks`)
      
      // Check if there are more tasks to load
      setHasMoreTasks(recentTasks.length === tasksPerPage)
      console.log(`Has more tasks: ${recentTasks.length === tasksPerPage}`)
      
      if (append) {
        setTasks(prev => {
          const newTasks = [...prev, ...recentTasks]
          console.log(`Total tasks after append: ${newTasks.length}`)
          return newTasks
        })
      } else {
        setTasks(recentTasks)
        console.log(`Initial load: ${recentTasks.length} tasks`)
      }

      // Only update analytics on initial load
      if (!append && analytics) {
        console.log('Analytics data:', analytics)
        
        // Calculate total tasks from analytics
        const totalTasks = analytics.overall_stats.completed_tasks + 
                          analytics.overall_stats.in_progress_tasks + 
                          analytics.overall_stats.pending_tasks
        setTotalTasksCount(totalTasks)
        
        // Convert analytics to chart data
        const chartData: AnalyticsData[] = [
          { name: "Completed", value: analytics.overall_stats.completed_tasks, color: "#22c55e" },
          { name: "In Progress", value: analytics.overall_stats.in_progress_tasks, color: "#3b82f6" },
          { name: "Pending", value: analytics.overall_stats.pending_tasks, color: "#f59e0b" },
        ].filter(item => item.value > 0) // Only show non-zero values

        setAnalyticsData(chartData)

        // Convert priority stats to bar chart data
        const priorityChartData: PriorityData[] = [
          { name: "High", value: analytics.overall_stats.high_priority, color: "#ef4444" },
          { name: "Medium", value: analytics.overall_stats.medium_priority, color: "#f59e0b" },
          { name: "Low", value: analytics.overall_stats.low_priority, color: "#22c55e" },
        ].filter(item => item.value > 0)

        setPriorityData(priorityChartData)

        // Set team activity data
        if (analytics.team_breakdown && analytics.team_breakdown.length > 0) {
          const teamData = analytics.team_breakdown.map((team, index) => ({
            name: team.team,
            value: team.total_tasks,
            color: `hsl(${index * 45}, 70%, 50%)`
          }))
          setTeamActivity(teamData)
        }

        // Set recent activity data
        if (analytics.recent_activity && analytics.recent_activity.length > 0) {
          setRecentActivity(analytics.recent_activity)
        }
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [tasksPerPage])

  const loadMoreTasks = () => {
    if (!isLoadingMore && hasMoreTasks) {
      loadData(true, tasks.length)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Filter and sort tasks whenever filters change
  useEffect(() => {
    let filtered = [...tasks]

    // Apply filters
    if (statusFilter !== 'all') {
      filtered = filtered.filter(task => task.status === statusFilter)
    }
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(task => task.priority === priorityFilter)
    }
    if (teamFilter !== 'all') {
      filtered = filtered.filter(task => task.assigned_team === teamFilter)
    }
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase()
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(keyword) ||
        task.description.toLowerCase().includes(keyword) ||
        (task.tags && task.tags.toLowerCase().includes(keyword))
      )
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: string | number, bValue: string | number

      switch (sortField) {
        case 'created_at':
          aValue = new Date(a.created_at).getTime()
          bValue = new Date(b.created_at).getTime()
          break
        case 'priority':
          const priorityOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 }
          aValue = priorityOrder[a.priority as keyof typeof priorityOrder]
          bValue = priorityOrder[b.priority as keyof typeof priorityOrder]
          break
        case 'status':
          const statusOrder = { 'PENDING': 1, 'IN_PROGRESS': 2, 'COMPLETED': 3 }
          aValue = statusOrder[a.status as keyof typeof statusOrder]
          bValue = statusOrder[b.status as keyof typeof statusOrder]
          break
        case 'title':
          aValue = a.title.toLowerCase()
          bValue = b.title.toLowerCase()
          break
        default:
          aValue = new Date(a.created_at).getTime()
          bValue = new Date(b.created_at).getTime()
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    setFilteredTasks(filtered)
  }, [tasks, statusFilter, priorityFilter, teamFilter, searchKeyword, sortField, sortOrder])

  const clearFilters = () => {
    setStatusFilter('all')
    setPriorityFilter('all')
    setTeamFilter('all')
    setSearchKeyword('')
    setSortField('created_at')
    setSortOrder('desc')
  }

  const getUniqueTeams = () => {
    const teams = [...new Set(tasks.map(task => task.assigned_team))]
    return teams.sort()
  }

  const updateTaskStatus = async (taskId: number, newStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED') => {
    try {
      setIsUpdating(taskId.toString())
      
      const updatedTask = await tasksAPI.updateStatus(taskId, newStatus)
      
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

      // Update priority data
      const priorityChartData: PriorityData[] = [
        { name: "High", value: analytics.overall_stats.high_priority, color: "#ef4444" },
        { name: "Medium", value: analytics.overall_stats.medium_priority, color: "#f59e0b" },
        { name: "Low", value: analytics.overall_stats.low_priority, color: "#22c55e" },
      ].filter(item => item.value > 0)

      setPriorityData(priorityChartData)
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

      // Update priority data
      const priorityChartData: PriorityData[] = [
        { name: "High", value: analytics.overall_stats.high_priority, color: "#ef4444" },
        { name: "Medium", value: analytics.overall_stats.medium_priority, color: "#f59e0b" },
        { name: "Low", value: analytics.overall_stats.low_priority, color: "#22c55e" },
      ].filter(item => item.value > 0)

      setPriorityData(priorityChartData)
    } catch (error) {
      console.error('Failed to delete task:', error)
      toast.error('Failed to delete task')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'text-green-600'
      case 'IN_PROGRESS':
        return 'text-blue-600'
      case 'PENDING':
        return 'text-yellow-600'
      default:
        return 'text-gray-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4" />
      case 'IN_PROGRESS':
        return <Clock className="h-4 w-4" />
      case 'PENDING':
        return <Clock className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getTeamColor = (team: string) => {
    const colors: { [key: string]: string } = {
      'Sales': 'bg-blue-100 text-blue-800',
      'Devs': 'bg-green-100 text-green-800',
      'Marketing': 'bg-purple-100 text-purple-800',
      'Design': 'bg-pink-100 text-pink-800',
      'Operations': 'bg-orange-100 text-orange-800',
      'Finance': 'bg-yellow-100 text-yellow-800',
      'HR': 'bg-red-100 text-red-800',
      'General': 'bg-gray-100 text-gray-800',
    }
    return colors[team] || 'bg-gray-100 text-gray-800'
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-100 text-red-800 border border-red-200'
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200'
      case 'LOW':
        return 'bg-green-100 text-green-800 border border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return '🔴'
      case 'MEDIUM':
        return '🟡'
      case 'LOW':
        return '🟢'
      default:
        return '⚪'
    }
  }

  const getStatusButton = (status: string, taskId: number) => {
    const isTaskUpdating = isUpdating === taskId.toString()
    
    const getNextStatus = (currentStatus: string) => {
      switch (currentStatus) {
        case 'PENDING':
          return 'IN_PROGRESS'
        case 'IN_PROGRESS':
          return 'COMPLETED'
        case 'COMPLETED':
          return 'PENDING'
        default:
          return 'PENDING'
      }
    }

    const getStatusConfig = (status: string) => {
      switch (status) {
        case 'PENDING':
          return {
            icon: <Clock className="h-3 w-3" />,
            text: 'Pending',
            color: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200',
            nextAction: 'Start'
          }
        case 'IN_PROGRESS':
          return {
            icon: <Loader2 className="h-3 w-3 animate-spin" />,
            text: 'In Progress',
            color: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200',
            nextAction: 'Complete'
          }
        case 'COMPLETED':
          return {
            icon: <CheckCircle className="h-3 w-3" />,
            text: 'Completed',
            color: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200',
            nextAction: 'Reset'
          }
        default:
          return {
            icon: <Clock className="h-3 w-3" />,
            text: 'Pending',
            color: 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200',
            nextAction: 'Start'
          }
      }
    }

    const config = getStatusConfig(status)
    const nextStatus = getNextStatus(status)

    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => updateTaskStatus(taskId, nextStatus as 'PENDING' | 'IN_PROGRESS' | 'COMPLETED')}
        disabled={isTaskUpdating}
        className={`${config.color} border transition-all duration-200 min-w-[100px]`}
        title={`Click to ${config.nextAction}`}
      >
        {isTaskUpdating ? (
          <Loader2 className="h-3 w-3 animate-spin mr-1" />
        ) : (
          <span className="mr-1">{config.icon}</span>
        )}
        <span className="text-xs font-medium">{config.text}</span>
      </Button>
    )
  }

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-2">
              Welcome back, {user?.first_name}! Here&apos;s your task overview.
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Analytics Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pie Chart Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center">
                        <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
                        Task Status Overview
                      </div>
                      {teamActivity.length > 0 && (
                        <Select value={showTeamActivity ? "team" : "overall"} onValueChange={(value) => setShowTeamActivity(value === "team")}>
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="overall">Overall Stats</SelectItem>
                            <SelectItem value="team">Team Activity</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {showTeamActivity ? "Team-wise task breakdown" : "Visual breakdown of your task completion status"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(!showTeamActivity && analyticsData.length > 0) || (showTeamActivity && teamActivity.length > 0) ? (
                      <>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={showTeamActivity ? teamActivity : analyticsData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                {(showTeamActivity ? teamActivity : analyticsData).map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex justify-center space-x-6 mt-4 flex-wrap">
                          {(showTeamActivity ? teamActivity : analyticsData).map((item, index) => (
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

                {/* Bar Chart Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Users className="mr-2 h-5 w-5 text-purple-500" />
                        Priority Distribution
                      </div>
                      {recentActivity.length > 0 && (
                        <Select value={showRecentActivity ? "recent" : "priority"} onValueChange={(value) => setShowRecentActivity(value === "recent")}>
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="priority">Priority Chart</SelectItem>
                            <SelectItem value="recent">Recent Activity</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {showRecentActivity ? "Recent task activity" : "Task count by priority level"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {showRecentActivity ? (
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {recentActivity.slice(0, 5).map((task) => (
                          <div key={task.id} className="flex items-center space-x-3 p-2 border rounded-lg bg-gray-50">
                            <span className={getStatusColor(task.status)}>
                              {getStatusIcon(task.status)}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {task.title}
                              </p>
                              <div className="flex items-center space-x-2 mt-1">
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${getPriorityColor(task.priority)}`}>
                                  {getPriorityIcon(task.priority)} {task.priority}
                                </span>
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${getTeamColor(task.assigned_team)}`}>
                                  {task.assigned_team}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : priorityData.length > 0 ? (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={priorityData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" fill="#8884d8">
                              {priorityData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-64 text-gray-500">
                        No priority data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Filters and Search Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Filter className="mr-2 h-5 w-5 text-indigo-500" />
                    Filters & Search
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                    {/* Search */}
                    <div className="lg:col-span-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          placeholder="Search tasks..."
                          value={searchKeyword}
                          onChange={(e) => setSearchKeyword(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    {/* Status Filter */}
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Priority Filter */}
                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Priority</SelectItem>
                        <SelectItem value="HIGH">🔴 High</SelectItem>
                        <SelectItem value="MEDIUM">🟡 Medium</SelectItem>
                        <SelectItem value="LOW">🟢 Low</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Team Filter */}
                    <Select value={teamFilter} onValueChange={setTeamFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Team" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Teams</SelectItem>
                        {getUniqueTeams().map(team => (
                          <SelectItem key={team} value={team}>{team}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Sort Options */}
                    <div className="flex space-x-2">
                      <Select value={`${sortField}-${sortOrder}`} onValueChange={(value) => {
                        const [field, order] = value.split('-') as [SortField, SortOrder]
                        setSortField(field)
                        setSortOrder(order)
                      }}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="created_at-desc">📅 Newest First</SelectItem>
                          <SelectItem value="created_at-asc">📅 Oldest First</SelectItem>
                          <SelectItem value="priority-desc">🔥 High Priority First</SelectItem>
                          <SelectItem value="priority-asc">🔥 Low Priority First</SelectItem>
                          <SelectItem value="status-asc">📋 Status: Pending First</SelectItem>
                          <SelectItem value="status-desc">📋 Status: Completed First</SelectItem>
                          <SelectItem value="title-asc">🔤 Title A-Z</SelectItem>
                          <SelectItem value="title-desc">🔤 Title Z-A</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-4">
                         {/* Total count indicator */}
                    {filteredTasks.length > 0 && (
                      <div className="text-center pt-2 text-sm text-gray-500">
                        Showing {filteredTasks.length} filtered tasks out of {tasks.length} loaded tasks
                        {!hasMoreTasks && " (all tasks loaded)"}
                      </div>
                    )}
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      Clear Filters
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Task List Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Activity className="mr-2 h-5 w-5 text-blue-500" />
                      <CardTitle>Tasks ({filteredTasks.length})</CardTitle>
                    </div>
                     <p className="text-sm text-gray-600">
                      Showing {filteredTasks.length} of {totalTasksCount > 0 ? totalTasksCount : tasks.length} tasks
                    </p>
                    {/* Load More Button - Top Position */}
                    {filteredTasks.length > 0 && hasMoreTasks && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={loadMoreTasks}
                        disabled={isLoadingMore}
                      >
                        {isLoadingMore ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          `Load More (${tasks.length} loaded)`
                        )}
                      </Button>
                    )}
                  </div>
                  <CardDescription>Your filtered and sorted tasks</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {filteredTasks.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">
                        {tasks.length === 0 
                          ? "No tasks available. Upload some transcripts to generate tasks!"
                          : "No tasks match your current filters. Try adjusting the filters above."
                        }
                      </p>
                    ) : (
                      filteredTasks.map((task) => (
                        <div key={task.id} className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                          {getStatusButton(task.status, task.id)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2 flex-wrap">
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${getPriorityColor(task.priority)}`}>
                                {getPriorityIcon(task.priority)} {task.priority}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${getTeamColor(task.assigned_team)}`}>
                                @{task.assigned_team}
                              </span>
                              <span className="text-xs text-gray-400">
                                {new Date(task.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <p className={`text-sm font-medium ${task.status === 'COMPLETED' ? "line-through text-gray-500" : "text-gray-900"}`}>
                              {task.title}
                            </p>
                            {task.description && (
                              <p className="text-xs text-gray-500 mt-1">
                                {task.description.length > 150 
                                  ? `${task.description.substring(0, 150)}...` 
                                  : task.description
                                }
                              </p>
                            )}
                            {task.tags && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {task.tags.split(',').map((tag, index) => (
                                  <span key={index} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                                    #{tag.trim()}
                                  </span>
                                ))}
                              </div>
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
}erall_stats.pending_tasks, color: "#f59e0b" },
      ].filter(item => item.value > 0)
      
      setAnalyticsData(chartData)

      // Update priority data
      const priorityChartData: PriorityData[] = [
        { name: "High", value: analytics.overall_stats.high_priority, color: "#ef4444" },
        { name: "Medium", value: analytics.overall_stats.medium_priority, color: "#f59e0b" },
        { name: "Low", value: analytics.overall_stats.low_priority, color: "#22c55e" },
      ].filter(item => item.value > 0)

      setPriorityData(priorityChartData)
    } catch (error) {
      console.error('Failed to delete task:', error)
      toast.error('Failed to delete task')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'text-green-600'
      case 'IN_PROGRESS':
        return 'text-blue-600'
      case 'PENDING':
        return 'text-yellow-600'
      default:
        return 'text-gray-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4" />
      case 'IN_PROGRESS':
        return <Clock className="h-4 w-4" />
      case 'PENDING':
        return <Clock className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getTeamColor = (team: string) => {
    const colors: { [key: string]: string } = {
      'Sales': 'bg-blue-100 text-blue-800',
      'Devs': 'bg-green-100 text-green-800',
      'Marketing': 'bg-purple-100 text-purple-800',
      'Design': 'bg-pink-100 text-pink-800',
      'Operations': 'bg-orange-100 text-orange-800',
      'Finance': 'bg-yellow-100 text-yellow-800',
      'HR': 'bg-red-100 text-red-800',
      'General': 'bg-gray-100 text-gray-800',
    }
    return colors[team] || 'bg-gray-100 text-gray-800'
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-100 text-red-800 border border-red-200'
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200'
      case 'LOW':
        return 'bg-green-100 text-green-800 border border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return '🔴'
      case 'MEDIUM':
        return '🟡'
      case 'LOW':
        return '🟢'
      default:
        return '⚪'
    }
  }

  const getStatusButton = (status: string, taskId: number) => {
    const isTaskUpdating = isUpdating === taskId.toString()
    
    const getNextStatus = (currentStatus: string) => {
      switch (currentStatus) {
        case 'PENDING':
          return 'IN_PROGRESS'
        case 'IN_PROGRESS':
          return 'COMPLETED'
        case 'COMPLETED':
          return 'PENDING'
        default:
          return 'PENDING'
      }
    }

    const getStatusConfig = (status: string) => {
      switch (status) {
        case 'PENDING':
          return {
            icon: <Clock className="h-3 w-3" />,
            text: 'Pending',
            color: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200',
            nextAction: 'Start'
          }
        case 'IN_PROGRESS':
          return {
            icon: <Loader2 className="h-3 w-3 animate-spin" />,
            text: 'In Progress',
            color: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200',
            nextAction: 'Complete'
          }
        case 'COMPLETED':
          return {
            icon: <CheckCircle className="h-3 w-3" />,
            text: 'Completed',
            color: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200',
            nextAction: 'Reset'
          }
        default:
          return {
            icon: <Clock className="h-3 w-3" />,
            text: 'Pending',
            color: 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200',
            nextAction: 'Start'
          }
      }
    }

    const config = getStatusConfig(status)
    const nextStatus = getNextStatus(status)

    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => updateTaskStatus(taskId, nextStatus as 'PENDING' | 'IN_PROGRESS' | 'COMPLETED')}
        disabled={isTaskUpdating}
        className={`${config.color} border transition-all duration-200 min-w-[100px]`}
        title={`Click to ${config.nextAction}`}
      >
        {isTaskUpdating ? (
          <Loader2 className="h-3 w-3 animate-spin mr-1" />
        ) : (
          <span className="mr-1">{config.icon}</span>
        )}
        <span className="text-xs font-medium">{config.text}</span>
      </Button>
    )
  }

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-2">
              Welcome back, {user?.first_name}! Here&apos;s your task overview.
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Analytics Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pie Chart Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center">
                        <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
                        Task Status Overview
                      </div>
                      {teamActivity.length > 0 && (
                        <Select value={showTeamActivity ? "team" : "overall"} onValueChange={(value) => setShowTeamActivity(value === "team")}>
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="overall">Overall Stats</SelectItem>
                            <SelectItem value="team">Team Activity</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {showTeamActivity ? "Team-wise task breakdown" : "Visual breakdown of your task completion status"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(!showTeamActivity && analyticsData.length > 0) || (showTeamActivity && teamActivity.length > 0) ? (
                      <>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={showTeamActivity ? teamActivity : analyticsData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                {(showTeamActivity ? teamActivity : analyticsData).map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex justify-center space-x-6 mt-4 flex-wrap">
                          {(showTeamActivity ? teamActivity : analyticsData).map((item, index) => (
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

                {/* Bar Chart Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Users className="mr-2 h-5 w-5 text-purple-500" />
                        Priority Distribution
                      </div>
                      {recentActivity.length > 0 && (
                        <Select value={showRecentActivity ? "recent" : "priority"} onValueChange={(value) => setShowRecentActivity(value === "recent")}>
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="priority">Priority Chart</SelectItem>
                            <SelectItem value="recent">Recent Activity</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {showRecentActivity ? "Recent task activity" : "Task count by priority level"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {showRecentActivity ? (
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {recentActivity.slice(0, 5).map((task) => (
                          <div key={task.id} className="flex items-center space-x-3 p-2 border rounded-lg bg-gray-50">
                            <span className={getStatusColor(task.status)}>
                              {getStatusIcon(task.status)}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {task.title}
                              </p>
                              <div className="flex items-center space-x-2 mt-1">
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${getPriorityColor(task.priority)}`}>
                                  {getPriorityIcon(task.priority)} {task.priority}
                                </span>
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${getTeamColor(task.assigned_team)}`}>
                                  {task.assigned_team}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : priorityData.length > 0 ? (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={priorityData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" fill="#8884d8">
                              {priorityData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-64 text-gray-500">
                        No priority data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Filters and Search Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Filter className="mr-2 h-5 w-5 text-indigo-500" />
                    Filters & Search
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                    {/* Search */}
                    <div className="lg:col-span-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          placeholder="Search tasks..."
                          value={searchKeyword}
                          onChange={(e) => setSearchKeyword(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    {/* Status Filter */}
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Priority Filter */}
                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Priority</SelectItem>
                        <SelectItem value="HIGH">🔴 High</SelectItem>
                        <SelectItem value="MEDIUM">🟡 Medium</SelectItem>
                        <SelectItem value="LOW">🟢 Low</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Team Filter */}
                    <Select value={teamFilter} onValueChange={setTeamFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Team" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Teams</SelectItem>
                        {getUniqueTeams().map(team => (
                          <SelectItem key={team} value={team}>{team}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Sort Options */}
                    <div className="flex space-x-2">
                      <Select value={`${sortField}-${sortOrder}`} onValueChange={(value) => {
                        const [field, order] = value.split('-') as [SortField, SortOrder]
                        setSortField(field)
                        setSortOrder(order)
                      }}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="created_at-desc">📅 Newest First</SelectItem>
                          <SelectItem value="created_at-asc">📅 Oldest First</SelectItem>
                          <SelectItem value="priority-desc">🔥 High Priority First</SelectItem>
                          <SelectItem value="priority-asc">🔥 Low Priority First</SelectItem>
                          <SelectItem value="status-asc">📋 Status: Pending First</SelectItem>
                          <SelectItem value="status-desc">📋 Status: Completed First</SelectItem>
                          <SelectItem value="title-asc">🔤 Title A-Z</SelectItem>
                          <SelectItem value="title-desc">🔤 Title Z-A</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-4">
                         {/* Total count indicator */}
                    {filteredTasks.length > 0 && (
                      <div className="text-center pt-2 text-sm text-gray-500">
                        Showing {filteredTasks.length} filtered tasks out of {tasks.length} loaded tasks
                        {!hasMoreTasks && " (all tasks loaded)"}
                      </div>
                    )}
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      Clear Filters
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Task List Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Activity className="mr-2 h-5 w-5 text-blue-500" />
                      <CardTitle>Tasks ({filteredTasks.length})</CardTitle>
                    </div>
                     <p className="text-sm text-gray-600">
                      Showing {filteredTasks.length} of {totalTasksCount > 0 ? totalTasksCount : tasks.length} tasks
                    </p>
                    {/* Load More Button - Top Position */}
                    {filteredTasks.length > 0 && hasMoreTasks && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={loadMoreTasks}
                        disabled={isLoadingMore}
                      >
                        {isLoadingMore ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          `Load More (${tasks.length} loaded)`
                        )}
                      </Button>
                    )}
                  </div>
                  <CardDescription>Your filtered and sorted tasks</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {filteredTasks.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">
                        {tasks.length === 0 
                          ? "No tasks available. Upload some transcripts to generate tasks!"
                          : "No tasks match your current filters. Try adjusting the filters above."
                        }
                      </p>
                    ) : (
                      filteredTasks.map((task) => (
                        <div key={task.id} className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                          {getStatusButton(task.status, task.id)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2 flex-wrap">
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${getPriorityColor(task.priority)}`}>
                                {getPriorityIcon(task.priority)} {task.priority}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${getTeamColor(task.assigned_team)}`}>
                                @{task.assigned_team}
                              </span>
                              <span className="text-xs text-gray-400">
                                {new Date(task.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <p className={`text-sm font-medium ${task.status === 'COMPLETED' ? "line-through text-gray-500" : "text-gray-900"}`}>
                              {task.title}
                            </p>
                            {task.description && (
                              <p className="text-xs text-gray-500 mt-1">
                                {task.description.length > 150 
                                  ? `${task.description.substring(0, 150)}...` 
                                  : task.description
                                }
                              </p>
                            )}
                            {task.tags && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {task.tags.split(',').map((tag, index) => (
                                  <span key={index} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                                    #{tag.trim()}
                                  </span>
                                ))}
                              </div>
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
