"use client"

import useAuth from "@/store/auth";

export function usePermission() {
  const pages = useAuth((state) => state.pages)
  const isSuperAdmin = useAuth((state) => state.isSuperAdmin)

  /**
   * Check if user has a specific permission for a feature
   * @param permission 'view' | 'create' | 'edit' | 'delete'
   * @param link the feature link (e.g. '/warehouse/receiving')
   */
  const can = (permission: string, link: string) => {
    if (isSuperAdmin) return true;
    
    const featurePermissions = pages[link];
    if (!featurePermissions) return false;
    
    return featurePermissions.includes(permission);
  }

  /**
   * Check if user can see a page (shortcut for can('view', link))
   */
  const canView = (link: string) => can('view', link);
  const canCreate = (link: string) => can('create', link);
  const canEdit = (link: string) => can('edit', link);
  const canDelete = (link: string) => can('delete', link);

  return { 
    can, 
    canView, 
    canCreate, 
    canEdit, 
    canDelete, 
    isSuperAdmin,
    pages
  };
}
