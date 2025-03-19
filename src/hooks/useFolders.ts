import React, { useState, useCallback, useEffect } from 'react';
import { Folder } from '../types/types';
import { getFolders, createFolder, updateStudySetFolder, updateFolder as updateFolderInDb, deleteFolder as deleteFolderInDb, getDatabase } from '../services/Database';

// Define a new type that includes study_set_count
type FolderWithCount = Folder & { 
  study_set_count: number;
  study_sets?: string[]; // Add this property
};

export function useFolders() {
  const [folders, setFolders] = useState<FolderWithCount[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshFolders = useCallback(async () => {
    try {
      setLoading(true);
      const db = await getDatabase();
      
      // First, get all folders with basic information
      const foldersWithCounts = await db.getAllAsync<FolderWithCount>(`
        SELECT 
          f.*,
          COALESCE((
            SELECT COUNT(*) 
            FROM study_sets s 
            WHERE s.folder_id = f.id 
            AND s.folder_id IS NOT NULL
          ), 0) as study_set_count
        FROM folders f
        ORDER BY f.created_at DESC
      `);
      
      // Now for each folder, get the actual study sets
      const foldersWithStudySets = await Promise.all(
        foldersWithCounts.map(async (folder) => {
          // Get study set IDs for this folder
          const studySets = await db.getAllAsync<{ id: string }>(`
            SELECT id FROM study_sets 
            WHERE folder_id = ? 
            AND folder_id IS NOT NULL
          `, [folder.id]);
          
          // Extract just the IDs into an array
          const studySetIds = studySets.map(set => set.id);
          
          // Return the folder with study_sets added
          return {
            ...folder,
            study_sets: studySetIds
          };
        })
      );
      
      console.log('Folders with study sets:', foldersWithStudySets);
      setFolders(foldersWithStudySets);
    } catch (error) {
      console.error('Error refreshing folders:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const addFolder = async (name: string, color: string) => {
    try {
      const newFolder = await createFolder({ name, color });
      await refreshFolders(); // Refresh the folders list after adding
      return newFolder;
    } catch (error) {
      console.error('Error in addFolder:', error);
      throw error;
    }
  };

  const updateFolder = async (folderId: string, name: string, color: string) => {
    try {
      await updateFolderInDb(folderId, { name, color });
      await refreshFolders(); // Refresh the folders list
    } catch (error) {
      console.error('Error updating folder:', error);
      throw error;
    }
  };

  const assignStudySetToFolder = async (studySetId: string, folderId: string | null) => {
    try {
      await updateStudySetFolder(studySetId, folderId);
      await refreshFolders(); // Refresh after assigning
    } catch (error) {
      console.error('Error assigning study set to folder:', error);
      throw error;
    }
  };

  const deleteFolder = async (folderId: string) => {
    try {
      await deleteFolderInDb(folderId);
      await refreshFolders(); // Refresh the folders list after deletion
    } catch (error) {
      console.error('Error deleting folder:', error);
      throw error;
    }
  };

  // Initial load
  useEffect(() => {
    refreshFolders();
  }, [refreshFolders]);

  useEffect(() => {
    console.log('Folders loaded:', folders);
    
    // Log a sample folder to check the structure
    if (folders && folders.length > 0) {
      console.log('Sample folder structure:', JSON.stringify(folders[0]));
    }
  }, [folders]);

  return {
    folders,  // Use folders directly, no need for transformation
    loading,
    addFolder,
    updateFolder,
    assignStudySetToFolder,
    refreshFolders,
    deleteFolder,
  };
} 