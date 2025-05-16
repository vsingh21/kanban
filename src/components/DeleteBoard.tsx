import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { TrashIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface DeleteBoardProps {
  boardId: string
  boardName: string
}

export default function DeleteBoard({ boardId, boardName }: DeleteBoardProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)
    
    try {
      // Delete the board and all related tasks will be cascaded
      const { error } = await supabase
        .from('boards')
        .delete()
        .eq('id', boardId)

      if (error) throw error
      
      // Redirect to dashboard after successful deletion
      navigate('/dashboard')
    } catch (error) {
      console.error('Error deleting board:', error)
      setError('Failed to delete board. Please try again.')
      setDeleting(false)
    }
  }

  return (
    <div>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center px-3 py-2 border border-red-300 dark:border-red-700 text-sm font-medium rounded-md text-red-700 dark:text-red-300 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-900 transition-colors duration-200 shadow-sm"
        aria-label="Delete board"
      >
        <TrashIcon className="h-5 w-5 mr-2" />
        Delete
      </button>

      {/* Confirmation Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-black dark:bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative bg-white dark:bg-gray-800 rounded-lg max-w-md mx-auto p-6 shadow-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-start">
              <div className="flex-shrink-0 text-red-500 dark:text-red-400">
                <ExclamationTriangleIcon className="h-6 w-6" />
              </div>
              <div className="ml-3 w-0 flex-1">
                <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Delete Board</h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Are you sure you want to delete <span className="font-medium">{boardName}</span>? This action cannot be undone and all tasks will be permanently removed.
                  </p>
                </div>

                {error && (
                  <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md">
                    <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}

                <div className="mt-4 flex space-x-3">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => setIsOpen(false)}
                    className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-900"
                  >
                    {deleting ? (
                      <>
                        <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                        Deleting...
                      </>
                    ) : (
                      'Delete'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 