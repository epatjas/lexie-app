import React, { useState, useCallback, useEffect } from 'react';
import { Folder } from '../types/types';
import { getFolders, createFolder, updateStudySetFolder, updateFolder as updateFolderInDb, deleteFolder as deleteFolderInDb } from '../services/Database';

export function useFolders() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshFolders = useCallback(async () => {
    try {
      setLoading(true);
      const fetchedFolders = await getFolders();
      setFolders(fetchedFolders);
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

  return {
    folders,
    loading,
    addFolder,
    updateFolder,
    assignStudySetToFolder,
    refreshFolders,
    deleteFolder,
  };
} 