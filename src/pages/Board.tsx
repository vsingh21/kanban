import { useEffect, useState, memo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { DragDropContext, Draggable } from 'react-beautiful-dnd'
import type { DropResult } from 'react-beautiful-dnd'
import { supabase } from '../lib/supabase'
import { PlusIcon, TrashIcon, PencilIcon, ArrowLeftIcon, Bars3Icon } from '@heroicons/react/24/outline'
import ShareBoard from '../components/ShareBoard'
import BoardMenu from '../components/BoardMenu'
import { StrictModeDroppable } from '../components/StrictModeDroppable'

interface Task {
  id: string
  title: string
  description: string
  status: 'todo' | 'in_progress' | 'done'
  board_id: string
  created_at: string
  user_id?: string
  position?: number
}

interface Board {
  id: string
  name: string
  user_id?: string
}

const COLUMNS = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
}

// Use a memo'd TaskCard component for better performance
const TaskCard = memo(({ 
  task, 
  index, 
  editingTask, 
  handleUpdateTask, 
  setEditingTask,
  onDelete
}: { 
  task: Task, 
  index: number, 
  editingTask: Task | null,
  handleUpdateTask: (task: Task) => void,
  setEditingTask: (task: Task | null) => void,
  onDelete: (id: string) => void
}) => {
  if (editingTask?.id === task.id) {
    return (
      <Draggable key={task.id} draggableId={task.id} index={index}>
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md border border-gray-100 dark:border-gray-600 hover:shadow-lg transition-all duration-200"
          >
            <div className="space-y-3">
              <div>
                <label htmlFor="edit-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title
                </label>
                <input
                  id="edit-title"
                  type="text"
                  value={editingTask.title}
                  onChange={(e) =>
                    setEditingTask({
                      ...editingTask,
                      title: e.target.value,
                    })
                  }
                  className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm dark:bg-gray-800 dark:text-white transition-colors duration-200"
                />
              </div>
              <div>
                <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <input
                  id="edit-description"
                  type="text"
                  value={editingTask.description}
                  onChange={(e) =>
                    setEditingTask({
                      ...editingTask,
                      description: e.target.value,
                    })
                  }
                  className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm dark:bg-gray-800 dark:text-white transition-colors duration-200"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => handleUpdateTask(editingTask)}
                  className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-sm font-medium transition-colors duration-200"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingTask(null)}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 text-sm transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </Draggable>
    );
  }

  return (
    <Draggable key={task.id} draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md border border-gray-100 dark:border-gray-600 hover:shadow-lg transition-all duration-200 ${
            snapshot.isDragging ? 'shadow-xl ring-2 ring-indigo-500 dark:ring-indigo-400 opacity-90' : ''
          }`}
        >
          <div className="flex justify-between items-start">
            <div className="flex items-start gap-2">
              <span 
                className="text-gray-400 dark:text-gray-500 mt-0.5 cursor-grab"
                {...provided.dragHandleProps}
              >
                <Bars3Icon className="h-4 w-4" />
              </span>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white break-words">
                {task.title}
              </h3>
            </div>
            <div className="flex space-x-2 ml-2">
              <button
                onClick={() => setEditingTask(task)}
                className="text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-200"
                aria-label="Edit task"
              >
                <PencilIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => onDelete(task.id)}
                className="text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200"
                aria-label="Delete task"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
          {task.description && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 break-words">
              {task.description}
            </p>
          )}
        </div>
      )}
    </Draggable>
  );
});

export default function Board() {
  const { boardId } = useParams<{ boardId: string }>()
  const navigate = useNavigate()
  const [board, setBoard] = useState<Board | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [newTask, setNewTask] = useState<Omit<Task, 'id' | 'created_at' | 'board_id'>>({
    title: '',
    description: '',
    status: 'todo',
  })
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (boardId) {
      checkBoardPermission()
    }
  }, [boardId])

  const checkBoardPermission = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/login')
        return
      }

      // Check if user is board owner
      const { data: boardData, error: boardError } = await supabase
        .from('boards')
        .select('*')
        .eq('id', boardId)
        .single()

      if (boardError) {
        if (boardError.code === 'PGRST116') {
          // Board not found
          setError('Board not found')
          navigate('/dashboard')
          return
        }
        throw boardError
      }

      setBoard(boardData)

      if (boardData.user_id === user.id) {
        fetchTasks()
        return
      }

      // Check if user is a board member
      const { data: memberData, error: memberError } = await supabase
        .from('board_members')
        .select('id')
        .eq('board_id', boardId)
        .eq('user_id', user.id)
        .single()

      if (memberError && memberError.code !== 'PGRST116') {
        // An error occurred, other than "not found"
        throw memberError
      }

      // If member data exists, user has access
      if (memberData) {
        fetchTasks()
      } else {
        // User doesn't have access to this board
        setError('You do not have access to this board')
        navigate('/dashboard')
      }
    } catch (error) {
      console.error('Error checking board permission:', error)
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const fetchTasks = async () => {
    try {
      console.log("Fetching tasks for board:", boardId);
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('board_id', boardId)
        .order('position', { ascending: true })

      if (error) throw error
      
      console.log("Raw tasks data:", data);
      
      // Check if all tasks have valid IDs
      const validData = data?.filter(task => {
        if (!task.id) {
          console.error('Task missing ID:', task);
          return false;
        }
        return true;
      }) || [];
      
      // Group tasks by status and sort each group by position
      const todoTasks = validData.filter(task => task.status === 'todo')
        .sort((a, b) => (a.position || 0) - (b.position || 0));
      
      const inProgressTasks = validData.filter(task => task.status === 'in_progress')
        .sort((a, b) => (a.position || 0) - (b.position || 0));
      
      const doneTasks = validData.filter(task => task.status === 'done')
        .sort((a, b) => (a.position || 0) - (b.position || 0));
      
      // Combine all sorted tasks
      const sortedData = [...todoTasks, ...inProgressTasks, ...doneTasks];
      
      console.log("Sorted tasks with IDs:", sortedData.map(t => ({ id: t.id, title: t.title, status: t.status, position: t.position })));
      setTasks(sortedData);
    } catch (error) {
      console.error('Error fetching tasks:', error)
      setError('Failed to load tasks. Please try refreshing the page.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTask.title.trim()) return
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get the highest position for the status
      const tasksInColumn = tasks.filter(t => t.status === newTask.status)
      const maxPosition = tasksInColumn.length > 0 
        ? Math.max(...tasksInColumn.map(t => t.position || 0)) + 100 
        : 100

      const { data, error } = await supabase
        .from('tasks')
        .insert([{ 
          ...newTask, 
          board_id: boardId,
          user_id: user.id,
          position: maxPosition
        }])
        .select()
        .single()

      if (error) throw error

      setTasks(prevTasks => [...prevTasks, data])
      setNewTask({ title: '', description: '', status: 'todo' })
    } catch (error) {
      console.error('Error creating task:', error)
      setError('Failed to create task. Please try again.')
    }
  }

  const handleUpdateTask = async (task: Task) => {
    setError(null)
    try {
      const { error } = await supabase
        .from('tasks')
        .update(task)
        .eq('id', task.id)

      if (error) throw error

      setTasks(tasks.map((t) => (t.id === task.id ? task : t)))
      setEditingTask(null)
    } catch (error) {
      console.error('Error updating task:', error)
      setError('Failed to update task. Please try again.')
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    setError(null)
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)

      if (error) throw error

      setTasks(tasks.filter((t) => t.id !== taskId))
    } catch (error) {
      console.error('Error deleting task:', error)
      setError('Failed to delete task. Please try again.')
    }
  }

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    
    // Return early if there's no destination or the item was dropped in the same place
    if (!destination || 
        (source.droppableId === destination.droppableId && 
         source.index === destination.index)) {
      return;
    }

    // Find the task being dragged
    const taskToMove = tasks.find(t => t.id === draggableId);
    if (!taskToMove) {
      console.error(`Task not found with ID: ${draggableId}`);
      return;
    }

    // Create a new array for immutability
    let newTasks = [...tasks];
    
    // Get all tasks in the source column
    const sourceTasks = newTasks.filter(t => t.status === source.droppableId);
    
    // Create updated task with new status
    const updatedTask = {
      ...taskToMove,
      status: destination.droppableId as 'todo' | 'in_progress' | 'done',
    };
    
    // Handle reordering within the same column
    if (source.droppableId === destination.droppableId) {
      // Create a copy of the tasks in this column
      const columnTasks = [...sourceTasks];
      
      // Remove the task from its original position
      columnTasks.splice(source.index, 1);
      
      // Insert the task at the new position
      columnTasks.splice(destination.index, 0, updatedTask);
      
      // Update positions for all tasks in the column
      const updatedColumnTasks = columnTasks.map((task, index) => ({
        ...task,
        position: index * 100
      }));
      
      // Replace all tasks from this column in the main tasks array
      newTasks = newTasks.filter(t => t.status !== source.droppableId);
      newTasks = [...newTasks, ...updatedColumnTasks];
    } else {
      // Moving between columns
      // Update the task in the tasks array
      const taskIndex = newTasks.findIndex(t => t.id === draggableId);
      if (taskIndex !== -1) {
        newTasks[taskIndex] = {
          ...updatedTask,
          position: destination.index * 100
        };
      }
    }
    
    // Update the state immediately for better UX
    setTasks(newTasks);
    
    try {
      // Update the task's status and position in the database
      await supabase
        .from('tasks')
        .update({ 
          status: updatedTask.status,
          position: destination.index * 100
        })
        .eq('id', updatedTask.id);
      
      // If we're reordering within the same column, update all affected tasks' positions
      if (source.droppableId === destination.droppableId) {
        // Get the updated tasks for this column from our newTasks array
        const updatedColumnTasks = newTasks.filter(t => t.status === source.droppableId);
        
        // Update other tasks' positions in batch if your API supports it
        // For Supabase, we need to do them one by one
        for (const task of updatedColumnTasks) {
          if (task.id !== draggableId) { // Skip the task we already updated
            await supabase
              .from('tasks')
              .update({ position: task.position })
              .eq('id', task.id);
          }
        }
      }
    } catch (error) {
      console.error('Failed to update task in database:', error);
      setError('Failed to update task position. Please try again.');
    }
  };

  useEffect(() => {
    // This will run whenever tasks changes
    if (tasks.length > 0) {
      console.log("Current tasks in state:", tasks.length);
      console.log("Task IDs in state:", tasks.map(t => t.id));
    }
  }, [tasks]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600 mb-4"></div>
      </div>
    )
  }

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/dashboard')}
            className="mr-3 flex items-center text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-200"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            <span className="ml-1 text-sm font-medium">Back to Dashboard</span>
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{board?.name || 'Loading...'}</h1>
        </div>
        <div className="flex items-center space-x-2">
          <ShareBoard boardId={boardId || ''} />
          <BoardMenu 
            boardId={boardId || ''} 
            boardName={board?.name || ''} 
            onRename={(newName) => setBoard(board => board ? { ...board, name: newName } : null)}
            onDelete={() => {
              // The BoardMenu component will handle navigation back to dashboard
              console.log('Board deleted, navigation handled by BoardMenu')
            }}
          />
        </div>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="mb-8 p-5 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 transition-colors duration-200">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Add New Task</h2>
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="task-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title
              </label>
              <input
                id="task-title"
                type="text"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                placeholder="Task title"
                className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
              />
            </div>
            <div>
              <label htmlFor="task-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <input
                id="task-description"
                type="text"
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                placeholder="Task description"
                className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
              />
            </div>
            <div>
              <label htmlFor="task-status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                id="task-status"
                value={newTask.status}
                onChange={(e) => {
                  // For TypeScript safety, we verify the value is one of our valid statuses
                  const value = e.target.value;
                  if (value === 'todo' || value === 'in_progress' || value === 'done') {
                    setNewTask({ ...newTask, status: value });
                  }
                }}
                className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
              >
                {Object.entries(COLUMNS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-900 transition-colors duration-200"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Task
            </button>
          </div>
        </form>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {Object.entries(COLUMNS).map(([status, title]) => (
            <div key={status} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm transition-colors duration-200">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                <span className={`w-3 h-3 rounded-full mr-2 ${
                  status === 'todo' ? 'bg-yellow-400 dark:bg-yellow-500' : 
                  status === 'in_progress' ? 'bg-blue-400 dark:bg-blue-500' : 
                  'bg-green-400 dark:bg-green-500'
                }`}></span>
                {title}
                <span className="ml-2 text-sm text-gray-500 dark:text-gray-400 font-normal">
                  ({tasks.filter(t => t.status === status).length})
                </span>
              </h2>
              <StrictModeDroppable droppableId={status}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`space-y-4 min-h-[150px] rounded-md transition-colors duration-200 ${
                      snapshot.isDraggingOver ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                    }`}
                  >
                    {tasks
                      .filter(task => task.status === status)
                      .sort((a, b) => (a.position || 0) - (b.position || 0))
                      .map((task, index) => (
                        <TaskCard 
                          key={task.id} 
                          task={task} 
                          index={index}
                          editingTask={editingTask}
                          handleUpdateTask={handleUpdateTask}
                          setEditingTask={setEditingTask}
                          onDelete={handleDeleteTask}
                        />
                      ))}
                    {provided.placeholder}
                  </div>
                )}
              </StrictModeDroppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  )
} 