import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { EllipsisVerticalIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline'

interface BoardMenuProps {
  boardId: string
  boardName: string
  onRename: (newName: string) => void
}

export default function BoardMenu({ boardId, boardName, onRename }: BoardMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [newBoardName, setNewBoardName] = useState(boardName)
  const [deleting, setDeleting] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

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
      
      // Close the modal after successful deletion
      setShowDeleteModal(false)
      // The board will be removed from the list in the parent component via re-fetch
    } catch (error) {
      console.error('Error deleting board:', error)
      setError('Failed to delete board. Please try again.')
      setDeleting(false)
    }
  }

  const handleRename = async () => {
    if (!newBoardName.trim() || newBoardName === boardName) {
      setShowRenameModal(false)
      return
    }

    setRenaming(true)
    setError(null)
    
    try {
      const { error } = await supabase
        .from('boards')
        .update({ name: newBoardName })
        .eq('id', boardId)

      if (error) throw error
      
      // Update the board name in the parent component
      onRename(newBoardName)
      setShowRenameModal(false)
    } catch (error) {
      console.error('Error renaming board:', error)
      setError('Failed to rename board. Please try again.')
    } finally {
      setRenaming(false)
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-900 transition-colors duration-200"
        aria-label="Board options"
      >
        <EllipsisVerticalIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-10 border border-gray-200 dark:border-gray-700">
          <div className="py-1" role="menu" aria-orientation="vertical">
            <button
              onClick={() => {
                setIsOpen(false)
                setShowRenameModal(true)
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
              role="menuitem"
            >
              <PencilIcon className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
              Rename
            </button>
            <button
              onClick={() => {
                setIsOpen(false)
                setShowDeleteModal(true)
              }}
              className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
              role="menuitem"
            >
              <TrashIcon className="h-4 w-4 mr-2 text-red-500 dark:text-red-400" />
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {showRenameModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-black dark:bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative bg-white dark:bg-gray-800 rounded-lg max-w-md mx-auto p-6 shadow-xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">Rename Board</h3>
            
            <div className="mb-4">
              <label htmlFor="board-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Board Name
              </label>
              <input
                id="board-name"
                type="text"
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {error && (
              <div className="mb-4 p-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                disabled={renaming}
                onClick={() => setShowRenameModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRename}
                disabled={renaming || !newBoardName.trim() || newBoardName === boardName}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {renaming ? (
                  <>
                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full inline-block"></div>
                    Renaming...
                  </>
                ) : (
                  'Rename'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-black dark:bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative bg-white dark:bg-gray-800 rounded-lg max-w-md mx-auto p-6 shadow-xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-2">Delete Board</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Are you sure you want to delete <span className="font-medium">{boardName}</span>? This action cannot be undone and all tasks will be permanently removed.
            </p>

            {error && (
              <div className="mb-4 p-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? (
                  <>
                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full inline-block"></div>
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 