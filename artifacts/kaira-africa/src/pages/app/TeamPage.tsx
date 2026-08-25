import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Users, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/common/StatusBadge';
import { PageTransition } from '@/components/common/PageTransition';
import { EmptyState } from '@/components/common/EmptyState';
import {
  useGetMe,
  useListTeamMembers,
  useCreateTeamMember,
  useDeleteTeamMember,
  getListTeamMembersQueryKey,
  ApiError,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { formatRelativeTime, getInitials } from '@/lib/utils';

function InviteMemberDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', role: '', department: '' });
  const [error, setError] = useState<string | null>(null);

  const createTeamMember = useCreateTeamMember({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTeamMembersQueryKey() });
        setForm({ firstName: '', lastName: '', email: '', phone: '', role: '', department: '' });
        onOpenChange(false);
      },
      onError: (err) => setError(err instanceof ApiError ? err.message : 'Failed to invite team member'),
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    createTeamMember.mutate({
      data: {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone || undefined,
        role: form.role,
        department: form.department || undefined,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tm-firstName">First name</Label>
              <Input id="tm-firstName" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tm-lastName">Last name</Label>
              <Input id="tm-lastName" required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tm-email">Email</Label>
            <Input id="tm-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tm-role">Role / title</Label>
              <Input id="tm-role" required placeholder="e.g. Sales Manager" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tm-department">Department</Label>
              <Input id="tm-department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tm-phone">Phone</Label>
            <Input id="tm-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={createTeamMember.isPending}>
              {createTeamMember.isPending ? 'Inviting…' : 'Send Invite'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function TeamPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [inviteOpen, setInviteOpen] = useState(false);

  const { data: me } = useGetMe();
  // The backend's requireRole("owner", "admin") is the actual security
  // boundary for team writes (see api-server/src/routes/team.ts) — this
  // is only a UX convenience so staff/manager never see controls that
  // would 403 if clicked. Removing/hiding this check would not weaken
  // security since the backend enforces it independently either way.
  const canManageTeam = me?.role === 'owner' || me?.role === 'admin';

  const { data: teamMembers, isLoading } = useListTeamMembers({
    search: search || undefined,
    status: statusFilter === 'all' ? undefined : (statusFilter as 'active' | 'inactive' | 'pending'),
  });

  const queryClient = useQueryClient();
  const deleteTeamMember = useDeleteTeamMember({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTeamMembersQueryKey() }),
    },
  });

  const activeCount = teamMembers?.filter(m => m.status === 'active').length || 0;
  const pendingCount = teamMembers?.filter(m => m.status === 'pending').length || 0;

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Team Members</h1>
            <p className="text-muted-foreground mt-1">Manage your team and their permissions</p>
          </div>
          {canManageTeam && (
            <Button onClick={() => setInviteOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Invite Member
            </Button>
          )}
        </div>

        {canManageTeam && <InviteMemberDialog open={inviteOpen} onOpenChange={setInviteOpen} />}        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-display text-2xl font-bold">{teamMembers?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-display text-2xl font-bold text-primary">{activeCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Invite</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-display text-2xl font-bold text-secondary">{pendingCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search team members..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Team List */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3 animate-pulse">
                {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-muted rounded-lg" />)}
              </div>
            ) : teamMembers && teamMembers.length > 0 ? (
              <div className="divide-y divide-border">
                {teamMembers.map((member, idx) => (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="h-12 w-12 bg-primary">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials(member.firstName, member.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">
                        {member.firstName} {member.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {member.email}
                      </p>
                    </div>
                    <div className="hidden md:block">
                      <p className="text-sm font-medium text-foreground">{member.role}</p>
                      <p className="text-xs text-muted-foreground">{member.department || 'No department'}</p>
                    </div>
                    <div className="hidden lg:block text-sm text-muted-foreground">
                      {member.lastActiveAt ? formatRelativeTime(member.lastActiveAt) : 'Never'}
                    </div>
                    <StatusBadge status={member.status as any} />
                    {canManageTeam && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        disabled={deleteTeamMember.isPending}
                        onClick={() => deleteTeamMember.mutate({ id: member.id })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="p-8">
                <EmptyState
                  icon={Users}
                  title="No team members found"
                  description="Try adjusting your search or filters"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
