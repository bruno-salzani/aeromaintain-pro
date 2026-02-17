import { useEffect, useState } from 'react';
import { User } from '@/types';

const STORAGE_KEY = 'am_users';

export function useUsers(initial: User[] = []) {
  const [users, setUsers] = useState<User[]>(initial);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setUsers(JSON.parse(raw));
    } catch (e) { void e; }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    } catch (e) { void e; }
  }, [users]);

  const addUser = (data: Omit<User, 'id'>) => {
    const u: User = { ...data, id: Math.random().toString(36).slice(2, 11) };
    setUsers(prev => [u, ...prev]);
  };

  const updateUser = (id: string, patch: Partial<User>) => {
    setUsers(prev => prev.map(u => (u.id === id ? { ...u, ...patch } : u)));
  };

  const deleteUser = (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  return { users, setUsers, addUser, updateUser, deleteUser };
}
