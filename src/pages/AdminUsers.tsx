import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Users, 
  ShieldCheck,
  UserPlus,
  UserMinus,
  RefreshCw,
  ArrowLeft,
  Crown,
  LogOut,
  Plus,
  KeyRound
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";

const SUPER_ADMIN_EMAIL = "shawn@guidepoint.co.bw";

interface UserProfile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  roles: string[];
  isSuperAdmin: boolean;
}

const toRolesArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((role): role is string => typeof role === "string" && role.trim().length > 0);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((role) => role.trim())
      .filter(Boolean);
  }

  return [];
};

const AdminUsers = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: authLoading, isAdminLoading, signOut } = useAuth();
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    userId: string;
    action: "assign" | "remove";
    role: string;
    userName: string;
  } | null>(null);

  // Create admin dialog
  const [createAdminOpen, setCreateAdminOpen] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [newAdminName, setNewAdminName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Change password dialog
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const currentUserEmail = user?.email?.toLowerCase() ?? "";
  const currentUserProfile = users.find(
    (profile) => (profile.email ?? "").toLowerCase() === currentUserEmail
  );
  const isSuperAdmin =
    (user?.email ?? "").toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() ||
    Boolean(currentUserProfile?.isSuperAdmin) ||
    currentUserProfile?.roles.some((role) => {
      const normalized = role.toLowerCase();
      return normalized === "super_admin" || normalized === "super-admin";
    }) === true;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/admin");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    // Only show error if both auth loading AND admin loading are complete
    if (!authLoading && !isAdminLoading && user && !isAdmin) {
      toast.error("Access denied. Admin role required.");
      navigate("/admin");
    }
  }, [isAdmin, authLoading, isAdminLoading, user, navigate]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const data = await api.adminUsers();
      const rawList = data?.users || data?.data || data || [];
      const usersList = Array.isArray(rawList) ? rawList : [];

      const normalizedUsers: UserProfile[] = usersList.map((rawUser: Record<string, unknown>, index: number) => {
        const email = typeof rawUser?.email === "string" ? rawUser.email : null;
        const fullName =
          typeof rawUser?.full_name === "string"
            ? rawUser.full_name
            : typeof rawUser?.name === "string"
              ? rawUser.name
              : null;
        const createdAt =
          typeof rawUser?.created_at === "string" ? rawUser.created_at : new Date().toISOString();
        const roles = toRolesArray(rawUser?.roles ?? rawUser?.role);
        const isSuperAdmin =
          Boolean(rawUser?.isSuperAdmin) ||
          Boolean(rawUser?.is_super_admin) ||
          (typeof email === "string" && email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase());

        return {
          id: String(rawUser?.id ?? rawUser?.user_id ?? `user-${index}`),
          user_id: String(rawUser?.user_id ?? rawUser?.id ?? `user-${index}`),
          email,
          full_name: fullName,
          created_at: createdAt,
          roles,
          isSuperAdmin,
        };
      });

      setUsers(normalizedUsers);
    } catch (err) {
      console.error("Error fetching users:", err);
      toast.error("Failed to fetch users");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && isAdmin) {
      fetchUsers();
    }
  }, [user, isAdmin]);

  const handleRoleAction = async () => {
    if (!confirmDialog) return;

    try {
      const { userId, action, role } = confirmDialog;

      if (action === "assign") {
        try {
          await api.adminAssignRole({ userId, role });
        } catch {
          // Fallback endpoint used by some Laravel variants
          if (role === "admin") {
            await api.adminMakeAdmin(userId);
          } else {
            throw new Error("Role assignment failed");
          }
        }
        toast.success("Role assigned successfully");
      } else {
        try {
          await api.adminRemoveRole({ userId, role });
        } catch {
          // Fallback endpoint used by some Laravel variants
          if (role === "admin") {
            await api.adminRemoveAdmin(userId);
          } else {
            throw new Error("Role removal failed");
          }
        }
        toast.success("Role removed successfully");
      }

      fetchUsers();
    } catch (err) {
      console.error("Error updating role:", err);
      toast.error(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setConfirmDialog(null);
    }
  };

  const handleCreateAdmin = async () => {
    if (!newAdminEmail || !newAdminPassword) {
      toast.error("Email and password are required");
      return;
    }

    if (newAdminPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsCreating(true);
    try {
      try {
        await api.adminCreateAdmin({
          fullName: newAdminName || undefined,
          email: newAdminEmail,
          password: newAdminPassword,
        });
      } catch {
        // Fallback to legacy create endpoint
        await api.adminCreateUser({
          name: newAdminName || undefined,
          email: newAdminEmail,
          password: newAdminPassword,
        });
      }
      toast.success("Admin user created successfully");
      setCreateAdminOpen(false);
      setNewAdminEmail("");
      setNewAdminPassword("");
      setNewAdminName("");
      fetchUsers();
    } catch (err) {
      console.error("Error creating admin:", err);
      toast.error(err instanceof Error ? err.message : "Failed to create admin");
    } finally {
      setIsCreating(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmNewPassword) {
      toast.error("Please fill in all password fields");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsChangingPassword(true);
    try {
      toast.error("Password updates are not supported by the current API.");
    } catch (err) {
      console.error("Error changing password:", err);
      toast.error("Failed to change password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/admin");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">User Management</h1>
              <p className="text-sm text-muted-foreground">Manage user roles and permissions</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => setChangePasswordOpen(true)}>
              <KeyRound className="w-4 h-4 mr-2" />
              Change Password
            </Button>
            <span className="text-sm text-muted-foreground">{user.email}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-xl p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-3xl font-bold text-foreground">{users.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card border border-border rounded-xl p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Admins</p>
                <p className="text-3xl font-bold text-primary">
                  {users.filter(u => u.roles.includes("admin")).length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-primary" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card border border-border rounded-xl p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Regular Users</p>
                <p className="text-3xl font-bold text-muted-foreground">
                  {users.filter(u => !u.roles.includes("admin")).length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Users className="w-6 h-6 text-muted-foreground" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Actions */}
        <div className="flex justify-between mb-4">
          <div>
            {isSuperAdmin && (
              <Button onClick={() => setCreateAdminOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Admin
              </Button>
            )}
          </div>
          <Button variant="outline" onClick={fetchUsers}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Users Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Loading...
                    </div>
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((userProfile) => (
                  <TableRow key={userProfile.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {userProfile.isSuperAdmin && (
                          <Crown className="w-4 h-4 text-warning" />
                        )}
                        <span className="font-medium">
                          {userProfile.full_name || "No name"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {userProfile.email}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {userProfile.isSuperAdmin && (
                          <Badge variant="default" className="bg-warning text-warning-foreground">
                            Super Admin
                          </Badge>
                        )}
                        {userProfile.roles.map((role) => (
                          <Badge 
                            key={role} 
                            variant={role === "admin" ? "default" : "secondary"}
                          >
                            {role}
                          </Badge>
                        ))}
                        {userProfile.roles.length === 0 && !userProfile.isSuperAdmin && (
                          <span className="text-sm text-muted-foreground">No roles</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(userProfile.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      {userProfile.isSuperAdmin ? (
                        <span className="text-xs text-muted-foreground">Protected</span>
                      ) : (
                        <div className="flex gap-2 justify-end">
                          {!userProfile.roles.includes("admin") ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setConfirmDialog({
                                open: true,
                                userId: userProfile.user_id,
                                action: "assign",
                                role: "admin",
                                userName: userProfile.full_name || userProfile.email || "User"
                              })}
                            >
                              <UserPlus className="w-4 h-4 mr-1" />
                              Make Admin
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setConfirmDialog({
                                open: true,
                                userId: userProfile.user_id,
                                action: "remove",
                                role: "admin",
                                userName: userProfile.full_name || userProfile.email || "User"
                              })}
                            >
                              <UserMinus className="w-4 h-4 mr-1" />
                              Remove Admin
                            </Button>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </main>

      {/* Create Admin Dialog */}
      <Dialog open={createAdminOpen} onOpenChange={setCreateAdminOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Admin</DialogTitle>
            <DialogDescription>
              Create a new admin user with email and a temporary password. They can change their password after logging in.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name (optional)</Label>
              <Input
                id="fullName"
                placeholder="John Doe"
                value={newAdminName}
                onChange={(e) => setNewAdminName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Temporary Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Min 6 characters"
                value={newAdminPassword}
                onChange={(e) => setNewAdminPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateAdminOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateAdmin} disabled={isCreating}>
              {isCreating ? "Creating..." : "Create Admin"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter a new password for your account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Min 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangePasswordOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleChangePassword} disabled={isChangingPassword}>
              {isChangingPassword ? "Changing..." : "Change Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog?.action === "assign" ? "Assign Admin Role" : "Remove Admin Role"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog?.action === "assign"
                ? `Are you sure you want to make "${confirmDialog?.userName}" an admin? They will have full access to the admin dashboard.`
                : `Are you sure you want to remove admin access from "${confirmDialog?.userName}"? They will no longer be able to access the admin dashboard.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRoleAction}>
              {confirmDialog?.action === "assign" ? "Assign Role" : "Remove Role"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminUsers;
