import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PlusIcon, UserGroupIcon } from '@heroicons/react/24/outline'
import BoardMenu from '../components/BoardMenu'

interface Board {
  id: string
  name: string
  created_at: string
  user_id: string
  is_owner: boolean
}

export default function Dashboard() {
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(true)
  const [newBoardName, setNewBoardName] = useState('')
  const [showNewBoardForm, setShowNewBoardForm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetchBoards()
  }, [])

  const fetchBoards = async () => {
    try {
      setError(null)
      setLoading(true)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      
      console.log("Current user:", user.id)
      
      // Get boards owned by the user
      console.log("Fetching owned boards...")
      const { data: ownedBoards, error: ownedError } = await supabase
        .from('boards')
        .select('*')
        .eq('user_id', user.id)
      
      if (ownedError) {
        console.error("Error fetching owned boards:", ownedError)
        throw ownedError
      }
      
      console.log(`Found ${ownedBoards?.length || 0} owned boards`)
      
      // Get boards shared with the user through board_members
      console.log("Fetching shared boards...")
      const { data: boardMemberships, error: membershipError } = await supabase
        .from('board_members')
        .select('board_id')
        .eq('user_id', user.id)
      
      if (membershipError) {
        console.error("Error fetching board memberships:", membershipError)
        throw membershipError
      }
      
      console.log(`Found ${boardMemberships?.length || 0} board memberships`)
      
      // If user has shared boards, fetch the actual board data
      let sharedBoards: any[] = []
      
      if (boardMemberships && boardMemberships.length > 0) {
        const boardIds = boardMemberships.map(membership => membership.board_id)
        console.log("Fetching shared board details for IDs:", boardIds)
        
        const { data: sharedBoardsData, error: sharedBoardsError } = await supabase
          .from('boards')
          .select('*')
          .in('id', boardIds)
        
        if (sharedBoardsError) {
          console.error("Error fetching shared boards:", sharedBoardsError)
          throw sharedBoardsError
        }
        
        sharedBoards = sharedBoardsData || []
        console.log(`Retrieved ${sharedBoards.length} shared boards`)
      }
      
      // Mark boards as owned or shared
      const ownedBoardsWithFlag = (ownedBoards || []).map(board => ({
        ...board,
        is_owner: true
      }))
      
      const sharedBoardsWithFlag = sharedBoards.map(board => ({
        ...board,
        is_owner: false
      }))
      
      // Combine and sort all boards
      const allBoards = [...ownedBoardsWithFlag, ...sharedBoardsWithFlag]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      
      console.log(`Total boards: ${allBoards.length}`)  
      setBoards(allBoards)
    } catch (error) {
      console.error('Error fetching boards:', error)
      setError('Failed to fetch boards.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBoardName.trim()) return
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data, error } = await supabase
        .from('boards')
        .insert([{ name: newBoardName, user_id: user.id }])
        .select()
        .single()
      if (error) throw error
      
      // Add the is_owner flag to the new board
      const newBoard = { ...data, is_owner: true }
      
      // Add the new board to the beginning of the boards array
      setBoards([newBoard, ...boards])
      setNewBoardName('')
      setShowNewBoardForm(false)
    } catch (error) {
      setError('Failed to create board. Please try again.')
      console.error('Error creating board:', error)
    }
  }

  const handleRenameBoard = (boardId: string, newName: string) => {
    setBoards(boards.map(board => 
      board.id === boardId ? { ...board, name: newName } : board
    ))
  }

  const handleDeleteBoard = (boardId: string) => {
    // Remove the board from state immediately for better user experience
    setBoards(boards.filter(board => board.id !== boardId))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Boards</h1>
        <button
          onClick={() => setShowNewBoardForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          New Board
        </button>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {showNewBoardForm && (
        <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700">
          <form onSubmit={handleCreateBoard} className="space-y-4">
            <div>
              <label htmlFor="board-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Board Name
              </label>
              <input
                id="board-name"
                type="text"
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                placeholder="Enter board name"
                className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowNewBoardForm(false)
                  setError(null)
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
              >
                Create Board
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Your Boards</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {boards.filter(board => board.is_owner).map((board) => (
            <div
              key={board.id}
              className="bg-white dark:bg-gray-800 overflow-hidden shadow-lg rounded-lg hover:shadow-xl transition-all duration-200 border border-gray-100 dark:border-gray-700 hover:border-indigo-100 dark:hover:border-indigo-900 cursor-pointer min-h-[180px] flex flex-col"
              onClick={() => navigate(`/board/${board.id}`)}
            >
              <div className="px-8 py-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start">
                  <h3 
                    className="text-xl font-semibold text-gray-900 dark:text-white mb-3"
                  >
                    {board.name}
                  </h3>
                  <div onClick={(e) => e.stopPropagation()}>
                    <BoardMenu 
                      boardId={board.id} 
                      boardName={board.name} 
                      onRename={(newName) => handleRenameBoard(board.id, newName)}
                      onDelete={() => handleDeleteBoard(board.id)}
                    />
                  </div>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Created {new Date(board.created_at).toLocaleDateString()}
                </p>
                <div className="mt-auto pt-4">
                  <div className="inline-flex items-center text-xs text-indigo-600 dark:text-indigo-400">
                    <span>Click to open board</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Shared Boards Section */}
      {boards.filter(board => !board.is_owner).length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <UserGroupIcon className="h-5 w-5 mr-2 text-indigo-500" />
            Shared With You
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {boards.filter(board => !board.is_owner).map((board) => (
              <div
                key={board.id}
                className="bg-white dark:bg-gray-800 overflow-hidden shadow-lg rounded-lg hover:shadow-xl transition-all duration-200 border border-indigo-100 dark:border-indigo-900 hover:border-indigo-200 dark:hover:border-indigo-800 cursor-pointer min-h-[180px] flex flex-col"
                onClick={() => navigate(`/board/${board.id}`)}
              >
                <div className="px-8 py-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                      {board.name}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Shared with you
                  </p>
                  <div className="mt-auto pt-4">
                    <div className="inline-flex items-center text-xs text-indigo-600 dark:text-indigo-400">
                      <span>Click to open board</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {boards.length === 0 && !showNewBoardForm && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">No boards yet</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Get started by creating your first board.
          </p>
          <button
            onClick={() => setShowNewBoardForm(true)}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create New Board
          </button>
        </div>
      )}
    </div>
  )
} 