import { useState, useEffect } from 'react';
import { Folder } from '../types/types';
import { getFolders, createFolder, updateStudySetFolder, updateFolder as updateFolderInDb } from '../services/Database';

export function useFolders() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFolders = async () => {
    try {
      const fetchedFolders = await getFolders();
      setFolders(fetchedFolders);
    } catch (error) {
      console.error('Error loading folders:', error);
    } finally {
      setLoading(false);
    }
  };

  const addFolder = async (name: string, color: string) => {
    console.log('addFolder called with:', { name, color });
    try {
      const newFolder = await createFolder({ name, color });
      console.log('Folder created successfully:', newFolder);
      setFolders(prev => [newFolder, ...prev]);
      return newFolder;
    } catch (error) {
      console.error('Error in addFolder:', error);
      throw error;
    }
  };

  const updateFolder = async (folderId: string, name: string, color: string) => {
    try {
      await updateFolderInDb(folderId, { name, color });
      await loadFolders(); // Refresh the folders list
    } catch (error) {
      console.error('Error updating folder:', error);
      throw error;
    }
  };

  const assignStudySetToFolder = async (studySetId: string, folderId: string | null) => {
    try {
      await updateStudySetFolder(studySetId, folderId);
    } catch (error) {
      console.error('Error assigning study set to folder:', error);
      throw error;
    }
  };

  useEffect(() => {
    loadFolders();
  }, []);

  return {
    folders,
    loading,
    addFolder,
    updateFolder,
    assignStudySetToFolder,
    refreshFolders: loadFolders,
  };
} 